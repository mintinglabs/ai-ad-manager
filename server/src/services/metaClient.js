import axios from 'axios';

const BASE_URL = process.env.META_BASE_URL || 'https://graph.facebook.com';
const API_VERSION = process.env.FB_API_VERSION || 'v19.0';

const metaApi = axios.create({ baseURL: `${BASE_URL}/${API_VERSION}`, timeout: 30000 });

// ─── Pagination Helper ───────────────────────────────────────────────

async function fetchAll(url, token, params = {}) {
  let results = [];
  let nextUrl = url;
  let isFullUrl = false;
  while (nextUrl) {
    const { data } = isFullUrl
      ? await axios.get(nextUrl)
      : await metaApi.get(nextUrl, { params: { access_token: token, ...params } });
    if (data.data) results = results.concat(data.data);
    nextUrl = data.paging?.next || null;
    isFullUrl = true;
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

export const getCampaigns = async (token, adAccountId) => {
  const { data } = await metaApi.get(`/${adAccountId}/campaigns`, {
    params: {
      access_token: token,
      fields: 'id,name,status,daily_budget,insights.date_preset(last_7d){spend,impressions,clicks,actions,action_values}'
    }
  });
  return data.data;
};

export const createCampaign = async (token, adAccountId, params) => {
  const { data } = await metaApi.post(`/${adAccountId}/campaigns`, null, {
    params: { access_token: token, ...params }
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
  const { data } = await metaApi.get(`/${campaignId}/adsets`, {
    params: {
      access_token: token,
      fields: 'id,name,status,daily_budget,targeting,optimization_goal,billing_event,bid_amount'
    }
  });
  return data.data;
};

export const getCampaignAds = async (token, campaignId) => {
  const { data } = await metaApi.get(`/${campaignId}/ads`, {
    params: {
      access_token: token,
      fields: 'id,name,status,effective_status,creative'
    }
  });
  return data.data;
};

// ─── Ad Sets ─────────────────────────────────────────────────────────

const AD_SET_FIELDS = 'id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,budget_remaining,bid_amount,bid_strategy,billing_event,optimization_goal,start_time,end_time,targeting,promoted_object,created_time,updated_time,learning_stage_info,adset_schedule';

export const getAdSets = async (token, adAccountId) => {
  const { data } = await metaApi.get(`/${adAccountId}/adsets`, {
    params: {
      access_token: token,
      fields: AD_SET_FIELDS
    }
  });
  return data.data;
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
  const { data } = await metaApi.get(`/${adSetId}/ads`, {
    params: {
      access_token: token,
      fields: 'id,name,status,effective_status,creative'
    }
  });
  return data.data;
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
  const { data } = await metaApi.get(`/${adAccountId}/ads`, {
    params: {
      access_token: token,
      fields: AD_FIELDS
    }
  });
  return data.data;
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
  const { data } = await metaApi.get(`/${adAccountId}/adcreatives`, {
    params: {
      access_token: token,
      fields: CREATIVE_FIELDS
    }
  });
  return data.data;
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
  const { data } = await metaApi.post(`/${adAccountId}/adimages`, null, {
    params: { access_token: token, bytes: imageData }
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

export const getAdVideos = async (token, adAccountId) => {
  const { data } = await metaApi.get(`/${adAccountId}/advideos`, {
    params: {
      access_token: token,
      fields: 'id,title,description,source,picture,length,status,created_time,updated_time'
    }
  });
  return data.data;
};

export const uploadAdVideo = async (token, adAccountId, params) => {
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

export const getInsights = async (token, adAccountId, datePreset = 'last_7d') => {
  const { data } = await metaApi.get(`/${adAccountId}/insights`, {
    params: {
      access_token: token,
      fields: 'spend,actions,action_values,impressions,clicks,ctr,cpm',
      date_preset: datePreset
    }
  });
  return data.data[0] || {};
};

export const getObjectInsights = async (token, objectId, params = {}) => {
  const { data } = await metaApi.get(`/${objectId}/insights`, {
    params: { access_token: token, ...params }
  });
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
  const { data } = await metaApi.get(`/${adAccountId}/customaudiences`, {
    params: {
      access_token: token,
      fields: 'id,name,subtype,description,delivery_status,operation_status,time_created,time_updated',
      limit: 50
    }
  });
  return data.data;
};

export const createCustomAudience = async (token, adAccountId, params) => {
  const subtype = (params.subtype || 'CUSTOM').toUpperCase();
  const retentionSec = (Number(params.retention_days) || 30) * 86400;
  const apiParams = {
    access_token: token,
    name: params.name,
    subtype,
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
      rule = rawRule; // already correct format as string
    } else {
      // Build proper v19+ rule format from simple params
      // Default: all website visitors from this pixel
      const filters = [];
      if (rawRule && typeof rawRule === 'object' && rawRule.url) {
        // Simple {url: {i_contains: "..."}} → convert to filter
        const urlVal = rawRule.url.i_contains || rawRule.url.eq || '';
        if (urlVal) {
          filters.push({ field: 'url', operator: rawRule.url.eq ? 'eq' : 'i_contains', value: urlVal });
        }
      }
      rule = {
        inclusions: {
          operator: 'or',
          rules: [{
            event_sources: [{ id: pixelId, type: 'pixel' }],
            retention_seconds: retentionSec,
            ...(filters.length > 0 && { filter: { operator: 'and', filters } }),
          }]
        }
      };
    }
    apiParams.rule = typeof rule === 'string' ? rule : JSON.stringify(rule);
    apiParams.prefill = 1;
  }

  // ── ENGAGEMENT audience (video, IG, page, etc.) ────────────────────
  if (subtype === 'ENGAGEMENT') {
    if (params.rule) {
      apiParams.rule = typeof params.rule === 'string' ? params.rule : JSON.stringify(params.rule);
    }
    if (params.inclusions) {
      // inclusions goes inside rule for engagement audiences too
      const inclusions = typeof params.inclusions === 'string' ? params.inclusions : JSON.stringify(params.inclusions);
      if (!apiParams.rule) apiParams.rule = inclusions;
    }
    apiParams.prefill = 1;
  }

  // ── CUSTOM audience (customer list) ────────────────────────────────
  if (subtype === 'CUSTOM') {
    apiParams.customer_file_source = params.customer_file_source || 'USER_PROVIDED_ONLY';
  }

  // ── LOOKALIKE params ───────────────────────────────────────────────
  if (params.origin_audience_id) apiParams.origin_audience_id = params.origin_audience_id;
  if (params.lookalike_spec) apiParams.lookalike_spec = typeof params.lookalike_spec === 'string' ? params.lookalike_spec : JSON.stringify(params.lookalike_spec);

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

export const addUsersToAudience = async (token, audienceId, payload) => {
  const { data } = await metaApi.post(`/${audienceId}/users`, null, {
    params: { access_token: token, payload: JSON.stringify(payload) }
  });
  return data;
};

export const removeUsersFromAudience = async (token, audienceId, payload) => {
  const { data } = await metaApi.delete(`/${audienceId}/users`, {
    params: { access_token: token, payload: JSON.stringify(payload) }
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
      fields: 'id,username,profile_pic,followers_count'
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
  const { data } = await metaApi.get(`/${adAccountId}/connected_instagram_accounts`, {
    params: {
      access_token: token,
      fields: 'id,username,profile_pic'
    }
  });
  return data.data;
};

// ─── Pages ───────────────────────────────────────────────────────────

export const getPages = async (token) => {
  const { data } = await metaApi.get('/me/accounts', {
    params: { access_token: token, fields: 'id,name,engagement,fan_count,category' }
  });
  return data.data;
};

export const getPageAds = async (token, pageId) => {
  const { data } = await metaApi.get(`/${pageId}/ads`, {
    params: { access_token: token, fields: 'id,name,status,effective_status', limit: 25 }
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
    params: { access_token: token, ...params }
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
