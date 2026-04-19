import { FunctionTool } from '@google/adk';
import { enums } from 'google-ads-api';
import { getCustomer, handleApiError, parseDateRange, statusLabel } from '../api/google/client.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
const safe = (fn) => async (args, ctx) => {
  try { return await fn(args, ctx); }
  catch (e) { return { error: e?.message || String(e) }; }
};

const T = (name, description, execute, parameters) => {
  const opts = { name, description, execute: safe(execute) };
  if (parameters) opts.parameters = parameters;
  return new FunctionTool(opts);
};

const obj = (props, required) => ({ type: 'object', properties: props, ...(required ? { required } : {}) });
const str = (desc) => ({ type: 'string', description: desc });
const num = (desc) => ({ type: 'number', description: desc });
const bool = (desc) => ({ type: 'boolean', description: desc });

const DATE_RANGE_ENUM = { type: 'string', description: 'Date range. One of: TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, LAST_90_DAYS, THIS_MONTH, LAST_MONTH. Default: LAST_30_DAYS' };

function truncate(arr, max = 50) {
  return Array.isArray(arr) && arr.length > max ? arr.slice(0, max) : arr;
}

// ── Tool implementations ──────────────────────────────────────────────────────

async function accountOverview({ dateRange, accountId, loginCustomerId }) {
  const customer = getCustomer(accountId, loginCustomerId);
  const range = parseDateRange(dateRange);
  const [accountRows, metricsRows, campaignCountRows] = await Promise.all([
    customer.query(`SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.manager, customer.status, customer.optimization_score FROM customer LIMIT 1`),
    customer.query(`SELECT metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.conversions_value, metrics.all_conversions FROM customer WHERE segments.date DURING ${range}`),
    customer.query(`SELECT campaign.id FROM campaign WHERE campaign.status != 'REMOVED'`),
  ]);
  const info = accountRows[0]?.customer;
  const totals = metricsRows.reduce((acc, row) => ({
    clicks: acc.clicks + Number(row.metrics?.clicks ?? 0),
    impressions: acc.impressions + Number(row.metrics?.impressions ?? 0),
    spend: acc.spend + Number(row.metrics?.cost_micros ?? 0) / 1_000_000,
    conversions: acc.conversions + Number(row.metrics?.conversions ?? 0),
    conversionsValue: acc.conversionsValue + Number(row.metrics?.conversions_value ?? 0),
  }), { clicks: 0, impressions: 0, spend: 0, conversions: 0, conversionsValue: 0 });

  return {
    account: { id: String(info?.id ?? ''), name: info?.descriptive_name ?? '', currencyCode: info?.currency_code ?? '', timeZone: info?.time_zone ?? '', optimizationScore: Number(info?.optimization_score ?? 0) },
    metrics: { ...totals, avgCtr: totals.impressions > 0 ? totals.clicks / totals.impressions : 0, avgCpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0, cpa: totals.conversions > 0 ? totals.spend / totals.conversions : 0, roas: totals.spend > 0 ? totals.conversionsValue / totals.spend : 0 },
    campaignCount: campaignCountRows.length,
  };
}

async function listCampaigns({ dateRange, accountId, loginCustomerId }) {
  const customer = getCustomer(accountId, loginCustomerId);
  const range = parseDateRange(dateRange);
  const rows = await customer.query(`
    SELECT campaign.id, campaign.name, campaign.status, campaign_budget.amount_micros,
      metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value, metrics.ctr, metrics.average_cpc, customer.descriptive_name
    FROM campaign WHERE segments.date DURING ${range} AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC LIMIT 50
  `);
  return { campaigns: truncate(rows.map(row => ({
    id: String(row.campaign?.id ?? ''), name: row.campaign?.name ?? '', status: statusLabel(row.campaign?.status ?? ''),
    dailyBudget: Number(row.campaign_budget?.amount_micros ?? 0) / 1_000_000,
    spend: Number(row.metrics?.cost_micros ?? 0) / 1_000_000, impressions: Number(row.metrics?.impressions ?? 0),
    clicks: Number(row.metrics?.clicks ?? 0), conversions: Number(row.metrics?.conversions ?? 0),
    conversionsValue: Number(row.metrics?.conversions_value ?? 0), ctr: Number(row.metrics?.ctr ?? 0),
    avgCpc: Number(row.metrics?.average_cpc ?? 0) / 1_000_000,
    roas: Number(row.metrics?.cost_micros ?? 0) > 0 ? Number(row.metrics?.conversions_value ?? 0) / (Number(row.metrics?.cost_micros ?? 0) / 1_000_000) : 0,
    accountName: row.customer?.descriptive_name ?? '',
  }))) };
}

