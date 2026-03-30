import { FunctionTool } from '@google/adk';
import { GoogleGenAI } from '@google/genai';
import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as meta from '../services/metaClient.js';
import { activeSessions } from './sessionBus.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.resolve(__dirname, '../../skills/default');

// ── Goal → Action Type mapping (source of truth for benchmark computation) ──
const GOAL_ACTION_MAP = {
  CONVERSATIONS: { action_type: 'onsite_conversion.messaging_conversation_started_7d', metric_field: 'actions' },
  LEAD_GENERATION: { action_type: ['lead', 'onsite_conversion.lead_grouped'], metric_field: 'actions' },
  OFFSITE_CONVERSIONS: {
    action_type: ['offsite_conversion.fb_pixel_purchase', 'offsite_conversion.fb_pixel_lead',
                  'offsite_conversion.fb_pixel_view_content', 'landing_page_view'],
    metric_field: 'actions', resolve: 'first_found',
  },
  LINK_CLICKS: { action_type: 'link_click', metric_field: 'actions' },
  LANDING_PAGE_VIEWS: { action_type: 'landing_page_view', metric_field: 'actions' },
  THRUPLAY: { action_type: 'video_view', metric_field: 'video_thruplay_watched_actions' },
  REACH: { action_type: null, metric_field: 'impressions' },
  POST_ENGAGEMENT: { action_type: 'post_engagement', metric_field: 'actions' },
  PROFILE_VISIT: { action_type: 'link_click', metric_field: 'actions' },
  VALUE: { action_type: 'purchase', metric_field: 'actions' },
};

// Extract result count from a campaign row based on its optimization_goal
function extractResults(row, goal) {
  const mapping = GOAL_ACTION_MAP[goal];
  if (!mapping) return { results: 0, action_type_used: null };
  const spend = parseFloat(row.spend) || 0;

  // REACH: result = impressions
  if (goal === 'REACH') {
    return { results: parseInt(row.impressions) || 0, action_type_used: 'impressions', spend };
  }
  // THRUPLAY: results from video_thruplay_watched_actions field
  if (mapping.metric_field === 'video_thruplay_watched_actions') {
    const thruplays = row.video_thruplay_watched_actions;
    const val = Array.isArray(thruplays) && thruplays.length > 0 ? parseInt(thruplays[0].value) || 0 : 0;
    return { results: val, action_type_used: 'video_thruplay', spend };
  }
  // Standard: look in actions array
  const actions = row.actions || [];
  const types = mapping.resolve === 'first_found' ? mapping.action_type
    : Array.isArray(mapping.action_type) ? mapping.action_type : [mapping.action_type];
  for (const at of types) {
    const found = actions.find(a => a.action_type === at);
    if (found) return { results: parseInt(found.value) || 0, action_type_used: at, spend };
  }
  return { results: 0, action_type_used: types[0], spend };
}

// Compute per-goal aggregated benchmarks from enriched campaign insights
function computeBenchmarks(insights) {
  const buckets = {};
  for (const row of insights) {
    const goal = row.optimization_goal;
    if (!goal) continue;
    const spend = parseFloat(row.spend) || 0;
    if (spend === 0) continue;
    const { results, action_type_used } = extractResults(row, goal);
    if (!buckets[goal]) {
      buckets[goal] = { total_spend: 0, total_results: 0, campaign_count: 0, primary_action_type: action_type_used };
    }
    buckets[goal].total_spend += spend;
    buckets[goal].total_results += results;
    buckets[goal].campaign_count += 1;
  }
  const benchmarks = {};
  for (const [goal, b] of Object.entries(buckets)) {
    benchmarks[goal] = {
      avg_cost_per_result: b.total_results > 0 ? +(b.total_spend / b.total_results).toFixed(2) : null,
      total_spend: +b.total_spend.toFixed(2),
      total_results: b.total_results,
      campaign_count: b.campaign_count,
      primary_action_type: b.primary_action_type,
    };
  }
  return benchmarks;
}

// ── Helper: extract token + adAccountId ─────────────────────────────────────
// Uses the user's real token (long-lived, from FB login → token exchange).
// ADK stores state as { value: {...}, delta: {...} } — read from .value
const ctx = (context) => ({
  token: context.state?.value?.token || context.state?.token,
  adAccountId: context.state?.value?.adAccountId || context.state?.adAccountId,
});

// ── Tool functions ──────────────────────────────────────────────────────────
// Organized by category. All use user's token + adAccountId from session.

// Build a concise result summary for the live activity log
function buildResultSummary(fnName, rawResult) {
  try {
    const r = rawResult?.result ? JSON.parse(rawResult.result) : rawResult;
    const s = {
      getCampaigns:     d => `${(d.data||d).length} campaign${(d.data||d).length===1?'':'s'}`,
      getAdSets:        d => `${(d.data||d).length} ad set${(d.data||d).length===1?'':'s'}`,
      getAds:           d => `${(d.data||d).length} ad${(d.data||d).length===1?'':'s'}`,
      getInsights:      d => `${(d.data||d).length} result${(d.data||d).length===1?'':'s'}`,
      getPages:         d => `${(d.data||d).length} page${(d.data||d).length===1?'':'s'}`,
      getPixels:        d => `${(d.data||d).length} pixel${(d.data||d).length===1?'':'s'}`,
      getAdImages:      d => `${(d.data||d).length} image${(d.data||d).length===1?'':'s'}`,
      getAdVideos:      d => `${(d.data||d).length} video${(d.data||d).length===1?'':'s'}`,
      createCampaign:   d => `Created — ID ${d.id}`,
      createAdSet:      d => `Created — ID ${d.id}`,
      createAdCreative: d => `Created — ID ${d.id}`,
      createAd:         d => `Created — ID ${d.id}`,
      createAdsBulk:    d => `${d.succeeded}/${d.total} created`,
      preflightCheck:   d => d.pass ? 'All checks passed' : `${d.failures?.length||0} issue(s)`,
      uploadAdImage:    d => { const k = Object.keys(d.images||{})[0]; return k ? 'Uploaded' : 'Uploaded'; },
    };
    return s[fnName]?.(r) ?? null;
  } catch { return null; }
}

// Wrap every tool so:
// 1. Thrown errors become { error } objects the LLM can read
// 2. Responses are serialized to { result: "JSON string" } so Gemini can parse them
const safe = (fn) => async (args, c) => {
  try {
    console.log(`[tool] ${fn.name} called with:`, JSON.stringify(args).slice(0, 500));
    const result = await fn(args, c);
    // Gemini function calling needs simple objects — stringify complex API responses
    const serialised = typeof result === 'string' ? { result } : { result: JSON.stringify(result) };

    // Emit tool_result over SSE so the frontend activity log can show result counts
    const sessionId = c.session?.id;
    const sseFn = sessionId ? activeSessions.get(sessionId) : null;
    if (sseFn) {
      const summary = buildResultSummary(fn.name, serialised);
      if (summary) sseFn({ type: 'tool_result', name: fn.name, summary });
    }

    return serialised;
  } catch (err) {
    const metaErr = err.response?.data?.error;
    const msg = metaErr
      ? `Meta API error ${metaErr.code || ''}: ${metaErr.message || 'unknown'}${metaErr.error_subcode ? ` (subcode: ${metaErr.error_subcode})` : ''}${metaErr.error_user_title ? ` — ${metaErr.error_user_title}: ${metaErr.error_user_msg || ''}` : ''}`
      : err.message || 'Unknown error';
    console.error(`[tool] ${fn.name} error:`, msg);
    if (metaErr) console.error(`[tool] full meta error:`, JSON.stringify(metaErr));
    return { error: msg };
  }
};

// ─── Campaigns ──────────────────────────────────────────────────────────────
function getCampaigns(_, c) {
  const { token, adAccountId } = ctx(c);
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getCampaigns(token, adAccountId);
}
function createCampaign(args, c) {
  // Auto-handle special_ad_categories — default to NONE if not specified
  const params = { ...args };
  if (!params.special_ad_categories) {
    params.special_ad_categories = JSON.stringify(['NONE']);
  } else if (typeof params.special_ad_categories === 'string') {
    // Agent might pass as comma-separated string instead of array
    try { JSON.parse(params.special_ad_categories); } catch {
      params.special_ad_categories = JSON.stringify(params.special_ad_categories.split(',').map(s => s.trim()));
    }
  } else if (Array.isArray(params.special_ad_categories)) {
    params.special_ad_categories = JSON.stringify(params.special_ad_categories);
  }
  return meta.createCampaign(ctx(c).token, ctx(c).adAccountId, params);
}
function updateCampaign({ campaign_id, ...updates }, c) {
  return meta.updateCampaign(ctx(c).token, campaign_id, updates);
}
function deleteCampaign({ campaign_id }, c) {
  return meta.deleteCampaign(ctx(c).token, campaign_id);
}
function copyCampaign({ campaign_id, ...params }, c) {
  return meta.copyCampaign(ctx(c).token, campaign_id, params);
}
function getCampaignAdSets({ campaign_id }, c) {
  return meta.getCampaignAdSets(ctx(c).token, campaign_id);
}
function getCampaignAds({ campaign_id }, c) {
  return meta.getCampaignAds(ctx(c).token, campaign_id);
}

// ─── Ad Sets ────────────────────────────────────────────────────────────────
function getAdSets(_, c) {
  const { token, adAccountId } = ctx(c);
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getAdSets(token, adAccountId);
}
function getAdSet({ ad_set_id }, c) {
  return meta.getAdSet(ctx(c).token, ad_set_id);
}
function createAdSet(args, c) {
  const params = { ...args };
  // Default bid_strategy if not set (required by Meta API)
  if (!params.bid_strategy && !params.bid_amount) {
    params.bid_strategy = 'LOWEST_COST_WITHOUT_CAP';
  }
  // Default billing_event
  if (!params.billing_event) params.billing_event = 'IMPRESSIONS';
  // Parse targeting if passed as JSON string and ensure targeting_optimization
  if (typeof params.targeting === 'string') {
    try { params.targeting = JSON.parse(params.targeting); } catch {}
  }
  if (params.targeting && typeof params.targeting === 'object') {
    // Default: disable Advantage Audience unless explicitly set
    if (!params.targeting.targeting_optimization) {
      params.targeting.targeting_optimization = 'none';
    }
    params.targeting = JSON.stringify(params.targeting);
  }
  // Auto-construct promoted_object for conversion-based optimization goals
  if (!params.promoted_object) {
    if (params.optimization_goal === 'OFFSITE_CONVERSIONS' && params.pixel_id) {
      params.promoted_object = JSON.stringify({ pixel_id: params.pixel_id, custom_event_type: 'PURCHASE' });
    } else if (params.optimization_goal === 'LEAD_GENERATION' && params.page_id) {
      params.promoted_object = JSON.stringify({ page_id: params.page_id });
    } else if (params.optimization_goal === 'PRODUCT_CATALOG_SALES' && params.product_catalog_id) {
      params.promoted_object = JSON.stringify({ product_catalog_id: params.product_catalog_id });
    }
  } else if (typeof params.promoted_object === 'object') {
    params.promoted_object = JSON.stringify(params.promoted_object);
  }
  // pixel_id and product_catalog_id are not direct Meta API params — remove after use
  delete params.pixel_id;
  delete params.product_catalog_id;
  return meta.createAdSet(ctx(c).token, ctx(c).adAccountId, params);
}
function updateAdSet({ ad_set_id, ...updates }, c) {
  return meta.updateAdSet(ctx(c).token, ad_set_id, updates);
}
function deleteAdSet({ ad_set_id }, c) {
  return meta.deleteAdSet(ctx(c).token, ad_set_id);
}
function copyAdSet({ ad_set_id, ...params }, c) {
  return meta.copyAdSet(ctx(c).token, ad_set_id, params);
}
function getAdSetAds({ ad_set_id }, c) {
  return meta.getAdSetAds(ctx(c).token, ad_set_id);
}
function getAdSetDeliveryEstimate({ ad_set_id }, c) {
  return meta.getAdSetDeliveryEstimate(ctx(c).token, ad_set_id);
}

