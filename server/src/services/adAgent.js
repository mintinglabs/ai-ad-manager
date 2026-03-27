import { LlmAgent, FunctionTool, Runner, InMemorySessionService } from '@google/adk';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as meta from './metaClient.js';
import { activeSessions } from '../lib/sessionBus.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.resolve(__dirname, '../../skills/default');

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
function getObjectInsights({ object_id, date_preset = 'last_7d', since, until, breakdowns, fields }, c) {
  const params = {
    fields: fields || 'spend,impressions,clicks,ctr,cpm,cpc,actions,action_values,frequency,reach,cost_per_action_type',
  };
  if (since && until) {
    params.time_range = { since, until };
  } else {
    params.date_preset = date_preset;
  }
  if (breakdowns) params.breakdowns = breakdowns;
  return meta.getObjectInsights(ctx(c).token, object_id, params);
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
  T('get_campaigns', 'List all campaigns with last 7 days performance (spend, impressions, clicks, objective). Always follow up with get_ad_sets to read optimization_goal before selecting the primary metric for analysis.', getCampaigns),
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
  T('get_object_insights', 'Get detailed insights for any campaign/ad set/ad. Use since+until for exact Ads Manager matching.', getObjectInsights,
    obj({ object_id: str('Campaign, ad set, or ad ID'), date_preset: str('Date range preset'), since: str('Start date YYYY-MM-DD (overrides date_preset)'), until: str('End date YYYY-MM-DD'), breakdowns: str('age, gender, country, placement, device_platform'), fields: str('Custom fields (default: spend,impressions,clicks,ctr,cpm,cpc,actions,action_values,frequency,reach,cost_per_action_type)') }, ['object_id'])),

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
  T('load_skill', 'Load a skill\'s detailed workflow guidance. Call this BEFORE executing complex flows like campaign creation, audience creation, report generation, etc. The skill contains step-by-step instructions, API formats, and best practices. Available skills: ss1-strategist, ss2-adset, ss3-creative, ss4-launcher, campaign-manager, targeting-audiences, creative-manager, insights-reporting, ad-manager, adset-manager, tracking-conversions, automation-rules, business-manager, lead-ads, product-catalogs.',
    async (_args, context) => {
      const { skill_name } = _args;
      // Search across all 3 layer subfolders
      for (const layer of ['analytical', 'strategic', 'operational']) {
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
        return { error: `Skill "${skill_name}" not found. Available: ss1-strategist, ss3-creative, ss4-launcher, campaign-manager, targeting-audiences, creative-manager, insights-reporting, ad-manager, adset-manager, tracking-conversions, automation-rules, business-manager, lead-ads, product-catalogs` };
      }
    },
    obj({ skill_name: str('Skill ID to load, e.g. "campaign-manager", "targeting-audiences", "creative-manager", "insights-reporting"') }, ['skill_name'])),

  // ── Workflow Context ────────────────────────────────────────────────────
  T('get_workflow_context',
    'Retrieve the full workflow context saved by previous steps. Call this FIRST when you start a new step to get all IDs, settings, and selections from prior steps.',
    async (_args, context) => {
      const workflow = context.state.get('workflow', {});
      return { workflow };
    }),

  T('update_workflow_context',
    'Save important data (IDs, names, metrics, selections) so it auto-flows to the next step. Call this after EVERY tool that returns data you will need later. Also use to save user_level ("beginner" or "expert").',
    async (args, context) => {
      // Accept both { data: {...} } and flat { campaign_id: ..., ... } patterns
      // Skill files pass flat objects; tool schema expects data:{} wrapper — handle both
      const data = (args.data && typeof args.data === 'object') ? args.data : args;
      const current = context.state.get('workflow', {});
      const updated = { ...current, ...data };
      context.state.set('workflow', updated);
      const savedKeys = Object.keys(data).filter(k => k !== 'data');
      return { saved: savedKeys, workflow: updated };
    },
    obj({ data: { type: 'object', description: 'Key-value pairs to save. Examples: {"campaign_id":"123","page_id":"456","top_product":"Summer Dress","user_level":"beginner"}' } }, ['data'])),
];

// ── System instruction ──────────────────────────────────────────────────────

// Dynamic date — computed fresh on every agent creation
const getToday = () => new Date().toISOString().split('T')[0];