async function campaignInsights({ campaignId, dateRange, accountId, loginCustomerId }) {
  const customer = getCustomer(accountId, loginCustomerId);
  const range = parseDateRange(dateRange);
  const rows = await customer.query(`
    SELECT campaign.id, campaign.name, campaign.status, campaign.bidding_strategy_type, campaign_budget.amount_micros,
      metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.conversions_value, metrics.ctr, metrics.average_cpc, segments.date
    FROM campaign WHERE campaign.id = ${campaignId} AND segments.date DURING ${range}
    ORDER BY segments.date ASC
  `);
  if (!rows.length) return { error: `No data found for campaign ${campaignId} in ${range}.` };
  const first = rows[0];
  const daily = rows.map(row => ({
    date: row.segments?.date ?? '', clicks: Number(row.metrics?.clicks ?? 0), impressions: Number(row.metrics?.impressions ?? 0),
    spend: Number(row.metrics?.cost_micros ?? 0) / 1_000_000, conversions: Number(row.metrics?.conversions ?? 0),
    conversionsValue: Number(row.metrics?.conversions_value ?? 0), ctr: Number(row.metrics?.ctr ?? 0),
    avgCpc: Number(row.metrics?.average_cpc ?? 0) / 1_000_000,
  }));
  const totals = daily.reduce((acc, d) => ({ clicks: acc.clicks + d.clicks, impressions: acc.impressions + d.impressions, spend: acc.spend + d.spend, conversions: acc.conversions + d.conversions, conversionsValue: acc.conversionsValue + d.conversionsValue }), { clicks: 0, impressions: 0, spend: 0, conversions: 0, conversionsValue: 0 });
  return { campaignId, campaignName: first?.campaign?.name ?? '', campaignStatus: statusLabel(first?.campaign?.status ?? ''), biddingStrategyType: String(first?.campaign?.bidding_strategy_type ?? ''), dailyBudget: Number(first?.campaign_budget?.amount_micros ?? 0) / 1_000_000, ...totals, avgCtr: totals.impressions > 0 ? totals.clicks / totals.impressions : 0, avgCpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0, cpa: totals.conversions > 0 ? totals.spend / totals.conversions : 0, roas: totals.spend > 0 ? totals.conversionsValue / totals.spend : 0, dailyMetrics: daily };
}

async function listAdGroups({ campaignId, dateRange, accountId, loginCustomerId }) {
  const customer = getCustomer(accountId, loginCustomerId);
  const range = parseDateRange(dateRange);
  const rows = await customer.query(`
    SELECT ad_group.id, ad_group.name, ad_group.status, ad_group.type,
      metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.ctr, metrics.average_cpc
    FROM ad_group WHERE campaign.id = ${campaignId} AND segments.date DURING ${range} AND ad_group.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
  `);
  return { adGroups: rows.map(row => ({ id: String(row.ad_group?.id ?? ''), name: row.ad_group?.name ?? '', status: statusLabel(row.ad_group?.status ?? ''), type: String(row.ad_group?.type ?? ''), clicks: Number(row.metrics?.clicks ?? 0), impressions: Number(row.metrics?.impressions ?? 0), spend: Number(row.metrics?.cost_micros ?? 0) / 1_000_000, conversions: Number(row.metrics?.conversions ?? 0), ctr: Number(row.metrics?.ctr ?? 0), avgCpc: Number(row.metrics?.average_cpc ?? 0) / 1_000_000 })), campaignId };
}

async function listKeywords({ campaignId, adGroupId, dateRange, accountId, loginCustomerId }) {
  const customer = getCustomer(accountId, loginCustomerId);
  const range = parseDateRange(dateRange);
  let gaql = `SELECT ad_group_criterion.criterion_id, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ad_group_criterion.status, ad_group_criterion.quality_info.quality_score, ad_group.id, ad_group.name, metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.ctr, metrics.average_cpc FROM keyword_view WHERE campaign.id = ${campaignId} AND segments.date DURING ${range} AND ad_group_criterion.status != 'REMOVED'`;
  if (adGroupId) gaql += ` AND ad_group.id = ${adGroupId}`;
  gaql += ` ORDER BY metrics.impressions DESC LIMIT 200`;
  const rows = await customer.query(gaql);
  return { keywords: rows.map(row => ({ criterionId: String(row.ad_group_criterion?.criterion_id ?? ''), text: row.ad_group_criterion?.keyword?.text ?? '', matchType: String(row.ad_group_criterion?.keyword?.match_type ?? ''), status: statusLabel(row.ad_group_criterion?.status ?? ''), qualityScore: row.ad_group_criterion?.quality_info?.quality_score ?? null, adGroupId: String(row.ad_group?.id ?? ''), adGroupName: row.ad_group?.name ?? '', clicks: Number(row.metrics?.clicks ?? 0), impressions: Number(row.metrics?.impressions ?? 0), spend: Number(row.metrics?.cost_micros ?? 0) / 1_000_000, conversions: Number(row.metrics?.conversions ?? 0), ctr: Number(row.metrics?.ctr ?? 0), avgCpc: Number(row.metrics?.average_cpc ?? 0) / 1_000_000 })), campaignId };
}

async function listSearchTerms({ campaignId, dateRange, accountId, loginCustomerId }) {
  const customer = getCustomer(accountId, loginCustomerId);
  const range = parseDateRange(dateRange);
  const rows = await customer.query(`SELECT search_term_view.search_term, search_term_view.status, segments.keyword.info.text, segments.keyword.info.match_type, ad_group.id, metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.ctr FROM search_term_view WHERE campaign.id = ${campaignId} AND segments.date DURING ${range} ORDER BY metrics.impressions DESC LIMIT 500`);
  return { searchTerms: rows.map(row => ({ searchTerm: row.search_term_view?.search_term ?? '', status: String(row.search_term_view?.status ?? ''), keywordText: row.segments?.keyword?.info?.text ?? '', keywordMatchType: String(row.segments?.keyword?.info?.match_type ?? ''), adGroupId: String(row.ad_group?.id ?? ''), clicks: Number(row.metrics?.clicks ?? 0), impressions: Number(row.metrics?.impressions ?? 0), spend: Number(row.metrics?.cost_micros ?? 0) / 1_000_000, conversions: Number(row.metrics?.conversions ?? 0), ctr: Number(row.metrics?.ctr ?? 0) })), campaignId };
}