// ─── Ads ────────────────────────────────────────────────────────────────────
function getAds(_, c) {
  const { token, adAccountId } = ctx(c);
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getAds(token, adAccountId);
}
function getAd({ ad_id }, c) {
  return meta.getAd(ctx(c).token, ad_id);
}
function createAd(args, c) {
  const params = { ...args };
  // Convert creative_id string to the creative object Meta API expects
  if (params.creative_id && !params.creative) {
    params.creative = JSON.stringify({ creative_id: params.creative_id });
    delete params.creative_id;
  }
  if (typeof params.creative === 'object') {
    params.creative = JSON.stringify(params.creative);
  }
  return meta.createAd(ctx(c).token, ctx(c).adAccountId, params);
}
async function createAdsBulk({ ads }, c) {
  const { token, adAccountId } = ctx(c);
  if (!adAccountId) return { error: 'No ad account selected.' };
  if (!Array.isArray(ads) || !ads.length) return { error: 'ads array required.' };
  const results = [];
  for (const ad of ads) {
    try {
      const params = { ...ad };
      if (params.creative_id && !params.creative) {
        params.creative = JSON.stringify({ creative_id: params.creative_id });
        delete params.creative_id;
      }
      if (typeof params.creative === 'object') params.creative = JSON.stringify(params.creative);
      const result = await meta.createAd(token, adAccountId, params);
      results.push({ status: 'success', ad_id: result.id, name: ad.name, creative_id: ad.creative_id });
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Unknown error';
      results.push({ status: 'error', name: ad.name, error: msg });
    }
  }
  const succeeded = results.filter(r => r.status === 'success');
  return { total: ads.length, succeeded: succeeded.length,
           failed: results.length - succeeded.length,
           ad_ids: succeeded.map(r => r.ad_id), results };
}
function updateAd({ ad_id, ...updates }, c) {
  return meta.updateAd(ctx(c).token, ad_id, updates);
}
function deleteAd({ ad_id }, c) {
  return meta.deleteAd(ctx(c).token, ad_id);
}
function copyAd({ ad_id, ...params }, c) {
  return meta.copyAd(ctx(c).token, ad_id, params);
}
function getAdLeads({ ad_id }, c) {
  return meta.getAdLeads(ctx(c).token, ad_id);
}

// ─── Ad Creatives ───────────────────────────────────────────────────────────
function getAdCreatives(_, c) {
  const { token, adAccountId } = ctx(c);
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getAdCreatives(token, adAccountId);
}
function getAdCreative({ creative_id }, c) {
  return meta.getAdCreative(ctx(c).token, creative_id);
}
function createAdCreative(args, c) {
  const params = { ...args };
  // Parse object_story_spec from JSON string if needed
  if (typeof params.object_story_spec === 'string') {
    try { params.object_story_spec = JSON.parse(params.object_story_spec); } catch {}
  }
  if (params.object_story_spec && typeof params.object_story_spec === 'object') {
    params.object_story_spec = JSON.stringify(params.object_story_spec);
  }
  return meta.createAdCreative(ctx(c).token, ctx(c).adAccountId, params);
}
function updateAdCreative({ creative_id, ...updates }, c) {
  return meta.updateAdCreative(ctx(c).token, creative_id, updates);
}
function deleteAdCreative({ creative_id }, c) {
  return meta.deleteAdCreative(ctx(c).token, creative_id);
}

// ─── Creative Visual Analysis (Gemini 3 Flash Vision) ───────────────────────
async function analyzeCreativeVisual({ media_urls, context }, _c) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) return { error: 'GEMINI_API_KEY not configured' };

  let urls;
  try { urls = typeof media_urls === 'string' ? JSON.parse(media_urls) : media_urls; } catch { urls = [media_urls]; }
  if (!Array.isArray(urls) || urls.length === 0) return { error: 'No media URLs provided' };

  // Fetch media as base64 (max 5 to control cost, 20MB video limit for inline)
  const mediaParts = [];
  for (const url of urls.slice(0, 5)) {
    try {
      const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000, maxContentLength: 20 * 1024 * 1024 });
      const mime = resp.headers['content-type'] || 'image/jpeg';
      mediaParts.push({ inlineData: { data: Buffer.from(resp.data).toString('base64'), mimeType: mime } });
    } catch (e) {
      console.warn(`[analyze_visual] Failed to fetch: ${url} — ${e.message}`);
    }
  }
  if (mediaParts.length === 0) return { error: 'Could not fetch any media' };

  const hasVideo = mediaParts.some(p => p.inlineData.mimeType.startsWith('video/'));
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are a senior Meta Ads creative analyst. Analyze these ad creative assets and return a JSON object with:

{
  "assets": [
    {
      "index": 1,
      "type": "image|video",
      "visual_elements": "What's in the asset — product, person, text overlay, background, colors",
      "text_overlay": "Any text visible (exact text if readable)",
      "hook_quality": "strong/medium/weak — would this stop the scroll in a feed?",
      "hook_reason": "Why the hook is strong/weak",
      ${hasVideo ? `"video_hook": "First 3 seconds analysis — does it grab attention immediately?",
      "pacing": "Fast/Medium/Slow — does the pacing match ad format?",
      "audio_cues": "Any text/captions suggesting audio elements?",` : ''}
      "mood": "Professional/Playful/Urgent/Luxurious/etc",
      "cta_visibility": "Is there a visible call-to-action? How prominent?",
      "format_fit": "Best suited for: feed/story/reels/carousel card",
      "issues": ["Any problems: text too small, cluttered, low contrast, etc"],
      "suggestions": ["Specific improvement recommendations"]
    }
  ],
  "overall": {
    "brand_consistency": "Are the assets consistent in style/color/tone?",
    "format_recommendation": "Best ad format for these assets",
    "strongest_asset": "Which asset index is strongest and why"
  }
}

${context ? `Ad context: ${context}` : ''}
Return ONLY valid JSON, no markdown.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ text: prompt }, ...mediaParts],
    });
    const text = response.text;
    try { return JSON.parse(text); } catch { return { analysis: text }; }
  } catch (e) {
    return { error: `Vision analysis failed: ${e.message}` };
  }
}

// ─── Assets ─────────────────────────────────────────────────────────────────
function getAdImages(_, c) {
  const { token, adAccountId } = ctx(c);
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getAdImages(token, adAccountId);
}
function getAdVideos(_, c) {
  const { token, adAccountId } = ctx(c);
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getAdVideos(token, adAccountId);
}
function uploadAdImage({ bytes, name }, c) {
  const { token, adAccountId } = ctx(c);
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.uploadAdImage(token, adAccountId, { bytes, name });
}
function uploadAdVideo({ file_url, source, title, description }, c) {
  const { token, adAccountId } = ctx(c);
  if (!adAccountId) return { error: 'No ad account selected.' };
  const params = {};
  if (file_url) params.file_url = file_url;
  if (source) params.source = Buffer.from(source, 'base64');
  if (title) params.title = title;
  if (description) params.description = description;
  if (!file_url && !source) return { error: 'Either file_url or source (base64) is required.' };
  return meta.uploadAdVideo(token, adAccountId, params);
}
function deleteAdImage({ image_hash }, c) {
  const { token, adAccountId } = ctx(c);
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.deleteAdImage(token, adAccountId, image_hash);
}
function getAdVideoStatus({ video_id }, c) {
  return meta.getAdVideoStatus(ctx(c).token, video_id);
}
function getPageVideos({ page_id }, c) {
  const { token, adAccountId } = ctx(c);
  if (!page_id) return { error: 'page_id is required.' };
  return meta.getPageVideos(token, page_id, adAccountId);
}

