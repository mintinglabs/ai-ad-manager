import { Router } from 'express';
import { getGoogleAdsClient, handleApiError } from './client.js';

const router = Router();

// GET /api/google/accounts — list all accessible accounts (MCC + children)
router.get('/', async (req, res) => {
  try {
    const client = getGoogleAdsClient();
    const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;

    const response = await client.listAccessibleCustomers(refreshToken);
    const accessibleIds = (response.resource_names ?? []).map(r => r.replace('customers/', ''));

    const allAccounts = [];

    for (const custId of accessibleIds) {
      try {
        const customer = client.Customer({ customer_id: custId, login_customer_id: custId, refresh_token: refreshToken });
        const rows = await customer.query(`SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.manager FROM customer LIMIT 1`);
        const info = rows[0]?.customer;
        if (!info) continue;

        const account = {
          id: String(info.id ?? custId),
          name: info.descriptive_name ?? custId,
          currencyCode: info.currency_code ?? '',
          isManager: Boolean(info.manager),
        };

        if (account.isManager) {
          try {
            const childRows = await customer.query(`
              SELECT customer_client.id, customer_client.descriptive_name, customer_client.currency_code, customer_client.manager, customer_client.status
              FROM customer_client WHERE customer_client.manager = false
            `);
            account.children = childRows
              .filter(row => { const s = String(row.customer_client?.status ?? ''); return s === 'ENABLED' || s === '2'; })
              .map(row => ({ id: String(row.customer_client?.id ?? ''), name: row.customer_client?.descriptive_name ?? '', currencyCode: row.customer_client?.currency_code ?? '', isManager: false }))
              .filter(child => child.id !== account.id)
              .sort((a, b) => a.name.localeCompare(b.name));
          } catch (childErr) {
            account.children = [];
          }
        }

        allAccounts.push(account);
      } catch (err) {
        console.warn(`[google/accounts] Skipping ${custId}:`, err?.message);
      }
    }

    // Deduplicate: remove accounts that already appear as MCC children
    const childIds = new Set();
    for (const acc of allAccounts) {
      if (acc.children) acc.children.forEach(c => childIds.add(c.id));
    }
    const deduplicated = allAccounts
      .filter(acc => acc.isManager || !childIds.has(acc.id))
      .sort((a, b) => { if (a.isManager !== b.isManager) return a.isManager ? -1 : 1; return a.name.localeCompare(b.name); });

    res.json({ accounts: deduplicated });
  } catch (err) {
    res.status(500).json(handleApiError(err, 'GET /api/google/accounts'));
  }
});

export default router;