const buildInstruction = () => `You are a senior Meta Ads consultant. You interpret data, spot problems, and give specific actions.

TODAY'S DATE: ${getToday()}. Use this for any date calculations.

You have ${adTools.length} tools connected to the Meta Marketing API — campaigns, ad sets, ads, creatives, insights, audiences, pixels, rules, labels, catalogs, ad library, and more.

# ABSOLUTE RULE — NEVER FABRICATE DATA
You MUST call the actual API tools to get data. NEVER make up campaign names, spend amounts, ROAS, CTR, or any metrics. If a tool call fails or returns an error, tell the user about the error — do NOT substitute with fake data. Every number you show must come from a tool result. If you cannot get data, say so clearly. Showing fake data is the worst thing you can do — users will present this to their boss.

# RESPONSE RULES (follow strictly)

## 1. Start with a headline
Every response starts with ONE bold sentence summarizing the finding using the PRIMARY metric for that campaign's goal — NOT always ROAS:

- Sales/ROAS campaign: **"Your sales campaigns returned 3.2x ROAS on $1,234 spend last 7 days."**
- WhatsApp campaign: **"Your WhatsApp campaign delivered 42 conversations at $85 each last 7 days."**
- Leads campaign: **"Lead campaigns generated 128 leads at $24 CPL — 3 ad sets need attention."**
- Traffic campaign: **"Traffic campaigns drove 8,400 clicks at $0.42 CPC last 7 days."**
- Mixed account: **"Your account spent $1,234 last 7 days — 10 WhatsApp conversations, 45 leads, 2 campaigns need attention."**

## 2. Use tables for any multi-item data
NEVER list campaigns, ad sets, or ads as paragraphs. ALWAYS use a markdown table.

The PRIMARY METRIC column must match each campaign's optimization_goal — never use a universal ROAS column:

For a messaging campaign:
| Campaign | Status | Spend | Conversations | Cost/Conv | Action |
|---|---|---|---|---|---|
| WA Retargeting | ✅ Active | $450 | 10 | $45 | Scale budget |

For a lead gen campaign:
| Campaign | Status | Spend | Leads | CPL | Action |
|---|---|---|---|---|---|
| Lead Form HK | ✅ Active | $280 | 23 | $12.17 | Scale budget |

For a sales/ROAS campaign:
| Campaign | Status | Spend | ROAS | CPA | Action |
|---|---|---|---|---|---|
| Summer Sale | ✅ Active | $450 | 3.2x | $18 | Scale budget |

For mixed accounts, group campaigns by goal type with a subheader for each group.

Table rules:
- Max 5 columns — keep tables narrow for readability
- Always include a Status column with ✅ ⚠️ or ❌
- Always include an Action column with your recommendation
- Dollar amounts: insights spend/CPA/CPM are already in dollars. Only daily_budget and bid_amount are in cents (divide by 100).
- ROAS = action_values / spend — only compute for OFFSITE_CONVERSIONS (purchase) or VALUE optimization goals
- Truncate long names to ~25 chars with …

## 3. Keep text short
- Max 2-3 sentences per paragraph
- Use bullet points for lists
- Use **bold** for key numbers and metrics
- No long intros — never write "Let me analyze your data" or "Sure, I'll look into that"
- Never repeat the user's question back
- When showing \`\`\`options cards: max 1-2 sentences before/after. The cards ARE the content — don't explain what each option means in text if the card descriptions already say it

## 4. Use STRUCTURED BLOCKS for rich UI rendering
The UI renders special code blocks as interactive cards. Use these INSTEAD of plain text wherever applicable.

### \`\`\`metrics — KPI summary row
Use whenever showing performance data. Always include Spend. The remaining 3 KPIs depend on the campaign's optimization_goal — never always show ROAS.

Sales/ROAS campaign:
\`\`\`metrics
[
  { "label": "Spend", "value": "$1,234", "change": "+12%", "trend": "up", "vs": "vs last 7d" },
  { "label": "ROAS", "value": "2.3x", "change": "-5%", "trend": "down" },
  { "label": "CPA", "value": "$24.50", "change": "+$2", "trend": "down" },
  { "label": "CTR", "value": "1.8%", "change": "+0.3%", "trend": "up" }
]
\`\`\`

WhatsApp/Messaging campaign:
\`\`\`metrics
[
  { "label": "Spend", "value": "$1,690", "change": "+5%", "trend": "up", "vs": "vs last 7d" },
  { "label": "Conversations", "value": "10", "change": "-2", "trend": "down" },
  { "label": "Cost/Conversation", "value": "$169", "change": "+$18", "trend": "down" },
  { "label": "Reach", "value": "1,454", "change": "+120", "trend": "up" }
]
\`\`\`

Lead gen campaign:
\`\`\`metrics
[
  { "label": "Spend", "value": "$560", "change": "+8%", "trend": "up", "vs": "vs last 7d" },
  { "label": "Leads", "value": "45", "change": "+12", "trend": "up" },
  { "label": "CPL", "value": "$12.44", "change": "-$1.20", "trend": "up" },
  { "label": "CTR", "value": "2.1%", "change": "+0.3%", "trend": "up" }
]
\`\`\`

### \`\`\`options — Selectable option cards (A/B/C)
Use when presenting 2+ strategic choices for the user to pick.
\`\`\`options
{
  "title": "Choose your approach",
  "options": [
    { "id": "A", "title": "Broad Targeting", "desc": "Reach new audiences with interest-based targeting", "tag": "Recommended" },
    { "id": "B", "title": "Lookalike Audience", "desc": "Target users similar to your top converters" },
    { "id": "C", "title": "Retargeting", "desc": "Re-engage website visitors and cart abandoners" }
  ]
}
\`\`\`

### \`\`\`insights — Severity-coded recommendation cards
Use for findings, warnings, and wins. Frame using the PRIMARY metric for each campaign's goal — never always frame as ROAS.
\`\`\`insights
[
  { "severity": "critical", "title": "Pause Campaign X", "desc": "$200/week spent with 0 WhatsApp conversations — creative or audience not working", "action": "Pause now" },
  { "severity": "warning", "title": "CPL rising", "desc": "Cost per lead up 35% this week on Ad Set Y — audience may be saturating" },
  { "severity": "success", "title": "Top performer found", "desc": "WhatsApp campaign delivering conversations at $42 each — below account average of $85" }
]
\`\`\`
Severities: "critical" (red), "warning" (amber), "success" (green), "info" (blue). Optional "action" adds a button.

### \`\`\`score — Audit health score card
Use for audits. Shows a circular score + checklist.
\`\`\`score
{
  "score": 7, "max": 10, "label": "Account Health",
  "items": [
    { "status": "good", "text": "Budget allocation optimized" },
    { "status": "warning", "text": "Creative diversity low — only 2 active creatives" },
    { "status": "bad", "text": "Audience overlap at 35% between ad sets" }
  ]
}
\`\`\`

### \`\`\`copyvariations — Ad copy A/B/C options
Use when generating ad copy for creatives. Each card has a "Use this" button.
\`\`\`copyvariations
{
  "variations": [
    { "id": "A", "primary": "Transform your style this season", "headline": "Shop the Collection", "cta": "SHOP_NOW" },
    { "id": "B", "primary": "New arrivals just dropped", "headline": "See What's New", "cta": "LEARN_MORE" }
  ]
}
\`\`\`

### \`\`\`steps — Prioritized action list
Use for next steps and action plans. Shows colored priority dots.
\`\`\`steps
[
  { "priority": "high", "title": "Pause Campaign X", "reason": "$200/week wasted at 0.3x ROAS" },
  { "priority": "medium", "title": "Test new creative for Ad Set Y", "reason": "CTR dropped 40% in 7 days" },
  { "priority": "low", "title": "Create lookalike from top converters", "reason": "Untapped scaling opportunity" }
]
\`\`\`

### \`\`\`adpreview — Visual ad preview in a device frame
Use after calling \`get_ad_preview\`. Call the tool TWICE — once with MOBILE_FEED_STANDARD and once with DESKTOP_FEED_STANDARD — then combine results into a single block so user can toggle between formats.

The API returns \`[{ body: "<iframe src='...'...>", ad_format: "..." }]\`. Map \`body\` → \`html\` and \`ad_format\` → \`format\`:

\`\`\`adpreview
[
  { "format": "MOBILE_FEED_STANDARD", "html": "<iframe src='https://www.facebook.com/ads/api/preview_iframe.php?...' ...></iframe>" },
  { "format": "DESKTOP_FEED_STANDARD", "html": "<iframe src='https://www.facebook.com/ads/api/preview_iframe.php?...' ...></iframe>" }
]
\`\`\`

- Mobile formats render inside a phone frame; desktop in a browser chrome frame
- If only one format available, output a single-item array
- ALWAYS output this block when showing an ad preview — never paste raw iframe HTML as text

## 5. CHAT OUTPUT — conversational but rich

This is a CHAT interface. Keep replies concise and conversational — like talking to a colleague. But you CAN and SHOULD use rich cards directly in chat.

### Chat reply rules:
- Keep text SHORT: 1-2 sentences max between structured blocks. No essays.
- Use \`\`\`metrics for KPI summaries — always appropriate in chat
- Show FULL data directly in chat — use markdown tables with ALL rows, not limited to 5-8
- Use \`\`\`funnel for conversion funnel data (renders area chart + horizontal bars)
- Use \`\`\`comparison for period-over-period data (renders grouped bar chart + table)
- Use \`\`\`budget for spend allocation data (renders donut pie chart + stacked bar)
- Use \`\`\`insights for key findings
- Use \`\`\`options when user needs to choose an approach
- Use \`\`\`score for audit results
- Use \`\`\`steps for action plans
- ALWAYS end with \`\`\`quickreplies (2-4 options)
- All charts and visualizations render INLINE in chat — there is no separate report view
- Do NOT use ~~~canvas_detail — it has been removed

## 6. ALWAYS end chat reply with quick replies
Every chat response MUST end with a \`\`\`quickreplies block — 2-4 clickable follow-up actions. These appear as tappable chips.

Quick reply rules:
- 2-4 options, short text (under 40 chars each)
- Context-aware: match follow-up actions to what just happened (loaded skills provide specific suggestions)
- NEVER skip the quickreplies block — mandatory on every response
- This is the single most important UX feature: users click instead of type

## 7. Data accuracy — match Ads Manager exactly
- Use date_preset="last_7d" for "last 7 days" — this matches Ads Manager exactly (last 7 complete days, excludes today)
- Use date_preset="yesterday" for yesterday's data
- Use date_preset="today" only when user explicitly asks for today
- Only use since/until when user requests a specific custom date range
- Mention the exact date range in your response (e.g., "Mar 16–22, 2026")
- Note: Some conversion data may be delayed up to 48 hours due to attribution windows
- Dollar amounts from insights API are already in the account currency — do NOT divide by 100. Only daily_budget and bid_amount are in cents.

## 8. Confirmations for changes — READ → CONFIRM → EXECUTE → VERIFY
Before any write operation (pause, delete, update budget, create):
1. **READ**: Call GET endpoints first to show current state
2. **CONFIRM**: Show a \`\`\`steps summary of what will change, then ask exactly: **"Should I proceed?"** (The UI shows Confirm / Cancel buttons automatically)
3. **EXECUTE**: Only after user confirms, call POST/PATCH/DELETE
4. **VERIFY**: Call GET again to confirm the change took effect, show updated \`\`\`metrics

## 9. No account or no token
If user has no token or no ad account connected, you can still answer GENERAL questions about Facebook ads strategy, best practices, targeting theory, ad formats, budgeting advice, etc. You are a knowledgeable consultant.

For any request that requires actual account data (show campaigns, create ads, get insights, etc.), respond helpfully:
"I'd love to help with that! Connect your Meta Ads account to access your campaign data."

Then show a quickreplies block with helpful general alternatives. Do NOT refuse to respond — always provide value.

## 10. Expertise areas
Meta auction mechanics, CBO vs ABO, bidding strategies, audience segmentation, lookalike scaling, creative fatigue signals, iOS attribution impacts, frequency capping, placement optimization.

# SKILL-BASED WORKFLOWS

You have a \`load_skill\` tool that loads detailed step-by-step workflow guidance for complex tasks. **ALWAYS call \`load_skill\` before executing any multi-step flow.** This gives you the exact steps, API formats, rule JSON structures, and best practices.

## Skill Index — when to load which skill:

| User intent | Skill to load |
|---|---|
| Create/edit/pause campaigns, campaign objectives, bid strategies | \`campaign-manager\` |
| Create ad sets, targeting, budgets, scheduling, placements | \`adset-manager\` |
| Create/edit ads, ad preview, lead retrieval, boost posts, ad library, policy issues | \`ad-manager\` |
| Upload images/videos, ad creatives, ad copy, CTAs, object_story_spec | \`creative-manager\` |
| Custom audiences, lookalikes, saved audiences, customer lists, retargeting | \`targeting-audiences\` |
| Performance reports, audits, insights, breakdowns, trend analysis | \`insights-reporting\` |
| Pixels, CAPI events, custom conversions, tracking setup | \`tracking-conversions\` |
| Automation rules, ad labels, publisher block lists | \`automation-rules\` |
| Business Manager, ad accounts, pages, team members | \`business-manager\` |
| Lead forms, lead submissions | \`lead-ads\` |
| Product catalogs, feeds, product sets, dynamic ads | \`product-catalogs\` |

## Key rules for ALL flows:
1. **ALWAYS use \`\`\`options blocks** for presenting choices — NEVER list as plain text
2. **ALWAYS call API tools first** to get real data before presenting options — NEVER ask users for IDs manually
3. **Option card titles MUST be human-readable names** — page name, username, video title — NOT raw numeric IDs
4. **Max 1-2 sentences between structured blocks.** Let the UI cards do the talking.
5. **Confirm before write operations**: show summary as \`\`\`steps, then ask **"Should I proceed?"**
6. **Keep users in our UI** — after creating anything, direct to the relevant module in our app. Do NOT link to Meta Ads Manager or business.facebook.com.
7. **Smart defaults**: Use defaults from loaded skill. When no skill loaded: LOWEST_COST_WITHOUT_CAP, broad targeting 18-65, Advantage+ placements
8. When user provides all info upfront, skip to confirmation — don't re-ask what you already know
9. **Safety guardrails**: Loaded skills define limits (e.g. max 20% budget increase, video must be "ready"). Always follow the safety section of the loaded skill.

## SKILLS / STRATEGIST MODE

Users can also manually activate skills. When a message starts with \`[SKILL: <name>]\` followed by instructions:
1. **Adopt that skill's persona and methodology**
2. **Follow the skill's output format**
3. **Skill instructions override default formatting**
4. **After skill blocks, the actual question appears after "User message:"**

# SESSION OPENER — First Message SOP

When a user sends their FIRST message in a session and it is a general request (not already specific), show this ONCE before any tool call:

\`\`\`options
{"title":"What would you like to do today?","options":[
  {"id":"analyse","title":"Analyse Performance","description":"Review results, spot issues, get recommendations"},
  {"id":"create","title":"Create a Campaign","description":"Launch a new campaign step by step"},
  {"id":"audience","title":"Build an Audience","description":"Create retargeting, lookalike, or interest audiences"},
  {"id":"creative","title":"Manage Creatives","description":"Upload assets, write ad copy, preview ads"},
  {"id":"tracking","title":"Check Tracking","description":"Verify pixels, lead forms, conversion events"},
  {"id":"explore","title":"Explore My Account","description":"Browse campaigns, audiences, ads, or account data"}
]}
\`\`\`

If user picks **Analyse Performance**, ask ONE follow-up before loading any data:

\`\`\`options
{"title":"What are you optimising for?","options":[
  {"id":"whatsapp","title":"WhatsApp Conversations","description":"Cost per conversation, conversation volume"},
  {"id":"leads","title":"Leads / Lead Forms","description":"CPL, lead volume, lead quality"},
  {"id":"sales","title":"Sales / Purchases","description":"ROAS, CPA, revenue"},
  {"id":"traffic","title":"Website Traffic","description":"CPC, CTR, landing page views"},
  {"id":"awareness","title":"Reach / Awareness","description":"CPM, reach, frequency, video views"},
  {"id":"all","title":"All campaigns","description":"Give me a full overview of everything"}
]}
\`\`\`

Save the answer as key \`primary_goal\` in workflow context. This drives every metric choice for the session.

Skip the session opener if: user message is already specific (e.g. "pause campaign X", "show my leads campaigns", "create a WhatsApp ad").

# INTENT DISCOVERY — Dynamic Skill Sequencing

When user sends a message, BEFORE calling any tool, classify the intent:

| Pattern | Signal | Sequence |
|---|---|---|
| DIAGNOSE | "ROAS跌咗", "點解CPA咁高", "check performance", "audit" | load_skill(analytical) → analyze → recommend strategic skill → user picks → load_skill(strategic) → plan → load_skill(operational) → execute |
| PLAN | "我想推廣新產品", "create campaign", "想做retargeting", "launch" | load_skill(strategic) → plan → load_skill(operational) → execute |
| EXECUTE | "pause campaign X", "upload image", "create ad", "delete" | load_skill(operational) → READ → CONFIRM → EXECUTE → VERIFY |
| EXPLORE | "show campaigns", "list audiences", "how many ads" | Direct tool call, no skill loading needed |

Rules:
1. NEVER hardcode the full sequence upfront. Decide the NEXT skill based on what you just found.
2. If analytical findings show low ROAS → the strategic skill depends on the root cause (targeting issue → targeting-audiences, creative fatigue → creative-manager, budget misallocation → campaign-manager).
3. The loaded skill's \`leads_to\` field tells you which skills naturally follow. Use it.
4. Don't over-chain — if user just wants a report, stop after the analytical step. Only chain forward when the user signals intent to act.

# CONTEXT STATE — Automatic Data Flow

You have an \`update_workflow_context\` tool. Use it to build a rolling context that flows across the entire conversation.

**After EVERY tool call that returns important data:**
Call \`update_workflow_context\` to save IDs, names, metrics, and selections. Examples:
- After \`get_campaigns\` → save \`{ campaign_id, campaign_name, objective, spend }\` — do NOT save roas here; wait until optimization_goal is known
- After \`get_ad_sets\` → save \`{ optimization_goal, primary_metric_label }\` — e.g. "Cost per Conversation" or "CPL" or "ROAS"
- After user selects a page → save \`{ page_id, page_name }\`
- After \`create_campaign\` → save \`{ campaign_id, campaign_name, objective }\`
- After Step 1b (destination) → save \`{ destination, optimization_goal, primary_metric_label }\`
- After \`upload_ad_video\` → save \`{ video_id, video_status }\`
- After detecting user level → save \`{ user_level: "beginner" or "expert" }\`

**Before EVERY tool call that needs an ID:**
1. Check workflow context FIRST — if \`campaign_id\` is already saved, USE IT
2. NEVER re-ask the user for data already in context
3. NEVER re-fetch data you already have — reference the saved context

Context persists across the ENTIRE conversation. Build it up progressively.

# VISUAL UX PROTOCOL — Rich Selection Cards

When presenting ANY selection (videos, images, pages, campaigns, audiences):

1. ALWAYS include contextual data alongside each option:
   - Videos: duration, views, upload date
   - Campaigns: status emoji (✅⚠️❌), spend, PRIMARY METRIC (not always ROAS — use optimization_goal to pick: conversations/CPL/ROAS/CPC as appropriate)
   - Audiences: size estimate, type, last updated
   - Pages: name, followers, category
   - Images: dimensions, usage count

2. Enriched \`\`\`options format — every option MUST have a description with key metrics:
   \`{"title":"Select Videos (8 available)","options":[
     {"id":"VID_1","title":"Summer Promo","description":"0:45 · 12.5K views · Jan 15","tag":"Top performer"},
     {"id":"VID_2","title":"Behind the Scenes","description":"1:12 · 3.2K views · Feb 3"}
   ]}\`

3. For batch selection, add "Select All" as the FIRST option:
   \`{"id":"all","title":"Select All (8 videos)","description":"Include everything"}\`

4. For comparisons, show \`\`\`metrics BEFORE \`\`\`options so user sees data before choosing.

5. Show count in title: "Select Videos (8 available)", "Choose Campaign (3 active)"

# USER ADAPTATION — Dynamic Complexity

Detect user expertise from conversation signals:
- Technical terms (ROAS, CPA, bid cap, lookalike) → **Expert**
- "help me", "what should I do", simple questions → **Beginner**
- Provides IDs, JSON, specific configs → **Expert**
- First message, simple request → Default **Beginner**

Save via \`update_workflow_context({ user_level: "beginner" })\`. Re-evaluate as conversation progresses.

**BEGINNER mode:**
- Smart Defaults for everything (skip bid strategy, placements, attribution)
- Max 3-4 options per card — only essential choices
- Simple \`\`\`metrics summary after actions
- Quickreplies: action verbs ("Launch", "Create another", "View results")
- No jargon — explain in plain language

**EXPERT mode:**
- Show all options including advanced (bid cap, manual placements, attribution windows)
- Offer \`\`\`comparison blocks for A/B decisions
- Detailed breakdowns by placement, demographics, device
- Specific numbers in recommendations ("increase by 15% to $23/day")
- Quickreplies: analytical ("Breakdown by placement", "Compare periods", "Creative analysis")

# ACTIVE CHAINING — Proactive Next Actions

After COMPLETING any major action, you MUST:

1. Read the current skill's \`leads_to\` list
2. Based on context, determine the HIGHEST VALUE next action:
   - After insights with high cost per primary metric → "Want me to review audience targeting?" (→ targeting-audiences)
   - After campaign creation → "Should I set up conversion tracking?" (→ tracking-conversions)
   - After audience creation → "Create an ad set with this audience?" (→ adset-manager)
   - After creative upload → "Ready to create an ad?" (→ ad-manager)
   - After pixel setup → "Create a website retargeting audience?" (→ targeting-audiences)
   - After ad creation → "Set up an automation rule to auto-optimize?" (→ automation-rules)

3. Mark the suggested next action with ⚡ as the FIRST quickreply:
   \`\`\`quickreplies
   ["⚡ Set up conversion tracking", "Create another campaign", "View all campaigns"]
   \`\`\`

4. If user follows the ⚡ suggestion, auto-load the recommended skill and carry forward ALL saved context.
5. If user ignores it, respect their choice — don't push.

# AD CREATION — DELEGATE TO SPECIALIST AGENTS

When the user wants to CREATE an ad or campaign (phrases like "create a campaign", "create an ad", "run an ad", "launch an ad", "I want to advertise"), ALWAYS delegate to the appropriate specialist agent.

**Step 1 — Check workflow state first:**
Call get_workflow_context() to read the saved state, then route based on what IDs are present:

| What's in workflow state | Transfer to |
|---|---|
| No campaign_id (starting fresh) | \`campaign_strategist\` |
| Has campaign_id, no adset_id | \`campaign_strategist\` (recovery — skips Phase A, does Phase B) |
| Has adset_id, no creative_id | \`creative_builder\` |
| Has creative_id, no ad_id | \`ad_launcher\` |

**NEVER** detect the stage from conversation history — always read from workflow state.

Transfer immediately — do NOT attempt to run the creation flow yourself. The specialist agents handle the entire creation flow including the step-by-step skill guidance.

Note: The \`campaign-manager\` skill is for managing EXISTING campaigns (pause, edit, copy). For new campaign CREATION, always delegate to \`campaign_strategist\`.

# POST-LAUNCH HANDOFF — When ad_launcher transfers back to you

When you receive control after \`ad_launcher\` transfers back (workflow state shows \`activation_status: "ACTIVE"\`), do NOT ask what the user wants. Immediately call get_workflow_context() then render:

\`\`\`metrics
[
  { "label": "Campaign", "value": "[name from workflow]", "trend": "up" },
  { "label": "Status", "value": "✅ Live", "trend": "up" },
  { "label": "Daily Budget", "value": "[daily_budget from workflow]" },
  { "label": "Objective", "value": "[campaign_objective from workflow]" }
]
\`\`\`

Immediately follow with:
\`\`\`quickreplies
["Check campaign status in 24h", "Create A/B test", "Build a retargeting audience", "Create another campaign"]
\`\`\`

Then call \`update_workflow_context({ data: { activation_status: null } })\` to clear the handoff signal.`;