async function listAds({ campaignId, dateRange, accountId, loginCustomerId }) {
  const customer = getCustomer(accountId, loginCustomerId);
  const range = parseDateRange(dateRange);
  const rows = await customer.query(`SELECT ad_group_ad.ad.id, ad_group_ad.ad.type, ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_search_ad.descriptions, ad_group_ad.ad.final_urls, ad_group_ad.status, ad_group.id, ad_group.name, metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.ctr FROM ad_group_ad WHERE campaign.id = ${campaignId} AND segments.date DURING ${range} AND ad_group_ad.status != 'REMOVED' ORDER BY metrics.impressions DESC`);
  return { ads: rows.map(row => { const rsa = row.ad_group_ad?.ad?.responsive_search_ad; return { id: String(row.ad_group_ad?.ad?.id ?? ''), adGroupId: String(row.ad_group?.id ?? ''), adGroupName: row.ad_group?.name ?? '', type: String(row.ad_group_ad?.ad?.type ?? ''), status: statusLabel(row.ad_group_ad?.status ?? ''), headlines: (rsa?.headlines ?? []).map(h => h.text ?? ''), descriptions: (rsa?.descriptions ?? []).map(d => d.text ?? ''), finalUrls: row.ad_group_ad?.ad?.final_urls ?? [], clicks: Number(row.metrics?.clicks ?? 0), impressions: Number(row.metrics?.impressions ?? 0), spend: Number(row.metrics?.cost_micros ?? 0) / 1_000_000, conversions: Number(row.metrics?.conversions ?? 0), ctr: Number(row.metrics?.ctr ?? 0) }; }), campaignId };
}

async function googleReports({ reportType, breakdown, demographicType, campaignId, dateRange, accountId, loginCustomerId }) {
  const customer = getCustomer(accountId, loginCustomerId);
  const range = parseDateRange(dateRange);
  const campaignFilter = campaignId ? ` AND campaign.id = ${campaignId}` : '';

  if (reportType === 'devices') {
    const rows = await customer.query(`SELECT segments.device, campaign.id, campaign.name, metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.ctr, metrics.average_cpc FROM campaign WHERE segments.date DURING ${range} AND campaign.status != 'REMOVED'${campaignFilter} ORDER BY metrics.cost_micros DESC`);
    return { devicePerformance: rows.map(row => ({ device: String(row.segments?.device ?? ''), campaignId: String(row.campaign?.id ?? ''), campaignName: row.campaign?.name ?? '', clicks: Number(row.metrics?.clicks ?? 0), impressions: Number(row.metrics?.impressions ?? 0), spend: Number(row.metrics?.cost_micros ?? 0) / 1_000_000, conversions: Number(row.metrics?.conversions ?? 0), ctr: Number(row.metrics?.ctr ?? 0), avgCpc: Number(row.metrics?.average_cpc ?? 0) / 1_000_000 })) };
  }
  if (reportType === 'geo') {
    const rows = await customer.query(`SELECT geographic_view.country_criterion_id, geographic_view.location_type, campaign.id, campaign.name, metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.ctr FROM geographic_view WHERE segments.date DURING ${range}${campaignFilter} ORDER BY metrics.cost_micros DESC LIMIT 200`);
    return { geoPerformance: rows.map(row => ({ countryId: String(row.geographic_view?.country_criterion_id ?? ''), locationType: String(row.geographic_view?.location_type ?? ''), campaignId: String(row.campaign?.id ?? ''), campaignName: row.campaign?.name ?? '', clicks: Number(row.metrics?.clicks ?? 0), impressions: Number(row.metrics?.impressions ?? 0), spend: Number(row.metrics?.cost_micros ?? 0) / 1_000_000, conversions: Number(row.metrics?.conversions ?? 0), ctr: Number(row.metrics?.ctr ?? 0) })) };
  }
  if (reportType === 'landing-pages') {
    const rows = await customer.query(`SELECT landing_page_view.unexpanded_final_url, campaign.id, campaign.name, metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.ctr FROM landing_page_view WHERE segments.date DURING ${range}${campaignFilter} ORDER BY metrics.clicks DESC LIMIT 100`);
    return { landingPages: rows.map(row => ({ url: row.landing_page_view?.unexpanded_final_url ?? '', campaignId: String(row.campaign?.id ?? ''), campaignName: row.campaign?.name ?? '', clicks: Number(row.metrics?.clicks ?? 0), impressions: Number(row.metrics?.impressions ?? 0), spend: Number(row.metrics?.cost_micros ?? 0) / 1_000_000, conversions: Number(row.metrics?.conversions ?? 0), ctr: Number(row.metrics?.ctr ?? 0) })) };
  }
  return { error: 'Invalid reportType. Use: devices, geo, landing-pages' };
}