// ─── Insights ───────────────────────────────────────────────────────────────
function getAccountInsights({ date_preset = 'last_7d', since, until }, c) {
  const { token, adAccountId } = ctx(c);
  if (!adAccountId) return { error: 'No ad account selected.' };
  const timeRange = (since && until) ? { since, until } : null;
  return meta.getInsights(token, adAccountId, date_preset, timeRange);
}
async function getObjectInsights({ object_id, date_preset = 'last_7d', since, until, breakdowns, fields, level, include_benchmarks }, c) {
  const { token, adAccountId } = ctx(c);

  // If level is set (e.g. "campaign"), auto-use account ID and convert date_preset → since/until.
  // Meta API returns empty data for level=campaign with date_preset, so explicit dates are required.
  if (level) {
    // Default to account ID when level is set. The AI often passes a fake placeholder like "act_1234567890".
    // Always override with the real account ID from session context when level is set.
    if (!object_id || object_id !== adAccountId) {
      console.log(`[getObjectInsights] Overriding object_id=${object_id} → ${adAccountId} (level=${level})`);
      object_id = adAccountId;
    }
    // Auto-convert date_preset to explicit since/until
    if (!since || !until) {
      const presetDays = {
        today: 0, yesterday: 1, last_3d: 3, last_7d: 7, last_14d: 14,
        last_28d: 28, last_30d: 30, last_90d: 90
      };
      const days = presetDays[date_preset] || 7;
      const now = new Date();
      const untilDate = new Date(now); untilDate.setDate(now.getDate() - 1);
      const sinceDate = new Date(now); sinceDate.setDate(now.getDate() - days);
      since = sinceDate.toISOString().split('T')[0];
      until = untilDate.toISOString().split('T')[0];
      console.log(`[getObjectInsights] Auto-converted ${date_preset} → since=${since} until=${until} (level=${level})`);
    }
  }

  const params = {
    fields: fields || 'spend,impressions,clicks,ctr,cpm,cpc,actions,action_values,frequency,reach,cost_per_action_type',
  };
  if (since && until) {
    params.time_range = { since, until };
  } else {
    params.date_preset = date_preset;
  }
  if (breakdowns) params.breakdowns = breakdowns;
  if (level) params.level = level;

  const t0 = Date.now();
  const insights = await meta.getObjectInsights(token, object_id, params);
  console.log(`[getObjectInsights] insights fetch took ${Date.now() - t0}ms (since=${since} until=${until})`);

  // When level=campaign, enrich each campaign row with optimization_goal from its ad sets.
  // This removes the AI from the data classification loop — the tool returns pre-classified data.
  if (level === 'campaign' && Array.isArray(insights) && insights.length > 0) {
    try {
      const t1 = Date.now();
      const adSets = await meta.getAdSets(token, adAccountId);
      console.log(`[getObjectInsights] getAdSets took ${Date.now() - t1}ms`);
      // Build campaign_id → optimization_goal map (use first ad set's goal per campaign)
      const goalMap = {};
      for (const adSet of adSets) {
        if (adSet.campaign_id && adSet.optimization_goal && !goalMap[adSet.campaign_id]) {
          goalMap[adSet.campaign_id] = adSet.optimization_goal;
        }
      }
      // Enrich each insight row
      for (const row of insights) {
        const cid = row.campaign_id || row.id;
        if (cid && goalMap[cid]) {
          row.optimization_goal = goalMap[cid];
        }
      }
      console.log(`[getObjectInsights] Enriched ${insights.length} campaigns with optimization_goal from ${adSets.length} ad sets`);
    } catch (err) {
      console.warn(`[getObjectInsights] Failed to enrich optimization_goal: ${err.message}`);
      // Non-fatal — return insights without enrichment
    }
  }

  // When include_benchmarks=true + level=campaign, compute per-goal aggregated baselines
  if (include_benchmarks && level === 'campaign' && Array.isArray(insights)) {
    const _benchmarks = computeBenchmarks(insights);
    console.log(`[getObjectInsights] Computed benchmarks for ${Object.keys(_benchmarks).length} goal groups`);
    return { data: insights, _benchmarks };
  }

  return insights;
}

// ─── Analyze Performance (single API call → 3 periods, with streaming progress) ──
async function analyzePerformance(_, c) {
  const { token, adAccountId } = ctx(c);
  if (!token) return { error: 'Not logged in.' };
  if (!adAccountId) return { error: 'No ad account selected.' };

  // SSE emitter for progress events — bypasses LLM, goes directly to client
  const sessionId = c.session?.id;
  const sseFn = sessionId ? activeSessions.get(sessionId) : null;
  const emitProgress = (msg) => {
    if (sseFn) sseFn({ type: 'tool_result', name: 'analyze_performance', summary: msg });
  };

  const t0 = Date.now();
  const now = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const since30 = new Date(now); since30.setDate(now.getDate() - 30);

  const FIELDS = 'campaign_id,campaign_name,spend,impressions,clicks,ctr,cpm,reach,frequency,actions,cost_per_action_type,video_thruplay_watched_actions,action_values,purchase_roas';

  emitProgress('Fetching 30-day campaign data...');

  // Single API call with pagination: 30-day daily breakdown at campaign level
  const [dailyRows, adSets] = await Promise.all([
    meta.fetchAll(`/${adAccountId}/insights`, token, {
      level: 'campaign',
      fields: FIELDS,
      time_range: JSON.stringify({ since: fmt(since30), until: fmt(yesterday) }),
      time_increment: 1,
      limit: 500,
    }, { maxPages: 10 }),
    meta.getAdSets(token, adAccountId),
  ]);

  const apiTime = Date.now() - t0;
  emitProgress(`Data received — ${dailyRows?.length || 0} rows in ${(apiTime / 1000).toFixed(1)}s. Crunching numbers...`);
  console.log(`[analyzePerformance] API calls took ${apiTime}ms (${dailyRows?.length || 0} daily rows, ${adSets?.length || 0} ad sets)`);

  // Build goal map from ad sets
  const goalMap = {};
  for (const adSet of adSets) {
    if (adSet.campaign_id && adSet.optimization_goal && !goalMap[adSet.campaign_id]) {
      goalMap[adSet.campaign_id] = adSet.optimization_goal;
    }
  }

  // Split daily rows into 3 periods and aggregate per campaign
  const since7 = new Date(now); since7.setDate(now.getDate() - 7);
  const since14 = new Date(now); since14.setDate(now.getDate() - 14);
  const since8 = new Date(now); since8.setDate(now.getDate() - 8);

  const current7dStart = fmt(since7);
  const prev7dStart = fmt(since14);
  const prev7dEnd = fmt(since8);

  // Accumulator: { [campaign_id]: { current: {...}, previous: {...}, baseline: {...} } }
  const campaigns = {};

  const mergeActions = (existing, incoming) => {
    if (!incoming) return existing || [];
    if (!existing) return [...incoming];
    const map = {};
    for (const a of existing) map[a.action_type] = parseInt(a.value) || 0;
    for (const a of incoming) map[a.action_type] = (map[a.action_type] || 0) + (parseInt(a.value) || 0);
    return Object.entries(map).map(([action_type, value]) => ({ action_type, value: String(value) }));
  };

  const mergeRow = (acc, row) => {
    if (!acc) {
      return {
        campaign_id: row.campaign_id,
        campaign_name: row.campaign_name,
        spend: parseFloat(row.spend) || 0,
        impressions: parseInt(row.impressions) || 0,
        clicks: parseInt(row.clicks) || 0,
        reach: parseInt(row.reach) || 0,
        actions: row.actions ? [...row.actions] : [],
        cost_per_action_type: row.cost_per_action_type ? [...row.cost_per_action_type] : [],
        video_thruplay_watched_actions: row.video_thruplay_watched_actions ? [...row.video_thruplay_watched_actions] : [],
        action_values: row.action_values ? [...row.action_values] : [],
      };
    }
    acc.spend += parseFloat(row.spend) || 0;
    acc.impressions += parseInt(row.impressions) || 0;
    acc.clicks += parseInt(row.clicks) || 0;
    acc.reach += parseInt(row.reach) || 0;
    acc.actions = mergeActions(acc.actions, row.actions);
    acc.video_thruplay_watched_actions = mergeActions(acc.video_thruplay_watched_actions, row.video_thruplay_watched_actions);
    acc.action_values = mergeActions(acc.action_values, row.action_values);
    return acc;
  };

  for (const row of (dailyRows || [])) {
    const cid = row.campaign_id;
    if (!cid) continue;
    const dateStart = row.date_start; // YYYY-MM-DD
    if (!dateStart) continue;

    if (!campaigns[cid]) campaigns[cid] = { current: null, previous: null, baseline: null };

    // Baseline: all 30 days
    campaigns[cid].baseline = mergeRow(campaigns[cid].baseline, row);

    // Current 7d: dateStart >= since7 (i.e., >= today-7)
    if (dateStart >= current7dStart) {
      campaigns[cid].current = mergeRow(campaigns[cid].current, row);
    }
    // Previous 7d: prev7dStart <= dateStart <= prev7dEnd
    if (dateStart >= prev7dStart && dateStart <= prev7dEnd) {
      campaigns[cid].previous = mergeRow(campaigns[cid].previous, row);
    }
  }

  // Compute derived fields and enrich with optimization_goal
  const computeDerived = (agg) => {
    if (!agg) return null;
    agg.spend = +agg.spend.toFixed(2);
    agg.ctr = agg.impressions > 0 ? +((agg.clicks / agg.impressions) * 100).toFixed(2) : 0;
    agg.cpm = agg.impressions > 0 ? +((agg.spend / agg.impressions) * 1000).toFixed(2) : 0;
    agg.frequency = agg.reach > 0 ? +(agg.impressions / agg.reach).toFixed(2) : 0;
    return agg;
  };

  const current7d = [];
  const previous7d = [];
  const baseline30d = [];

  for (const [cid, periods] of Object.entries(campaigns)) {
    const goal = goalMap[cid] || null;
    if (periods.current) {
      const row = computeDerived(periods.current);
      row.optimization_goal = goal;
      current7d.push(row);
    }
    if (periods.previous) {
      const row = computeDerived(periods.previous);
      row.optimization_goal = goal;
      previous7d.push(row);
    }
    if (periods.baseline) {
      const row = computeDerived(periods.baseline);
      row.optimization_goal = goal;
      baseline30d.push(row);
    }
  }

  const _benchmarks = computeBenchmarks(baseline30d);

  // Compute account summary and emit to client immediately
  const totalSpend = current7d.reduce((s, r) => s + r.spend, 0);
  const totalImpressions = current7d.reduce((s, r) => s + r.impressions, 0);
  const totalClicks = current7d.reduce((s, r) => s + r.clicks, 0);
  const accountSummary = {
    total_spend: +totalSpend.toFixed(2),
    total_impressions: totalImpressions,
    total_clicks: totalClicks,
    campaign_count: current7d.length,
    period: `${current7dStart} to ${fmt(yesterday)}`,
  };

  // Emit account summary as SSE text — client shows this BEFORE LLM generates response
  if (sseFn) {
    const currency = totalSpend > 0 ? '$' : '';
    const summaryText = `📊 **${accountSummary.period}** — ${currency}${accountSummary.total_spend.toLocaleString()} spent · ${accountSummary.campaign_count} campaigns · ${accountSummary.total_clicks.toLocaleString()} clicks\n\n`;
    sseFn({ type: 'text', content: summaryText });
    emitProgress(`Analysis ready — ${current7d.length} campaigns, ${Object.keys(_benchmarks).length} goal groups`);
  }

  console.log(`[analyzePerformance] Total time: ${Date.now() - t0}ms — ${current7d.length} campaigns, ${Object.keys(_benchmarks).length} goal groups`);

  return {
    current_7d: current7d,
    previous_7d: previous7d,
    baseline_30d: baseline30d,
    _benchmarks,
    account_summary: accountSummary,
  };
}

// ─── Account Info ───────────────────────────────────────────────────────────
function getAdAccountDetails(_, c) {
  const { token, adAccountId } = ctx(c);
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getAdAccountDetails(token, adAccountId);
}
function getAdAccountActivities(_, c) {
  const { token, adAccountId } = ctx(c);
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getAdAccountActivities(token, adAccountId);
}
function getMinimumBudgets(_, c) {
  const { token, adAccountId } = ctx(c);
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getMinimumBudgets(token, adAccountId);
}