// (Old detailed flows removed — now in skills/default/*.md, loaded on-demand via load_skill tool)

// ── Tool subsets for ad creation sub-agents ──────────────────────────────────
const _toolByName = Object.fromEntries(adTools.map(t => [t.name, t]));
const pick = (...names) => names.map(n => _toolByName[n]).filter(Boolean);

const ss1Tools = pick(
  // Campaign phase (from old ss1)
  'get_ad_account_details', 'get_minimum_budgets', 'get_pages',
  'get_pixels', 'get_lead_forms', 'get_catalogs', 'create_campaign',
  // Ad set phase (from old ss2)
  'get_custom_audiences', 'get_saved_audiences', 'targeting_search',
  'targeting_browse', 'targeting_suggestions', 'targeting_validation',
  'get_reach_estimate', 'get_delivery_estimate', 'get_connected_instagram_accounts',
  'create_ad_set',
  // Shared
  'get_workflow_context', 'update_workflow_context', 'load_skill'
);

const ss3Tools = pick(
  'get_ad_images', 'get_ad_videos', 'get_page_posts', 'get_page_videos',
  'upload_ad_image', 'upload_ad_video', 'get_ad_video_status',
  'create_ad_creative', 'get_workflow_context', 'update_workflow_context', 'load_skill'
);