async function listAudiences({ type = 'all', accountId, loginCustomerId }) {
  const customer = getCustomer(accountId, loginCustomerId);
  const [customAudiences, userLists] = await Promise.all([
    type !== 'remarketing' ? customer.query(`SELECT custom_audience.id, custom_audience.resource_name, custom_audience.name, custom_audience.type, custom_audience.status FROM custom_audience`) : [],
    type !== 'custom' ? customer.query(`SELECT user_list.id, user_list.resource_name, user_list.name, user_list.type, user_list.membership_status, user_list.size_for_search, user_list.size_for_display, user_list.description FROM user_list`) : [],
  ]);
  return {
    audiences: customAudiences.map(row => ({ id: String(row.custom_audience?.id ?? ''), name: row.custom_audience?.name ?? '', type: String(row.custom_audience?.type ?? ''), status: String(row.custom_audience?.status ?? '') })),
    userLists: userLists.map(row => ({ id: String(row.user_list?.id ?? ''), name: row.user_list?.name ?? '', type: String(row.user_list?.type ?? ''), membershipStatus: String(row.user_list?.membership_status ?? ''), sizeForSearch: Number(row.user_list?.size_for_search ?? 0), description: row.user_list?.description ?? '' })),
  };
}

async function listNegativeKeywords({ campaignId, adGroupId, accountId, loginCustomerId }) {
  const customer = getCustomer(accountId, loginCustomerId);
  if (campaignId) {
    const rows = await customer.query(`SELECT campaign_criterion.criterion_id, campaign_criterion.keyword.text, campaign_criterion.keyword.match_type, campaign.id, campaign.name FROM campaign_criterion WHERE campaign.id = ${campaignId} AND campaign_criterion.negative = true AND campaign_criterion.type = 'KEYWORD'`);
    return { negativeKeywords: rows.map(row => ({ criterionId: String(row.campaign_criterion?.criterion_id ?? ''), text: row.campaign_criterion?.keyword?.text ?? '', matchType: String(row.campaign_criterion?.keyword?.match_type ?? ''), level: 'campaign', campaignId: String(row.campaign?.id ?? ''), campaignName: row.campaign?.name ?? '' })) };
  }
  if (adGroupId) {
    const rows = await customer.query(`SELECT ad_group_criterion.criterion_id, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ad_group.id, ad_group.name FROM ad_group_criterion WHERE ad_group.id = ${adGroupId} AND ad_group_criterion.negative = true AND ad_group_criterion.type = 'KEYWORD'`);
    return { negativeKeywords: rows.map(row => ({ criterionId: String(row.ad_group_criterion?.criterion_id ?? ''), text: row.ad_group_criterion?.keyword?.text ?? '', matchType: String(row.ad_group_criterion?.keyword?.match_type ?? ''), level: 'adGroup', adGroupId: String(row.ad_group?.id ?? ''), adGroupName: row.ad_group?.name ?? '' })) };
  }
  return { error: 'Provide campaignId or adGroupId.' };
}

async function listRecommendations({ campaignId, accountId, loginCustomerId }) {
  const customer = getCustomer(accountId, loginCustomerId);
  const customerId = accountId || process.env.GOOGLE_ADS_CUSTOMER_ID;
  let gaql = `SELECT recommendation.resource_name, recommendation.type, recommendation.campaign, recommendation.impact FROM recommendation`;
  if (campaignId) gaql += ` WHERE recommendation.campaign = 'customers/${customerId}/campaigns/${campaignId}'`;
  gaql += ` LIMIT 100`;
  const rows = await customer.query(gaql);
  return { recommendations: rows.map(row => ({ resourceName: row.recommendation?.resource_name ?? '', type: String(row.recommendation?.type ?? ''), campaign: row.recommendation?.campaign ?? '', impact: row.recommendation?.impact ?? null })) };
}

async function listConversions({ accountId, loginCustomerId }) {
  const customer = getCustomer(accountId, loginCustomerId);
  const rows = await customer.query(`SELECT conversion_action.id, conversion_action.resource_name, conversion_action.name, conversion_action.type, conversion_action.status, conversion_action.category, conversion_action.counting_type, conversion_action.value_settings.default_value, conversion_action.attribution_model_settings.attribution_model FROM conversion_action WHERE conversion_action.status != 'REMOVED' ORDER BY conversion_action.name ASC`);
  return { conversionActions: rows.map(row => ({ id: String(row.conversion_action?.id ?? ''), name: row.conversion_action?.name ?? '', type: String(row.conversion_action?.type ?? ''), status: String(row.conversion_action?.status ?? ''), category: String(row.conversion_action?.category ?? ''), countingType: String(row.conversion_action?.counting_type ?? ''), defaultValue: Number(row.conversion_action?.value_settings?.default_value ?? 0), attributionModel: String(row.conversion_action?.attribution_model_settings?.attribution_model ?? '') })) };
}

async function searchGeoTargets({ search, countryCode, accountId, loginCustomerId }) {
  const customer = getCustomer(accountId, loginCustomerId);
  if (!search && !countryCode) return { error: "Provide 'search' or 'countryCode'." };
  const sanitize = (s) => s.replace(/[^a-zA-Z0-9\s\-]/g, '');
  let gaql = `SELECT geo_target_constant.id, geo_target_constant.name, geo_target_constant.country_code, geo_target_constant.target_type, geo_target_constant.canonical_name FROM geo_target_constant WHERE geo_target_constant.status = 'ENABLED'`;
  if (search) gaql += ` AND geo_target_constant.canonical_name LIKE '%${sanitize(search)}%'`;
  if (countryCode) gaql += ` AND geo_target_constant.country_code = '${sanitize(countryCode).toUpperCase().slice(0, 2)}'`;
  gaql += ` LIMIT 50`;
  const rows = await customer.query(gaql);
  return { geoTargets: rows.map(row => ({ id: String(row.geo_target_constant?.id ?? ''), name: row.geo_target_constant?.name ?? '', countryCode: row.geo_target_constant?.country_code ?? '', targetType: row.geo_target_constant?.target_type ?? '', canonicalName: row.geo_target_constant?.canonical_name ?? '' })) };
}