// ─── Audiences ──────────────────────────────────────────────────────────────
function getCustomAudiences(_, c) {
  const { token, adAccountId } = ctx(c);
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getCustomAudiences(token, adAccountId);
}
function getCustomAudience({ audience_id }, c) {
  return meta.getCustomAudience(ctx(c).token, audience_id);
}
function createCustomAudience(args, c) {
  return meta.createCustomAudience(ctx(c).token, ctx(c).adAccountId, args);
}
function updateCustomAudience({ audience_id, ...updates }, c) {
  return meta.updateCustomAudience(ctx(c).token, audience_id, updates);
}
function deleteCustomAudience({ audience_id }, c) {
  return meta.deleteCustomAudience(ctx(c).token, audience_id);
}
function createLookalikeAudience(args, c) {
  return meta.createLookalikeAudience(ctx(c).token, ctx(c).adAccountId, args);
}
function addUsersToAudience({ audience_id, payload }, c) {
  return meta.addUsersToAudience(ctx(c).token, audience_id, payload);
}
function removeUsersFromAudience({ audience_id, payload }, c) {
  return meta.removeUsersFromAudience(ctx(c).token, audience_id, payload);
}
function getSavedAudiences(_, c) {
  const { token, adAccountId } = ctx(c);
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getSavedAudiences(token, adAccountId);
}

// ─── Targeting ──────────────────────────────────────────────────────────────
function targetingSearch({ query }, c) {
  return meta.targetingSearch(ctx(c).token, ctx(c).adAccountId, query);
}
function targetingBrowse(_, c) {
  return meta.targetingBrowse(ctx(c).token, ctx(c).adAccountId);
}
function targetingSuggestions({ targeting_list }, c) {
  return meta.targetingSuggestions(ctx(c).token, ctx(c).adAccountId, targeting_list);
}
function targetingValidation({ targeting_spec }, c) {
  return meta.targetingValidation(ctx(c).token, ctx(c).adAccountId, targeting_spec);
}
function getReachEstimate({ targeting_spec }, c) {
  return meta.getReachEstimate(ctx(c).token, ctx(c).adAccountId, targeting_spec);
}
function getDeliveryEstimate({ targeting_spec, optimization_goal }, c) {
  return meta.getDeliveryEstimate(ctx(c).token, ctx(c).adAccountId, { targeting_spec, optimization_goal });
}

// ─── Ad Rules ───────────────────────────────────────────────────────────────
function getAdRules(_, c) {
  const { token, adAccountId } = ctx(c);
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getAdRules(token, adAccountId);
}
function getAdRule({ rule_id }, c) {
  return meta.getAdRule(ctx(c).token, rule_id);
}
function createAdRule(args, c) {
  return meta.createAdRule(ctx(c).token, ctx(c).adAccountId, args);
}
function updateAdRule({ rule_id, ...updates }, c) {
  return meta.updateAdRule(ctx(c).token, rule_id, updates);
}
function deleteAdRule({ rule_id }, c) {
  return meta.deleteAdRule(ctx(c).token, rule_id);
}
function getAdRuleHistory({ rule_id }, c) {
  return meta.getAdRuleHistory(ctx(c).token, rule_id);
}

// ─── Ad Labels ──────────────────────────────────────────────────────────────
function getAdLabels(_, c) {
  const { token, adAccountId } = ctx(c);
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getAdLabels(token, adAccountId);
}
function createAdLabel({ name }, c) {
  return meta.createAdLabel(ctx(c).token, ctx(c).adAccountId, name);
}
function assignLabel({ object_id, label_id }, c) {
  return meta.assignLabel(ctx(c).token, object_id, label_id);
}

// ─── Pixels & Conversions ───────────────────────────────────────────────────
function getPixels(_, c) {
  const { token, adAccountId } = ctx(c);
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getPixels(token, adAccountId);
}
function getPixelStats({ pixel_id }, c) {
  return meta.getPixelStats(ctx(c).token, pixel_id);
}
function createPixel({ name }, c) {
  const { token, adAccountId } = ctx(c);
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.createPixel(token, adAccountId, name);
}
function updatePixel({ pixel_id, ...updates }, c) {
  return meta.updatePixel(ctx(c).token, pixel_id, updates);
}
function sendConversionEvent({ pixel_id, event_data, event_name, action_source, user_data, custom_data, test_event_code }, c) {
  // Handle both structured event_data and flat params from Gemini
  let payload = event_data;
  if (!payload || (!payload.data && !Array.isArray(payload))) {
    // Gemini sent flat params instead of nested event_data
    payload = {
      data: [{
        event_name: event_name || 'PageView',
        action_source: action_source || 'website',
        event_time: Math.floor(Date.now() / 1000),
        ...(user_data && { user_data }),
        ...(custom_data && { custom_data }),
      }],
      ...(test_event_code && { test_event_code }),
    };
  }
  if (test_event_code && !payload.test_event_code) payload.test_event_code = test_event_code;
  return meta.sendConversionEvent(ctx(c).token, pixel_id, payload);
}
function getCustomConversions(_, c) {
  const { token, adAccountId } = ctx(c);
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getCustomConversions(token, adAccountId);
}
function createCustomConversion(args, c) {
  return meta.createCustomConversion(ctx(c).token, ctx(c).adAccountId, args);
}

// ─── Lead Ads ───────────────────────────────────────────────────────────────
function getLeadForms({ page_id }, c) {
  return meta.getLeadForms(ctx(c).token, page_id);
}
function getLeadFormLeads({ form_id }, c) {
  return meta.getLeadFormLeads(ctx(c).token, form_id);
}

// ─── Previews ───────────────────────────────────────────────────────────────
function getAdPreview({ ad_id, ad_format = 'DESKTOP_FEED_STANDARD' }, c) {
  return meta.getAdPreview(ctx(c).token, ad_id, ad_format);
}

// ─── Business & Pages ───────────────────────────────────────────────────────
function getBusinesses(_, c) {
  return meta.getBusinesses(ctx(c).token);
}
function getBusinessDetails({ business_id }, c) {
  return meta.getBusinessDetails(ctx(c).token, business_id);
}
function getPages(_, c) {
  return meta.getPages(ctx(c).token);
}
function getPagePosts({ page_id }, c) {
  return meta.getPagePosts(ctx(c).token, page_id);
}

// ─── Catalogs ───────────────────────────────────────────────────────────────
function getCatalogs({ business_id }, c) {
  return meta.getCatalogs(ctx(c).token, business_id);
}
function getCatalogProducts({ catalog_id }, c) {
  return meta.getCatalogProducts(ctx(c).token, catalog_id);
}
function getCatalogProductSets({ catalog_id }, c) {
  return meta.getCatalogProductSets(ctx(c).token, catalog_id);
}
function getCatalogDiagnostics({ catalog_id }, c) {
  return meta.getCatalogDiagnostics(ctx(c).token, catalog_id);
}

// ─── Lead Forms ─────────────────────────────────────────────────────────────
function createLeadForm({ page_id, ...args }, c) {
  return meta.createLeadForm(ctx(c).token, page_id, args);
}

// ─── Saved Audiences ────────────────────────────────────────────────────────
function createSavedAudience(args, c) {
  return meta.createSavedAudience(ctx(c).token, ctx(c).adAccountId, args);
}
function deleteSavedAudience({ audience_id }, c) {
  return meta.deleteSavedAudience(ctx(c).token, audience_id);
}

// ─── Instagram ──────────────────────────────────────────────────────────────
function getConnectedInstagramAccounts(_, c) {
  return meta.getConnectedInstagramAccounts(ctx(c).token, ctx(c).adAccountId);
}

function getIgMedia({ ig_account_id, page_id }, c) {
  const { token, adAccountId } = ctx(c);
  return meta.getIgMedia(token, ig_account_id, { pageId: page_id, adAccountId });
}

// ─── Ad Library ─────────────────────────────────────────────────────────────
function searchAdLibrary(args, c) {
  return meta.searchAdLibrary(ctx(c).token, args);
}

// ─── A/B Test Setup ─────────────────────────────────────────────────────────
async function setupAbTest({ campaign_id, test_variable, variant_b_changes }, c) {
  const { token } = ctx(c);
  if (!campaign_id) return { error: 'campaign_id is required' };
  if (!test_variable) return { error: 'test_variable is required (e.g. "audience", "creative", "budget")' };

  // Step 1: Copy the campaign (deep copy includes ad sets and ads)
  const copy = await meta.copyCampaign(token, campaign_id, {
    deep_copy: true,
    rename_strategy: 'DEEP_RENAME',
    status_option: 'PAUSED',
  });

  // Step 2: Get the original campaign name for labeling
  const original = await meta.getCampaign(token, campaign_id);
  const origName = original.name || 'Campaign';

  // Step 3: Rename the copy to indicate it's the B variant
  const newName = `[A/B Test] ${origName} — Variant B (${test_variable})`;
  await meta.updateCampaign(token, copy.copied_campaign_id || copy.id, { name: newName });

  return {
    status: 'success',
    original_campaign_id: campaign_id,
    variant_b_campaign_id: copy.copied_campaign_id || copy.id,
    variant_b_name: newName,
    test_variable,
    next_steps: `Variant B campaign created in PAUSED state. Now modify the ${test_variable} on the variant B campaign/ad sets, then activate both campaigns with equal budgets to start the test.`,
  };
}

// ─── Campaign Templates (in-memory store) ───────────────────────────────────
const templateStore = new Map();

function saveTemplate({ name, description, config }, c) {
  if (!name) return { error: 'name is required' };
  if (!config) return { error: 'config is required — include objective, targeting, budget, optimization_goal, etc.' };
  const id = `tpl_${Date.now()}`;
  const template = { id, name, description: description || '', config: typeof config === 'string' ? JSON.parse(config) : config, created_at: new Date().toISOString() };
  templateStore.set(id, template);
  return { status: 'saved', template };
}

function listTemplates() {
  const templates = Array.from(templateStore.values());
  if (!templates.length) return { templates: [], message: 'No templates saved yet. Use save_campaign_template to save one.' };
  return { templates };
}

function getTemplate({ template_id }) {
  const tpl = templateStore.get(template_id);
  if (!tpl) return { error: `Template ${template_id} not found` };
  return tpl;
}

function deleteTemplate({ template_id }) {
  if (!templateStore.has(template_id)) return { error: `Template ${template_id} not found` };
  templateStore.delete(template_id);
  return { status: 'deleted', template_id };
}

