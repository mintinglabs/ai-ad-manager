import { LlmAgent, FunctionTool, Runner, InMemorySessionService } from '@google/adk';
import * as meta from './metaClient.js';

// ── Helper: extract token + adAccountId ─────────────────────────────────────
// Always use META_DEMO_TOKEN for data access (FB Login token is auth-only).
// ADK stores state as { value: {...}, delta: {...} } — read from .value
const ctx = (context) => ({
  token: process.env.META_DEMO_TOKEN,
  adAccountId: context.state?.value?.adAccountId || context.state?.adAccountId,
});

// ── Tool functions ──────────────────────────────────────────────────────────
// Organized by category. All use META_DEMO_TOKEN + adAccountId from session.

// Wrap every tool so:
// 1. Thrown errors become { error } objects the LLM can read
// 2. Responses are serialized to { result: "JSON string" } so Gemini can parse them
const safe = (fn) => async (args, c) => {
  try {
    const result = await fn(args, c);
    // Gemini function calling needs simple objects — stringify complex API responses
    if (typeof result === 'string') return { result };
    return { result: JSON.stringify(result) };
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message || 'Unknown error';
    console.error(`[tool] ${fn.name} error:`, msg);
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

// ─── Ad Library ─────────────────────────────────────────────────────────────
function searchAdLibrary(args, c) {
  return meta.searchAdLibrary(ctx(c).token, args);
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
  T('create_ad_creative', 'Create an ad creative with image, video, or carousel.', createAdCreative,
    obj({ name: str('Creative name'), object_story_spec: { type: 'object', description: 'Story spec with page_id, link_data, etc.' } }, ['name'])),
  T('update_ad_creative', 'Update an ad creative.', updateAdCreative,
    obj({ creative_id: str('Creative ID') }, ['creative_id'])),
  T('delete_ad_creative', 'Delete an ad creative.', deleteAdCreative,
    obj({ creative_id: str('Creative ID') }, ['creative_id'])),

  // ── Assets ──────────────────────────────────────────────────────────────
  T('get_ad_images', 'List all ad images in the account.', getAdImages),
  T('get_ad_videos', 'List all ad videos in the account.', getAdVideos),

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
  T('create_custom_audience', 'Create a new custom audience.', createCustomAudience,
    obj({ name: str('Audience name'), description: str('Description'), subtype: str('WEBSITE, APP, ENGAGEMENT') }, ['name'])),
  T('update_custom_audience', 'Update an audience.', updateCustomAudience,
    obj({ audience_id: str('Audience ID'), name: str('New name'), description: str('New description') }, ['audience_id'])),
  T('delete_custom_audience', 'Delete an audience. CONFIRM first.', deleteCustomAudience,
    obj({ audience_id: str('Audience ID') }, ['audience_id'])),
  T('create_lookalike_audience', 'Create a lookalike audience from an existing source audience.', createLookalikeAudience,
    obj({ name: str('Audience name'), origin_audience_id: str('Source audience ID'), lookalike_spec: { type: 'object', description: '{ country: "US", ratio: 0.01-0.20 }' } }, ['name', 'origin_audience_id', 'lookalike_spec'])),
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

  // ── Ad Library ────────────────────────────────────────────────────────
  T('search_ad_library', 'Search the Meta Ad Library for competitor ads. Requires ad_reached_countries.', searchAdLibrary,
    obj({ search_terms: str('Keywords to search'), ad_reached_countries: { type: 'array', items: { type: 'string' }, description: 'Country codes e.g. ["US","GB"]' }, ad_type: str('ALL, POLITICAL_AND_ISSUE_ADS') }, ['ad_reached_countries'])),
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

| Campaign | Status | Spend | ROAS | Impressions | Action |
|---|---|---|---|---|---|
| Summer Sale | ✅ Active | $450 | 3.2x | 45,200 | Scale budget |
| Retargeting | ⚠️ Active | $280 | 0.8x | 12,100 | Pause or fix |

Table rules:
- Max 5-6 columns
- Always include a Status column with ✅ ⚠️ or ❌
- Always include an Action column with your recommendation
- Dollar amounts in dollars (API returns cents — divide by 100)
- ROAS = action_values / spend

## 3. Keep text short
- Max 2-3 sentences per paragraph
- Use bullet points for lists
- Use **bold** for key numbers and metrics
- No long intros — never write "Let me analyze your data" or "Sure, I'll look into that"
- Never repeat the user's question back

## 4. Use section headers
Break every response into sections:
## Overview (headline + table)
## Issues Found (with ✅ ⚠️ ❌)
## Next Steps (numbered actions)

## 5. End with numbered actions
Every response ends with:
## Next Steps
1. 🔴 **[Urgent]** Pause Campaign X — $200/week wasted at 0.3x ROAS
2. 🟡 **[This week]** Test new creative for Ad Set Y — CTR dropped 40%
3. 🟢 **[Opportunity]** Create lookalike from top converters

## 6. Audits use a score
When auditing, give a score:
**Account Health: 7/10**
Then list what's good (✅) and what needs fixing (❌).

## 7. Confirmations for changes
Before any write operation (pause, delete, update budget, create):
- State exactly what you'll change
- Show the expected impact
- Ask "Should I proceed?" so the user can confirm or cancel

## 8. No account selected
If no ad account is selected, say: "Select an ad account from the sidebar to get started."

## 9. Expertise areas (reference when relevant)
Meta auction mechanics, CBO vs ABO, bidding strategies, audience segmentation, lookalike scaling, creative fatigue signals, iOS attribution impacts, frequency capping, placement optimization.`;

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
