import axios from 'axios';
import { buildAudiencePayload } from '../utils/customerDataNormalizer.js';

const BASE_URL = process.env.META_BASE_URL || 'https://graph.facebook.com';
const API_VERSION = process.env.FB_API_VERSION || 'v19.0';

export const metaApi = axios.create({ baseURL: `${BASE_URL}/${API_VERSION}`, timeout: 60000 });

// ─── Pagination Helper ───────────────────────────────────────────────

async function fetchAll(url, token, params = {}, { maxPages = Infinity } = {}) {
  let results = [];
  let nextUrl = url;
  let isFullUrl = false;
  let page = 0;
  while (nextUrl && page < maxPages) {
    const { data } = isFullUrl
      ? await axios.get(nextUrl)
      : await metaApi.get(nextUrl, { params: { access_token: token, ...params } });
    if (data.data) results = results.concat(data.data);
    nextUrl = data.paging?.next || null;
    isFullUrl = true;
    page++;
  }
  return results;
}

// ─── Auth ────────────────────────────────────────────────────────────

export const exchangeToken = async (shortLivedToken) => {
  const { data } = await metaApi.get('/oauth/access_token', {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: process.env.FB_APP_ID,
      client_secret: process.env.FB_APP_SECRET,
      fb_exchange_token: shortLivedToken
    }
  });
  return data;
};

// ─── Ad Accounts ─────────────────────────────────────────────────────

export const getAdAccounts = async (token) => {
  const { data } = await metaApi.get('/me/adaccounts', {
    params: {
      access_token: token,
      fields: 'id,name,account_id,account_status,currency,business',
      limit: 100
    }
  });
  return data.data;
};

export const getAdAccountDetails = async (token, adAccountId) => {
  const { data } = await metaApi.get(`/${adAccountId}`, {
    params: {
      access_token: token,
      fields: 'id,name,account_id,account_status,currency,business,balance,amount_spent,spend_cap,timezone_name,timezone_offset_hours_utc,min_daily_budget,is_prepay_account,funding_source_details'
    }
  });
  return data;
};

export const getAdAccountActivities = async (token, adAccountId, params = {}) => {
  const { data } = await metaApi.get(`/${adAccountId}/activities`, {
    params: {
      access_token: token,
      fields: 'event_type,event_time,extra_data,actor_name',
      limit: 50,
      ...params
    }
  });
  return data.data;
};

export const getAdAccountUsers = async (token, adAccountId) => {
  const { data } = await metaApi.get(`/${adAccountId}/users`, {
    params: {
      access_token: token,
      fields: 'id,name,role,permissions'
    }
  });
  return data.data;
};

export const getMinimumBudgets = async (token, adAccountId) => {
  const { data } = await metaApi.get(`/${adAccountId}/minimum_budgets`, {
    params: { access_token: token }
  });
  return data.data;
};

// ─── Campaigns ───────────────────────────────────────────────────────

// Lightweight campaign list (id + name only) for pickers/dropdowns
export const getCampaignsList = async (token, adAccountId) => {
  const { data } = await metaApi.get(`/${adAccountId}/campaigns`, {
    params: {
      access_token: token,
      limit: 500,
      fields: 'id,name,status',
    },
  });
  return data.data;
};

export const getCampaigns = async (token, adAccountId) => {
  // Get campaigns with inline insights — limit to 100 to avoid timeout
  // For full account totals, agent should use get_account_insights separately
  const { data } = await metaApi.get(`/${adAccountId}/campaigns`, {
    params: {
      access_token: token,
      limit: 100,
      fields: 'id,name,status,objective,daily_budget,lifetime_budget,insights.date_preset(last_7d){spend,impressions,clicks,ctr,cpm,actions,action_values,cost_per_action_type}',
    },
  });
  return data.data;
};

export const getCampaign = async (token, campaignId) => {
  const { data } = await metaApi.get(`/${campaignId}`, {
    params: { access_token: token, fields: 'id,name,status,objective,daily_budget,lifetime_budget' }
  });
  return data;
};

export const createCampaign = async (token, adAccountId, params) => {
  // Default is_adset_budget_sharing_enabled to false if not specified (required by Meta API)
  const campaignParams = {
    is_adset_budget_sharing_enabled: false,
    ...params,
  };
  const { data } = await metaApi.post(`/${adAccountId}/campaigns`, null, {
    params: { access_token: token, ...campaignParams }
  });
  return data;
};

export const updateCampaign = async (token, campaignId, updates) => {
  const { data } = await metaApi.post(`/${campaignId}`, null, {
    params: { access_token: token, ...updates }
  });
  return data;
};

export const deleteCampaign = async (token, campaignId) => {
  const { data } = await metaApi.delete(`/${campaignId}`, {
    params: { access_token: token }
  });
  return data;
};

export const copyCampaign = async (token, campaignId, params = {}) => {
  const { data } = await metaApi.post(`/${campaignId}/copies`, null, {
    params: { access_token: token, ...params }
  });
  return data;
};

export const getCampaignAdSets = async (token, campaignId) => {
  return fetchAll(`/${campaignId}/adsets`, token, {
    limit: 200,
    fields: 'id,name,status,daily_budget,targeting,optimization_goal,billing_event,bid_amount',
  });
};

export const getCampaignAds = async (token, campaignId) => {
  return fetchAll(`/${campaignId}/ads`, token, {
    limit: 200,
    fields: 'id,name,status,effective_status,creative',
  });
};

// ─── Ad Sets ─────────────────────────────────────────────────────────

const AD_SET_FIELDS = 'id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,budget_remaining,bid_amount,bid_strategy,billing_event,optimization_goal,start_time,end_time,targeting,promoted_object,created_time,updated_time,learning_stage_info,adset_schedule';

export const getAdSets = async (token, adAccountId) => {
  return fetchAll(`/${adAccountId}/adsets`, token, {
    limit: 200,
    fields: AD_SET_FIELDS,
  });
};

export const getAdSet = async (token, adSetId) => {
  const { data } = await metaApi.get(`/${adSetId}`, {
    params: {
      access_token: token,
      fields: AD_SET_FIELDS
    }
  });
  return data;
};

export const createAdSet = async (token, adAccountId, params) => {
  const { data } = await metaApi.post(`/${adAccountId}/adsets`, null, {
    params: { access_token: token, ...params }
  });
  return data;
};

export const updateAdSet = async (token, adSetId, updates) => {
  const { data } = await metaApi.post(`/${adSetId}`, null, {
    params: { access_token: token, ...updates }
  });
  return data;
};

export const deleteAdSet = async (token, adSetId) => {
  const { data } = await metaApi.delete(`/${adSetId}`, {
    params: { access_token: token }
  });
  return data;
};

export const copyAdSet = async (token, adSetId, params = {}) => {
  const { data } = await metaApi.post(`/${adSetId}/copies`, null, {
    params: { access_token: token, ...params }
  });
  return data;
};

export const getAdSetAds = async (token, adSetId) => {
  return fetchAll(`/${adSetId}/ads`, token, {
    limit: 200,
    fields: 'id,name,status,effective_status,creative',
  });
};

export const getAdSetDeliveryEstimate = async (token, adSetId) => {
  const { data } = await metaApi.get(`/${adSetId}/delivery_estimate`, {
    params: { access_token: token }
  });
  return data.data;
};

// ─── Ads ─────────────────────────────────────────────────────────────

const AD_FIELDS = 'id,name,adset_id,campaign_id,status,effective_status,creative,created_time,updated_time,tracking_specs,conversion_domain';

export const getAds = async (token, adAccountId) => {
  return fetchAll(`/${adAccountId}/ads`, token, {
    limit: 200,
    fields: AD_FIELDS,
  });
};

export const getAd = async (token, adId) => {
  const { data } = await metaApi.get(`/${adId}`, {
    params: {
      access_token: token,
      fields: AD_FIELDS
    }
  });
  return data;
};