async function applyTemplate({ template_id, campaign_name, daily_budget }, c) {
  const tpl = templateStore.get(template_id);
  if (!tpl) return { error: `Template ${template_id} not found` };
  const { token, adAccountId } = ctx(c);
  if (!adAccountId) return { error: 'No ad account selected.' };

  const cfg = tpl.config;
  // Create campaign from template
  const campaignParams = {
    name: campaign_name || `${tpl.name} — ${new Date().toLocaleDateString()}`,
    objective: cfg.objective || 'OUTCOME_TRAFFIC',
    status: 'PAUSED',
    special_ad_categories: cfg.special_ad_categories || '[]',
  };
  if (daily_budget) campaignParams.daily_budget = String(Math.round(daily_budget * 100));
  else if (cfg.daily_budget) campaignParams.daily_budget = String(cfg.daily_budget);

  const campaign = await meta.createCampaign(token, adAccountId, campaignParams);

  return {
    status: 'success',
    campaign_id: campaign.id,
    template_used: tpl.name,
    config_applied: cfg,
    next_steps: 'Campaign created in PAUSED state from template. Now create ad sets and ads, then activate when ready.',
  };
}

// ─── Pre-Flight Checklist ───────────────────────────────────────────────────
async function preflightCheck({ campaign_id }, c) {
  const { token, adAccountId } = ctx(c);
  if (!adAccountId) return { error: 'No ad account selected.' };
  if (!campaign_id) return { error: 'campaign_id is required.' };

  const checks = [];
  const pass = (name, detail) => checks.push({ name, status: 'pass', detail });
  const fail = (name, detail, fix) => checks.push({ name, status: 'fail', detail, fix });
  const warn = (name, detail, fix) => checks.push({ name, status: 'warn', detail, fix });

  try {
    // 1. Get campaign
    const campaign = await meta.getCampaign(token, campaign_id);
    pass('Campaign exists', `"${campaign.name}" — objective: ${campaign.objective}`);

    // 2. Check special_ad_categories
    const cats = campaign.special_ad_categories || [];
    if (cats.length && !cats.includes('NONE')) {
      pass('Special Ad Categories', cats.join(', '));
    } else {
      pass('Special Ad Categories', 'None declared');
    }

    // 3. Get ad sets scoped to this campaign
    const adSets = await meta.getCampaignAdSets(token, campaign_id);
    const adSetList = adSets?.data || adSets || [];
    if (!adSetList.length) {
      fail('Ad Sets', 'No ad sets found in this campaign', 'Create at least one ad set with targeting and budget');
    } else {
      pass('Ad Sets', `${adSetList.length} ad set(s) found`);

      // Check each ad set
      for (const adSet of adSetList) {
        const targeting = typeof adSet.targeting === 'string' ? JSON.parse(adSet.targeting) : adSet.targeting;
        // Location check
        if (targeting?.geo_locations?.countries?.length || targeting?.geo_locations?.cities?.length || targeting?.geo_locations?.regions?.length) {
          pass(`Ad Set "${adSet.name}" — Location`, 'Targeting location set');
        } else {
          fail(`Ad Set "${adSet.name}" — Location`, 'No location targeting set', 'Add at least one country, city, or region');
        }
        // Budget check
        const budget = adSet.daily_budget || adSet.lifetime_budget;
        if (budget && Number(budget) >= 100) { // 100 cents = $1
          pass(`Ad Set "${adSet.name}" — Budget`, `$${(Number(budget) / 100).toFixed(2)}/day`);
        } else if (budget) {
          warn(`Ad Set "${adSet.name}" — Budget`, `$${(Number(budget) / 100).toFixed(2)}/day — below Meta's recommended minimum`, 'Consider increasing budget to at least $1/day');
        } else {
          fail(`Ad Set "${adSet.name}" — Budget`, 'No budget set', 'Set a daily or lifetime budget');
        }
      }
    }

    // 4. Get ads scoped to this campaign
    const ads = await meta.getCampaignAds(token, campaign_id);
    const adList = ads?.data || ads || [];
    if (!adList.length) {
      fail('Ads', 'No ads found in this campaign', 'Create at least one ad with a creative');
    } else {
      pass('Ads', `${adList.length} ad(s) found`);
    }

    // 5. Pixel check — only for website conversion objectives, NOT messaging/lead-form
    // Pixel is NOT required for CONVERSATIONS (WhatsApp/Messenger/IG DM) or LEAD_GENERATION (lead forms)
    const convObjectives = ['OUTCOME_SALES', 'OUTCOME_LEADS'];
    const pixelOptimizationGoals = ['OFFSITE_CONVERSIONS', 'VALUE'];
    const messagingGoals = ['CONVERSATIONS', 'LEAD_GENERATION'];
    const needsPixel = convObjectives.includes(campaign.objective) &&
      adSetList.some(as => pixelOptimizationGoals.includes(as.optimization_goal)) &&
      !adSetList.every(as => messagingGoals.includes(as.optimization_goal));
    if (needsPixel) {
      try {
        const pixels = await meta.getPixels(token, adAccountId);
        const pixelList = pixels?.data || pixels || [];
        if (pixelList.length) {
          pass('Pixel (required for website conversions)', `${pixelList.length} pixel(s) available`);
        } else {
          fail('Pixel (required for website conversions)', 'No pixel found — required for website conversion campaigns', 'Create a Meta Pixel and install it on your website');
        }
      } catch {
        warn('Pixel check', 'Could not verify pixel status', 'Manually verify your pixel is installed and firing');
      }
    } else if (convObjectives.includes(campaign.objective) && adSetList.some(as => messagingGoals.includes(as.optimization_goal))) {
      pass('Pixel check', 'Not required — messaging/lead-form campaign (WhatsApp, Messenger, or Lead Form)');
    }

    // 6. TOS check
    try {
      const tos = await meta.checkCustomAudienceTos(token, adAccountId);
      if (tos.accepted) {
        pass('Custom Audience TOS', 'Accepted');
      } else {
        warn('Custom Audience TOS', 'Not yet accepted — required if using customer list targeting', 'Accept Custom Audience Terms in your Audience Manager');
      }
    } catch {
      // Non-critical — skip
    }

    const totalFails = checks.filter(c => c.status === 'fail').length;
    const totalWarns = checks.filter(c => c.status === 'warn').length;
    const totalPassed = checks.filter(c => c.status === 'pass').length;

    return {
      campaign_id,
      campaign_name: campaign.name,
      summary: totalFails === 0
        ? (totalWarns === 0 ? 'All checks passed — ready to launch!' : `${totalWarns} warning(s) — review before launching`)
        : `${totalFails} issue(s) must be fixed before launching`,
      ready_to_launch: totalFails === 0,
      checks,
      totals: { pass: totalPassed, fail: totalFails, warn: totalWarns },
    };
  } catch (err) {
    return { error: `Pre-flight check failed: ${err.message}` };
  }
}

// ─── Build FunctionTool instances ───────────────────────────────────────────
const T = (name, description, execute, parameters) => {
  const opts = { name, description, execute: safe(execute) };
  if (parameters) opts.parameters = parameters;
  return new FunctionTool(opts);
};

const obj = (props, required) => ({ type: 'object', properties: props, ...(required ? { required } : {}) });
const str = (desc) => ({ type: 'string', description: desc });
const num = (desc) => ({ type: 'number', description: desc });