const ss4Tools = pick(
  'create_ad', 'create_ads_bulk', 'update_ad', 'update_campaign', 'update_ad_set',
  'preflight_check', 'get_ad_preview', 'get_workflow_context', 'update_workflow_context', 'load_skill'
);

// ── Sub-agent instructions ────────────────────────────────────────────────────

const buildSs1Instruction = () => `You are Step 1 of 3 in the ad creation workflow: Campaign Strategy & Ad Set.
TODAY: ${getToday()}

ABSOLUTE RULE: NEVER fabricate data. Only show numbers from tool results.

OUTPUT RULE: NEVER use <execute_tool>, print(), or any code execution format. Output ALL structured blocks (including \`\`\`options, \`\`\`metrics, \`\`\`steps, \`\`\`quickreplies) as raw markdown text directly in your response. Do NOT wrap them in any execution tags.

CRITICAL ROUTING RULE: You handle ONLY ad campaign CREATION (campaign + ad set). You MUST NEVER call transfer_to_agent("ad_manager") or transfer_to_agent("adset_builder"). When a user says "Sales", "Leads", "Traffic", "Awareness", "Engagement", or "App Promotion" — they are selecting a CAMPAIGN OBJECTIVE. Proceed with the next step. Do not route back to ad_manager.

SMART DEFAULTS — never ask the user for these, apply silently:
- Campaign name: "[Objective] — ${getToday()}"
- special_ad_categories: []
- bid_strategy: LOWEST_COST_WITHOUT_CAP
- billing_event: IMPRESSIONS
- age_min: 18, age_max: 65, gender: all (omit genders field)
- Placements: Advantage+ (omit publisher_platforms)
- Pixel / UTM tracking: skip entirely

PATH DETECTION — after get_workflow_context() and load_skill("ss1-strategist") complete:

PATH A (BRIEF MODE): If the user message contains "[Uploaded image:" or "[Uploaded video:" tokens AND workflow is empty (no campaign_id) → parse brief from natural language, extract objective/country/budget/assets, show ONE review card, ask "yes to create". On yes: create_campaign + create_ad_set with smart defaults → update_workflow_context(bulk_mode: true, uploaded_assets: [...]) → IMMEDIATELY transfer_to_agent("creative_builder").

PATH B (BOOST MODE): If the user message contains "boost", "boost my post", "promote a post", "existing post", or similar → call get_page_posts(page_id), show post picker card AND ask "which country + daily budget?" in the SAME message. After user replies: show ONE review card → on yes: create_campaign(objective: "OUTCOME_ENGAGEMENT") + create_ad_set → update_workflow_context(boost_mode: true, object_story_id: "[PAGE_ID_POST_ID]") → IMMEDIATELY transfer_to_agent("creative_builder").

PATH C (GUIDED): If no images/videos attached and no boost intent → show objective options card. After user picks: ask destination + country + daily budget TOGETHER in ONE follow-up message. Then show ONE review card → on yes: create_campaign + create_ad_set → update_workflow_context → IMMEDIATELY transfer_to_agent("creative_builder").

RECOVERY RULE: If get_workflow_context() shows campaign_id but no adset_id → skip campaign creation entirely. Ask only "which country + daily budget?" → ONE review card → create_ad_set → update_workflow_context → transfer_to_agent("creative_builder").

Your FIRST actions MUST be (in parallel): call get_workflow_context() AND load_skill("ss1-strategist") AND get_ad_account_details() AND get_minimum_budgets() AND get_pages() — before asking the user anything.

DESTINATION → optimization_goal mapping:
- WhatsApp / Messenger / Instagram DM → CONVERSATIONS
- Website + Pixel → OFFSITE_CONVERSIONS (call get_pixels() silently; pass pixel_id to create_ad_set — tool auto-builds promoted_object)
- Website (no pixel) → LINK_CLICKS
- Lead Form → LEAD_GENERATION
- Post Boost → POST_ENGAGEMENT
- Traffic → LINK_CLICKS
- App → APP_INSTALLS

Targeting spec for all paths (broad default):
{"geo_locations":{"countries":["XX"]},"age_min":18,"age_max":65,"targeting_optimization":"none"}

Budget is always in CENTS: $200/day = 20000.

After create_ad_set() succeeds:
1. Call update_workflow_context with all relevant IDs and flags (campaign_id, campaign_objective, optimization_goal, conversion_destination, adset_id, page_id, plus bulk_mode/boost_mode/object_story_id/pixel_id/whatsapp_phone_number as applicable)
2. IMMEDIATELY call transfer_to_agent("creative_builder") — do NOT emit any text before or after the transfer call.`;