export const createAd = async (token, adAccountId, params) => {
  const { data } = await metaApi.post(`/${adAccountId}/ads`, null, {
    params: { access_token: token, ...params }
  });
  return data;
};

export const updateAd = async (token, adId, updates) => {
  const { data } = await metaApi.post(`/${adId}`, null, {
    params: { access_token: token, ...updates }
  });
  return data;
};

export const deleteAd = async (token, adId) => {
  const { data } = await metaApi.delete(`/${adId}`, {
    params: { access_token: token }
  });
  return data;
};

export const copyAd = async (token, adId, params = {}) => {
  const { data } = await metaApi.post(`/${adId}/copies`, null, {
    params: { access_token: token, ...params }
  });
  return data;
};

export const getAdLeads = async (token, adId) => {
  return fetchAll(`/${adId}/leads`, token, {
    fields: 'id,created_time,field_data,ad_id,ad_name,campaign_id,campaign_name'
  });
};

// ─── Ad Creatives ────────────────────────────────────────────────────

const CREATIVE_FIELDS = 'id,name,status,body,title,image_hash,image_url,video_id,object_story_spec,object_url,call_to_action_type,url_tags,asset_feed_spec,thumbnail_url';

export const getAdCreatives = async (token, adAccountId) => {
  return fetchAll(`/${adAccountId}/adcreatives`, token, {
    limit: 200,
    fields: CREATIVE_FIELDS,
  });
};

export const getAdCreative = async (token, creativeId) => {
  const { data } = await metaApi.get(`/${creativeId}`, {
    params: {
      access_token: token,
      fields: CREATIVE_FIELDS
    }
  });
  return data;
};

export const createAdCreative = async (token, adAccountId, params) => {
  const { data } = await metaApi.post(`/${adAccountId}/adcreatives`, null, {
    params: { access_token: token, ...params }
  });
  return data;
};

export const updateAdCreative = async (token, creativeId, updates) => {
  const { data } = await metaApi.post(`/${creativeId}`, null, {
    params: { access_token: token, ...updates }
  });
  return data;
};

export const deleteAdCreative = async (token, creativeId) => {
  const { data } = await metaApi.delete(`/${creativeId}`, {
    params: { access_token: token }
  });
  return data;
};

// ─── Ad Images ───────────────────────────────────────────────────────

export const getAdImages = async (token, adAccountId) => {
  const { data } = await metaApi.get(`/${adAccountId}/adimages`, {
    params: {
      access_token: token,
      fields: 'id,hash,name,url,url_128,width,height,status,created_time'
    }
  });
  return data.data;
};

export const uploadAdImage = async (token, adAccountId, imageData) => {
  const bytes = typeof imageData === 'string' ? imageData : imageData?.bytes || imageData;
  const formData = new URLSearchParams();
  formData.append('access_token', token);
  formData.append('bytes', bytes);
  if (imageData?.name) formData.append('name', imageData.name);
  const { data } = await metaApi.post(`/${adAccountId}/adimages`, formData.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    maxBodyLength: Infinity,
  });
  return data;
};

export const deleteAdImage = async (token, adAccountId, imageHash) => {
  const { data } = await metaApi.delete(`/${adAccountId}/adimages`, {
    params: { access_token: token, hash: imageHash }
  });
  return data;
};

// ─── Ad Videos ───────────────────────────────────────────────────────

// ─── Video 3-Second Views from Ad Insights (Marketing API) ──────────
// Builds a map of video_id → aggregated 3-second video views across ALL ads.
// Uses video_play_actions (action_type: video_view) from ad-level insights.
// Default date_preset is last_30d to match Meta's native Custom Audience video picker.