const adTools = [
  // ── Campaigns ───────────────────────────────────────────────────────────
  T('get_campaigns', 'List all campaigns with last 7 days performance (spend, impressions, clicks, objective). For analytics, use get_object_insights with level="campaign" instead — it returns optimization_goal pre-joined in each row.', getCampaigns),
  T('create_campaign', 'Create a new campaign. Requires name, objective, status. special_ad_categories defaults to NONE.', createCampaign,
    obj({ name: str('Campaign name'), objective: str('OUTCOME_TRAFFIC, OUTCOME_ENGAGEMENT, OUTCOME_AWARENESS, OUTCOME_LEADS, OUTCOME_SALES, OUTCOME_APP_PROMOTION'), status: str('ACTIVE or PAUSED'), special_ad_categories: str('Comma-separated: NONE, HOUSING, CREDIT, EMPLOYMENT, ISSUES_ELECTIONS_POLITICS. Defaults to NONE if omitted.') }, ['name', 'objective', 'status'])),
  T('update_campaign', 'Update a campaign (name, status, daily_budget, etc). CONFIRM with user before executing.', updateCampaign,
    obj({ campaign_id: str('Campaign ID'), name: str('New name'), status: str('ACTIVE or PAUSED'), daily_budget: num('Budget in cents') }, ['campaign_id'])),
  T('delete_campaign', 'Delete a campaign. CONFIRM with user first.', deleteCampaign,
    obj({ campaign_id: str('Campaign ID') }, ['campaign_id'])),
  T('copy_campaign', 'Duplicate a campaign.', copyCampaign,
    obj({ campaign_id: str('Campaign ID') }, ['campaign_id'])),
  T('get_campaign_ad_sets', 'Get ad sets for a specific campaign.', getCampaignAdSets,
    obj({ campaign_id: str('Campaign ID') }, ['campaign_id'])),
  T('get_campaign_ads', 'Get ads for a specific campaign.', getCampaignAds,
    obj({ campaign_id: str('Campaign ID') }, ['campaign_id'])),

  // ── Ad Sets ─────────────────────────────────────────────────────────────
  T('get_ad_sets', 'List all ad sets with targeting, budget, and optimization details.', getAdSets),
  T('get_ad_set', 'Get detailed info for a single ad set.', getAdSet,
    obj({ ad_set_id: str('Ad set ID') }, ['ad_set_id'])),
  T('create_ad_set', 'Create a new ad set. For OFFSITE_CONVERSIONS pass pixel_id so promoted_object is auto-built. For LEAD_GENERATION pass page_id.', createAdSet,
    obj({ campaign_id: str('Parent campaign ID'), name: str('Ad set name'), targeting: str('Targeting spec as JSON string, e.g. {"geo_locations":{"countries":["US"]},"age_min":18,"age_max":65}'), optimization_goal: str('REACH, LINK_CLICKS, OFFSITE_CONVERSIONS, LEAD_GENERATION, CONVERSATIONS, PRODUCT_CATALOG_SALES'), billing_event: str('IMPRESSIONS or LINK_CLICKS'), daily_budget: num('Budget in cents'), status: str('ACTIVE or PAUSED'), pixel_id: str('Required when optimization_goal is OFFSITE_CONVERSIONS'), page_id: str('Required when optimization_goal is LEAD_GENERATION'), promoted_object: str('Optional — JSON string e.g. {"pixel_id":"...","custom_event_type":"PURCHASE"}. Auto-built if pixel_id is provided.') }, ['campaign_id', 'name', 'optimization_goal', 'billing_event'])),
  T('update_ad_set', 'Update an ad set (status, budget, targeting, etc). CONFIRM first.', updateAdSet,
    obj({ ad_set_id: str('Ad set ID'), status: str('ACTIVE or PAUSED'), daily_budget: num('Budget in cents'), name: str('New name') }, ['ad_set_id'])),
  T('delete_ad_set', 'Delete an ad set. CONFIRM first.', deleteAdSet,
    obj({ ad_set_id: str('Ad set ID') }, ['ad_set_id'])),
  T('copy_ad_set', 'Duplicate an ad set.', copyAdSet,
    obj({ ad_set_id: str('Ad set ID') }, ['ad_set_id'])),
  T('get_ad_set_ads', 'Get ads in a specific ad set.', getAdSetAds,
    obj({ ad_set_id: str('Ad set ID') }, ['ad_set_id'])),
  T('get_ad_set_delivery_estimate', 'Get delivery estimate for an ad set.', getAdSetDeliveryEstimate,
    obj({ ad_set_id: str('Ad set ID') }, ['ad_set_id'])),

  // ── Ads ─────────────────────────────────────────────────────────────────
  T('get_ads', 'List all ads in the account.', getAds),
  T('get_ad', 'Get details of a single ad.', getAd,
    obj({ ad_id: str('Ad ID') }, ['ad_id'])),
  T('create_ad', 'Create a new ad. Requires ad set ID, name, and creative_id.', createAd,
    obj({ adset_id: str('Ad set ID'), name: str('Ad name'), creative_id: str('Creative ID (from create_ad_creative)'), status: str('ACTIVE or PAUSED') }, ['adset_id', 'name', 'creative_id'])),
  T('update_ad', 'Update an ad. CONFIRM first.', updateAd,
    obj({ ad_id: str('Ad ID'), status: str('ACTIVE or PAUSED'), name: str('New name') }, ['ad_id'])),
  T('delete_ad', 'Delete an ad. CONFIRM first.', deleteAd,
    obj({ ad_id: str('Ad ID') }, ['ad_id'])),
  T('copy_ad', 'Duplicate an ad.', copyAd,
    obj({ ad_id: str('Ad ID') }, ['ad_id'])),
  T('create_ads_bulk',
    'Create multiple ads in bulk under the same ad set. Pass ads array: [{ adset_id, name, creative_id, status }]. Returns ad_ids array and per-ad results. Use instead of calling create_ad N times for bulk launches.',
    createAdsBulk,
    obj({ ads: { type: 'array', description: 'Array of ad objects, each: { adset_id, name, creative_id, status }',
      items: obj({ adset_id: str('Ad set ID'), name: str('Ad name'), creative_id: str('Creative ID'), status: str('PAUSED or ACTIVE') }, ['adset_id','name','creative_id']) } }, ['ads'])),
  T('get_ad_leads', 'Get leads from a specific ad.', getAdLeads,
    obj({ ad_id: str('Ad ID') }, ['ad_id'])),

  // ── Ad Creatives ────────────────────────────────────────────────────────
  T('get_ad_creatives', 'List all ad creatives in the account.', getAdCreatives),
  T('get_ad_creative', 'Get details of a single creative.', getAdCreative,
    obj({ creative_id: str('Creative ID') }, ['creative_id'])),
  T('create_ad_creative', 'Create an ad creative with object_story_spec (as JSON string). Always include page_id.', createAdCreative,
    obj({
      name: str('Creative name'),
      object_story_spec: str('JSON string of the creative spec. For image: {"page_id":"ID","link_data":{"image_hash":"HASH","link":"URL","message":"text","name":"headline","call_to_action":{"type":"SHOP_NOW","value":{"link":"URL"}}}}'),
      url_tags: str('Optional UTM parameters'),
    }, ['name'])),
  T('update_ad_creative', 'Update an ad creative.', updateAdCreative,
    obj({ creative_id: str('Creative ID') }, ['creative_id'])),
  T('delete_ad_creative', 'Delete an ad creative.', deleteAdCreative,
    obj({ creative_id: str('Creative ID') }, ['creative_id'])),

  // ── Creative Visual Analysis ────────────────────────────────────────────
  T('analyze_creative_visual', 'Analyze ad creative images AND videos using Gemini 3 Flash vision. Fetches media by URL, analyzes visual elements, hook quality, text overlays, mood, CTA visibility, video pacing, and returns structured recommendations. Supports images (JPG/PNG) and videos (MP4, <20MB). Max 5 assets per call.', analyzeCreativeVisual,
    obj({ media_urls: { type: 'array', items: { type: 'string' }, description: 'Array of image or video URLs to analyze (max 5, videos must be <20MB)' }, context: str('Optional context about the ad — product, target audience, campaign goal') }, ['media_urls'])),

  // ── Assets ──────────────────────────────────────────────────────────────
  T('get_ad_images', 'List all ad images in the account.', getAdImages),
  T('get_ad_videos', 'List all ad videos in the account.', getAdVideos),
  T('upload_ad_image', 'Upload an ad image (base64-encoded bytes).', uploadAdImage,
    obj({ bytes: str('Base64-encoded image data'), name: str('Image name') }, ['bytes'])),
  T('upload_ad_video', 'Upload an ad video from a URL or base64 source. Supports MP4, MOV files.', uploadAdVideo,
    obj({ file_url: str('URL of the video file (YouTube, direct link, or hosted URL)'), source: str('Base64-encoded video data (for direct file uploads)'), title: str('Video title'), description: str('Video description') })),
  T('delete_ad_image', 'Delete an ad image by hash.', deleteAdImage,
    obj({ image_hash: str('Image hash to delete') }, ['image_hash'])),
  T('get_ad_video_status', 'Check the upload/processing status of a video.', getAdVideoStatus,
    obj({ video_id: str('Video ID') }, ['video_id'])),

  // ── Insights ────────────────────────────────────────────────────────────
  T('get_account_insights', 'Get account-level performance for a date range. For exact Ads Manager matching, use since+until params (includes today).', getAccountInsights,
    obj({ date_preset: str('today, yesterday, last_3d, last_7d, last_14d, last_28d, last_30d, last_90d, this_month, last_month'), since: str('Start date YYYY-MM-DD for explicit range (overrides date_preset)'), until: str('End date YYYY-MM-DD for explicit range (use today to include partial data)') })),
  T('get_object_insights', 'Get detailed insights for any campaign/ad set/ad/account. Pass act_xxx as object_id with level=campaign|adset|ad to get all objects at that level in one call. Use since+until for exact date matching. Pass include_benchmarks=true with level=campaign to get per-goal baselines (_benchmarks) for performance evaluation.', getObjectInsights,
    obj({ object_id: str('Campaign ID, ad set ID, ad ID, or act_xxx account ID'), date_preset: str('Date range preset'), since: str('Start date YYYY-MM-DD (overrides date_preset)'), until: str('End date YYYY-MM-DD'), level: str('campaign, adset, or ad — use with act_xxx object_id to get all objects at that level in one API call'), breakdowns: str('age, gender, country, placement, device_platform'), fields: str('Custom fields (default: spend,impressions,clicks,ctr,cpm,cpc,actions,action_values,frequency,reach,cost_per_action_type)'), include_benchmarks: { type: 'boolean', description: 'When true with level=campaign, returns { data: [...], _benchmarks: { [goal]: { avg_cost_per_result, total_spend, total_results, campaign_count } } }' } }, ['object_id'])),
  T('analyze_performance', 'All-in-one ANALYZE tool. Makes a single Meta API call (30-day daily breakdown) and returns 3 pre-split periods: current_7d, previous_7d, baseline_30d, plus _benchmarks. Each campaign row includes optimization_goal pre-joined. Use this for ANALYZE intent instead of calling get_object_insights 3 times.', analyzePerformance),

  // ── Account Info ────────────────────────────────────────────────────────
  T('get_ad_account_details', 'Get account details: balance, spend cap, timezone, currency.', getAdAccountDetails),
  T('get_ad_account_activities', 'Get recent account activity log (who changed what, when).', getAdAccountActivities),
  T('get_minimum_budgets', 'Get minimum budget requirements for the account.', getMinimumBudgets),

  // ── Audiences ───────────────────────────────────────────────────────────
  T('get_custom_audiences', 'List all custom audiences.', getCustomAudiences),
  T('get_custom_audience', 'Get details of a single audience (size, status, etc).', getCustomAudience,
    obj({ audience_id: str('Audience ID') }, ['audience_id'])),
  T('create_custom_audience', 'Create a custom audience. For WEBSITE: pass pixel_id + optional URL rule (system auto-builds event_sources). For ENGAGEMENT (video/IG/page/lead_ad/offline): pass full rule JSON with inclusions/exclusions and event_sources. For CUSTOM (customer list): just name + subtype. See system prompt for full rule examples.', createCustomAudience,
    obj({
      name: str('Audience name'),
      subtype: str('WEBSITE | ENGAGEMENT | CUSTOM — use ENGAGEMENT for video, IG, page, lead_ad, offline, fb_event, shopping, catalogue, AR audiences'),
      description: str('Description'),
      pixel_id: str('REQUIRED for WEBSITE audiences — the pixel ID'),
      rule: str('JSON string. For WEBSITE: {"url":{"i_contains":"/product"}}. For ENGAGEMENT: full rule with inclusions/exclusions containing event_sources, retention_seconds, and filters.'),
      retention_days: num('Days to retain (default 30 for website, 365 for engagement). Max: website=180, lead_ad=90, offline=180, video/IG/page=365'),
      customer_file_source: str('For CUSTOM only: USER_PROVIDED_ONLY (default), PARTNER_PROVIDED_ONLY, BOTH_USER_AND_PARTNER_PROVIDED'),
    }, ['name', 'subtype'])),
  T('update_custom_audience', 'Update an audience.', updateCustomAudience,
    obj({ audience_id: str('Audience ID'), name: str('New name'), description: str('New description') }, ['audience_id'])),
  T('delete_custom_audience', 'Delete an audience. CONFIRM first.', deleteCustomAudience,
    obj({ audience_id: str('Audience ID') }, ['audience_id'])),
  T('create_lookalike_audience', 'Create a lookalike audience from an existing source audience.', createLookalikeAudience,
    obj({ name: str('Audience name'), origin_audience_id: str('Source audience ID'), lookalike_spec: str('JSON string: {"country":"US","ratio":0.01} — ratio from 0.01 to 0.20') }, ['name', 'origin_audience_id', 'lookalike_spec'])),
  T('add_users_to_audience', 'Add users (email, phone, etc.) to a custom audience.', addUsersToAudience,
    obj({ audience_id: str('Audience ID'), payload: { type: 'object', description: '{ schema: ["EMAIL"|"PHONE"|"FN"|"LN"], data: [["hash1"],["hash2"]] }' } }, ['audience_id', 'payload'])),
  T('remove_users_from_audience', 'Remove users from a custom audience.', removeUsersFromAudience,
    obj({ audience_id: str('Audience ID'), payload: { type: 'object', description: '{ schema: ["EMAIL"|"PHONE"], data: [["hash1"]] }' } }, ['audience_id', 'payload'])),
  T('get_saved_audiences', 'List saved audiences.', getSavedAudiences),

  // ── Targeting ───────────────────────────────────────────────────────────
  T('targeting_search', 'Search for interests, behaviors, demographics by keyword.', targetingSearch,
    obj({ query: str('Search keyword') }, ['query'])),
  T('targeting_browse', 'Browse all available targeting categories.', targetingBrowse),
  T('targeting_suggestions', 'Get targeting suggestions based on existing targeting.', targetingSuggestions,
    obj({ targeting_list: str('JSON array of existing targeting interests') }, ['targeting_list'])),
  T('targeting_validation', 'Validate a targeting spec before using it.', targetingValidation,
    obj({ targeting_spec: { type: 'object', description: 'Targeting spec to validate' } }, ['targeting_spec'])),
  T('get_reach_estimate', 'Estimate audience reach for a targeting spec.', getReachEstimate,
    obj({ targeting_spec: { type: 'object', description: 'Targeting spec' } }, ['targeting_spec'])),
  T('get_delivery_estimate', 'Estimate daily delivery (impressions, cost) for targeting + optimization goal.', getDeliveryEstimate,
    obj({ targeting_spec: { type: 'object', description: 'Targeting spec' }, optimization_goal: str('e.g. REACH, LINK_CLICKS') }, ['targeting_spec', 'optimization_goal'])),

  // ── Ad Rules ────────────────────────────────────────────────────────────
  T('get_ad_rules', 'List all automated rules.', getAdRules),
  T('get_ad_rule', 'Get details of a single rule.', getAdRule,
    obj({ rule_id: str('Rule ID') }, ['rule_id'])),
  T('create_ad_rule', 'Create an automated rule (e.g. pause if CPA > $X).', createAdRule,
    obj({ name: str('Rule name'), evaluation_spec: { type: 'object', description: 'Conditions to evaluate' }, execution_spec: { type: 'object', description: 'Actions to take' }, schedule_spec: { type: 'object', description: 'When to evaluate' } }, ['name', 'evaluation_spec', 'execution_spec'])),
  T('update_ad_rule', 'Update an automated rule.', updateAdRule,
    obj({ rule_id: str('Rule ID') }, ['rule_id'])),
  T('delete_ad_rule', 'Delete an automated rule.', deleteAdRule,
    obj({ rule_id: str('Rule ID') }, ['rule_id'])),
  T('get_ad_rule_history', 'View execution history of a rule.', getAdRuleHistory,
    obj({ rule_id: str('Rule ID') }, ['rule_id'])),

  // ── Ad Labels ───────────────────────────────────────────────────────────
  T('get_ad_labels', 'List all ad labels.', getAdLabels),
  T('create_ad_label', 'Create a new ad label.', createAdLabel,
    obj({ name: str('Label name') }, ['name'])),
  T('assign_label', 'Assign a label to a campaign, ad set, or ad.', assignLabel,
    obj({ object_id: str('Campaign/ad set/ad ID'), label_id: str('Label ID') }, ['object_id', 'label_id'])),

  // ── Pixels & Conversions ──────────────────────────────────────────────
  T('get_pixels', 'List all tracking pixels.', getPixels),
  T('get_pixel_stats', 'Get pixel event statistics.', getPixelStats,
    obj({ pixel_id: str('Pixel ID') }, ['pixel_id'])),
  T('create_pixel', 'Create a new tracking pixel. CONFIRM first.', createPixel,
    obj({ name: str('Pixel name') }, ['name'])),
  T('update_pixel', 'Update a pixel (name, etc).', updatePixel,
    obj({ pixel_id: str('Pixel ID'), name: str('New name') }, ['pixel_id'])),
  T('send_conversion_event', 'Send server-side conversion event via Conversions API. Standard events: Purchase, Lead, CompleteRegistration, AddToCart, InitiateCheckout, ViewContent, Search, AddPaymentInfo, AddToWishlist, Subscribe, StartTrial, Contact, PageView. Always include test_event_code for testing. Can use event_data object OR flat params.', sendConversionEvent,
    obj({
      pixel_id: str('Pixel ID'),
      event_name: str('Event name: Purchase, Lead, ViewContent, AddToCart, InitiateCheckout, CompleteRegistration, Search, Subscribe, Contact, PageView'),
      action_source: str('website, app, email, phone_call, chat, system_generated'),
      user_data: { type: 'object', description: '{ em: ["hashed_email"], ph: ["hashed_phone"], client_ip_address, client_user_agent, fbc, fbp }' },
      custom_data: { type: 'object', description: '{ currency: "USD", value: 99.99, content_name, content_ids: ["SKU1"], content_type: "product" }' },
      test_event_code: str('Test event code e.g. "TEST12345" — use this for testing before going live'),
      event_data: { type: 'object', description: 'Alternative: full event payload { data: [{event_name, event_time, action_source, user_data, custom_data}], test_event_code }' },
    }, ['pixel_id'])),
  T('get_custom_conversions', 'List all custom conversions.', getCustomConversions),
  T('create_custom_conversion', 'Create a custom conversion event.', createCustomConversion,
    obj({ name: str('Conversion name'), pixel_id: str('Pixel ID'), custom_event_type: str('Event type'), rule: str('URL rule') }, ['name'])),

  // ── Lead Ads ──────────────────────────────────────────────────────────
  T('get_lead_forms', 'Get lead forms for a Facebook page.', getLeadForms,
    obj({ page_id: str('Page ID') }, ['page_id'])),
  T('get_lead_form_leads', 'Get leads submitted to a form.', getLeadFormLeads,
    obj({ form_id: str('Form ID') }, ['form_id'])),

  // ── Previews ──────────────────────────────────────────────────────────
  T('get_ad_preview', 'Get a rendered preview of an existing ad. Returns an array of objects with {body, ad_format}. After calling, output the result as an ```adpreview block — see system prompt section 4 for format.', getAdPreview,
    obj({ ad_id: str('Ad ID'), ad_format: str('DESKTOP_FEED_STANDARD, MOBILE_FEED_STANDARD, INSTAGRAM_STANDARD, MOBILE_STORY, INSTAGRAM_STORY — call twice (mobile + desktop) for full preview') }, ['ad_id'])),

  // ── Business & Pages ──────────────────────────────────────────────────
  T('get_businesses', 'List all business portfolios the user has access to.', getBusinesses),
  T('get_business_details', 'Get details of a business portfolio.', getBusinessDetails,
    obj({ business_id: str('Business ID') }, ['business_id'])),
  T('get_pages', 'List all Facebook pages the user manages.', getPages),
  T('get_page_posts', 'List recent posts from a Facebook Page. Use this when user wants to promote/boost an existing post as an ad.', getPagePosts,
    obj({ page_id: str('Facebook Page ID') }, ['page_id'])),
  T('get_page_videos', 'List videos from a Facebook Page. Use this when creating video engagement audiences — show the video list so users can pick which videos to target. Returns video IDs, titles, descriptions, and thumbnails.', getPageVideos,
    obj({ page_id: str('Facebook Page ID') }, ['page_id'])),

  // ── Catalogs ──────────────────────────────────────────────────────────
  T('get_catalogs', 'List product catalogs for a business.', getCatalogs,
    obj({ business_id: str('Business ID') }, ['business_id'])),
  T('get_catalog_products', 'List products in a catalog.', getCatalogProducts,
    obj({ catalog_id: str('Catalog ID') }, ['catalog_id'])),
  T('get_catalog_product_sets', 'List product sets (dynamic collections) in a catalog.', getCatalogProductSets,
    obj({ catalog_id: str('Catalog ID') }, ['catalog_id'])),
  T('get_catalog_diagnostics', 'Get catalog health diagnostics — missing fields, errors, warnings.', getCatalogDiagnostics,
    obj({ catalog_id: str('Catalog ID') }, ['catalog_id'])),

  // ── Lead Forms ────────────────────────────────────────────────────────
  T('create_lead_form', 'Create a lead generation form for a Facebook page. CONFIRM with user first.', createLeadForm,
    obj({ page_id: str('Facebook Page ID'), name: str('Form name'), questions: { type: 'array', items: { type: 'object' }, description: 'Array of question objects, e.g. [{"type":"EMAIL"},{"type":"FULL_NAME"},{"type":"PHONE"}]' }, privacy_policy: { type: 'object', description: '{"url":"https://...","link_text":"Privacy Policy"}' }, thank_you_page: { type: 'object', description: '{"title":"Thanks!","body":"We will be in touch."}' } }, ['page_id', 'name'])),

  // ── Saved Audiences ───────────────────────────────────────────────────
  T('create_saved_audience', 'Save a targeting spec as a reusable audience. Use for frequently used targeting combinations.', createSavedAudience,
    obj({ name: str('Audience name'), targeting: { type: 'object', description: 'Targeting spec to save' } }, ['name', 'targeting'])),
  T('delete_saved_audience', 'Delete a saved audience. CONFIRM first.', deleteSavedAudience,
    obj({ audience_id: str('Saved audience ID') }, ['audience_id'])),

  // ── Instagram ─────────────────────────────────────────────────────────
  T('get_connected_instagram_accounts', 'List Instagram accounts connected to the ad account. Needed for IG-specific ad placements and video audiences.', getConnectedInstagramAccounts),
  T('get_ig_media', 'List videos from an Instagram professional account. Use for creating IG video engagement audiences. Returns video IDs, captions, timestamps, and permalinks.', getIgMedia,
    obj({ ig_account_id: str('Instagram account ID'), page_id: str('Facebook Page ID linked to this IG account (for token access)') }, ['ig_account_id'])),

  // ── Ad Library ────────────────────────────────────────────────────────
  T('search_ad_library', 'Search the Meta Ad Library for competitor ads. Returns page_name, headlines, body text, ad_snapshot_url. Format results as ```adlib JSON for rich card rendering.', searchAdLibrary,
    obj({ search_terms: str('Keywords to search'), ad_reached_countries: { type: 'array', items: { type: 'string' }, description: 'Country codes e.g. ["US","GB","HK"]' }, ad_type: str('ALL, POLITICAL_AND_ISSUE_ADS'), limit: { type: 'number', description: 'Max results (default 12)' } }, ['ad_reached_countries'])),

  // ── A/B Testing ─────────────────────────────────────────────────────
  T('setup_ab_test', 'Set up an A/B test by deep-copying a campaign as Variant B. CONFIRM with user before executing. After creation, modify the test variable on Variant B, then activate both.', setupAbTest,
    obj({ campaign_id: str('Campaign ID to duplicate as control (Variant A)'), test_variable: str('What to test: audience, creative, copy, budget, placement, bid_strategy') }, ['campaign_id', 'test_variable'])),

  // ── Campaign Templates ──────────────────────────────────────────────
  T('save_campaign_template', 'Save a campaign configuration as a reusable template. Include objective, targeting, budget, optimization_goal, and any other settings.', saveTemplate,
    obj({ name: str('Template name'), description: str('What this template is for'), config: { type: 'object', description: 'Campaign config: { objective, targeting, daily_budget, optimization_goal, billing_event, bid_strategy, special_ad_categories, ... }' } }, ['name', 'config'])),
  T('list_campaign_templates', 'List all saved campaign templates.', listTemplates),
  T('get_campaign_template', 'Get details of a saved template.', getTemplate,
    obj({ template_id: str('Template ID') }, ['template_id'])),
  T('delete_campaign_template', 'Delete a saved template.', deleteTemplate,
    obj({ template_id: str('Template ID') }, ['template_id'])),
  T('apply_campaign_template', 'Create a new campaign from a saved template. CONFIRM with user first.', applyTemplate,
    obj({ template_id: str('Template ID to use'), campaign_name: str('Name for the new campaign (optional)'), daily_budget: num('Daily budget in dollars (optional, overrides template)') }, ['template_id'])),

  // ── Pre-Flight Checklist ──────────────────────────────────────────────
  T('preflight_check', 'Run a pre-launch checklist on a campaign to validate it is ready to go live. Checks: campaign objective, ad sets with targeting & budget, ads with creatives, pixel (for conversion campaigns), and TOS acceptance. Call this BEFORE activating any campaign. Present results as a checklist with pass/fail/warn status.', preflightCheck,
    obj({ campaign_id: str('Campaign ID to validate') }, ['campaign_id'])),

  // ── Skill Loader ──────────────────────────────────────────────────────
  T('load_skill', 'Load a skill\'s detailed workflow guidance. Call this BEFORE executing complex flows like campaign creation, audience creation, report generation, etc. The skill contains step-by-step instructions, API formats, and best practices. Available pipeline skills: campaign-setup, creative-assembly, ad-launcher. Available operational skills: campaign-manager, targeting-audiences, creative-manager, insights-reporting, ad-manager, adset-manager, tracking-conversions, automation-rules, business-manager, lead-ads, product-catalogs.',
    async (_args, context) => {
      const { skill_name } = _args;
      // Search across all layer subfolders including pipeline
      for (const layer of ['pipeline', 'analytical', 'strategic', 'operational']) {
        try {
          const filepath = path.join(SKILLS_DIR, layer, `${skill_name}.md`);
          const content = await fs.readFile(filepath, 'utf-8');
          const body = content.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
          return { skill: skill_name, layer, content: body };
        } catch { /* try next layer */ }
      }
      // Fallback: flat file in SKILLS_DIR
      try {
        const filepath = path.join(SKILLS_DIR, `${skill_name}.md`);
        const content = await fs.readFile(filepath, 'utf-8');
        const body = content.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
        return { skill: skill_name, content: body };
      } catch {
        return { error: `Skill "${skill_name}" not found. Pipeline skills: campaign-setup, creative-assembly, ad-launcher. Operational skills: campaign-manager, targeting-audiences, creative-manager, insights-reporting, ad-manager, adset-manager, tracking-conversions, automation-rules, business-manager, lead-ads, product-catalogs` };
      }
    },
    obj({ skill_name: str('Skill ID to load, e.g. "campaign-setup", "creative-assembly", "ad-launcher", "campaign-manager", "insights-reporting"') }, ['skill_name'])),

  // ── Workflow Context ────────────────────────────────────────────────────
  T('get_workflow_context',
    'Retrieve the full workflow context saved by previous steps. Call this FIRST when you start a new step to get all IDs, settings, and selections from prior steps.',
    async (_args, context) => {
      const workflow = context.state.get('workflow', {});
      return { workflow };
    }),

  T('update_workflow_context',
    'Save important data (IDs, names, metrics, selections) so it auto-flows to the next step. Pass clear_task: true to wipe all task-scoped fields while preserving global fields (page_id, pixel_id, currency, user_level).',
    async (args, context) => {
      // Accept both { data: {...} } and flat { campaign_id: ..., ... } patterns
      const data = (args.data && typeof args.data === 'object') ? args.data : args;
      const current = context.state.get('workflow', {});

      // Task-scoped fields — cleared when clear_task: true
      const TASK_FIELDS = new Set([
        'campaign_id', 'campaign_name', 'campaign_objective', 'optimization_goal',
        'conversion_destination', 'adset_id', 'creative_id', 'creative_ids',
        'creative_names', 'ad_format', 'ad_id', 'ad_ids',
        'ss1_substep', 'ss3_substep', 'ss4_substep', 'creation_stage',
        'bulk_mode', 'boost_mode', 'object_story_id', 'uploaded_assets',
        'link', 'cta', 'country', 'daily_budget_cents', 'whatsapp_phone_number',
        'form_id', 'auto_confirmed', 'activation_status', 'creative_swap_mode',
        'pending_video_ids', 'ss3_format', 'intent',
      ]);

      let base = current;
      if (data.clear_task === true) {
        // Keep only global fields (page_id, pixel_id, currency, user_level, primary_goal, etc.)
        base = Object.fromEntries(
          Object.entries(current).filter(([k]) => !TASK_FIELDS.has(k))
        );
      }

      const { clear_task, ...rest } = data;
      // Deep-merge baton field so sub-agents can write to their own namespace
      // without overwriting other sub-agents' data
      let updated;
      if (rest.baton && typeof rest.baton === 'object' && base.baton && typeof base.baton === 'object') {
        const mergedBaton = { ...base.baton, ...rest.baton };
        const { baton: _, ...restWithoutBaton } = rest;
        updated = { ...base, ...restWithoutBaton, baton: mergedBaton };
      } else {
        updated = { ...base, ...rest };
      }
      context.state.set('workflow', updated);
      return { saved: Object.keys(rest), cleared_task: clear_task === true, workflow: updated };
    },
    obj({ data: { type: 'object', description: 'Key-value pairs to save. Pass clear_task: true to wipe task-scoped fields (campaign_id, adset_id, creative_id, substeps, etc.) while keeping global fields. Examples: {"campaign_id":"123","page_id":"456"} or {"clear_task":true,"activation_status":"ACTIVE"}' } }, ['data'])),
];

