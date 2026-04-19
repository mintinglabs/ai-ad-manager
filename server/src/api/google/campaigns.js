import { Router } from 'express';
import { enums } from 'google-ads-api';
import { getCustomer, statusLabel, handleApiError, parseDateRange } from './client.js';

const router = Router();

// GET /api/google/campaigns?accountId=&loginCustomerId=&dateRange=
router.get('/', async (req, res) => {
  try {
    const { accountId, loginCustomerId, dateRange } = req.query;
    const range = parseDateRange(dateRange);
    const customer = getCustomer(accountId, loginCustomerId);

    const rows = await customer.query(`
      SELECT
        campaign.id, campaign.name, campaign.status,
        campaign_budget.amount_micros,
        metrics.cost_micros, metrics.impressions, metrics.clicks,
        metrics.conversions, metrics.conversions_value, metrics.ctr, metrics.average_cpc,
        customer.descriptive_name
      FROM campaign
      WHERE segments.date DURING ${range} AND campaign.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC LIMIT 50
    `);

    const campaigns = rows.map(row => ({
      id: String(row.campaign?.id ?? ''),
      name: row.campaign?.name ?? 'Unnamed Campaign',
      status: statusLabel(row.campaign?.status ?? ''),
      dailyBudget: Number(row.campaign_budget?.amount_micros ?? 0) / 1_000_000,
      spend: Number(row.metrics?.cost_micros ?? 0) / 1_000_000,
      impressions: Number(row.metrics?.impressions ?? 0),
      clicks: Number(row.metrics?.clicks ?? 0),
      conversions: Number(row.metrics?.conversions ?? 0),
      conversionsValue: Number(row.metrics?.conversions_value ?? 0),
      ctr: Number(row.metrics?.ctr ?? 0),
      avgCpc: Number(row.metrics?.average_cpc ?? 0) / 1_000_000,
      roas: Number(row.metrics?.cost_micros ?? 0) > 0 ? Number(row.metrics?.conversions_value ?? 0) / (Number(row.metrics?.cost_micros ?? 0) / 1_000_000) : 0,
      accountName: row.customer?.descriptive_name ?? '',
    }));

    res.json({ campaigns, accountId: accountId || process.env.GOOGLE_ADS_CUSTOMER_ID });
  } catch (err) {
    res.status(500).json(handleApiError(err, 'GET /api/google/campaigns'));
  }
});

// GET /api/google/campaigns/:id — single campaign with daily breakdown
router.get('/:id', async (req, res) => {
  try {
    const { accountId, loginCustomerId, dateRange } = req.query;
    const range = parseDateRange(dateRange);
    const customer = getCustomer(accountId, loginCustomerId);

    const rows = await customer.query(`
      SELECT
        campaign.id, campaign.name, campaign.status, campaign.bidding_strategy_type,
        campaign_budget.amount_micros,
        metrics.clicks, metrics.impressions, metrics.cost_micros,
        metrics.conversions, metrics.conversions_value, metrics.ctr, metrics.average_cpc,
        segments.date
      FROM campaign
      WHERE campaign.id = ${req.params.id} AND segments.date DURING ${range}
      ORDER BY segments.date ASC
    `);

    if (!rows.length) return res.status(404).json({ error: 'Campaign not found' });
    const first = rows[0];

    const dailyMetrics = rows.map(row => ({
      date: row.segments?.date ?? '',
      clicks: Number(row.metrics?.clicks ?? 0),
      impressions: Number(row.metrics?.impressions ?? 0),
      spend: Number(row.metrics?.cost_micros ?? 0) / 1_000_000,
      conversions: Number(row.metrics?.conversions ?? 0),
      conversionsValue: Number(row.metrics?.conversions_value ?? 0),
      ctr: Number(row.metrics?.ctr ?? 0),
      avgCpc: Number(row.metrics?.average_cpc ?? 0) / 1_000_000,
    }));

    const totals = dailyMetrics.reduce((acc, d) => ({
      clicks: acc.clicks + d.clicks,
      impressions: acc.impressions + d.impressions,
      spend: acc.spend + d.spend,
      conversions: acc.conversions + d.conversions,
      conversionsValue: acc.conversionsValue + d.conversionsValue,
    }), { clicks: 0, impressions: 0, spend: 0, conversions: 0, conversionsValue: 0 });

    res.json({
      id: String(first.campaign?.id ?? ''),
      name: first.campaign?.name ?? '',
      status: statusLabel(first.campaign?.status ?? ''),
      biddingStrategyType: String(first.campaign?.bidding_strategy_type ?? ''),
      dailyBudget: Number(first.campaign_budget?.amount_micros ?? 0) / 1_000_000,
      ...totals,
      avgCtr: totals.impressions > 0 ? totals.clicks / totals.impressions : 0,
      avgCpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
      cpa: totals.conversions > 0 ? totals.spend / totals.conversions : 0,
      roas: totals.spend > 0 ? totals.conversionsValue / totals.spend : 0,
      dailyMetrics,
    });
  } catch (err) {
    res.status(500).json(handleApiError(err, 'GET /api/google/campaigns/:id'));
  }
});