const _videoViewsCache = new Map(); // key → { map, ts }
const VIEWS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const getVideoViewsMap = async (token, adAccountId, { datePreset = 'last_30d' } = {}) => {
  const cacheKey = `${adAccountId}:${datePreset}`;
  const cached = _videoViewsCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < VIEWS_CACHE_TTL) return cached.map;

  const viewsMap = {}; // video_id → total 3s views

  try {
    // ── Step 1: Get all ads with creative{id,video_id} ──
    const ads = await fetchAll(`/${adAccountId}/ads`, token, {
      fields: 'id,creative{id,video_id}',
      limit: 500
    }, { maxPages: 5 });

    // Separate ads with direct video_id from those needing creative lookup
    const adToCreativeId = {};
    const adToVideoIds = {}; // ad_id → Set of video IDs
    const needLookup = new Set();
    for (const ad of ads) {
      const c = ad.creative || {};
      adToCreativeId[ad.id] = c.id;
      if (c.video_id) {
        adToVideoIds[ad.id] = new Set([c.video_id]);
      } else if (c.id) {
        needLookup.add(c.id);
      }
    }

    // ── Step 2: Batch-fetch creatives for asset_feed_spec + object_story_spec ──
    // Dynamic creatives store video IDs in asset_feed_spec.videos[].video_id
    // Boosted posts reference source via object_story_spec.video_data.video_id
    const creativeToVideoIds = {};
    const sourceVideoMap = {}; // variant_video_id → source_video_id (from object_story_spec)
    const lookupList = [...needLookup];
    for (let i = 0; i < lookupList.length; i += 50) {
      const batch = lookupList.slice(i, i + 50);
      try {
        const { data } = await metaApi.get('/', {
          params: { ids: batch.join(','), fields: 'id,video_id,asset_feed_spec,object_story_spec', access_token: token }
        });
        for (const [cid, info] of Object.entries(data)) {
          const videos = new Set();
          if (info.video_id) videos.add(String(info.video_id));
          // Dynamic creative video assets
          for (const va of (info.asset_feed_spec?.videos || [])) {
            if (va.video_id) videos.add(String(va.video_id));
          }
          // Source video from boosted post
          const sv = info.object_story_spec?.video_data?.video_id;
          if (sv) {
            videos.add(String(sv));
            // Map all other videos in this creative to the source
            for (const vid of videos) {
              if (vid !== String(sv)) sourceVideoMap[vid] = String(sv);
            }
          }
          if (videos.size) creativeToVideoIds[cid] = videos;
        }
      } catch { /* batch lookup failed, skip */ }
    }

    // Merge creative lookups into ad mapping
    for (const [adId, cid] of Object.entries(adToCreativeId)) {
      if (!adToVideoIds[adId] && cid && creativeToVideoIds[cid]) {
        adToVideoIds[adId] = creativeToVideoIds[cid];
      }
    }

    // Also resolve source videos for ads with direct video_id
    // by checking their creatives' object_story_spec
    const directCreativeIds = [];
    for (const ad of ads) {
      const c = ad.creative || {};
      if (c.video_id && c.id && !needLookup.has(c.id)) {
        directCreativeIds.push(c.id);
      }
    }
    for (let i = 0; i < directCreativeIds.length; i += 50) {
      const batch = directCreativeIds.slice(i, i + 50);
      try {
        const { data } = await metaApi.get('/', {
          params: { ids: batch.join(','), fields: 'id,video_id,object_story_spec', access_token: token }
        });
        for (const [, info] of Object.entries(data)) {
          const sv = info.object_story_spec?.video_data?.video_id;
          if (sv && info.video_id && String(sv) !== String(info.video_id)) {
            sourceVideoMap[String(info.video_id)] = String(sv);
          }
        }
      } catch { /* skip */ }
    }

    // ── Step 3: Build video families by title + length ──
    // Gather ALL unique video IDs from the mapping
    const allVideoIds = new Set();
    for (const vids of Object.values(adToVideoIds)) {
      for (const vid of vids) allVideoIds.add(vid);
    }
    // Also add source videos from object_story_spec
    for (const sv of Object.values(sourceVideoMap)) allVideoIds.add(sv);
    // Normalize title: strip Meta's auto-crop prefix for family matching
    // Format: "Auto_Cropped_AR_4_X_5_DCO_filename" or "Auto_Cropped_AR_IG_9_X_16_V3_filename"
    const normalizeTitle = (t) => (t.replace(/^Auto_Cropped_AR_.*?(?:DCO_|V\d+_)/i, '') || t).trim();

    // Include ALL ad account videos — they may be variants of creative videos
    // Pre-populate family mapping from advideos (already returns title+length)
    const vidToFamily = {}; // video_id → family_key
    const familyPrimary = {}; // family_key → primary video_id
    try {
      const adVideos = await fetchAll(`/${adAccountId}/advideos`, token, {
        fields: 'id,title,length', limit: 500
      }, { maxPages: 2 });
      for (const v of adVideos) {
        allVideoIds.add(v.id);
        const title = normalizeTitle(v.title || '');
        const length = Math.round(v.length || 0);
        const fkey = `${title}|${length}`;
        vidToFamily[v.id] = fkey;
        if (!familyPrimary[fkey]) familyPrimary[fkey] = v.id;
      }
    } catch { /* skip */ }

    // Batch-fetch title + length for remaining video IDs not yet resolved
    const unresolvedVids = [...allVideoIds].filter(vid => !vidToFamily[vid]);
    for (let i = 0; i < unresolvedVids.length; i += 25) {
      const batch = unresolvedVids.slice(i, i + 25);
      try {
        const { data } = await metaApi.get('/', {
          params: { ids: batch.join(','), fields: 'id,title,length', access_token: token }
        });
        for (const [vid, info] of Object.entries(data)) {
          const title = normalizeTitle(info.title || '');
          const length = Math.round(info.length || 0);
          const fkey = `${title}|${length}`;
          vidToFamily[vid] = fkey;
          if (!familyPrimary[fkey]) familyPrimary[fkey] = vid;
        }
      } catch {
        for (const vid of batch) {
          if (!vidToFamily[vid]) { vidToFamily[vid] = vid; familyPrimary[vid] = vid; }
        }
      }
    }

    // Merge families using sourceVideoMap (variants → source)
    // If variant A maps to source B, they should share the same family
    for (const [variant, source] of Object.entries(sourceVideoMap)) {
      const sf = vidToFamily[source];
      if (sf) vidToFamily[variant] = sf;
    }

    // ── Step 4: Get ad-level insights ──
    const insights = await fetchAll(`/${adAccountId}/insights`, token, {
      level: 'ad',
      fields: 'ad_id,video_play_actions',
      date_preset: datePreset,
      limit: 500
    }, { maxPages: 5 });

    // ── Step 5: Aggregate views per video family (deduplicated) ──
    const familyViews = {}; // family_key → total views
    for (const row of insights) {
      const vids = adToVideoIds[row.ad_id];
      if (!vids) continue;
      const vpa = row.video_play_actions || [];
      for (const action of vpa) {
        if (action.action_type === 'video_view') {
          const views = parseInt(action.value, 10) || 0;
          // Deduplicate: count once per family per ad
          const seenFamilies = new Set();
          for (const vid of vids) {
            const fam = vidToFamily[vid] || vid;
            if (!seenFamilies.has(fam)) {
              seenFamilies.add(fam);
              familyViews[fam] = (familyViews[fam] || 0) + views;
            }
          }
        }
      }
    }

    // ── Step 6: Map family totals back to individual video IDs ──
    for (const vid of allVideoIds) {
      const fam = vidToFamily[vid] || vid;
      if (familyViews[fam]) viewsMap[vid] = familyViews[fam];
    }

    // ── Step 7: Build secondary lookup by video length ──
    // Page videos and IG videos have different IDs than ad copies but share the
    // same duration. This map lets consumers match any video to its ad family's
    // aggregated views using rounded length as key.
    const byLength = {}; // rounded_length_tenths → { views, title }
    for (const [fkey, views] of Object.entries(familyViews)) {
      if (!views) continue;
      const parts = fkey.split('|');
      const lenStr = parts.pop();
      const title = parts.join('|');
      const lenKey = String(Math.round(parseFloat(lenStr) * 10)); // 0.1s precision
      if (lenKey === '0' || lenKey === 'NaN') continue;
      if (views > (byLength[lenKey]?.views || 0)) {
        byLength[lenKey] = { views, title };
      }
    }
    viewsMap._byLength = byLength;

    console.log(`[getVideoViewsMap] ${adAccountId}: ${Object.keys(viewsMap).length} videos, ${Object.keys(familyViews).length} families, ${Object.keys(byLength).length} length keys`);
  } catch (err) {
    console.error('[getVideoViewsMap] error:', err.response?.data?.error?.message || err.message);
  }

  if (!viewsMap._byLength) viewsMap._byLength = {};
  _videoViewsCache.set(cacheKey, { map: viewsMap, ts: Date.now() });
  return viewsMap;
};

export const getAdVideos = async (token, adAccountId, { viewsMap: prebuiltMap } = {}) => {
  try {
    // Get ad videos and ad insight views in parallel (skip viewsMap if already provided)
    const [{ data }, viewsMap] = await Promise.all([
      metaApi.get(`/${adAccountId}/advideos`, {
        params: {
          access_token: token,
          fields: 'id,title,description,source,picture,length,status,created_time,updated_time,source_instagram_media_id'
        }
      }),
      prebuiltMap ? Promise.resolve(prebuiltMap) : getVideoViewsMap(token, adAccountId)
    ]);
    return (data.data || []).map(v => ({
      ...v,
      three_second_views: viewsMap[v.id] || 0
    }));
  } catch (err) {
    console.error('getAdVideos error:', err.response?.data?.error?.message || err.message);
    try {
      const { data } = await metaApi.get(`/${adAccountId}/advideos`, {
        params: {
          access_token: token,
          fields: 'id,title,description,source,picture,length,status,created_time,updated_time,source_instagram_media_id'
        }
      });
      return data.data || [];
    } catch (err2) {
      console.error('getAdVideos fallback error:', err2.response?.data?.error?.message || err2.message);
      const { data } = await metaApi.get(`/${adAccountId}/advideos`, {
        params: {
          access_token: token,
          fields: 'id,title,description,source,picture,length,status,created_time,updated_time'
        }
      });
      return data.data || [];
    }
  }
};