async function gaqlQuery({ query, accountId, loginCustomerId }) {
  const customer = getCustomer(accountId, loginCustomerId);
  const upper = query.toUpperCase().trim();
  if (!upper.startsWith('SELECT')) return { error: 'Only SELECT queries are allowed.' };
  if (/\b(INSERT|UPDATE|DELETE|CREATE|DROP|MUTATE)\b/i.test(query)) return { error: 'Mutation keywords detected. This tool is read-only.' };
  const rows = await customer.query(query);
  return { rowCount: rows.length, rows: truncate(rows, 100) };
}

// ── Mutation tools ─────────────────────────────────────────────────────────

async function updateCampaign({ campaignId, name, status, budgetAmountMicros, biddingStrategy, accountId, loginCustomerId }) {
  const customer = getCustomer(accountId, loginCustomerId);
  const customerId = accountId || process.env.GOOGLE_ADS_CUSTOMER_ID;
  const mutations = [];
  if (name || status || biddingStrategy) {
    const resource = { resource_name: `customers/${customerId}/campaigns/${campaignId}` };
    if (name) resource.name = name;
    if (status) resource.status = enums.CampaignStatus[status];
    if (biddingStrategy) {
      switch (biddingStrategy.type) {
        case 'MAXIMIZE_CONVERSIONS': resource.maximize_conversions = { target_cpa_micros: biddingStrategy.targetCpaMicros || 0 }; break;
        case 'MAXIMIZE_CONVERSION_VALUE': resource.maximize_conversion_value = { target_roas: biddingStrategy.targetRoas || 0 }; break;
        case 'TARGET_CPA': resource.target_cpa = { target_cpa_micros: biddingStrategy.targetCpaMicros }; break;
        case 'TARGET_ROAS': resource.target_roas = { target_roas: biddingStrategy.targetRoas }; break;
        case 'MANUAL_CPC': resource.manual_cpc = { enhanced_cpc_enabled: true }; break;
      }
    }
    mutations.push({ entity: 'campaign', operation: 'update', resource });
  }
  if (budgetAmountMicros !== undefined) {
    const budgetRows = await customer.query(`SELECT campaign.campaign_budget FROM campaign WHERE campaign.id = ${campaignId} LIMIT 1`);
    const budgetResourceName = budgetRows[0]?.campaign?.campaign_budget;
    if (budgetResourceName) mutations.push({ entity: 'campaign_budget', operation: 'update', resource: { resource_name: budgetResourceName, amount_micros: budgetAmountMicros } });
  }
  if (!mutations.length) return { error: 'No valid fields to update.' };
  const response = await customer.mutateResources(mutations);
  return { success: true, results: response.mutate_operation_responses };
}

async function createCampaign({ campaign, accountId, loginCustomerId }) {
  const customer = getCustomer(accountId, loginCustomerId);
  const customerId = accountId || process.env.GOOGLE_ADS_CUSTOMER_ID;
  const mutations = [];
  let tempId = -1;
  const budgetTempId = tempId--;
  mutations.push({ entity: 'campaign_budget', operation: 'create', resource: { resource_name: `customers/${customerId}/campaignBudgets/${budgetTempId}`, name: `${campaign.name} Budget`, amount_micros: campaign.dailyBudgetMicros, delivery_method: enums.BudgetDeliveryMethod.STANDARD, explicitly_shared: false } });
  const campaignTempId = tempId--;
  const campaignResource = { resource_name: `customers/${customerId}/campaigns/${campaignTempId}`, name: campaign.name, status: enums.CampaignStatus[campaign.status || 'PAUSED'], advertising_channel_type: enums.AdvertisingChannelType[campaign.advertisingChannelType], campaign_budget: `customers/${customerId}/campaignBudgets/${budgetTempId}` };
  switch (campaign.biddingStrategy?.type) {
    case 'MAXIMIZE_CONVERSIONS': campaignResource.maximize_conversions = { target_cpa_micros: campaign.biddingStrategy.targetCpaMicros || 0 }; break;
    case 'MAXIMIZE_CONVERSION_VALUE': campaignResource.maximize_conversion_value = { target_roas: campaign.biddingStrategy.targetRoas || 0 }; break;
    case 'TARGET_CPA': campaignResource.target_cpa = { target_cpa_micros: campaign.biddingStrategy.targetCpaMicros }; break;
    case 'TARGET_ROAS': campaignResource.target_roas = { target_roas: campaign.biddingStrategy.targetRoas }; break;
    case 'MANUAL_CPC': campaignResource.manual_cpc = { enhanced_cpc_enabled: true }; break;
  }
  mutations.push({ entity: 'campaign', operation: 'create', resource: campaignResource });
  const response = await customer.mutateResources(mutations);
  return { success: true, results: response.mutate_operation_responses };
}

