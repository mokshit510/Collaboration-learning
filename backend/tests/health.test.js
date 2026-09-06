import app from '../src/app.js';
import assert from 'node:assert';

console.log('--- Starting PRAMAAN Backend Health Verification Test ---');

const server = app.listen(0, async () => {
  const address = server.address();
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`[Test] Test server listening on ${baseUrl}`);

  try {
    // 1. Test Root Route
    console.log('[Test 1] Testing Root Route GET / ...');
    const rootRes = await fetch(`${baseUrl}/`);
    assert.strictEqual(rootRes.status, 200, 'Root route should return status 200');
    const rootJson = await rootRes.json();
    assert.strictEqual(rootJson.status, 'online', 'Status should be online');
    assert.strictEqual(rootJson.sihProblemStatement, 'SIH26188');
    console.log('✓ Root Route test passed successfully.');

    // 2. Test Health Endpoint GET /api/health
    console.log('[Test 2] Testing Health Endpoint GET /api/health ...');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(healthRes.status, 200, 'Health route should return status 200');
    const healthJson = await healthRes.json();
    assert.strictEqual(healthJson.success, true, 'Health check should report success: true');
    assert.strictEqual(healthJson.data.status, 'HEALTHY', 'Status should be HEALTHY');
    assert.strictEqual(healthJson.data.sihProblemStatement, 'SIH26188');
    assert.ok(healthJson.data.uptimeSeconds >= 0, 'Uptime should be a non-negative number');
    assert.ok(healthJson.data.services, 'Services status object should be present');
    assert.ok(healthJson.data.system, 'System metrics object should be present');
    console.log('✓ Health Endpoint test passed successfully.');
    console.log('  Response Data:', JSON.stringify(healthJson.data, null, 2));

    // 3. Test 404 Not Found Handler
    console.log('[Test 3] Testing 404 Handler GET /api/nonexistent ...');
    const notFoundRes = await fetch(`${baseUrl}/api/nonexistent`);
    assert.strictEqual(notFoundRes.status, 404, 'Non-existent route should return 404');
    const notFoundJson = await notFoundRes.json();
    assert.strictEqual(notFoundJson.success, false, '404 response should report success: false');
    console.log('✓ 404 Handler test passed successfully.');

    // 4. Test Crypto Utilities
    console.log('[Test 4] Testing Cryptographic Hashing Utilities ...');
    const { sha256, computeChainHash } = await import('../src/utils/hash.js');
    const hash1 = sha256('test-document-content');
    assert.strictEqual(typeof hash1, 'string');
    assert.strictEqual(hash1.length, 64);
    const chained = computeChainHash(hash1, { action: 'screening', score: 92 });
    assert.strictEqual(typeof chained, 'string');
    assert.strictEqual(chained.length, 64);
    console.log('✓ Hash utilities test passed successfully.');

    console.log('\n========================================================');
    console.log(' ALL PHASE 2 HEALTH & SKELETON VERIFICATIONS PASSED! ');
    console.log('========================================================\n');

    server.close(() => {
      console.log('[Test] Test server shut down cleanly.');
      process.exit(0);
    });
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    server.close(() => {
      process.exit(1);
    });
  }
});