// ── Tool subsets for 5 sub-agents ────────────────────────────────────────────
const _toolByName = Object.fromEntries(adTools.map(t => [t.name, t]));
const pick = (...names) => names.map(n => _toolByName[n]).filter(Boolean);

// Analyst — diagnosis, benchmarks, action_queue (read-only + baton write)
const analystTools = pick(
  'analyze_performance',
  'get_workflow_context', 'update_workflow_context', 'load_skill'
);

// Audience Strategist — targeting gaps, audience recommendations
const audienceTools = pick(
  'get_custom_audiences', 'get_saved_audiences', 'get_custom_audience',
  'get_reach_estimate', 'get_delivery_estimate',
  'targeting_search', 'targeting_browse', 'targeting_suggestions', 'targeting_validation',
  'create_custom_audience', 'create_lookalike_audience', 'create_saved_audience',
  'get_pages', 'get_pixels', 'get_page_videos', 'get_ig_media', 'get_connected_instagram_accounts',
  'get_workflow_context', 'update_workflow_context', 'load_skill'
);

// Creative Strategist — hook analysis, copy pivots, format recommendations (read-only audit)
const creativeTools = pick(
  'get_ad_creatives', 'get_ad_creative', 'get_ad_preview',
  'get_ad_images', 'get_ad_videos', 'get_ads',
  'get_pages', 'get_page_posts', 'get_page_videos',
  'analyze_creative_visual',
  'get_workflow_context', 'update_workflow_context', 'load_skill'
);