async function addKeywords({ adGroupId, keywords, accountId, loginCustomerId }) {
  const customer = getCustomer(accountId, loginCustomerId);
  const customerId = accountId || process.env.GOOGLE_ADS_CUSTOMER_ID;
  const mutations = keywords.map(kw => ({ entity: 'ad_group_criterion', operation: 'create', resource: { ad_group: `customers/${customerId}/adGroups/${adGroupId}`, keyword: { text: kw.text, match_type: enums.KeywordMatchType[kw.matchType] }, cpc_bid_micros: kw.cpcBidMicros || undefined, status: enums.AdGroupCriterionStatus.ENABLED } }));
  const response = await customer.mutateResources(mutations);
  return { success: true, results: response.mutate_operation_responses };
}

async function addNegativeKeywords({ level, campaignId, adGroupId, keywords, accountId, loginCustomerId }) {
  const customer = getCustomer(accountId, loginCustomerId);
  const customerId = accountId || process.env.GOOGLE_ADS_CUSTOMER_ID;
  if (level === 'campaign' && campaignId) {
    const mutations = keywords.map(kw => ({ entity: 'campaign_criterion', operation: 'create', resource: { campaign: `customers/${customerId}/campaigns/${campaignId}`, negative: true, keyword: { text: kw.text, match_type: enums.KeywordMatchType[kw.matchType] } } }));
    const response = await customer.mutateResources(mutations);
    return { success: true, results: response.mutate_operation_responses };
  }
  if (level === 'adGroup' && adGroupId) {
    const mutations = keywords.map(kw => ({ entity: 'ad_group_criterion', operation: 'create', resource: { ad_group: `customers/${customerId}/adGroups/${adGroupId}`, negative: true, keyword: { text: kw.text, match_type: enums.KeywordMatchType[kw.matchType] } } }));
    const response = await customer.mutateResources(mutations);
    return { success: true, results: response.mutate_operation_responses };
  }
  return { error: 'Invalid level or missing campaignId/adGroupId.' };
}

async function setCampaignTargeting({ campaignId, targetingType, geoTargets, devices, languageCodes, schedules, accountId, loginCustomerId }) {
  const customer = getCustomer(accountId, loginCustomerId);
  const customerId = accountId || process.env.GOOGLE_ADS_CUSTOMER_ID;
  const mutations = [];
  const campResource = `customers/${customerId}/campaigns/${campaignId}`;
  if (targetingType === 'geo' && geoTargets) {
    for (const g of geoTargets) mutations.push({ entity: 'campaign_criterion', operation: 'create', resource: { campaign: campResource, negative: g.isNegative ?? false, location: { geo_target_constant: `geoTargetConstants/${g.geoTargetConstantId}` }, bid_modifier: g.bidModifier } });
  }
  if (targetingType === 'devices' && devices) {
    const deviceMap = { MOBILE: enums.Device.MOBILE, DESKTOP: enums.Device.DESKTOP, TABLET: enums.Device.TABLET };
    for (const d of devices) mutations.push({ entity: 'campaign_criterion', operation: 'create', resource: { campaign: campResource, device: { type: deviceMap[d.type] }, bid_modifier: d.bidModifier } });
  }
  if (targetingType === 'languages' && languageCodes) {
    const langMap = { en: '1000', zh: '1017', ja: '1005', ko: '1012', fr: '1002', de: '1001', es: '1003', pt: '1014', it: '1004', ru: '1031', ar: '1019', hi: '1023', th: '1044', vi: '1040', ms: '1102', id: '1025' };
    for (const code of languageCodes) { const langId = langMap[code.toLowerCase()]; if (!langId) continue; mutations.push({ entity: 'campaign_criterion', operation: 'create', resource: { campaign: campResource, language: { language_constant: `languageConstants/${langId}` } } }); }
  }
  if (!mutations.length) return { error: 'No targeting criteria provided.' };
  const response = await customer.mutateResources(mutations);
  return { success: true, results: response.mutate_operation_responses };
}

async function createWebsiteVisitorsAudience({ name, urlRules, membershipLifeSpanDays = 30, accountId, loginCustomerId }) {
  const customer = getCustomer(accountId, loginCustomerId);
  const ruleItems = urlRules.map(rule => ({ name: rule.value, string_rule_item: { operator: rule.type === 'EQUALS' ? enums.UserListStringRuleItemOperator.EQUALS : enums.UserListStringRuleItemOperator.CONTAINS, value: rule.value } }));
  const response = await customer.mutateResources([{ entity: 'user_list', operation: 'create', resource: { name, description: `Website visitors: ${name}`, membership_status: enums.UserListMembershipStatus.OPEN, membership_life_span: membershipLifeSpanDays, rule_based_user_list: { prepopulation_status: enums.UserListPrepopulationStatus.REQUESTED, flexible_rule_user_list: { inclusive_rule_operator: enums.UserListFlexibleRuleOperator.AND, inclusive_operands: [{ rule: { rule_item_groups: [{ rule_items: ruleItems }] } }] } } } }]);
  return { success: true, results: response.mutate_operation_responses, message: `Website visitors audience "${name}" created.` };
}

async function createCustomAudience({ name, type, members, accountId, loginCustomerId }) {
  const customer = getCustomer(accountId, loginCustomerId);
  const memberTypeMap = { KEYWORD: enums.CustomAudienceMemberType.KEYWORD, URL: enums.CustomAudienceMemberType.URL, APP: enums.CustomAudienceMemberType.APP };
  const typeMap = { SEARCH: enums.CustomAudienceType.SEARCH, INTEREST: enums.CustomAudienceType.INTEREST };
  const processedMembers = members.map(m => { const member = { member_type: memberTypeMap[m.memberType] }; if (m.memberType === 'KEYWORD') member.keyword = m.value; else if (m.memberType === 'URL') member.url = m.value; else if (m.memberType === 'APP') member.app = m.value; return member; });
  const response = await customer.mutateResources([{ entity: 'custom_audience', operation: 'create', resource: { name, type: typeMap[type], status: enums.CustomAudienceStatus.ENABLED, members: processedMembers } }]);
  return { success: true, results: response.mutate_operation_responses, message: `Custom audience "${name}" created.` };
}