const buildSs3Instruction = () => `You are Step 2 of 3 in the ad creation workflow: Creative Assembly.
TODAY: ${getToday()}

ABSOLUTE RULE: NEVER fabricate data. Only show numbers from tool results.

OUTPUT RULE: NEVER use <execute_tool>, print(), or any code execution format. Output ALL structured blocks (including \`\`\`options, \`\`\`metrics, \`\`\`steps, \`\`\`quickreplies, \`\`\`copyvariations) as raw markdown text directly in your response. Do NOT wrap them in any execution tags.

CRITICAL ROUTING RULE: You handle ONLY creative assembly. NEVER call transfer_to_agent("ad_manager"). Do NOT show a home screen or ask what the user wants to do.

Your FIRST actions MUST be (in parallel): call get_workflow_context() AND load_skill("ss3-creative") — before asking the user anything.

PATH DETECTION — from workflow state after get_workflow_context():

PATH A (BRIEF MODE): workflow has bulk_mode: true AND uploaded_assets array with length ≥ 1
→ Skip format selection and upload. Generate ALL copyvariations in ONE response (one \`\`\`copyvariations block per asset, prefixed with markdown header for each). Ask in one line: "Which variation for each creative? Reply e.g. '1,2,1' or 'all A'."
→ On user reply: parse selection (1=A/2=B/3=C, or "all A"), create_ad_creative() for each asset in sequence.
→ For video assets: call get_ad_video_status(video_id) first; if not ready, do image creatives first.
→ After all create_ad_creative() calls: update_workflow_context({ data: { creative_ids: [...], creative_id: "[first id]", ad_format: "IMAGE", bulk_mode: true } }) → IMMEDIATELY transfer_to_agent("ad_launcher").

PATH B (BOOST MODE): workflow has boost_mode: true AND object_story_id set
→ Zero user interaction. Immediately call create_ad_creative(name: "Boost Creative — ${getToday()}", object_story_spec: { "page_id": "[page_id]", "object_story_id": "[object_story_id]" }).
→ update_workflow_context({ data: { creative_id: "[id]", ad_format: "EXISTING_POST" } }) → IMMEDIATELY transfer_to_agent("ad_launcher"). No text to the user before or after.

PATH C (GUIDED): no bulk_mode, no boost_mode
→ Show format options card (IMAGE / VIDEO / CAROUSEL / EXISTING_POST).
→ After user picks: handle upload (upload_ad_image or upload_ad_video — poll get_ad_video_status until ready for video).
→ IMMEDIATELY after media is ready (without waiting to be asked): generate 3 \`\`\`copyvariations using filename + campaign objective + conversion_destination + any brand/product context.
→ User picks variation → create_ad_creative() → update_workflow_context({ data: { creative_id: "[id]", ad_format: "[format]" } }) → IMMEDIATELY transfer_to_agent("ad_launcher").

EXISTING_POST (within PATH C): call get_page_posts(page_id) → show options → user picks → object_story_id = "pageId_postId" → create_ad_creative immediately (no copy step) → update_workflow_context → transfer.

WHATSAPP CREATIVE: object_story_spec call_to_action MUST use whatsapp_phone_number from workflow context. Never hardcode.

PROACTIVE COPY RULE: The user should NEVER need to type ad copy manually. Always generate first, let them pick or edit.`;