// PATCH /api/google/campaigns/:id — update status, budget, name
router.patch('/:id', async (req, res) => {
  try {
    const { accountId, loginCustomerId } = req.query;
    const { name, status, budgetAmountMicros, biddingStrategy } = req.body;
    const customer = getCustomer(accountId, loginCustomerId);
    const customerId = accountId || process.env.GOOGLE_ADS_CUSTOMER_ID;
    const mutations = [];

    if (name || status || biddingStrategy) {
      const resource = { resource_name: `customers/${customerId}/campaigns/${req.params.id}` };
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
      const budgetRows = await customer.query(`SELECT campaign.campaign_budget FROM campaign WHERE campaign.id = ${req.params.id} LIMIT 1`);
      const budgetResourceName = budgetRows[0]?.campaign?.campaign_budget;
      if (budgetResourceName) {
        mutations.push({ entity: 'campaign_budget', operation: 'update', resource: { resource_name: budgetResourceName, amount_micros: budgetAmountMicros } });
      }
    }

    if (!mutations.length) return res.status(400).json({ error: 'No valid fields to update.' });
    const response = await customer.mutateResources(mutations);
    res.json({ success: true, results: response.mutate_operation_responses });
  } catch (err) {
    res.status(500).json(handleApiError(err, 'PATCH /api/google/campaigns/:id'));
  }
});

// POST /api/google/campaigns — create campaign
router.post('/', async (req, res) => {
  try {
    const { accountId, loginCustomerId } = req.query;
    const { campaign } = req.body;
    const customer = getCustomer(accountId, loginCustomerId);
    const customerId = accountId || process.env.GOOGLE_ADS_CUSTOMER_ID;

    const mutations = [];
    let tempId = -1;
    const budgetTempId = tempId--;
    mutations.push({
      entity: 'campaign_budget', operation: 'create',
      resource: { resource_name: `customers/${customerId}/campaignBudgets/${budgetTempId}`, name: `${campaign.name} Budget`, amount_micros: campaign.dailyBudgetMicros, delivery_method: enums.BudgetDeliveryMethod.STANDARD, explicitly_shared: false },
    });

    const campaignTempId = tempId--;
    const campaignResource = {
      resource_name: `customers/${customerId}/campaigns/${campaignTempId}`,
      name: campaign.name,
      status: enums.CampaignStatus[campaign.status || 'PAUSED'],
      advertising_channel_type: enums.AdvertisingChannelType[campaign.advertisingChannelType],
      campaign_budget: `customers/${customerId}/campaignBudgets/${budgetTempId}`,
    };

    switch (campaign.biddingStrategy?.type) {
      case 'MAXIMIZE_CONVERSIONS': campaignResource.maximize_conversions = { target_cpa_micros: campaign.biddingStrategy.targetCpaMicros || 0 }; break;
      case 'MAXIMIZE_CONVERSION_VALUE': campaignResource.maximize_conversion_value = { target_roas: campaign.biddingStrategy.targetRoas || 0 }; break;
      case 'TARGET_CPA': campaignResource.target_cpa = { target_cpa_micros: campaign.biddingStrategy.targetCpaMicros }; break;
      case 'TARGET_ROAS': campaignResource.target_roas = { target_roas: campaign.biddingStrategy.targetRoas }; break;
      case 'MANUAL_CPC': campaignResource.manual_cpc = { enhanced_cpc_enabled: true }; break;
    }

    mutations.push({ entity: 'campaign', operation: 'create', resource: campaignResource });
    const response = await customer.mutateResources(mutations);
    res.json({ success: true, results: response.mutate_operation_responses });
  } catch (err) {
    res.status(500).json(handleApiError(err, 'POST /api/google/campaigns'));
  }
});