export const uploadAdVideo = async (token, adAccountId, params) => {
  // If a Buffer is provided as 'source', use multipart/form-data for binary upload
  if (params.source && Buffer.isBuffer(params.source)) {
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('access_token', token);
    form.append('source', params.source, { filename: params.title || 'video.mp4', contentType: 'video/mp4' });
    if (params.title) form.append('title', params.title);
    if (params.description) form.append('description', params.description);
    const { data } = await metaApi.post(`/${adAccountId}/advideos`, form, {
      headers: form.getHeaders(),
      timeout: 120000, // 2 min for video uploads
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    return data;
  }
  // Otherwise use file_url (URL-based upload)
  const { data } = await metaApi.post(`/${adAccountId}/advideos`, null, {
    params: { access_token: token, ...params }
  });
  return data;
};

export const getAdVideoStatus = async (token, videoId) => {
  const { data } = await metaApi.get(`/${videoId}`, {
    params: {
      access_token: token,
      fields: 'id,status,title'
    }
  });
  return data;
};

// ─── Insights ────────────────────────────────────────────────────────

export const getInsights = async (token, adAccountId, datePreset = 'last_7d', timeRange = null) => {
  const params = {
    access_token: token,
    fields: 'spend,actions,action_values,impressions,clicks,ctr,cpm,cpc,frequency,reach,cost_per_action_type',
  };
  if (timeRange?.since && timeRange?.until) {
    params.time_range = JSON.stringify(timeRange);
  } else {
    params.date_preset = datePreset;
  }
  const { data } = await metaApi.get(`/${adAccountId}/insights`, { params });
  return data.data[0] || {};
};

export const getObjectInsights = async (token, objectId, params = {}) => {
  // If time_range is passed as an object, stringify it for the API
  const queryParams = { access_token: token, ...params };
  if (params.time_range && typeof params.time_range === 'object') {
    queryParams.time_range = JSON.stringify(params.time_range);
  }
  const { data } = await metaApi.get(`/${objectId}/insights`, { params: queryParams });
  return data.data;
};

export const createAsyncReport = async (token, adAccountId, params = {}) => {
  const { data } = await metaApi.post(`/${adAccountId}/insights`, null, {
    params: { access_token: token, ...params }
  });
  return data;
};

export const getAsyncReportStatus = async (token, reportRunId) => {
  const { data } = await metaApi.get(`/${reportRunId}`, {
    params: {
      access_token: token,
      fields: 'id,async_status,async_percent_completion'
    }
  });
  return data;
};

export const getAsyncReportResults = async (token, reportRunId) => {
  const { data } = await metaApi.get(`/${reportRunId}/insights`, {
    params: { access_token: token }
  });
  return data.data;
};

// ─── Audiences ───────────────────────────────────────────────────────

export const getCustomAudiences = async (token, adAccountId) => {
  const fields = 'id,name,subtype,description,delivery_status,operation_status,approximate_count_lower_bound,approximate_count_upper_bound,time_created,time_updated,is_value_based';
  const { data } = await metaApi.get(`/${adAccountId}/customaudiences`, {
    params: { access_token: token, fields, limit: 50 }
  });
  return data.data;
};

export const createCustomAudience = async (token, adAccountId, params) => {
  const subtype = (params.subtype || 'CUSTOM').toUpperCase();
  const retentionSec = (Number(params.retention_days) || 30) * 86400;
  const apiParams = {
    access_token: token,
    name: params.name,
    // NOTE: v19.0 does NOT support "subtype" param for WEBSITE/ENGAGEMENT.
    // Meta infers the type from the rule's event_sources.
    // Only CUSTOM and LOOKALIKE need subtype.
  };
  if (params.description) apiParams.description = params.description;

  // ── WEBSITE audience: build event_sources rule with pixel_id ────────
  if (subtype === 'WEBSITE') {
    const pixelId = params.pixel_id;
    if (!pixelId) throw new Error('pixel_id is required for WEBSITE audiences');

    // If caller already provided a full rule with event_sources, use it
    const rawRule = params.rule;
    let rule;
    if (rawRule && typeof rawRule === 'object' && rawRule.inclusions) {
      rule = rawRule;
    } else if (rawRule && typeof rawRule === 'string' && rawRule.includes('event_sources')) {
      rule = rawRule;
    } else {
      // Build v19+ rule: always include a URL filter (empty = all visitors)
      const urlValue = (rawRule && typeof rawRule === 'object' && rawRule.url)
        ? (rawRule.url.i_contains || rawRule.url.eq || '')
        : '';
      const urlOperator = (rawRule?.url?.eq) ? 'eq' : 'i_contains';

      rule = {
        inclusions: {
          operator: 'or',
          rules: [{
            event_sources: [{ id: pixelId, type: 'pixel' }],
            retention_seconds: retentionSec,
            filter: {
              operator: 'and',
              filters: [{ field: 'url', operator: urlOperator, value: urlValue }]
            },
          }]
        }
      };
    }
    apiParams.rule = typeof rule === 'string' ? rule : JSON.stringify(rule);
    apiParams.prefill = 1;
    // Do NOT send subtype for WEBSITE — v19 rejects it
  }

  // ── ENGAGEMENT audience (video, IG, page, etc.) ────────────────────
  else if (subtype === 'ENGAGEMENT') {
    // Engagement also uses rule with event_sources — no subtype param
    if (params.rule) {
      apiParams.rule = typeof params.rule === 'string' ? params.rule : JSON.stringify(params.rule);
    }
    if (params.inclusions) {
      const inclusions = typeof params.inclusions === 'string' ? params.inclusions : JSON.stringify(params.inclusions);
      if (!apiParams.rule) apiParams.rule = inclusions;
    }
    apiParams.prefill = 1;
    // Do NOT send subtype for ENGAGEMENT — v19 rejects it
  }

  // ── CUSTOM audience (customer list) — subtype IS required ──────────
  else if (subtype === 'CUSTOM') {
    apiParams.subtype = 'CUSTOM';
    apiParams.customer_file_source = params.customer_file_source || 'USER_PROVIDED_ONLY';
  }

  // ── LOOKALIKE — subtype IS required ────────────────────────────────
  else if (subtype === 'LOOKALIKE') {
    apiParams.subtype = 'LOOKALIKE';
    if (params.origin_audience_id) apiParams.origin_audience_id = params.origin_audience_id;
    if (params.lookalike_spec) apiParams.lookalike_spec = typeof params.lookalike_spec === 'string' ? params.lookalike_spec : JSON.stringify(params.lookalike_spec);
  }

  // Fallback: pass subtype for any other type
  else {
    apiParams.subtype = subtype;
  }

  // Log what we're sending to Meta for debugging
  const debugParams = { ...apiParams };
  delete debugParams.access_token;
  console.log(`[metaClient] createCustomAudience → POST /${adAccountId}/customaudiences`, JSON.stringify(debugParams));

  const { data } = await metaApi.post(`/${adAccountId}/customaudiences`, null, {
    params: apiParams
  });
  return data;
};

export const getCustomAudience = async (token, audienceId) => {
  const { data } = await metaApi.get(`/${audienceId}`, {
    params: {
      access_token: token,
      fields: 'id,name,description,subtype,approximate_count_lower_bound,approximate_count_upper_bound,delivery_status,operation_status,retention_days'
    }
  });
  return data;
};

export const updateCustomAudience = async (token, audienceId, updates) => {
  const { data } = await metaApi.post(`/${audienceId}`, null, {
    params: { access_token: token, ...updates }
  });
  return data;
};

export const deleteCustomAudience = async (token, audienceId) => {
  const { data } = await metaApi.delete(`/${audienceId}`, {
    params: { access_token: token }
  });
  return data;
};

export const addUsersToAudience = async (token, audienceId, payload, { raw } = {}) => {
  // If raw customer data provided, normalize + SHA256 hash before sending
  let finalPayload = payload;
  if (raw && payload.schema && payload.data) {
    finalPayload = buildAudiencePayload(payload.data, payload.schema);
  }
  const { data } = await metaApi.post(`/${audienceId}/users`, null, {
    params: { access_token: token, payload: JSON.stringify(finalPayload) }
  });
  return data;
};

export const removeUsersFromAudience = async (token, audienceId, payload) => {
  const { data } = await metaApi.delete(`/${audienceId}/users`, {
    params: { access_token: token, payload: JSON.stringify(payload) }
  });
  return data;
};

// --- Custom Audience TOS ---
export const checkCustomAudienceTos = async (token, adAccountId) => {
  try {
    const { data } = await metaApi.get(`/${adAccountId}`, {
      params: { access_token: token, fields: 'tos_accepted' }
    });
    const tosAccepted = data.tos_accepted?.custom_audience_tos === 1;
    return { accepted: tosAccepted };
  } catch {
    // If we can't check, assume not accepted to be safe
    return { accepted: false };
  }
};

export const acceptCustomAudienceTos = async (token, adAccountId) => {
  const { data } = await metaApi.post(`/${adAccountId}/tos_accepted`, null, {
    params: { access_token: token, custom_audience_tos: 1 }
  });
  return data;
};

export const createLookalikeAudience = async (token, adAccountId, params) => {
  const { data } = await metaApi.post(`/${adAccountId}/customaudiences`, null, {
    params: {
      access_token: token,
      name: params.name,
      subtype: 'LOOKALIKE',
      origin_audience_id: params.origin_audience_id,
      lookalike_spec: JSON.stringify(params.lookalike_spec)
    }
  });
  return data;
};

export const getSavedAudiences = async (token, adAccountId) => {
  const { data } = await metaApi.get(`/${adAccountId}/saved_audiences`, {
    params: {
      access_token: token,
      fields: 'id,name,targeting,run_status,time_created,time_updated'
    }
  });
  return data.data;
};

export const createSavedAudience = async (token, adAccountId, params) => {
  const { data } = await metaApi.post(`/${adAccountId}/saved_audiences`, null, {
    params: { access_token: token, ...params }
  });
  return data;
};

export const deleteSavedAudience = async (token, audienceId) => {
  const { data } = await metaApi.delete(`/${audienceId}`, {
    params: { access_token: token }
  });
  return data;
};

// ─── Targeting ───────────────────────────────────────────────────────

export const targetingSearch = async (token, adAccountId, query) => {
  const { data } = await metaApi.get(`/${adAccountId}/targetingsearch`, {
    params: { access_token: token, q: query }
  });
  return data.data;
};

export const targetingBrowse = async (token, adAccountId) => {
  const { data } = await metaApi.get(`/${adAccountId}/targetingbrowse`, {
    params: { access_token: token }
  });
  return data.data;
};

export const targetingSuggestions = async (token, adAccountId, targetingList) => {
  const { data } = await metaApi.get(`/${adAccountId}/targetingsuggestions`, {
    params: { access_token: token, targeting_list: targetingList }
  });
  return data.data;
};

export const targetingValidation = async (token, adAccountId, targetingSpec) => {
  const { data } = await metaApi.get(`/${adAccountId}/targetingvalidation`, {
    params: { access_token: token, targeting_spec: JSON.stringify(targetingSpec) }
  });
  return data.data;
};

export const getReachEstimate = async (token, adAccountId, targetingSpec) => {
  const { data } = await metaApi.get(`/${adAccountId}/reachestimate`, {
    params: { access_token: token, targeting_spec: JSON.stringify(targetingSpec) }
  });
  return data.data;
};

export const getDeliveryEstimate = async (token, adAccountId, params) => {
  const { data } = await metaApi.get(`/${adAccountId}/delivery_estimate`, {
    params: {
      access_token: token,
      targeting_spec: JSON.stringify(params.targeting_spec),
      optimization_goal: params.optimization_goal
    }
  });
  return data.data;
};

export const getBroadTargetingCategories = async (token, adAccountId) => {
  const { data } = await metaApi.get(`/${adAccountId}/broadtargetingcategories`, {
    params: { access_token: token }
  });
  return data.data;
};

// ─── Ad Rules ────────────────────────────────────────────────────────

const AD_RULE_FIELDS = 'id,name,status,schedule_spec,evaluation_spec,execution_spec,created_time,updated_time';

export const getAdRules = async (token, adAccountId) => {
  const { data } = await metaApi.get(`/${adAccountId}/adrules_library`, {
    params: {
      access_token: token,
      fields: AD_RULE_FIELDS
    }
  });
  return data.data;
};

export const getAdRule = async (token, ruleId) => {
  const { data } = await metaApi.get(`/${ruleId}`, {
    params: {
      access_token: token,
      fields: AD_RULE_FIELDS
    }
  });
  return data;
};

export const createAdRule = async (token, adAccountId, params) => {
  const { data } = await metaApi.post(`/${adAccountId}/adrules_library`, null, {
    params: { access_token: token, ...params }
  });
  return data;
};

export const updateAdRule = async (token, ruleId, updates) => {
  const { data } = await metaApi.post(`/${ruleId}`, null, {
    params: { access_token: token, ...updates }
  });
  return data;
};

export const deleteAdRule = async (token, ruleId) => {
  const { data } = await metaApi.delete(`/${ruleId}`, {
    params: { access_token: token }
  });
  return data;
};

export const getAdRuleHistory = async (token, ruleId) => {
  const { data } = await metaApi.get(`/${ruleId}/history`, {
    params: { access_token: token }
  });
  return data.data;
};

// ─── Ad Labels ───────────────────────────────────────────────────────

export const getAdLabels = async (token, adAccountId) => {
  const { data } = await metaApi.get(`/${adAccountId}/adlabels`, {
    params: {
      access_token: token,
      fields: 'id,name,created_time,updated_time'
    }
  });
  return data.data;
};

export const createAdLabel = async (token, adAccountId, name) => {
  const { data } = await metaApi.post(`/${adAccountId}/adlabels`, null, {
    params: { access_token: token, name }
  });
  return data;
};

export const updateAdLabel = async (token, labelId, name) => {
  const { data } = await metaApi.post(`/${labelId}`, null, {
    params: { access_token: token, name }
  });
  return data;
};

export const deleteAdLabel = async (token, labelId) => {
  const { data } = await metaApi.delete(`/${labelId}`, {
    params: { access_token: token }
  });
  return data;
};

export const assignLabel = async (token, objectId, labelId) => {
  const { data } = await metaApi.post(`/${objectId}/adlabels`, null, {
    params: { access_token: token, adlabels: JSON.stringify([{ id: labelId }]) }
  });
  return data;
};

// ─── Pixels ──────────────────────────────────────────────────────────

const PIXEL_FIELDS = 'id,name,code,creation_time,last_fired_time,is_unavailable';

export const getPixels = async (token, adAccountId) => {
  const { data } = await metaApi.get(`/${adAccountId}/adspixels`, {
    params: {
      access_token: token,
      fields: PIXEL_FIELDS
    }
  });
  return data.data;
};

export const getPixel = async (token, pixelId) => {
  const { data } = await metaApi.get(`/${pixelId}`, {
    params: {
      access_token: token,
      fields: PIXEL_FIELDS
    }
  });
  return data;
};

export const createPixel = async (token, adAccountId, name) => {
  const { data } = await metaApi.post(`/${adAccountId}/adspixels`, null, {
    params: { access_token: token, name }
  });
  return data;
};

export const updatePixel = async (token, pixelId, updates) => {
  const { data } = await metaApi.post(`/${pixelId}`, null, {
    params: { access_token: token, ...updates }
  });
  return data;
};

export const getPixelStats = async (token, pixelId) => {
  const { data } = await metaApi.get(`/${pixelId}/stats`, {
    params: { access_token: token }
  });
  return data.data;
};

export const sendConversionEvent = async (token, pixelId, eventData) => {
  // eventData should have { data: [...events], test_event_code? }
  // Handle both: agent sends data array directly or nested in .data
  const events = Array.isArray(eventData.data) ? eventData.data : Array.isArray(eventData) ? eventData : [eventData];

  // Add event_time if missing (required by Meta)
  const now = Math.floor(Date.now() / 1000);
  const enriched = events.map(e => ({
    event_time: now,
    action_source: 'website',
    ...e,
  }));

  // Send as form body (not query params) to avoid URL length limits
  const formData = new URLSearchParams();
  formData.append('access_token', token);
  formData.append('data', JSON.stringify(enriched));
  if (eventData.test_event_code) formData.append('test_event_code', eventData.test_event_code);

  const { data } = await metaApi.post(`/${pixelId}/events`, formData.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return data;
};

// ─── Custom Conversions ──────────────────────────────────────────────

export const getCustomConversions = async (token, adAccountId) => {
  const { data } = await metaApi.get(`/${adAccountId}/customconversions`, {
    params: {
      access_token: token,
      fields: 'id,name,rule,event_source_type,default_conversion_value,custom_event_type,pixel'
    }
  });
  return data.data;
};

export const createCustomConversion = async (token, adAccountId, params) => {
  const { data } = await metaApi.post(`/${adAccountId}/customconversions`, null, {
    params: { access_token: token, ...params }
  });
  return data;
};

export const updateCustomConversion = async (token, conversionId, updates) => {
  const { data } = await metaApi.post(`/${conversionId}`, null, {
    params: { access_token: token, ...updates }
  });
  return data;
};

export const deleteCustomConversion = async (token, conversionId) => {
  const { data } = await metaApi.delete(`/${conversionId}`, {
    params: { access_token: token }
  });
  return data;
};

// ─── Lead Ads ────────────────────────────────────────────────────────

export const getLeadForms = async (token, pageId) => {
  const { data } = await metaApi.get(`/${pageId}/leadgen_forms`, {
    params: {
      access_token: token,
      fields: 'id,name,status,locale,created_time,questions,privacy_policy_url'
    }
  });
  return data.data;
};

export const getLeadFormLeads = async (token, formId) => {
  return fetchAll(`/${formId}/leads`, token, {
    fields: 'id,created_time,field_data,ad_id,ad_name,campaign_id,campaign_name'
  });
};

export const createLeadForm = async (token, pageId, params) => {
  const { data } = await metaApi.post(`/${pageId}/leadgen_forms`, null, {
    params: { access_token: token, ...params }
  });
  return data;
};

// ─── Ad Previews ─────────────────────────────────────────────────────

export const getAdPreview = async (token, adId, adFormat) => {
  const { data } = await metaApi.get(`/${adId}/previews`, {
    params: { access_token: token, ad_format: adFormat }
  });
  return data.data;
};

export const getCreativePreview = async (token, creativeId, adFormat) => {
  const { data } = await metaApi.get(`/${creativeId}/previews`, {
    params: { access_token: token, ad_format: adFormat }
  });
  return data.data;
};

export const generatePreview = async (token, adAccountId, creativeSpec, adFormat) => {
  const { data } = await metaApi.get(`/${adAccountId}/generatepreviews`, {
    params: { access_token: token, creative: JSON.stringify(creativeSpec), ad_format: adFormat }
  });
  return data.data;
};

// ─── Product Catalogs ────────────────────────────────────────────────

export const getCatalogs = async (token, businessId) => {
  const { data } = await metaApi.get(`/${businessId}/owned_product_catalogs`, {
    params: {
      access_token: token,
      fields: 'id,name,vertical,product_count,feed_count'
    }
  });
  return data.data;
};

export const getCatalog = async (token, catalogId) => {
  const { data } = await metaApi.get(`/${catalogId}`, {
    params: {
      access_token: token,
      fields: 'id,name,vertical,product_count,feed_count'
    }
  });
  return data;
};

export const createCatalog = async (token, businessId, params) => {
  const { data } = await metaApi.post(`/${businessId}/owned_product_catalogs`, null, {
    params: { access_token: token, ...params }
  });
  return data;
};

export const updateCatalog = async (token, catalogId, updates) => {
  const { data } = await metaApi.post(`/${catalogId}`, null, {
    params: { access_token: token, ...updates }
  });
  return data;
};

export const deleteCatalog = async (token, catalogId) => {
  const { data } = await metaApi.delete(`/${catalogId}`, {
    params: { access_token: token }
  });
  return data;
};

export const getCatalogProducts = async (token, catalogId, params = {}) => {
  const { data } = await metaApi.get(`/${catalogId}/products`, {
    params: {
      access_token: token,
      fields: 'id,name,description,url,image_url,price,sale_price,currency,availability,brand,category,retailer_id',
      limit: 50,
      ...params
    }
  });
  return data.data;
};

export const batchCatalogProducts = async (token, catalogId, requests) => {
  const { data } = await metaApi.post(`/${catalogId}/batch`, null, {
    params: { access_token: token, requests: JSON.stringify(requests) }
  });
  return data;
};

export const getCatalogProductSets = async (token, catalogId) => {
  const { data } = await metaApi.get(`/${catalogId}/product_sets`, {
    params: {
      access_token: token,
      fields: 'id,name,filter,product_count'
    }
  });
  return data.data;
};

export const createProductSet = async (token, catalogId, params) => {
  const { data } = await metaApi.post(`/${catalogId}/product_sets`, null, {
    params: { access_token: token, ...params }
  });
  return data;
};

export const updateProductSet = async (token, setId, updates) => {
  const { data } = await metaApi.post(`/${setId}`, null, {
    params: { access_token: token, ...updates }
  });
  return data;
};

export const deleteProductSet = async (token, setId) => {
  const { data } = await metaApi.delete(`/${setId}`, {
    params: { access_token: token }
  });
  return data;
};

export const getCatalogProductFeeds = async (token, catalogId) => {
  const { data } = await metaApi.get(`/${catalogId}/product_feeds`, {
    params: {
      access_token: token,
      fields: 'id,name,product_count,schedule,latest_upload'
    }
  });
  return data.data;
};

export const createProductFeed = async (token, catalogId, params) => {
  const { data } = await metaApi.post(`/${catalogId}/product_feeds`, null, {
    params: { access_token: token, ...params }
  });
  return data;
};

export const updateProductFeed = async (token, feedId, updates) => {
  const { data } = await metaApi.post(`/${feedId}`, null, {
    params: { access_token: token, ...updates }
  });
  return data;
};

export const deleteProductFeed = async (token, feedId) => {
  const { data } = await metaApi.delete(`/${feedId}`, {
    params: { access_token: token }
  });
  return data;
};

export const getCatalogDiagnostics = async (token, catalogId) => {
  const { data } = await metaApi.get(`/${catalogId}/diagnostics`, {
    params: { access_token: token }
  });
  return data.data;
};

// ─── Business Manager ────────────────────────────────────────────────

export const getBusinesses = async (token) => {
  const { data } = await metaApi.get('/me/businesses', {
    params: { access_token: token, fields: 'id,name,verification_status' }
  });
  return data.data;
};

export const getOwnedAdAccounts = async (token, businessId) => {
  const { data } = await metaApi.get(`/${businessId}/owned_ad_accounts`, {
    params: {
      access_token: token,
      fields: 'id,name,account_id,account_status,currency',
      limit: 100
    }
  });
  return data.data;
};

export const getBusinessDetails = async (token, businessId) => {
  const { data } = await metaApi.get(`/${businessId}`, {
    params: {
      access_token: token,
      fields: 'id,name,link,primary_page,profile_picture_uri,verification_status,created_time,updated_time'
    }
  });
  return data;
};

export const getBusinessUsers = async (token, businessId) => {
  const { data } = await metaApi.get(`/${businessId}/business_users`, {
    params: {
      access_token: token,
      fields: 'id,name,role,email'
    }
  });
  return data.data;
};

export const getSystemUsers = async (token, businessId) => {
  const { data } = await metaApi.get(`/${businessId}/system_users`, {
    params: {
      access_token: token,
      fields: 'id,name,role'
    }
  });
  return data.data;
};

export const getBusinessOwnedPages = async (token, businessId) => {
  const { data } = await metaApi.get(`/${businessId}/owned_pages`, {
    params: {
      access_token: token,
      fields: 'id,name,category,fan_count'
    }
  });
  return data.data;
};

export const getBusinessOwnedPixels = async (token, businessId) => {
  const { data } = await metaApi.get(`/${businessId}/owned_pixels`, {
    params: {
      access_token: token,
      fields: 'id,name,last_fired_time'
    }
  });
  return data.data;
};

export const getBusinessOwnedCatalogs = async (token, businessId) => {
  const { data } = await metaApi.get(`/${businessId}/owned_product_catalogs`, {
    params: {
      access_token: token,
      fields: 'id,name,vertical,product_count'
    }
  });
  return data.data;
};

export const getBusinessOwnedIGAccounts = async (token, businessId) => {
  const { data } = await metaApi.get(`/${businessId}/owned_instagram_accounts`, {
    params: {
      access_token: token,
      fields: 'id,username,profile_picture_url'
    }
  });
  return data.data;
};

export const getBusinessClientAdAccounts = async (token, businessId) => {
  const { data } = await metaApi.get(`/${businessId}/client_ad_accounts`, {
    params: {
      access_token: token,
      fields: 'id,name,account_id,account_status,currency'
    }
  });
  return data.data;
};

export const claimAdAccount = async (token, businessId, adAccountId) => {
  const { data } = await metaApi.post(`/${businessId}/owned_ad_accounts`, null, {
    params: { access_token: token, adaccount_id: adAccountId }
  });
  return data;
};

export const getConnectedInstagramAccounts = async (token, adAccountId) => {
  // Collect { id, username, profile_pic, _source, _pageToken }
  const allResults = [];
  const pageTokenMap = new Map(); // igId -> pageToken (for username resolution)
  const pageIdMap = new Map(); // igId -> pageId (for video fallback via page)

  // Run all sources in parallel
  const source1 = metaApi.get(`/${adAccountId}/connected_instagram_accounts`, {
    params: { access_token: token, fields: 'id,username,profile_picture_url' }
  }).then(({ data }) => {
    const found = data.data || [];
    console.log(`[IG Discovery] Source 1 - connected_instagram_accounts: ${found.length}`, found.map(a => a.username));
    found.forEach(a => allResults.push({ id: a.id, username: a.username, profile_pic: a.profile_picture_url, _source: 1 }));
  }).catch(err => console.error('[IG Discovery] Source 1 ERROR:', err.response?.data?.error?.message || err.message));

  const source2and4 = metaApi.get('/me/accounts', {
    params: { access_token: token, fields: 'id,name,access_token,instagram_business_account{id,username,profile_picture_url}', limit: 100 }
  }).then(async ({ data }) => {
    const pages = data.data || [];
    // Source 2: IG business accounts linked to Pages
    for (const p of pages) {
      if (p.instagram_business_account) {
        const ig = p.instagram_business_account;
        console.log(`[IG Discovery] Source 2 - Page "${p.name}": @${ig.username}`);
        allResults.push({ id: ig.id, username: ig.username, profile_pic: ig.profile_picture_url, _source: 2 });
        if (p.access_token) pageTokenMap.set(ig.id, p.access_token);
        pageIdMap.set(ig.id, p.id);
      }
    }

    // Store page tokens/IDs for Source 2 accounts (needed for video fallback)
    for (const p of pages) {
      if (p.instagram_business_account && p.access_token) {
        pageTokenMap.set(p.instagram_business_account.id, p.access_token);
        pageIdMap.set(p.instagram_business_account.id, p.id);
      }
    }
  }).catch(err => console.error('[IG Discovery] Source 2/4 ERROR:', err.response?.data?.error?.message || err.message));

  await Promise.allSettled([source1, source2and4]);

  // Deduplicate by ID — prefer Source 1 > Source 2
  const seenIds = new Map();
  const accounts = [];
  allResults.sort((a, b) => (a._source || 99) - (b._source || 99));
  for (const a of allResults) {
    if (!a.id) continue;
    if (!seenIds.has(a.id)) {
      seenIds.set(a.id, accounts.length);
      accounts.push(a);
    }
  }

  // Clean up internal flags, include pageId for video fallback
  const result = accounts.map(({ _source, ...rest }) => ({
    ...rest,
    ...(pageIdMap.get(rest.id) && { pageId: pageIdMap.get(rest.id) }),
  }));
  console.log(`[IG Discovery] TOTAL: ${result.length} accounts`, result.map(a => a.username));
  return result;
};

// ─── Pages ───────────────────────────────────────────────────────────

export const getPages = async (token) => {
  const { data } = await metaApi.get('/me/accounts', {
    params: { access_token: token, fields: 'id,name,engagement,fan_count,category,access_token,instagram_business_account{id,name,username}' }
  });
  return data.data;
};

export const getPageVideos = async (token, pageId, adAccountId, { after } = {}) => {
  // First get the page access token (required for /{pageId}/videos)
  const pages = await getPages(token);
  const page = pages?.find(p => p.id === pageId);
  const pageToken = page?.access_token || token;

  // Build ad insights views map first, then pass to getAdVideos to avoid redundant call
  const viewsMapPromise = adAccountId ? getVideoViewsMap(token, adAccountId) : Promise.resolve({});
  // getAdVideos reuses the same viewsMap (no duplicate getVideoViewsMap call)
  const adVidsPromise = adAccountId
    ? viewsMapPromise.then(vm => getAdVideos(token, adAccountId, { viewsMap: vm })).catch(() => [])
    : Promise.resolve([]);

  // Strip Meta auto-crop prefix from ad video titles
  const cleanTitle = (t) => (t || '').replace(/^Auto_Cropped_AR_.*?(?:DCO_|V\d+_)/i, '').trim() || t || '';

  try {
    const params = {
      access_token: pageToken,
      fields: 'id,title,description,source,picture,length,created_time,updated_time,views,status,source_instagram_media_id',
      limit: 50
    };
    if (after) params.after = after;

    const [{ data }, viewsMap, adVids] = await Promise.all([
      metaApi.get(`/${pageId}/videos`, { params }),
      viewsMapPromise,
      adVidsPromise
    ]);

    // Build ad video lookup by rounded length (in 0.1s) for cross-matching
    // Key: length_tenths → { views, title, updated_time, ... } (best match by views)
    const adByLength = {};
    for (const av of (adVids || [])) {
      const lenKey = Math.round((av.length || 0) * 10);
      if (lenKey > 0 && av.three_second_views > (adByLength[lenKey]?.three_second_views || 0)) {
        adByLength[lenKey] = av;
      }
    }
    // Also build a set of ad video lengths for dedup
    const adLengths = new Set(Object.keys(adByLength).map(Number));

    const byLength = viewsMap._byLength || {};
    const rawPageVideos = (data.data || []).filter(v => !v.status || v.status.video_status === 'ready');
    const pageVideos = rawPageVideos.map(v => {
      let views = viewsMap[v.id] || 0;
      let lastUsed = v.updated_time;
      // If page video has no ad views, try two fallback strategies:
      // 1. viewsMap._byLength: aggregated family views keyed by video duration (0.1s precision)
      // 2. adByLength: direct ad video match by duration
      // Page videos and ad copies of the same content always share the same duration.
      if (!views && v.length) {
        const lenKey = String(Math.round((v.length || 0) * 10));
        // Strategy 1: family views by length from getVideoViewsMap
        if (byLength[lenKey]?.views) {
          views = byLength[lenKey].views;
        }
        // Strategy 2: direct ad video match
        if (!views) {
          const match = adByLength[Number(lenKey)];
          if (match?.three_second_views > 0) views = match.three_second_views;
        }
        // Inherit "last used" from ad video if available and more recent
        const adMatch = adByLength[Number(lenKey)];
        if (adMatch?.updated_time && (!lastUsed || adMatch.updated_time > lastUsed)) {
          lastUsed = adMatch.updated_time;
        }
      }
      return {
        ...v,
        title: cleanTitle(v.title) || v.title,
        three_second_views: views || v.views || 0,
        updated_time: lastUsed
      };
    });
    const nextCursor = data.paging?.cursors?.after || null;
    const hasMore = !!data.paging?.next;

    // Merge ad account videos not already in page list (dedup by ID AND by length)
    if (!after && adVids?.length) {
      const pageVideoIds = new Set(pageVideos.map(v => v.id));
      const pageLengths = new Set(rawPageVideos.map(v => Math.round((v.length || 0) * 10)).filter(l => l > 0));
      const extra = adVids
        .filter(v => !pageVideoIds.has(v.id))
        // Skip ad copies of page videos (same length = same content, already shown)
        .filter(v => {
          const lenKey = Math.round((v.length || 0) * 10);
          return lenKey === 0 || !pageLengths.has(lenKey);
        })
        .map(v => ({ ...v, title: cleanTitle(v.title) }));
      // Sort by updated_time (last used) descending — matches Meta's default sort
      const merged = [...pageVideos, ...extra].sort((a, b) =>
        (b.updated_time || b.created_time || '').localeCompare(a.updated_time || a.created_time || ''));
      return { videos: merged, nextCursor: hasMore ? nextCursor : null };
    }

    return { videos: pageVideos, nextCursor: hasMore ? nextCursor : null };
  } catch (err) {
    console.error('getPageVideos error:', err.response?.data?.error?.message || err.message);
    if (!after && adAccountId) {
      try {
        const adVids = await getAdVideos(token, adAccountId);
        return { videos: (adVids || []).map(v => ({ ...v, title: cleanTitle(v.title) })), nextCursor: null };
      } catch { /* */ }
    }
    return { videos: [], nextCursor: null };
  }
};

// Resolve 3-second views for a video using viewsMap with _byLength fallback.
// viewsMap maps ad video IDs; _byLength maps by video duration for page/IG videos
// whose IDs differ from their ad account copies.
const resolveViews = (viewsMap, videoId, length, organicViews = 0) => {
  if (viewsMap[videoId]) return viewsMap[videoId];
  if (length) {
    const lenKey = String(Math.round((length || 0) * 10));
    if (viewsMap._byLength?.[lenKey]?.views) return viewsMap._byLength[lenKey].views;
  }
  return organicViews || 0;
};

export const getIgMedia = async (token, igAccountId, { pageId, adAccountId, after } = {}) => {
  // Try direct IG media endpoint (requires instagram_basic permission)
  // Use page token if available — page tokens carry instagram_basic scope
  let igToken = token;
  if (pageId) {
    try {
      const pages = await getPages(token);
      const page = pages?.find(p => p.id === pageId);
      if (page?.access_token) igToken = page.access_token;
    } catch { /* use user token */ }
  }

  // Build ad insights views map in parallel (if ad account available)
  const viewsMapPromise = adAccountId ? getVideoViewsMap(token, adAccountId) : Promise.resolve({});

  if (!after) {
    try {
      const [{ data }, viewsMap] = await Promise.all([
        metaApi.get(`/${igAccountId}/media`, {
          params: {
            access_token: igToken,
            fields: 'id,media_type,media_url,thumbnail_url,caption,timestamp,permalink',
            limit: 50
          }
        }),
        viewsMapPromise
      ]);
      const videos = (data.data || []).filter(m => m.media_type === 'VIDEO');
      const nextCursor = data.paging?.cursors?.after || null;
      console.log(`[getIgMedia] Direct IG media: ${data.data?.length || 0} total, ${videos.length} videos`);

      // Normalize IG video fields to match FB video format used by the UI
      const normalized = videos.map(v => ({
        ...v,
        title: v.caption?.slice(0, 80) || 'Untitled',
        picture: v.thumbnail_url,
        created_time: v.timestamp,
        updated_time: v.timestamp,
        three_second_views: resolveViews(viewsMap, v.id, v.length),
        source_instagram_media_id: v.id,
        is_ig: true,
      }));

      // If we got some IG videos and there's a page, also fetch page videos and merge
      // (many IG videos are crossposted and only appear under page videos)
      if (pageId) {
        try {
          const pagePages = await getPages(token);
          const linkedPage = pagePages?.find(p => p.id === pageId);
          const pt = linkedPage?.access_token || token;
          const { data: pvData } = await metaApi.get(`/${pageId}/videos`, {
            params: { access_token: pt, fields: 'id,title,description,source,picture,length,created_time,updated_time,views,source_instagram_media_id', limit: 50 }
          });
          const pageVids = (pvData.data || []).map(pv => ({
            ...pv,
            three_second_views: resolveViews(viewsMap, pv.id, pv.length, pv.views),
            is_ig: !!pv.source_instagram_media_id
          }));
          // Merge: page videos first (they have views + duration), dedupe by source_instagram_media_id
          const igIds = new Set(normalized.map(n => n.id));
          const extra = pageVids.filter(pv => !igIds.has(pv.id) && !igIds.has(pv.source_instagram_media_id));
          console.log(`[getIgMedia] Merged: ${normalized.length} IG + ${extra.length} page videos`);
          const merged = [...normalized, ...extra].sort((a, b) => (b.three_second_views || 0) - (a.three_second_views || 0));
          return { videos: merged, nextCursor: data.paging?.next ? nextCursor : null };
        } catch { /* page merge failed, return IG-only */ }
      }

      return { videos: normalized, nextCursor: data.paging?.next ? nextCursor : null };
    } catch (err) {
      console.log(`[getIgMedia] IG media endpoint failed (${err.response?.data?.error?.code || err.message}), trying page fallback...`);
    }
  }

  // Fallback: fetch videos from the linked FB Page (works without instagram_business_basic)
  if (pageId) {
    const viewsMap = await viewsMapPromise;
    const pages = await getPages(token);
    const page = pages?.find(p => p.id === pageId);
    const pageToken = page?.access_token || token;
    try {
      const params = {
        access_token: pageToken,
        fields: 'id,title,description,source,picture,length,created_time,updated_time,views,source_instagram_media_id',
        limit: 50
      };
      if (after) params.after = after;
      const { data } = await metaApi.get(`/${pageId}/videos`, { params });
      const videos = (data.data || []).map(v => ({
        ...v,
        three_second_views: resolveViews(viewsMap, v.id, v.length, v.views),
        is_ig: !!v.source_instagram_media_id
      }));
      const nextCursor = data.paging?.cursors?.after || null;
      console.log(`[getIgMedia] Page fallback: ${videos.length} videos from page ${pageId}`);
      return { videos, nextCursor: data.paging?.next ? nextCursor : null };
    } catch (err2) {
      console.log(`[getIgMedia] Page fallback failed: ${err2.response?.data?.error?.message || err2.message}`);
    }
  }

  return { videos: [], nextCursor: null };
};

export const getPageAds = async (token, pageId) => {
  const { data } = await metaApi.get(`/${pageId}/ads`, {
    params: { access_token: token, fields: 'id,name,status,effective_status', limit: 25 }
  });
  return data.data;
};

export const getPagePosts = async (token, pageId) => {
  const { data } = await metaApi.get(`/${pageId}/posts`, {
    params: { access_token: token, fields: 'id,message,created_time,full_picture,permalink_url,shares,likes.summary(true),comments.summary(true)', limit: 25 }
  });
  return data.data;
};

// ─── Batch API ───────────────────────────────────────────────────────

export const batchRequest = async (token, batch) => {
  const { data } = await axios.post(`${BASE_URL}/${API_VERSION}/`, null, {
    params: { access_token: token, batch: JSON.stringify(batch) }
  });
  return data;
};

// ─── Reach & Frequency ──────────────────────────────────────────────

export const createReachFrequencyPrediction = async (token, adAccountId, params) => {
  const { data } = await metaApi.post(`/${adAccountId}/reachfrequencypredictions`, null, {
    params: { access_token: token, ...params }
  });
  return data;
};

// ─── Ad Library ──────────────────────────────────────────────────────

export const searchAdLibrary = async (token, params = {}) => {
  const { data } = await metaApi.get('/ads_archive', {
    params: {
      access_token: token,
      fields: 'id,ad_creation_time,ad_creative_bodies,ad_creative_link_captions,ad_creative_link_descriptions,ad_creative_link_titles,ad_delivery_start_time,ad_delivery_stop_time,ad_snapshot_url,page_id,page_name,publisher_platforms,bylines,estimated_audience_size,impressions,spend',
      limit: params.limit || 12,
      ...params,
    }
  });
  return data.data;
};

// ─── Publisher Block Lists ───────────────────────────────────────────

export const getPublisherBlockLists = async (token, adAccountId) => {
  const { data } = await metaApi.get(`/${adAccountId}/publisher_block_lists`, {
    params: {
      access_token: token,
      fields: 'id,name,app_publishers,web_publishers'
    }
  });
  return data.data;
};

export const createPublisherBlockList = async (token, adAccountId, name) => {
  const { data } = await metaApi.post(`/${adAccountId}/publisher_block_lists`, null, {
    params: { access_token: token, name }
  });
  return data;
};

export const deletePublisherBlockList = async (token, listId) => {
  const { data } = await metaApi.delete(`/${listId}`, {
    params: { access_token: token }
  });
  return data;
};