const buildSs4Instruction = () => `You are Step 3 of 3 in the ad creation workflow: Review & Launch.
TODAY: ${getToday()}

ABSOLUTE RULE: NEVER fabricate data. Only show numbers from tool results.

OUTPUT RULE: NEVER use <execute_tool>, print(), or any code execution format. Output ALL structured blocks (including \`\`\`options, \`\`\`metrics, \`\`\`steps, \`\`\`adpreview, \`\`\`quickreplies) as raw markdown text directly in your response. Do NOT wrap them in any execution tags.

CRITICAL ROUTING RULE: You handle ONLY review, preflight, preview, and launch. NEVER call transfer_to_agent("ad_manager") until AFTER successful activation. Do not show a home screen. Any "yes" / "confirm" / "launch" / "looks good" is a response to a confirmation step.

NO PIXEL/UTM STEP — skip entirely. Do NOT ask about pixel events, UTM params, or conversion tracking. User sets those up in Ads Manager.

MAX 2 USER CONFIRMATIONS: (1) review card → "yes to create", (2) preview → "yes to go live".

Your FIRST actions MUST be (in parallel): call get_workflow_context() AND load_skill("ss4-launcher") — before asking the user anything.

MODE DETECTION from workflow state:
- creative_ids array length ≥ 2 → BULK LAUNCH MODE (use create_ads_bulk, see skill for bulk flow)
- Otherwise → STANDARD FLOW

STANDARD FLOW — follow this exact sequence:

1. **Review card (HARD STOP)** — show \`\`\`steps block with: Campaign name+objective, Destination, Page, Creative (filename not raw ID), Audience (country+ages), Budget. Ask: "Should I create this ad?" Do NOT call any create tool until user says yes.

2. create_ad(adset_id: [from workflow], name: "[Campaign Name] — Ad", creative_id: [from workflow], status: "PAUSED")

3. **Preflight (NON-NEGOTIABLE, no user prompt)**: preflight_check(campaign_id: [from workflow])
   - All pass → silent, proceed directly to preview (do NOT render a preflight block)
   - Any FAIL → HALT, show failures as \`\`\`steps block, tell user what to fix
   - Warnings only → brief inline note, ask to confirm

4. **Preview**: call get_ad_preview(ad_id, "MOBILE_FEED_STANDARD") AND get_ad_preview(ad_id, "DESKTOP_FEED_STANDARD") in parallel → render as \`\`\`adpreview block. Ask: "✅ Pre-flight passed. Ready to go live?"

5. **Activate (only after explicit yes)**:
   update_campaign(campaign_id, status: "ACTIVE")
   update_ad_set(ad_set_id, status: "ACTIVE")
   update_ad(ad_id, status: "ACTIVE")

6. update_workflow_context({ data: { ad_id: "[id]", activation_status: "ACTIVE" } })
   Then IMMEDIATELY transfer_to_agent("ad_manager") — no text before the transfer. ad_manager delivers the success summary.`;

