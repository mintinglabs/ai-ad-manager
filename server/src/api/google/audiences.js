import { Router } from 'express';
import { enums } from 'google-ads-api';
import { getCustomer, handleApiError } from './client.js';

const router = Router();

// GET /api/google/audiences?accountId=&type=custom|remarketing|all
router.get('/', async (req, res) => {
  try {
    const { accountId, loginCustomerId, type = 'all' } = req.query;
    const customer = getCustomer(accountId, loginCustomerId);

    const [customAudiences, userLists] = await Promise.all([
      type !== 'remarketing' ? customer.query(`SELECT custom_audience.id, custom_audience.resource_name, custom_audience.name, custom_audience.type, custom_audience.status FROM custom_audience`) : Promise.resolve([]),
      type !== 'custom' ? customer.query(`SELECT user_list.id, user_list.resource_name, user_list.name, user_list.type, user_list.membership_status, user_list.size_for_search, user_list.size_for_display, user_list.description FROM user_list`) : Promise.resolve([]),
    ]);

    res.json({
      audiences: customAudiences.map(row => ({ id: String(row.custom_audience?.id ?? ''), resourceName: row.custom_audience?.resource_name ?? '', name: row.custom_audience?.name ?? '', type: String(row.custom_audience?.type ?? ''), status: String(row.custom_audience?.status ?? '') })),
      userLists: userLists.map(row => ({ id: String(row.user_list?.id ?? ''), resourceName: row.user_list?.resource_name ?? '', name: row.user_list?.name ?? '', type: String(row.user_list?.type ?? ''), membershipStatus: String(row.user_list?.membership_status ?? ''), sizeForSearch: Number(row.user_list?.size_for_search ?? 0), sizeForDisplay: Number(row.user_list?.size_for_display ?? 0), description: row.user_list?.description ?? '' })),
    });
  } catch (err) {
    res.status(500).json(handleApiError(err, 'GET /api/google/audiences'));
  }
});

// POST /api/google/audiences/website-visitors
router.post('/website-visitors', async (req, res) => {
  try {
    const { accountId, loginCustomerId } = req.query;
    const { name, urlRules, membershipLifeSpanDays = 30 } = req.body;
    const customer = getCustomer(accountId, loginCustomerId);

    const ruleItems = urlRules.map(rule => ({
      name: rule.value,
      string_rule_item: {
        operator: rule.type === 'EQUALS' ? enums.UserListStringRuleItemOperator.EQUALS : enums.UserListStringRuleItemOperator.CONTAINS,
        value: rule.value,
      },
    }));

    const response = await customer.mutateResources([{
      entity: 'user_list', operation: 'create',
      resource: {
        name, description: `Website visitors: ${name}`,
        membership_status: enums.UserListMembershipStatus.OPEN,
        membership_life_span: membershipLifeSpanDays,
        rule_based_user_list: {
          prepopulation_status: enums.UserListPrepopulationStatus.REQUESTED,
          flexible_rule_user_list: {
            inclusive_rule_operator: enums.UserListFlexibleRuleOperator.AND,
            inclusive_operands: [{ rule: { rule_item_groups: [{ rule_items: ruleItems }] } }],
          },
        },
      },
    }]);

    res.json({ success: true, results: response.mutate_operation_responses, message: `Audience "${name}" created.` });
  } catch (err) {
    res.status(500).json(handleApiError(err, 'POST /api/google/audiences/website-visitors'));
  }
});

// POST /api/google/audiences/custom
router.post('/custom', async (req, res) => {
  try {
    const { accountId, loginCustomerId } = req.query;
    const { name, type, members } = req.body;
    const customer = getCustomer(accountId, loginCustomerId);

    const memberTypeMap = { KEYWORD: enums.CustomAudienceMemberType.KEYWORD, URL: enums.CustomAudienceMemberType.URL, APP: enums.CustomAudienceMemberType.APP };
    const typeMap = { SEARCH: enums.CustomAudienceType.SEARCH, INTEREST: enums.CustomAudienceType.INTEREST };

    const processedMembers = members.map(m => {
      const member = { member_type: memberTypeMap[m.memberType] };
      if (m.memberType === 'KEYWORD') member.keyword = m.value;
      else if (m.memberType === 'URL') member.url = m.value;
      else if (m.memberType === 'APP') member.app = m.value;
      return member;
    });

    const response = await customer.mutateResources([{
      entity: 'custom_audience', operation: 'create',
      resource: { name, type: typeMap[type], status: enums.CustomAudienceStatus.ENABLED, members: processedMembers },
    }]);

    res.json({ success: true, results: response.mutate_operation_responses, message: `Custom audience "${name}" created.` });
  } catch (err) {
    res.status(500).json(handleApiError(err, 'POST /api/google/audiences/custom'));
  }
});

export default router;
