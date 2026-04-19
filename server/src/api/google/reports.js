import { Router } from 'express';
import { getCustomer, handleApiError, parseDateRange } from './client.js';

const router = Router();

// GET /api/google/reports?accountId=&dateRange=&campaignId=&type=devices|time|geo|demographics|landing-pages
router.get('/', async (req, res) => {
  try {
    const { accountId, loginCustomerId, dateRange, campaignId, type, breakdown, demographicType } = req.query;
    const range = parseDateRange(dateRange);
    const customer = getCustomer(accountId, loginCustomerId);
    const campaignFilter = campaignId ? ` AND campaign.id = ${campaignId}` : '';

    if (type === 'devices') {
      const rows = await customer.query(`
        SELECT segments.device, campaign.id, campaign.name,
          metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.ctr, metrics.average_cpc
        FROM campaign WHERE segments.date DURING ${range} AND campaign.status != 'REMOVED'${campaignFilter}
        ORDER BY metrics.cost_micros DESC
      `);
      return res.json({ devicePerformance: rows.map(row => ({
        device: String(row.segments?.device ?? ''), campaignId: String(row.campaign?.id ?? ''), campaignName: row.campaign?.name ?? '',
        clicks: Number(row.metrics?.clicks ?? 0), impressions: Number(row.metrics?.impressions ?? 0),
        spend: Number(row.metrics?.cost_micros ?? 0) / 1_000_000, conversions: Number(row.metrics?.conversions ?? 0),
        ctr: Number(row.metrics?.ctr ?? 0), avgCpc: Number(row.metrics?.average_cpc ?? 0) / 1_000_000,
      })) });
    }

    if (type === 'time') {
      const bd = breakdown || 'hour';
      if (bd === 'hour') {
        const rows = await customer.query(`
          SELECT segments.hour, segments.day_of_week,
            metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.ctr
          FROM campaign WHERE segments.date DURING ${range} AND campaign.status != 'REMOVED'${campaignFilter}
          ORDER BY segments.day_of_week ASC, segments.hour ASC
        `);
        return res.json({ timePerformance: rows.map(row => ({
          hour: Number(row.segments?.hour ?? 0), dayOfWeek: String(row.segments?.day_of_week ?? ''),
          clicks: Number(row.metrics?.clicks ?? 0), impressions: Number(row.metrics?.impressions ?? 0),
          spend: Number(row.metrics?.cost_micros ?? 0) / 1_000_000, conversions: Number(row.metrics?.conversions ?? 0),
          ctr: Number(row.metrics?.ctr ?? 0),
        })), breakdown: 'hour' });
      }
      const rows = await customer.query(`
        SELECT segments.day_of_week,
          metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.conversions_value, metrics.ctr, metrics.average_cpc
        FROM campaign WHERE segments.date DURING ${range} AND campaign.status != 'REMOVED'${campaignFilter}
        ORDER BY segments.day_of_week ASC
      `);
      return res.json({ timePerformance: rows.map(row => ({
        dayOfWeek: String(row.segments?.day_of_week ?? ''), clicks: Number(row.metrics?.clicks ?? 0),
        impressions: Number(row.metrics?.impressions ?? 0), spend: Number(row.metrics?.cost_micros ?? 0) / 1_000_000,
        conversions: Number(row.metrics?.conversions ?? 0), ctr: Number(row.metrics?.ctr ?? 0),
        avgCpc: Number(row.metrics?.average_cpc ?? 0) / 1_000_000,
      })), breakdown: 'dayOfWeek' });
    }

    if (type === 'geo') {
      const rows = await customer.query(`
        SELECT geographic_view.country_criterion_id, geographic_view.location_type, campaign.id, campaign.name,
          metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.ctr, metrics.average_cpc
        FROM geographic_view WHERE segments.date DURING ${range}${campaignFilter}
        ORDER BY metrics.cost_micros DESC LIMIT 200
      `);
      return res.json({ geoPerformance: rows.map(row => ({
        countryId: String(row.geographic_view?.country_criterion_id ?? ''), locationType: String(row.geographic_view?.location_type ?? ''),
        campaignId: String(row.campaign?.id ?? ''), campaignName: row.campaign?.name ?? '',
        clicks: Number(row.metrics?.clicks ?? 0), impressions: Number(row.metrics?.impressions ?? 0),
        spend: Number(row.metrics?.cost_micros ?? 0) / 1_000_000, conversions: Number(row.metrics?.conversions ?? 0),
        ctr: Number(row.metrics?.ctr ?? 0), avgCpc: Number(row.metrics?.average_cpc ?? 0) / 1_000_000,
      })) });
    }

    if (type === 'demographics') {
      const dt = demographicType || 'age';
      const viewMap = {
        age: { view: 'age_range_view', field: 'ad_group_criterion.age_range.type', key: 'ageRange' },
        gender: { view: 'gender_view', field: 'ad_group_criterion.gender.type', key: 'gender' },
        income: { view: 'income_range_view', field: 'ad_group_criterion.income_range.type', key: 'incomeRange' },
      };
      const v = viewMap[dt] || viewMap.age;
      const rows = await customer.query(`
        SELECT ${v.field}, campaign.id, campaign.name,
          metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.ctr
        FROM ${v.view} WHERE segments.date DURING ${range}${campaignFilter}
        ORDER BY metrics.impressions DESC
      `);
      return res.json({ demographics: rows.map(row => {
        const dimValue = dt === 'age' ? String(row.ad_group_criterion?.age_range?.type ?? '')
          : dt === 'gender' ? String(row.ad_group_criterion?.gender?.type ?? '')
          : String(row.ad_group_criterion?.income_range?.type ?? '');
        return {
          [v.key]: dimValue, campaignId: String(row.campaign?.id ?? ''), campaignName: row.campaign?.name ?? '',
          clicks: Number(row.metrics?.clicks ?? 0), impressions: Number(row.metrics?.impressions ?? 0),
          spend: Number(row.metrics?.cost_micros ?? 0) / 1_000_000, conversions: Number(row.metrics?.conversions ?? 0),
          ctr: Number(row.metrics?.ctr ?? 0),
        };
      }), type: dt });
    }

    if (type === 'landing-pages') {
      const rows = await customer.query(`
        SELECT landing_page_view.unexpanded_final_url, campaign.id, campaign.name,
          metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.ctr, metrics.average_cpc
        FROM landing_page_view WHERE segments.date DURING ${range}${campaignFilter}
        ORDER BY metrics.clicks DESC LIMIT 100
      `);
      return res.json({ landingPages: rows.map(row => ({
        url: row.landing_page_view?.unexpanded_final_url ?? '', campaignId: String(row.campaign?.id ?? ''), campaignName: row.campaign?.name ?? '',
        clicks: Number(row.metrics?.clicks ?? 0), impressions: Number(row.metrics?.impressions ?? 0),
        spend: Number(row.metrics?.cost_micros ?? 0) / 1_000_000, conversions: Number(row.metrics?.conversions ?? 0),
        ctr: Number(row.metrics?.ctr ?? 0), avgCpc: Number(row.metrics?.average_cpc ?? 0) / 1_000_000,
      })) });
    }

    // Account overview (no type specified)
    const [accountRows, metricsRows, campaignCountRows] = await Promise.all([
      customer.query(`SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.optimization_score FROM customer LIMIT 1`),
      customer.query(`SELECT metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM customer WHERE segments.date DURING ${range}`),
      customer.query(`SELECT campaign.id FROM campaign WHERE campaign.status != 'REMOVED'`),
    ]);

    const totals = metricsRows.reduce((acc, row) => ({
      clicks: acc.clicks + Number(row.metrics?.clicks ?? 0),
      impressions: acc.impressions + Number(row.metrics?.impressions ?? 0),
      spend: acc.spend + Number(row.metrics?.cost_micros ?? 0) / 1_000_000,
      conversions: acc.conversions + Number(row.metrics?.conversions ?? 0),
      conversionsValue: acc.conversionsValue + Number(row.metrics?.conversions_value ?? 0),
    }), { clicks: 0, impressions: 0, spend: 0, conversions: 0, conversionsValue: 0 });

    const info = accountRows[0]?.customer;
    res.json({
      account: { id: String(info?.id ?? ''), name: info?.descriptive_name ?? '', currencyCode: info?.currency_code ?? '', timeZone: info?.time_zone ?? '', optimizationScore: Number(info?.optimization_score ?? 0) },
      metrics: { ...totals, avgCtr: totals.impressions > 0 ? totals.clicks / totals.impressions : 0, avgCpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0, cpa: totals.conversions > 0 ? totals.spend / totals.conversions : 0, roas: totals.spend > 0 ? totals.conversionsValue / totals.spend : 0 },
      campaignCount: campaignCountRows.length,
    });
  } catch (err) {
    res.status(500).json(handleApiError(err, 'GET /api/google/reports'));
  }
});

export default router;