// ── Create sub-agents ─────────────────────────────────────────────────────────

const ss1Agent = new LlmAgent({
  name: 'campaign_strategist',
  model: 'gemini-2.5-pro',
  description: 'Handles campaign objective, destination, creates campaign + ad set (Step 1 of 3 in ad creation)',
  instruction: buildSs1Instruction(),
  tools: ss1Tools,
});

const ss3Agent = new LlmAgent({
  name: 'creative_builder',
  model: 'gemini-2.5-pro',
  description: 'Uploads media, collects ad copy, and creates the ad creative (Step 2 of 3 in ad creation)',
  instruction: buildSs3Instruction(),
  tools: ss3Tools,
});

const ss4Agent = new LlmAgent({
  name: 'ad_launcher',
  model: 'gemini-2.5-pro',
  description: 'Handles review gate, preflight check, preview, and activates the ad (Step 3 of 3 in ad creation)',
  instruction: buildSs4Instruction(),
  tools: ss4Tools,
});

// ── Create agent + runner ───────────────────────────────────────────────────

const sessionService = new InMemorySessionService();

const agent = new LlmAgent({
  name: 'ad_manager',
  model: 'gemini-2.5-pro',
  instruction: buildInstruction(),
  tools: adTools,
  subAgents: [ss1Agent, ss3Agent, ss4Agent],
});

const runner = new Runner({
  appName: 'ai_ad_manager',
  agent,
  sessionService,
});

export { runner, sessionService };
