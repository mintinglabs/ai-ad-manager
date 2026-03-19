/**
 * Comprehensive API endpoint test script.
 * Tests that every route is registered and responds (not 404).
 * Meta API calls may fail with auth errors — that's expected.
 * We're testing route registration, parameter validation, and error handling.
 */

const BASE = 'http://localhost:3001/api';

const results = { pass: 0, fail: 0, errors: [] };

async function test(method, path, body = null, expectedStatus = null) {
  const url = `${BASE}${path}`;
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    const status = res.status;

    // 404 means route not registered — that's a FAIL
    // 400 means validation working — PASS
    // 500/502 means route hit Meta API (auth fail expected) — PASS
    // 200 means success — PASS
    const isRouteRegistered = status !== 404;
    const isExpectedValidation = expectedStatus ? status === expectedStatus : true;

    if (isRouteRegistered && isExpectedValidation) {
      results.pass++;
      console.log(`  ✓ ${method.padEnd(6)} ${path} → ${status}`);
    } else {
      results.fail++;
      const reason = !isRouteRegistered ? '404 NOT FOUND' : `Expected ${expectedStatus}, got ${status}`;
      results.errors.push(`${method} ${path}: ${reason}`);
      console.log(`  ✗ ${method.padEnd(6)} ${path} → ${status} (${reason})`);
    }
    return { status, data };
  } catch (err) {
    results.fail++;
    results.errors.push(`${method} ${path}: ${err.message}`);
    console.log(`  ✗ ${method.padEnd(6)} ${path} → ERROR: ${err.message}`);
    return { status: 0, data: {} };
  }
}