// Executor — all creation + management (merges old SS1+SS3+SS4)
const executorTools = pick(
  // Account info
  'get_ad_account_details', 'get_minimum_budgets',
  // Pages & connections
  'get_pages', 'get_connected_instagram_accounts',
  // Tracking
  'get_pixels', 'get_lead_forms', 'get_catalogs',
  // Campaign CRUD
  'create_campaign', 'update_campaign', 'delete_campaign', 'copy_campaign',
  'get_campaigns', 'get_campaign_ad_sets', 'get_campaign_ads',
  // Ad Set CRUD
  'create_ad_set', 'update_ad_set', 'delete_ad_set', 'copy_ad_set',
  'get_ad_sets', 'get_ad_set', 'get_ad_set_ads',
  // Audience (for ad set targeting)
  'get_custom_audiences', 'get_saved_audiences',
  'targeting_search', 'targeting_browse', 'targeting_suggestions', 'targeting_validation',
  'get_reach_estimate', 'get_delivery_estimate',
  // Creative assembly
  'get_ad_images', 'get_ad_videos', 'get_page_posts', 'get_page_videos', 'get_ig_media',
  'upload_ad_image', 'upload_ad_video', 'get_ad_video_status',
  'create_ad_creative', 'update_ad_creative',
  'analyze_creative_visual',
  // Ad CRUD
  'create_ad', 'create_ads_bulk', 'update_ad', 'delete_ad', 'copy_ad',
  'get_ads', 'get_ad', 'get_ad_leads',
  // Lead forms
  'get_lead_form_leads',
  // Launch & preview
  'preflight_check', 'get_ad_preview',
  // Shared
  'get_workflow_context', 'update_workflow_context', 'load_skill'
);

// Technical Guard — pixel, CAPI, conversion tracking health
const technicalTools = pick(
  // Pixel lifecycle
  'get_pixels', 'get_pixel_stats', 'create_pixel', 'update_pixel',
  // CAPI events
  'send_conversion_event',
  // Custom conversions
  'get_custom_conversions', 'create_custom_conversion',
  // Context
  'get_ad_account_details', 'get_pages',
  // Shared
  'get_workflow_context', 'update_workflow_context', 'load_skill'
);

// Root orchestrator — ONLY exploration + routing. NO insights/analysis tools.
const rootTools = pick(
  // Explore intent (list objects)
  'get_campaigns', 'get_ad_sets', 'get_ads',
  'get_campaign_ad_sets', 'get_campaign_ads', 'get_ad_set_ads',
  'get_ad_account_details',
  // Shared
  'get_workflow_context', 'update_workflow_context', 'load_skill'
);

export { adTools, rootTools, analystTools, audienceTools, creativeTools, executorTools, technicalTools };
