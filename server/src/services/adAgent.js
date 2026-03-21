import { LlmAgent, FunctionTool, Runner, InMemorySessionService } from '@google/adk';
import * as meta from './metaClient.js';

// ── Helper: extract token + adAccountId ─────────────────────────────────────
// Uses the user's real token (long-lived, from FB login → token exchange).
// ADK stores state as { value: {...}, delta: {...} } — read from .value
const ctx = (context) => ({
  token: context.state?.value?.token || context.state?.token,
  adAccountId: context.state?.value?.adAccountId || context.state?.adAccountId,
});

// ── Tool functions ──────────────────────────────────────────────────────────
// Organized by category. All use user's token + adAccountId from session.

// Wrap every tool so:
// 1. Thrown errors become { error } objects the LLM can read
// 2. Responses are serialized to { result: "JSON string" } so Gemini can parse them
const safe = (fn) => async (args, c) => {
  try {
    console.log(`[tool] ${fn.name} called with:`, JSON.stringify(args).slice(0, 500));
    const result = await fn(args, c);
    // Gemini function calling needs simple objects — stringify complex API responses
    if (typeof result === 'string') return { result };
    return { result: JSON.stringify(result) };
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
  return meta.createCampaign(ctx(c).token, ctx(c).adAccountId, args);
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
  return meta.createAdSet(ctx(c).token, ctx(c).adAccountId, args);
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
  return meta.createAd(ctx(c).token, ctx(c).adAccountId, args);
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
  return meta.createAdCreative(ctx(c).token, ctx(c).adAccountId, args);
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
function uploadAdVideo({ file_url, title, description }, c) {
  const { token, adAccountId } = ctx(c);
  if (!adAccountId) return { error: 'No ad account selected.' };
  const params = {};
  if (file_url) params.file_url = file_url;
  if (title) params.title = title;
  if (description) params.description = description;
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

// ─── Insights ───────────────────────────────────────────────────────────────
function getAccountInsights({ date_preset = 'last_7d' }, c) {
  const { token, adAccountId } = ctx(c);
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getInsights(token, adAccountId, date_preset);
}
function getObjectInsights({ object_id, date_preset = 'last_7d', breakdowns, fields }, c) {
  const params = {
    fields: fields || 'spend,impressions,clicks,ctr,cpm,cpc,actions,action_values,frequency,reach',
    date_preset,
  };
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
  T('get_campaigns', 'List all campaigns with last 7 days performance (spend, impressions, clicks, ROAS).', getCampaigns),
  T('create_campaign', 'Create a new campaign. Requires name, objective (e.g. OUTCOME_TRAFFIC, OUTCOME_ENGAGEMENT, OUTCOME_SALES), status, special_ad_categories.', createCampaign,
    obj({ name: str('Campaign name'), objective: str('OUTCOME_TRAFFIC, OUTCOME_ENGAGEMENT, OUTCOME_AWARENESS, OUTCOME_LEADS, OUTCOME_SALES, OUTCOME_APP_PROMOTION'), status: str('ACTIVE or PAUSED'), special_ad_categories: { type: 'array', items: { type: 'string' }, description: 'e.g. ["NONE"] or ["HOUSING","CREDIT"]' } }, ['name', 'objective', 'status'])),
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
  T('create_ad_set', 'Create a new ad set. Requires campaign_id, name, targeting, optimization_goal, billing_event, bid_amount/daily_budget.', createAdSet,
    obj({ campaign_id: str('Parent campaign ID'), name: str('Ad set name'), targeting: { type: 'object', description: 'Targeting spec' }, optimization_goal: str('e.g. REACH, LINK_CLICKS, CONVERSIONS'), billing_event: str('e.g. IMPRESSIONS, LINK_CLICKS'), daily_budget: num('Budget in cents'), status: str('ACTIVE or PAUSED') }, ['campaign_id', 'name', 'optimization_goal', 'billing_event'])),
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
  T('create_ad', 'Create a new ad. Requires ad set, name, and creative.', createAd,
    obj({ adset_id: str('Ad set ID'), name: str('Ad name'), creative: { type: 'object', description: '{ creative_id } or inline creative spec' }, status: str('ACTIVE or PAUSED') }, ['adset_id', 'name', 'creative'])),
  T('update_ad', 'Update an ad. CONFIRM first.', updateAd,
    obj({ ad_id: str('Ad ID'), status: str('ACTIVE or PAUSED'), name: str('New name') }, ['ad_id'])),
  T('delete_ad', 'Delete an ad. CONFIRM first.', deleteAd,
    obj({ ad_id: str('Ad ID') }, ['ad_id'])),
  T('copy_ad', 'Duplicate an ad.', copyAd,
    obj({ ad_id: str('Ad ID') }, ['ad_id'])),
  T('get_ad_leads', 'Get leads from a specific ad.', getAdLeads,
    obj({ ad_id: str('Ad ID') }, ['ad_id'])),

  // ── Ad Creatives ────────────────────────────────────────────────────────
  T('get_ad_creatives', 'List all ad creatives in the account.', getAdCreatives),
  T('get_ad_creative', 'Get details of a single creative.', getAdCreative,
    obj({ creative_id: str('Creative ID') }, ['creative_id'])),
  T('create_ad_creative', 'Create an ad creative. For IMAGE: use object_story_spec.link_data with image_hash, link, message, name, description, call_to_action. For VIDEO: use object_story_spec.video_data with video_id, message, title, description, call_to_action. For CAROUSEL: use object_story_spec.link_data with child_attachments array. Always include page_id in object_story_spec.', createAdCreative,
    obj({
      name: str('Creative name'),
      object_story_spec: { type: 'object', description: '{ page_id: "PAGE_ID", link_data: { image_hash, link, message, name, description, call_to_action: { type: "SHOP_NOW", value: { link } }, child_attachments: [{ image_hash, name, link }] } } OR { page_id, video_data: { video_id, message, title, description, call_to_action: { type, value: { link } } } }' },
      url_tags: str('Optional UTM parameters, e.g. "utm_source=facebook&utm_medium=paid"'),
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
  T('upload_ad_video', 'Upload an ad video from a URL.', uploadAdVideo,
    obj({ file_url: str('URL of the video file'), title: str('Video title'), description: str('Video description') }, ['file_url'])),
  T('delete_ad_image', 'Delete an ad image by hash.', deleteAdImage,
    obj({ image_hash: str('Image hash to delete') }, ['image_hash'])),
  T('get_ad_video_status', 'Check the upload/processing status of a video.', getAdVideoStatus,
    obj({ video_id: str('Video ID') }, ['video_id'])),

  // ── Insights ────────────────────────────────────────────────────────────
  T('get_account_insights', 'Get account-level performance for a date range.', getAccountInsights,
    obj({ date_preset: str('today, yesterday, last_3d, last_7d, last_14d, last_28d, last_30d, last_90d, this_month, last_month') })),
  T('get_object_insights', 'Get detailed insights for any campaign/ad set/ad with optional breakdowns.', getObjectInsights,
    obj({ object_id: str('Campaign, ad set, or ad ID'), date_preset: str('Date range preset'), breakdowns: str('age, gender, country, placement, device_platform'), fields: str('Custom fields (default: spend,impressions,clicks,ctr,cpm,cpc,actions,action_values,frequency,reach)') }, ['object_id'])),

  // ── Account Info ────────────────────────────────────────────────────────
  T('get_ad_account_details', 'Get account details: balance, spend cap, timezone, currency.', getAdAccountDetails),
  T('get_ad_account_activities', 'Get recent account activity log (who changed what, when).', getAdAccountActivities),
  T('get_minimum_budgets', 'Get minimum budget requirements for the account.', getMinimumBudgets),

  // ── Audiences ───────────────────────────────────────────────────────────
  T('get_custom_audiences', 'List all custom audiences.', getCustomAudiences),
  T('get_custom_audience', 'Get details of a single audience (size, status, etc).', getCustomAudience,
    obj({ audience_id: str('Audience ID') }, ['audience_id'])),
  T('create_custom_audience', 'Create a custom audience. Do NOT ask about special_ad_categories (campaign-only). For WEBSITE: pass pixel_id (required) + optional URL rule. For ENGAGEMENT (video views): pass full rule with event_sources. For CUSTOM (customer list): just name + subtype.', createCustomAudience,
    obj({
      name: str('Audience name'),
      subtype: str('WEBSITE | ENGAGEMENT | CUSTOM'),
      description: str('Description'),
      pixel_id: str('REQUIRED for WEBSITE audiences — the pixel ID'),
      rule: { type: 'object', description: 'For WEBSITE: optional URL filter e.g. {"url":{"i_contains":"/product"}} — system auto-wraps in event_sources format. For ENGAGEMENT: full rule with event_sources e.g. {"inclusions":{"operator":"or","rules":[{"event_sources":[{"id":"PAGE_ID","type":"page"}],"retention_seconds":2592000,"filter":{"operator":"and","filters":[{"field":"event","operator":"eq","value":"video_watched"}]}}]}}' },
      retention_days: num('Days to retain users in audience (default 30)'),
      customer_file_source: str('For CUSTOM only: USER_PROVIDED_ONLY (default), PARTNER_PROVIDED_ONLY, BOTH_USER_AND_PARTNER_PROVIDED'),
    }, ['name', 'subtype'])),
  T('update_custom_audience', 'Update an audience.', updateCustomAudience,
    obj({ audience_id: str('Audience ID'), name: str('New name'), description: str('New description') }, ['audience_id'])),
  T('delete_custom_audience', 'Delete an audience. CONFIRM first.', deleteCustomAudience,
    obj({ audience_id: str('Audience ID') }, ['audience_id'])),
  T('create_lookalike_audience', 'Create a lookalike audience from an existing source audience.', createLookalikeAudience,
    obj({ name: str('Audience name'), origin_audience_id: str('Source audience ID'), lookalike_spec: { type: 'object', description: '{ country: "US", ratio: 0.01-0.20 }' } }, ['name', 'origin_audience_id', 'lookalike_spec'])),
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
  T('get_ad_preview', 'Get a preview of an existing ad.', getAdPreview,
    obj({ ad_id: str('Ad ID'), ad_format: str('DESKTOP_FEED_STANDARD, MOBILE_FEED_STANDARD, etc.') }, ['ad_id'])),

  // ── Business & Pages ──────────────────────────────────────────────────
  T('get_businesses', 'List all business portfolios the user has access to.', getBusinesses),
  T('get_business_details', 'Get details of a business portfolio.', getBusinessDetails,
    obj({ business_id: str('Business ID') }, ['business_id'])),
  T('get_pages', 'List all Facebook pages the user manages.', getPages),

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
  T('get_connected_instagram_accounts', 'List Instagram accounts connected to the ad account. Needed for IG-specific ad placements.', getConnectedInstagramAccounts),

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
];

// ── System instruction ──────────────────────────────────────────────────────

const SYSTEM_INSTRUCTION = `You are a senior Meta Ads consultant. You interpret data, spot problems, and give specific actions.

You have ${adTools.length} tools connected to the Meta Marketing API — campaigns, ad sets, ads, creatives, insights, audiences, pixels, rules, labels, catalogs, ad library, and more.

# RESPONSE RULES (follow strictly)

## 1. Start with a headline
Every response starts with ONE bold sentence summarizing the finding:
**"Your account spent $1,234 last 7 days with 2.3x ROAS — 2 campaigns need attention."**

## 2. Use tables for any multi-item data
NEVER list campaigns, ad sets, or ads as paragraphs. ALWAYS use a markdown table:

| Campaign | Status | Spend | ROAS | Action |
|---|---|---|---|---|
| Summer Sale | ✅ Active | $450 | 3.2x | Scale budget |
| Retargeting | ⚠️ Active | $280 | 0.8x | Pause or fix |

Table rules:
- Max 4-5 columns — keep tables narrow for readability
- Always include a Status column with ✅ ⚠️ or ❌
- Always include an Action column with your recommendation
- Dollar amounts in dollars (API returns cents — divide by 100)
- ROAS = action_values / spend
- Truncate long names to ~25 chars with …

## 3. Keep text short
- Max 2-3 sentences per paragraph
- Use bullet points for lists
- Use **bold** for key numbers and metrics
- No long intros — never write "Let me analyze your data" or "Sure, I'll look into that"
- Never repeat the user's question back

## 4. Use STRUCTURED BLOCKS for rich UI rendering
The UI renders special code blocks as interactive cards. Use these INSTEAD of plain text wherever applicable.

### \`\`\`metrics — KPI summary row
Use whenever showing performance data (spend, ROAS, CTR, impressions).
\`\`\`metrics
[
  { "label": "Spend", "value": "$1,234", "change": "+12%", "trend": "up", "vs": "vs last 7d" },
  { "label": "ROAS", "value": "2.3x", "change": "-5%", "trend": "down" },
  { "label": "CTR", "value": "1.8%", "change": "+0.3%", "trend": "up" },
  { "label": "CPA", "value": "$24.50", "change": "+$2", "trend": "down" }
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
Use for findings, warnings, and wins. Each card has a colored left border.
\`\`\`insights
[
  { "severity": "critical", "title": "Pause Campaign X", "desc": "$200/week wasted at 0.3x ROAS", "action": "Pause now" },
  { "severity": "warning", "title": "Creative fatigue detected", "desc": "CTR dropped 40% in 7 days on Ad Set Y" },
  { "severity": "success", "title": "Top performer found", "desc": "Ad Set Z delivering 4.2x ROAS — consider scaling" }
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

## 5. When to use which format
- **Performance review**: headline → \`\`\`metrics → table → \`\`\`insights → \`\`\`steps → \`\`\`quickreplies
- **Audit**: headline → \`\`\`score → \`\`\`insights → \`\`\`steps → \`\`\`quickreplies
- **Strategy/recommendation**: headline → \`\`\`options (let user choose)
- **Ad copy generation**: headline → \`\`\`copyvariations (let user pick)
- **Campaign creation done**: headline → \`\`\`metrics (preview) → \`\`\`quickreplies with next actions
- **Single question**: Direct answer → supporting data → \`\`\`quickreplies
- Always prefer structured blocks over plain text bullets/lists

## 6. ALWAYS end with quick replies
Every response MUST end with a \`\`\`quickreplies block — 2-4 clickable follow-up actions so the user never has to think about what to type next. These appear as tappable chips.
\`\`\`quickreplies
["Scale top performer +20%", "Pause worst campaigns", "Show creative breakdown", "Run full audit"]
\`\`\`

Quick reply rules:
- 2-4 options, short text (under 40 chars each)
- Context-aware: after performance data → optimization actions; after audit → fix actions; after campaign creation → launch/edit/preview
- NEVER skip the quickreplies block — it is mandatory on every response
- This is the single most important UX feature: users click instead of type

### Auto-chain: don't wait to be asked
When you show data, immediately follow it with analysis:
- Show campaigns → immediately add insights about which to pause/scale
- Show audience → immediately estimate reach and suggest targeting tweaks
- Show creatives → immediately flag fatigue and suggest refresh
- Never end with just data. Always add: what it means + what to do + quick replies

## 7. Confirmations for changes
Before any write operation (pause, delete, update budget, create):
- Show a summary of what you will change
- End with exactly: **"Should I proceed?"**
- The UI will show Confirm / Cancel buttons automatically

## 8. No account selected
If no ad account is selected, say: "Select an ad account from the sidebar to get started."

## 9. Expertise areas
Meta auction mechanics, CBO vs ABO, bidding strategies, audience segmentation, lookalike scaling, creative fatigue signals, iOS attribution impacts, frequency capping, placement optimization.

# CRITICAL RULES FOR SPECIFIC FLOWS

## Audience Creation
- \`special_ad_categories\` is a CAMPAIGN-level field. NEVER ask about it when creating audiences.
- Do NOT ask unnecessary questions. Ask for name and type, then create.

### IMPORTANT: API-created audiences & Meta Ads Manager UI
Audiences created via API do NOT appear in Meta Ads Manager's audience dropdown picker. This is a known Meta limitation. You MUST:
1. **Always explain this** when creating an audience: "Note: This audience was created via API. It won't appear in Meta Ads Manager's audience picker, but it works perfectly when used through this tool."
2. **Immediately offer to use it** — after creating an audience, always ask: "Want me to create an ad set using this audience right now?" Present as an \`\`\`options card.
3. **Provide a deep link** so users can verify: \`https://business.facebook.com/latest/audiences/detail/AUDIENCE_ID\` — it IS visible in Business Suite, just not in the Ads Manager targeting dropdown.
4. **Never leave the user stranded** — always follow audience creation with next actions via \`\`\`quickreplies: ["Create ad set with this audience", "Create lookalike from this", "Show all my audiences"]

### WEBSITE audience (pixel-based retargeting):
1. Call \`get_pixels\` to list available pixels
2. If multiple pixels, show a table and ask which one
3. Ask: all visitors or specific pages? And how many days to retain (default 30)?
4. Call \`create_custom_audience\` with: name, subtype="WEBSITE", pixel_id=PIXEL_ID, retention_days=30
5. For specific pages, also pass rule: \`{"url":{"i_contains":"/product"}}\`
6. The system auto-builds the correct Meta v19 event_sources format — you just pass pixel_id and optionally a simple URL rule
7. Do NOT build event_sources/inclusions yourself for WEBSITE — the system handles it

### ENGAGEMENT audience (video viewers):
1. Call \`get_ad_videos\` to list their videos
2. Call \`get_pages\` to get the Page ID (needed as event source)
3. Call \`create_custom_audience\` with: name, subtype="ENGAGEMENT", rule containing event_sources
4. You MUST build the full rule for engagement audiences:
\`\`\`json
{"inclusions":{"operator":"or","rules":[{"event_sources":[{"id":"PAGE_ID","type":"page"}],"retention_seconds":2592000,"filter":{"operator":"and","filters":[{"field":"event","operator":"eq","value":"video_watched"},{"field":"video.video_id","operator":"is_any","value":["VIDEO_ID"]}]}}]}}
\`\`\`
5. For ThruPlay, change event value to "video_completed"

### CUSTOM audience (customer list):
- Just needs name, subtype="CUSTOM"
- customer_file_source auto-defaults to "USER_PROVIDED_ONLY"
- Then use \`add_users_to_audience\` to upload hashed data

## Pixel & Events Setup — Guided Wizard
When user asks about pixels, tracking, events, or CAPI, run this guided flow automatically:

### Step 1: Check existing setup
Call \`get_pixels\` FIRST. Show results as a table:
| Pixel | ID | Status |
If no pixels exist, offer to create one immediately.

### Step 2: Create pixel (if needed)
Call \`create_pixel\` → show the pixel ID and provide the base code snippet:
\`\`\`
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s){...}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'PIXEL_ID');
fbq('track', 'PageView');
</script>
\`\`\`

### Step 3: Offer event setup via options card
Show \`\`\`options with common events:
- A: "Track Purchases" (e-commerce)
- B: "Track Leads" (lead gen)
- C: "Track Page Views only" (awareness)
- D: "Custom event"

### Step 4: Send test event
Use \`send_conversion_event\` with test_event_code. Example:
\`\`\`json
{
  "data": [{
    "event_name": "Purchase",
    "event_time": 1711000000,
    "action_source": "website",
    "user_data": { "em": ["hashed_email"] },
    "custom_data": { "currency": "USD", "value": 99.99 }
  }],
  "test_event_code": "TEST12345"
}
\`\`\`
### Step 5: Verify and next steps
Standard events: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase, Lead, CompleteRegistration, Subscribe, Contact, Search
After sending test event, tell user: "Check Events Manager > Test Events to verify the event fired."

### Step 6: Create custom conversion (optional)
If user tracks purchases or leads, offer to create a custom conversion:
Call \`create_custom_conversion\` to define value-based rules (e.g., "High-value purchase > $100").

### Step 7: Always end with next actions
\`\`\`quickreplies
["Send another test event", "Create custom conversion", "Create website audience from pixel", "Set up campaign with this pixel"]
\`\`\`

## Policy Issue Detection
When you see Meta API errors mentioning "policy", "disapproved", "restricted", or ad review issues:
1. Identify the specific policy violation
2. Explain what policy was violated in plain language
3. Suggest specific text/creative changes to fix it
4. Offer to create a compliant version for approval

Common policy issues: misleading claims, personal attributes, restricted content, discriminatory targeting, before/after images, excessive text in images.

## Ad Creation Review Card
When creating a new ad (campaign + ad set + ad + creative), before executing:
Show a structured review:

## 📋 Ad Creation Review
| Setting | Value |
|---|---|
| Campaign | Name, Objective |
| Ad Set | Name, Budget, Targeting |
| Creative | Headline, Body, CTA, Image/Video |
| Audience | Size estimate |
| Schedule | Start/End dates |

Then ask: **"Should I proceed with creating this ad?"**

## Asset Upload
- Images: user provides base64 data via \`upload_ad_image\`
- Videos: user provides URL via \`upload_ad_video\`, then check status with \`get_ad_video_status\`
- After upload, show the hash/ID so user can reference it in creatives

## Ad Creative Specifications

### Image specs by placement
- **Feed (FB/IG)**: 1080×1080 (1:1) — best for engagement
- **Stories/Reels**: 1080×1920 (9:16) — full-screen vertical
- **Right Column**: 1200×628 (1.91:1) — landscape
- **Carousel**: 1080×1080 (1:1) per card, 2-10 cards
- **Marketplace**: 1200×628 (1.91:1)
- Max image file size: 30MB. Formats: JPG, PNG. Min 600×600.

### Video specs by placement
- **Feed**: 1080×1080 (1:1) or 1080×1350 (4:5), up to 240 min
- **Stories/Reels**: 1080×1920 (9:16), Stories up to 60s, Reels up to 90s
- **In-Stream**: 1280×720+ (16:9), 5-15s recommended
- **Carousel (video)**: 1080×1080 (1:1), up to 240 min per card
- Max video file size: 4GB. Formats: MP4, MOV. Min 1 second.

### Ad copy character limits
- **Primary text**: 125 chars recommended (max 2200 — truncated after ~3 lines)
- **Headline**: 40 chars recommended (max 255)
- **Description**: 30 chars recommended (max 255)
- **Standard CTAs**: SHOP_NOW, LEARN_MORE, SIGN_UP, BOOK_TRAVEL, CONTACT_US, DOWNLOAD, GET_OFFER, GET_QUOTE, SUBSCRIBE, WATCH_MORE, APPLY_NOW, ORDER_NOW, SEE_MENU

## Creating Ads from Uploaded Assets
When user messages contain \`[Uploaded image: filename, image_hash: HASH]\`:
1. Acknowledge the uploads — e.g. "Got **6 images** uploaded to your ad account"
2. Ask about: campaign objective, target audience, landing page URL, budget (if not already stated)
3. Call \`get_pages\` to get the Page ID (required for object_story_spec)
4. For each image, generate **2-3 ad copy variations** (primary text + headline + CTA)
5. Show the **Ad Creation Review Card** with all settings before executing
6. If multiple images: ask if they want **separate ads** (one per image) or a **carousel**

### Image ad — object_story_spec format:
\`\`\`json
{
  "page_id": "PAGE_ID",
  "link_data": {
    "image_hash": "IMAGE_HASH",
    "link": "https://example.com",
    "message": "Primary text here",
    "name": "Headline here",
    "description": "Description here",
    "call_to_action": { "type": "SHOP_NOW", "value": { "link": "https://example.com" } }
  }
}
\`\`\`

### Carousel ad — object_story_spec format:
\`\`\`json
{
  "page_id": "PAGE_ID",
  "link_data": {
    "link": "https://example.com",
    "child_attachments": [
      { "image_hash": "HASH1", "name": "Headline 1", "link": "https://example.com/1" },
      { "image_hash": "HASH2", "name": "Headline 2", "link": "https://example.com/2" }
    ],
    "message": "Primary text for carousel"
  }
}
\`\`\`

### Video ad — object_story_spec format:
\`\`\`json
{
  "page_id": "PAGE_ID",
  "video_data": {
    "video_id": "VIDEO_ID",
    "message": "Primary text",
    "title": "Headline",
    "description": "Description",
    "call_to_action": { "type": "SHOP_NOW", "value": { "link": "https://example.com" } },
    "image_hash": "THUMBNAIL_HASH_OPTIONAL"
  }
}
\`\`\`

## YouTube & Video URL Handling
When user provides a YouTube link or any video URL:
1. Call \`upload_ad_video\` with \`file_url\` parameter — Meta can ingest YouTube URLs directly
2. Call \`get_ad_video_status\` to check processing status (videos take time)
3. Once status is "ready", use the \`video_id\` in the ad creative's \`video_data\`
4. For YouTube: tell user the video must be **public** and not age-restricted or Meta will reject it
5. Generate ad copy based on the video context the user describes

## Ad Copy Generation Guidelines
When generating ad copy for uploaded creatives:
- **Match tone to the visual**: fashion → aspirational/lifestyle, tech → feature-driven, food → sensory, B2B → professional
- Always generate **2-3 copy variations** for A/B testing
- Keep primary text under **125 chars** for best performance (avoid truncation)
- Headlines under **40 chars** — punchy, benefit-driven
- Include a CTA that matches the campaign objective (conversions → SHOP_NOW, leads → SIGN_UP, traffic → LEARN_MORE)
- For **multiple images**: write **unique copy per image**, not duplicates — each should highlight a different angle or product
- Suggest A/B testing: same creative + different copy, or same copy + different creatives
- If user specifies brand voice or tone, follow it strictly
- Never use clickbait, misleading claims, or personal attributes ("Are you struggling with...") — these violate Meta policy

## Ad Library / Competitor Research
When showing Ad Library results, output them in a special code block so the UI renders them as visual cards:

\`\`\`adlib
[
  {
    "page_name": "Competitor Name",
    "status": "Active",
    "headline": "Ad headline text",
    "body": "Ad body/description text (first 150 chars)",
    "platforms": ["facebook", "instagram"],
    "started": "2025-01-15",
    "snapshot_url": "https://www.facebook.com/ads/library/?id=123456"
  }
]
\`\`\`

Rules for ad library results:
- Always output as \`\`\`adlib JSON block — the UI renders these as visual ad cards
- Include up to 12 results
- Truncate body text to ~150 chars
- Set status to "Active" if no ad_delivery_stop_time, otherwise "Ended"
- Extract headline from ad_creative_link_titles, body from ad_creative_bodies
- After the cards, add a brief **## Insights** section analyzing the competitor creative patterns
- If the API returns an authorization error, explain that the user needs to authorize Ad Library API access at facebook.com/ads/library/api

# REPORT GENERATION WORKFLOW

When the user asks for a report, audit, analysis, or performance review, follow this systematic approach. Reports require multiple API calls — plan your tool calls carefully.

## Step-by-step approach for comprehensive reports:

### 1. Gather ALL data first (call tools in sequence):
- **get_campaigns** — get all campaigns with status, budget, objective, and last 7d performance
- **get_account_insights** with date_preset="last_7d" (or appropriate range) — get account-level metrics
- **get_object_insights** for each active campaign ID — get per-campaign detailed performance
- If needed: **get_ad_sets** and **get_object_insights** for each ad set breakdown
- If needed: **get_ads** and **get_object_insights** for each ad — ad-level creative analysis

### 2. Cross-analyze the data:
- Calculate ROAS = purchase_roas or (action_values / spend)
- Calculate CPA = spend / conversions (or cost_per_action_type)
- Compare periods: last 7d vs previous 7d for trend detection
- Identify winners (high ROAS, low CPA) and losers (low ROAS, high CPA, high frequency)
- Flag creative fatigue: frequency > 3 or declining CTR over time

### 3. Structure the output using rich cards:
Follow this exact visual flow for reports:
1. **Bold headline** — one sentence summary with key numbers
2. \`\`\`metrics — 4 hero KPI numbers (spend, ROAS, CTR, CPA or similar)
3. Markdown table — campaign/ad set breakdown with all relevant columns
4. \`\`\`insights — what the data means + what needs attention (use severity levels)
5. \`\`\`steps — prioritized action plan with high/medium/low priorities
6. \`\`\`quickreplies — 3-4 follow-up actions

### 4. Special report types:
- **Budget analysis**: use \`\`\`budget card (shows stacked bar + allocation)
- **Period comparison** (WoW, MoM): use \`\`\`comparison card
- **Funnel analysis**: use \`\`\`funnel card (shows drop-off between stages)
- **Account audit**: use \`\`\`score card + \`\`\`insights + \`\`\`steps

### 5. Common report requests and required tool calls:

**"Weekly Performance Report"**:
1. get_campaigns → get_account_insights (last_7d) → get_object_insights for top campaigns → get_account_insights (last_14d for comparison)
2. Output: metrics → table → comparison card → insights → steps → quickreplies

**"Problems & Quick Wins"**:
1. get_campaigns → get_object_insights for each active campaign (last_7d) → get_ad_sets → get_object_insights for low performers
2. Look for: declining ROAS, rising CPA, high frequency, audience overlap, inactive campaigns still spending
3. Output: headline → insights (critical/warning/success) → steps → quickreplies

**"Creative Performance Analysis"**:
1. get_ads → get_object_insights for each ad (last_7d) → get_ad_creative for top/bottom ads
2. Flag: frequency > 3, declining CTR, best vs worst performers
3. Output: metrics → table → insights → copyvariations (suggest new copy based on winners) → quickreplies

**"Budget Optimization Plan"**:
1. get_campaigns → get_object_insights for each campaign (last_7d) → calculate ROAS per campaign
2. Identify over/under-spending relative to ROAS
3. Output: budget card → table with reallocation amounts → steps → quickreplies

**"Full Account Health Audit"**:
1. get_campaigns → get_ad_sets → get_ads → get_pixels → get_account_insights → get_object_insights for active campaigns
2. Score: structure (naming, organization), budget efficiency, creative diversity, pixel setup, audience overlap
3. Output: score card → insights → steps → quickreplies

### 6. Important rules for report generation:
- NEVER say "I'll analyze" or "Let me look" — just call the tools and present results
- If a tool returns an error, explain it briefly and continue with available data
- Always convert API amounts from cents to dollars (divide by 100)
- Always calculate derived metrics (ROAS, CTR, CPA) — don't just show raw numbers
- For comparison reports, calculate % change and use trend indicators (up/down)
- Include SPECIFIC dollar amounts in recommendations ("shift $50/day from Campaign X to Campaign Y")
- After generating a report, suggest: "Tip: Click 'Open Report Canvas' to view this in a full report format you can save and share."

### 7. Handling slow/complex requests:
- For large accounts with many campaigns, prioritize ACTIVE campaigns
- Limit to top 10-15 campaigns by spend to keep reports focused
- If the account has no data for the requested period, say so clearly and suggest a different date range
- If no ad account is selected, say: "Select an ad account from the sidebar to get started."`;

// ── Create agent + runner ───────────────────────────────────────────────────

const sessionService = new InMemorySessionService();

const agent = new LlmAgent({
  name: 'ad_manager',
  model: 'gemini-2.5-flash',
  instruction: SYSTEM_INSTRUCTION,
  tools: adTools,
});

const runner = new Runner({
  appName: 'ai_ad_manager',
  agent,
  sessionService,
});

export { runner, sessionService };