async function runTests() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  AI Ad Manager — Comprehensive API Endpoint Tests');
  console.log('══════════════════════════════════════════════════\n');

  // --- Health ---
  console.log('▸ Health');
  await test('GET', '/ping');

  // --- Auth ---
  console.log('\n▸ Auth');
  await test('POST', '/auth/token', {}, 400); // missing shortLivedToken

  // --- Campaigns ---
  console.log('\n▸ Campaigns');
  await test('GET', '/campaigns?adAccountId=act_123');
  await test('POST', '/campaigns', {}, 400); // missing required fields
  await test('POST', '/campaigns', { adAccountId: 'act_123', name: 'Test', objective: 'OUTCOME_TRAFFIC' });
  await test('PATCH', '/campaigns/123', { status: 'PAUSED' });
  await test('DELETE', '/campaigns/123');
  await test('POST', '/campaigns/123/copies', { deep_copy: true });
  await test('GET', '/campaigns/123/adsets');
  await test('GET', '/campaigns/123/ads');

  // --- Ad Sets ---
  console.log('\n▸ Ad Sets');
  await test('GET', '/adsets?adAccountId=act_123');
  await test('GET', '/adsets/123');
  await test('POST', '/adsets', {}, 400); // missing required fields
  await test('POST', '/adsets', { adAccountId: 'act_123', name: 'Test AdSet', campaign_id: '123', optimization_goal: 'LINK_CLICKS', billing_event: 'IMPRESSIONS' });
  await test('PATCH', '/adsets/123', { status: 'PAUSED' });
  await test('DELETE', '/adsets/123');
  await test('POST', '/adsets/123/copies', {});
  await test('GET', '/adsets/123/ads');
  await test('GET', '/adsets/123/delivery_estimate');

  // --- Ads ---
  console.log('\n▸ Ads');
  await test('GET', '/ads?adAccountId=act_123');
  await test('GET', '/ads/123');
  await test('POST', '/ads', {}, 400);
  await test('POST', '/ads', { adAccountId: 'act_123', name: 'Test Ad', adset_id: '123', creative: { creative_id: '456' } });
  await test('PATCH', '/ads/123', { status: 'PAUSED' });
  await test('DELETE', '/ads/123');
  await test('POST', '/ads/123/copies', {});
  await test('GET', '/ads/123/leads');
  await test('GET', '/ads/123/previews?ad_format=DESKTOP_FEED_STANDARD');

  // --- Creatives ---
  console.log('\n▸ Creatives');
  await test('GET', '/creatives?adAccountId=act_123');
  await test('GET', '/creatives/123');
  await test('POST', '/creatives', {}, 400);
  await test('POST', '/creatives', { adAccountId: 'act_123', name: 'Test Creative' });
  await test('PATCH', '/creatives/123', { name: 'Updated' });
  await test('DELETE', '/creatives/123');
  await test('GET', '/creatives/123/previews?ad_format=MOBILE_FEED_STANDARD');

  // --- Assets (Images & Videos) ---
  console.log('\n▸ Assets');
  await test('GET', '/assets/images?adAccountId=act_123');
  await test('POST', '/assets/images', {}, 400);
  await test('POST', '/assets/images', { adAccountId: 'act_123', bytes: 'base64data' });
  await test('DELETE', '/assets/images', {}, 400); // missing required
  await test('DELETE', '/assets/images', { adAccountId: 'act_123', hash: 'abc123' });
  await test('GET', '/assets/videos?adAccountId=act_123');
  await test('POST', '/assets/videos', {}, 400);
  await test('POST', '/assets/videos', { adAccountId: 'act_123', file_url: 'https://example.com/video.mp4' });
  await test('GET', '/assets/videos/123/status');

  // --- Insights ---
  console.log('\n▸ Insights');
  await test('GET', '/insights');
  await test('GET', '/insights/act_123?date_preset=last_7d');
  await test('GET', '/insights/act_123?breakdowns=age,gender');
  await test('POST', '/insights/async', {}, 400);
  await test('POST', '/insights/async', { adAccountId: 'act_123', date_preset: 'last_30d', breakdowns: 'age' });
  await test('GET', '/insights/async/12345/status');
  await test('GET', '/insights/async/12345/results');

  // --- Targeting ---
  console.log('\n▸ Targeting');
  await test('GET', '/targeting/search?adAccountId=act_123&q=fitness');
  await test('GET', '/targeting/search', null, 400); // missing params
  await test('GET', '/targeting/browse?adAccountId=act_123');
  await test('GET', '/targeting/suggestions?adAccountId=act_123');
  await test('POST', '/targeting/validate', {}, 400);
  await test('POST', '/targeting/validate', { adAccountId: 'act_123', targeting_spec: { geo_locations: { countries: ['US'] } } });
  await test('POST', '/targeting/reach-estimate', {}, 400);
  await test('POST', '/targeting/reach-estimate', { adAccountId: 'act_123', targeting_spec: { geo_locations: { countries: ['US'] } } });
  await test('POST', '/targeting/delivery-estimate', {}, 400);
  await test('POST', '/targeting/delivery-estimate', { adAccountId: 'act_123', targeting_spec: { geo_locations: { countries: ['US'] } }, optimization_goal: 'LINK_CLICKS' });
  await test('GET', '/targeting/broad-categories?adAccountId=act_123');
  await test('GET', '/targeting/saved-audiences?adAccountId=act_123');
  await test('POST', '/targeting/saved-audiences', {}, 400);
  await test('POST', '/targeting/saved-audiences', { adAccountId: 'act_123', name: 'Test Audience', targeting: { geo_locations: { countries: ['US'] } } });
  await test('DELETE', '/targeting/saved-audiences/123');

  // --- Rules ---
  console.log('\n▸ Ad Rules');
  await test('GET', '/rules?adAccountId=act_123');
  await test('GET', '/rules/123');
  await test('POST', '/rules', {}, 400);
  await test('POST', '/rules', { adAccountId: 'act_123', name: 'Test Rule', schedule_spec: {}, evaluation_spec: {}, execution_spec: {} });
  await test('PATCH', '/rules/123', { name: 'Updated Rule' });
  await test('DELETE', '/rules/123');
  await test('GET', '/rules/123/history');

  // --- Labels ---
  console.log('\n▸ Ad Labels');
  await test('GET', '/labels?adAccountId=act_123');
  await test('POST', '/labels', {}, 400);
  await test('POST', '/labels', { adAccountId: 'act_123', name: 'Test Label' });
  await test('PATCH', '/labels/123', { name: 'Updated' });
  await test('DELETE', '/labels/123');
  await test('POST', '/labels/assign', {}, 400);
  await test('POST', '/labels/assign', { objectId: '123', labelId: '456' });

  // --- Pixels ---
  console.log('\n▸ Pixels');
  await test('GET', '/pixels?adAccountId=act_123');
  await test('GET', '/pixels/123');
  await test('POST', '/pixels', {}, 400);
  await test('POST', '/pixels', { adAccountId: 'act_123', name: 'Test Pixel' });
  await test('PATCH', '/pixels/123', { name: 'Updated' });
  await test('GET', '/pixels/123/stats');
  await test('POST', '/pixels/123/events', {}, 400);
  await test('POST', '/pixels/123/events', { data: [{ event_name: 'Purchase', event_time: 1234567890, action_source: 'website', user_data: { em: 'hash' } }] });

  // --- Conversions ---
  console.log('\n▸ Custom Conversions');
  await test('GET', '/conversions?adAccountId=act_123');
  await test('POST', '/conversions', {}, 400);
  await test('POST', '/conversions', { adAccountId: 'act_123', name: 'Test', rule: '{}', event_source_type: 'pixel' });
  await test('PATCH', '/conversions/123', { name: 'Updated' });
  await test('DELETE', '/conversions/123');

  // --- Leads ---
  console.log('\n▸ Lead Ads');
  await test('GET', '/leads/forms?pageId=123');
  await test('GET', '/leads/forms?pageId=', null, 400);
  await test('GET', '/leads/forms/123/leads');
  await test('POST', '/leads/forms', {}, 400);
  await test('POST', '/leads/forms', { pageId: '123', name: 'Test Form', questions: [], privacy_policy_url: 'https://example.com' });
  await test('GET', '/leads/ads/123');

  // --- Catalogs ---
  console.log('\n▸ Product Catalogs');
  await test('GET', '/catalogs?businessId=123');
  await test('GET', '/catalogs/123');
  await test('POST', '/catalogs', {}, 400);
  await test('POST', '/catalogs', { businessId: '123', name: 'Test Catalog', vertical: 'commerce' });
  await test('PATCH', '/catalogs/123', { name: 'Updated' });
  await test('DELETE', '/catalogs/123');
  await test('GET', '/catalogs/123/products');
  await test('POST', '/catalogs/123/products/batch', {}, 400);
  await test('POST', '/catalogs/123/products/batch', { requests: [{ method: 'CREATE', data: {} }] });
  await test('GET', '/catalogs/123/product-sets');
  await test('POST', '/catalogs/123/product-sets', {}, 400);
  await test('POST', '/catalogs/123/product-sets', { name: 'Test Set', filter: '{}' });
  await test('PATCH', '/catalogs/product-sets/123', { name: 'Updated' });
  await test('DELETE', '/catalogs/product-sets/123');
  await test('GET', '/catalogs/123/feeds');
  await test('POST', '/catalogs/123/feeds', {}, 400);
  await test('POST', '/catalogs/123/feeds', { name: 'Test Feed', schedule: {} });
  await test('PATCH', '/catalogs/feeds/123', { name: 'Updated' });
  await test('DELETE', '/catalogs/feeds/123');
  await test('GET', '/catalogs/123/diagnostics');

  // --- Previews ---
  console.log('\n▸ Ad Previews');
  await test('GET', '/previews/ad/123?ad_format=DESKTOP_FEED_STANDARD');
  await test('GET', '/previews/ad/123', null, 400);
  await test('GET', '/previews/creative/123?ad_format=MOBILE_FEED_STANDARD');
  await test('GET', '/previews/creative/123', null, 400);
  await test('POST', '/previews/generate', {}, 400);
  await test('POST', '/previews/generate', { adAccountId: 'act_123', creative: { body: 'test' }, ad_format: 'DESKTOP_FEED_STANDARD' });

  // --- Meta (Business Manager, Audiences, etc.) ---
  console.log('\n▸ Meta — Ad Accounts');
  await test('GET', '/meta/adaccounts');
  await test('GET', '/meta/adaccounts/act_123/details');
  await test('GET', '/meta/adaccounts/act_123/activities');
  await test('GET', '/meta/adaccounts/act_123/users');
  await test('GET', '/meta/adaccounts/act_123/minimum-budgets');
  await test('GET', '/meta/adaccounts/act_123/instagram-accounts');

  console.log('\n▸ Meta — Businesses');
  await test('GET', '/meta/businesses');
  await test('GET', '/meta/businesses/123/adaccounts');
  await test('GET', '/meta/businesses/123/details');
  await test('GET', '/meta/businesses/123/users');
  await test('GET', '/meta/businesses/123/system-users');
  await test('GET', '/meta/businesses/123/owned-pages');
  await test('GET', '/meta/businesses/123/owned-pixels');
  await test('GET', '/meta/businesses/123/owned-catalogs');
  await test('GET', '/meta/businesses/123/owned-instagram');
  await test('GET', '/meta/businesses/123/client-adaccounts');
  await test('POST', '/meta/businesses/123/claim-adaccount', {}, 400);
  await test('POST', '/meta/businesses/123/claim-adaccount', { adaccount_id: 'act_456' });

  console.log('\n▸ Meta — Audiences');
  await test('GET', '/meta/customaudiences?adAccountId=act_123');
  await test('POST', '/meta/customaudiences', {}, 400);
  await test('POST', '/meta/customaudiences', { adAccountId: 'act_123', name: 'Test Audience' });
  await test('GET', '/meta/customaudiences/123');
  await test('PATCH', '/meta/customaudiences/123', { name: 'Updated' });
  await test('DELETE', '/meta/customaudiences/123');
  await test('POST', '/meta/customaudiences/123/users', { schema: ['EMAIL'], data: [['hash']] });
  await test('DELETE', '/meta/customaudiences/123/users', { schema: ['EMAIL'], data: [['hash']] });
  await test('POST', '/meta/lookalike-audiences', {}, 400);
  await test('POST', '/meta/lookalike-audiences', { adAccountId: 'act_123', name: 'LAL', origin_audience_id: '456', lookalike_spec: { type: 'similarity', country: 'US', ratio: 0.01 } });

  console.log('\n▸ Meta — Pages');
  await test('GET', '/meta/pages');
  await test('GET', '/meta/pages/123/ads');

  console.log('\n▸ Meta — Batch, Ad Library, R&F, Block Lists');
  await test('POST', '/meta/batch', {}, 400);
  await test('POST', '/meta/batch', { batch: [{ method: 'GET', relative_url: 'me' }] });
  await test('GET', '/meta/ad-library?search_terms=test&ad_reached_countries=US');
  await test('POST', '/meta/reach-frequency', {}, 400);
  await test('POST', '/meta/reach-frequency', { adAccountId: 'act_123', budget: 1000, prediction_mode: 0, start_time: 1234567890, stop_time: 1234667890 });
  await test('GET', '/meta/block-lists?adAccountId=act_123');
  await test('POST', '/meta/block-lists', {}, 400);
  await test('POST', '/meta/block-lists', { adAccountId: 'act_123', name: 'Test Block List' });
  await test('DELETE', '/meta/block-lists/123');

  // --- Summary ---
  console.log('\n══════════════════════════════════════════════════');
  console.log(`  RESULTS: ${results.pass} passed, ${results.fail} failed`);
  console.log('══════════════════════════════════════════════════');
  if (results.errors.length > 0) {
    console.log('\n  FAILURES:');
    results.errors.forEach(e => console.log(`    ✗ ${e}`));
  }
  console.log('');
}

runTests().then(() => process.exit(results.fail > 0 ? 1 : 0));