async function applyRecommendation({ recommendationResourceName, action, accountId, loginCustomerId }) {
  const customer = getCustomer(accountId, loginCustomerId);
  const customerId = accountId || process.env.GOOGLE_ADS_CUSTOMER_ID;
  const resolvedLoginId = loginCustomerId || customerId;
  const accessToken = await customer.getAccessToken?.();
  if (!accessToken) return { error: 'Failed to obtain access token.' };
  const url = action === 'apply'
    ? `https://googleads.googleapis.com/v19/customers/${customerId}/recommendations:apply`
    : `https://googleads.googleapis.com/v19/customers/${customerId}/recommendations:dismiss`;
  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '', 'login-customer-id': resolvedLoginId, 'Content-Type': 'application/json' }, body: JSON.stringify({ operations: [{ resource_name: recommendationResourceName }] }) });
  if (!res.ok) { const errBody = await res.text(); return { error: `Failed to ${action} recommendation: ${errBody}` }; }
  return { success: true, result: await res.json() };
}

// ── Export all Google tools ────────────────────────────────────────────────

export const googleTools = [
  // Read
  T('google_account_overview', 'Get Google Ads account-level metrics: spend, clicks, impressions, conversions, ROAS, CPA, optimization score, campaign count.', accountOverview, obj({ dateRange: DATE_RANGE_ENUM, accountId: str('Google Ads customer ID (optional, uses default if omitted)'), loginCustomerId: str('MCC login customer ID (optional)') })),
  T('google_list_campaigns', 'List all Google Ads campaigns with performance metrics (spend, clicks, impressions, conversions, ROAS). Returns top 50 by spend.', listCampaigns, obj({ dateRange: DATE_RANGE_ENUM, accountId: str('Customer ID (optional)'), loginCustomerId: str('MCC login ID (optional)') })),
  T('google_campaign_insights', 'Get daily performance breakdown for a specific Google Ads campaign.', campaignInsights, obj({ campaignId: str('Campaign ID'), dateRange: DATE_RANGE_ENUM, accountId: str('Customer ID (optional)'), loginCustomerId: str('MCC login ID (optional)') }, ['campaignId'])),
  T('google_list_ad_groups', 'List ad groups for a Google Ads campaign with performance metrics.', listAdGroups, obj({ campaignId: str('Campaign ID'), dateRange: DATE_RANGE_ENUM, accountId: str('Customer ID (optional)'), loginCustomerId: str('MCC login ID (optional)') }, ['campaignId'])),
  T('google_list_keywords', 'List keywords for a campaign with quality score, match type, and performance. Note: Display campaigns do not have keywords.', listKeywords, obj({ campaignId: str('Campaign ID'), adGroupId: str('Optional: filter by ad group ID'), dateRange: DATE_RANGE_ENUM, accountId: str('Customer ID (optional)'), loginCustomerId: str('MCC login ID (optional)') }, ['campaignId'])),
  T('google_list_search_terms', 'Get search terms report — actual user queries that triggered ads. Use for finding negative keyword opportunities.', listSearchTerms, obj({ campaignId: str('Campaign ID'), dateRange: DATE_RANGE_ENUM, accountId: str('Customer ID (optional)'), loginCustomerId: str('MCC login ID (optional)') }, ['campaignId'])),
  T('google_list_ads', 'List responsive search ads (RSA) for a campaign with headlines, descriptions, and performance.', listAds, obj({ campaignId: str('Campaign ID'), dateRange: DATE_RANGE_ENUM, accountId: str('Customer ID (optional)'), loginCustomerId: str('MCC login ID (optional)') }, ['campaignId'])),
  T('google_reports', 'Get performance reports by dimension: devices (mobile/desktop/tablet), geo (country/region), or landing-pages.', googleReports, obj({ reportType: { type: 'string', description: 'Report type: devices, geo, landing-pages' }, campaignId: str('Optional: filter to specific campaign'), dateRange: DATE_RANGE_ENUM, accountId: str('Customer ID (optional)'), loginCustomerId: str('MCC login ID (optional)') }, ['reportType'])),
  T('google_list_audiences', 'List all Google Ads audiences: custom audiences and remarketing user lists.', listAudiences, obj({ type: { type: 'string', description: 'Filter: custom, remarketing, or all. Default: all' }, accountId: str('Customer ID (optional)'), loginCustomerId: str('MCC login ID (optional)') })),
  T('google_list_negative_keywords', 'List negative keywords for a campaign or ad group.', listNegativeKeywords, obj({ campaignId: str('Campaign ID to filter'), adGroupId: str('Ad Group ID to filter'), accountId: str('Customer ID (optional)'), loginCustomerId: str('MCC login ID (optional)') })),
  T('google_list_recommendations', "List Google's optimization recommendations for the account.", listRecommendations, obj({ campaignId: str('Optional: filter to specific campaign'), accountId: str('Customer ID (optional)'), loginCustomerId: str('MCC login ID (optional)') })),
  T('google_list_conversions', 'List all Google Ads conversion actions with their settings.', listConversions, obj({ accountId: str('Customer ID (optional)'), loginCustomerId: str('MCC login ID (optional)') })),
  T('google_search_geo_targets', 'Search for geo target location IDs for campaign geo targeting.', searchGeoTargets, obj({ search: str('Search by location name (e.g. "Hong Kong")'), countryCode: str('ISO 2-letter country code (e.g. "HK")'), accountId: str('Customer ID (optional)'), loginCustomerId: str('MCC login ID (optional)') })),
  T('google_gaql_query', 'Run a custom GAQL SELECT query for advanced analysis. Read-only.', gaqlQuery, obj({ query: str('Full GAQL SELECT query'), accountId: str('Customer ID (optional)'), loginCustomerId: str('MCC login ID (optional)') }, ['query'])),

  // Mutations
  T('google_update_campaign', 'Update a Google Ads campaign: name, status (ENABLED/PAUSED), daily budget (in micros), or bidding strategy. ALWAYS confirm with user before calling.', updateCampaign, obj({ campaignId: str('Campaign ID'), name: str('New campaign name'), status: { type: 'string', description: 'ENABLED or PAUSED' }, budgetAmountMicros: num('New daily budget in micros (1 HKD = 1000000)'), biddingStrategy: { type: 'object', description: '{ type: MAXIMIZE_CONVERSIONS|TARGET_CPA|TARGET_ROAS|MANUAL_CPC, targetCpaMicros?, targetRoas? }' }, accountId: str('Customer ID (optional)'), loginCustomerId: str('MCC login ID (optional)') }, ['campaignId'])),
  T('google_create_campaign', 'Create a new Google Ads campaign. Created in PAUSED state by default. ALWAYS confirm with user before calling.', createCampaign, obj({ campaign: { type: 'object', description: '{ name, advertisingChannelType: SEARCH|DISPLAY|SHOPPING, status?: ENABLED|PAUSED, dailyBudgetMicros, biddingStrategy: { type, targetCpaMicros?, targetRoas? } }' }, accountId: str('Customer ID (optional)'), loginCustomerId: str('MCC login ID (optional)') }, ['campaign'])),
  T('google_add_keywords', 'Add keywords to a Google Ads ad group. ALWAYS confirm with user before calling.', addKeywords, obj({ adGroupId: str('Ad group ID'), keywords: { type: 'array', description: 'Array of { text, matchType: EXACT|PHRASE|BROAD, cpcBidMicros? }' }, accountId: str('Customer ID (optional)'), loginCustomerId: str('MCC login ID (optional)') }, ['adGroupId', 'keywords'])),
  T('google_add_negative_keywords', 'Add negative keywords to block unwanted search terms. ALWAYS confirm with user before calling.', addNegativeKeywords, obj({ level: { type: 'string', description: 'campaign or adGroup' }, campaignId: str('Campaign ID (for campaign level)'), adGroupId: str('Ad Group ID (for adGroup level)'), keywords: { type: 'array', description: 'Array of { text, matchType: EXACT|PHRASE|BROAD }' }, accountId: str('Customer ID (optional)'), loginCustomerId: str('MCC login ID (optional)') }, ['level', 'keywords'])),
  T('google_set_campaign_targeting', 'Set campaign targeting: geo locations, devices, or languages. ALWAYS confirm with user before calling.', setCampaignTargeting, obj({ campaignId: str('Campaign ID'), targetingType: { type: 'string', description: 'geo, devices, or languages' }, geoTargets: { type: 'array', description: 'For geo: [{ geoTargetConstantId, isNegative?, bidModifier? }]' }, devices: { type: 'array', description: 'For devices: [{ type: MOBILE|DESKTOP|TABLET, bidModifier }]' }, languageCodes: { type: 'array', description: 'For languages: ISO codes ["en","zh"]', items: { type: 'string' } }, accountId: str('Customer ID (optional)'), loginCustomerId: str('MCC login ID (optional)') }, ['campaignId', 'targetingType'])),
  T('google_create_website_visitors_audience', 'Create a remarketing list for website visitors. ALWAYS confirm with user before calling.', createWebsiteVisitorsAudience, obj({ name: str('Audience name'), urlRules: { type: 'array', description: '[{ type: EQUALS|CONTAINS, value: "url" }]' }, membershipLifeSpanDays: num('Days to keep users (default 30)'), accountId: str('Customer ID (optional)'), loginCustomerId: str('MCC login ID (optional)') }, ['name', 'urlRules'])),
  T('google_create_custom_audience', 'Create a custom audience based on keywords, URLs, or apps. ALWAYS confirm with user before calling.', createCustomAudience, obj({ name: str('Audience name'), type: { type: 'string', description: 'SEARCH or INTEREST' }, members: { type: 'array', description: '[{ memberType: KEYWORD|URL|APP, value }]' }, accountId: str('Customer ID (optional)'), loginCustomerId: str('MCC login ID (optional)') }, ['name', 'type', 'members'])),
  T('google_apply_recommendation', "Apply or dismiss a Google optimization recommendation. ALWAYS confirm with user before calling.", applyRecommendation, obj({ recommendationResourceName: str('Full resource name from google_list_recommendations'), action: { type: 'string', description: 'apply or dismiss' }, accountId: str('Customer ID (optional)'), loginCustomerId: str('MCC login ID (optional)') }, ['recommendationResourceName', 'action'])),
];