// GET /api/google/campaigns/:id/ad-groups
router.get('/:id/ad-groups', async (req, res) => {
  try {
    const { accountId, loginCustomerId, dateRange } = req.query;
    const range = parseDateRange(dateRange);
    const customer = getCustomer(accountId, loginCustomerId);

    const rows = await customer.query(`
      SELECT ad_group.id, ad_group.name, ad_group.status, ad_group.type,
        metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.ctr, metrics.average_cpc
      FROM ad_group
      WHERE campaign.id = ${req.params.id} AND segments.date DURING ${range} AND ad_group.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
    `);

    res.json({ adGroups: rows.map(row => ({
      id: String(row.ad_group?.id ?? ''), name: row.ad_group?.name ?? '', status: statusLabel(row.ad_group?.status ?? ''),
      type: String(row.ad_group?.type ?? ''), clicks: Number(row.metrics?.clicks ?? 0),
      impressions: Number(row.metrics?.impressions ?? 0), spend: Number(row.metrics?.cost_micros ?? 0) / 1_000_000,
      conversions: Number(row.metrics?.conversions ?? 0), ctr: Number(row.metrics?.ctr ?? 0),
      avgCpc: Number(row.metrics?.average_cpc ?? 0) / 1_000_000,
    })) });
  } catch (err) {
    res.status(500).json(handleApiError(err, 'GET /api/google/campaigns/:id/ad-groups'));
  }
});

// GET /api/google/campaigns/:id/keywords
router.get('/:id/keywords', async (req, res) => {
  try {
    const { accountId, loginCustomerId, dateRange } = req.query;
    const range = parseDateRange(dateRange);
    const customer = getCustomer(accountId, loginCustomerId);

    const rows = await customer.query(`
      SELECT ad_group_criterion.criterion_id, ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type, ad_group_criterion.status,
        ad_group_criterion.quality_info.quality_score,
        ad_group.id, ad_group.name,
        metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.ctr, metrics.average_cpc
      FROM keyword_view
      WHERE campaign.id = ${req.params.id} AND segments.date DURING ${range} AND ad_group_criterion.status != 'REMOVED'
      ORDER BY metrics.impressions DESC LIMIT 200
    `);

    res.json({ keywords: rows.map(row => ({
      criterionId: String(row.ad_group_criterion?.criterion_id ?? ''),
      text: row.ad_group_criterion?.keyword?.text ?? '',
      matchType: String(row.ad_group_criterion?.keyword?.match_type ?? ''),
      status: statusLabel(row.ad_group_criterion?.status ?? ''),
      qualityScore: row.ad_group_criterion?.quality_info?.quality_score ?? null,
      adGroupId: String(row.ad_group?.id ?? ''), adGroupName: row.ad_group?.name ?? '',
      clicks: Number(row.metrics?.clicks ?? 0), impressions: Number(row.metrics?.impressions ?? 0),
      spend: Number(row.metrics?.cost_micros ?? 0) / 1_000_000, conversions: Number(row.metrics?.conversions ?? 0),
      ctr: Number(row.metrics?.ctr ?? 0), avgCpc: Number(row.metrics?.average_cpc ?? 0) / 1_000_000,
    })) });
  } catch (err) {
    res.status(500).json(handleApiError(err, 'GET /api/google/campaigns/:id/keywords'));
  }
});

// GET /api/google/campaigns/:id/search-terms
router.get('/:id/search-terms', async (req, res) => {
  try {
    const { accountId, loginCustomerId, dateRange } = req.query;
    const range = parseDateRange(dateRange);
    const customer = getCustomer(accountId, loginCustomerId);

    const rows = await customer.query(`
      SELECT search_term_view.search_term, search_term_view.status,
        segments.keyword.info.text, segments.keyword.info.match_type,
        ad_group.id,
        metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.ctr
      FROM search_term_view
      WHERE campaign.id = ${req.params.id} AND segments.date DURING ${range}
      ORDER BY metrics.impressions DESC LIMIT 500
    `);

    res.json({ searchTerms: rows.map(row => ({
      searchTerm: row.search_term_view?.search_term ?? '',
      status: String(row.search_term_view?.status ?? ''),
      keywordText: row.segments?.keyword?.info?.text ?? '',
      keywordMatchType: String(row.segments?.keyword?.info?.match_type ?? ''),
      adGroupId: String(row.ad_group?.id ?? ''),
      clicks: Number(row.metrics?.clicks ?? 0), impressions: Number(row.metrics?.impressions ?? 0),
      spend: Number(row.metrics?.cost_micros ?? 0) / 1_000_000, conversions: Number(row.metrics?.conversions ?? 0),
      ctr: Number(row.metrics?.ctr ?? 0),
    })) });
  } catch (err) {
    res.status(500).json(handleApiError(err, 'GET /api/google/campaigns/:id/search-terms'));
  }
});

export default router;
