import app from '../src/app.js';
import assert from 'node:assert';
import crypto from 'node:crypto';

console.log('================================================================');
console.log('  PRAMAAN Backend Integration Test Suite');
console.log('  Testing Auth, Supabase Connection, and Document Upload Flow');
console.log('================================================================\n');

const server = app.listen(0, async () => {
  const address = server.address();
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`[Suite] Running test server at ${baseUrl}\n`);

  try {
    // -------------------------------------------------------------
    // Test 1: Health & Supabase Status
    // -------------------------------------------------------------
    console.log('[Test 1] Health & Supabase Connection Probes:');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(healthRes.status, 200, 'Health endpoint must return status 200');
    const healthJson = await healthRes.json();
    assert.strictEqual(healthJson.success, true);
    assert.strictEqual(healthJson.data.status, 'HEALTHY');
    assert.ok(healthJson.data.services.supabase, 'Supabase service status must be present');
    console.log(`✓ Health status: ${healthJson.data.status}`);
    console.log(`✓ Supabase connection probe: ${healthJson.data.services.supabase.status} (${healthJson.data.services.supabase.message})\n`);

    // -------------------------------------------------------------
    // Test 2: Authentication - Login Endpoint
    // -------------------------------------------------------------
    console.log('[Test 2] POST /api/auth/login with investigator credentials:');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'officer@ssb.gov.in',
        password: 'demoPassword123',
      }),
    });
    assert.strictEqual(loginRes.status, 200, 'Login must return 200');
    const loginJson = await loginRes.json();
    assert.strictEqual(loginJson.success, true);
    assert.ok(loginJson.data.token, 'Token must be returned');
    assert.strictEqual(loginJson.data.user.role, 'investigator');
    const officerToken = loginJson.data.token;
    console.log(`✓ Login successful. User: ${loginJson.data.user.full_name} (${loginJson.data.user.role})`);
    console.log(`✓ Token received: ${officerToken.substring(0, 25)}...\n`);

    // -------------------------------------------------------------
    // Test 3: Authentication - Protected /api/auth/me
    // -------------------------------------------------------------
    console.log('[Test 3] GET /api/auth/me with Bearer token:');
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    assert.strictEqual(meRes.status, 200, '/me should return 200 with valid token');
    const meJson = await meRes.json();
    assert.strictEqual(meJson.success, true);
    assert.strictEqual(meJson.data.email, 'officer@ssb.gov.in');
    console.log(`✓ Auth profile verified: ${meJson.data.badge_number} @ ${meJson.data.checkpoint}\n`);

    // -------------------------------------------------------------
    // Test 4: Auth Enforcement - Reject request without token
    // -------------------------------------------------------------
    console.log('[Test 4] Auth Enforcement: GET /api/auth/me without token:');
    const unauthRes = await fetch(`${baseUrl}/api/auth/me`);
    assert.strictEqual(unauthRes.status, 401, 'Request without token must be rejected with 401');
    const unauthJson = await unauthRes.json();
    assert.strictEqual(unauthJson.success, false);
    console.log(`✓ Protected endpoint properly rejected with 401: "${unauthJson.message}"\n`);

    // -------------------------------------------------------------
    // Test 5: Document Upload - Reject unauthorized upload
    // -------------------------------------------------------------
    console.log('[Test 5] Auth Enforcement: POST /api/documents/upload without token:');
    const unauthUploadRes = await fetch(`${baseUrl}/api/documents/upload`, {
      method: 'POST',
    });
    assert.strictEqual(unauthUploadRes.status, 401, 'Upload without token must return 401');
    console.log('✓ Unauthorized document upload rejected with 401\n');

    // -------------------------------------------------------------
    // Test 6: Document Upload - Successful upload with SHA-256 hash
    // -------------------------------------------------------------
    console.log('[Test 6] POST /api/documents/upload with valid document file and Bearer token:');
    const samplePassportData = Buffer.from('FAKE_PASSPORT_IMAGE_BINARY_DATA_FOR_SCREENING_PIPELINE_VERIFICATION_TEST');
    const expectedSha256 = crypto.createHash('sha256').update(samplePassportData).digest('hex');

    const formData = new FormData();
    const blob = new Blob([samplePassportData], { type: 'image/jpeg' });
    formData.append('document', blob, 'sample_indian_passport.jpg');
    formData.append('documentType', 'passport');

    const uploadRes = await fetch(`${baseUrl}/api/documents/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${officerToken}`,
      },
      body: formData,
    });

    assert.strictEqual(uploadRes.status, 201, 'Upload must return status 201');
    const uploadJson = await uploadRes.json();
    assert.strictEqual(uploadJson.success, true);
    assert.ok(uploadJson.data.id, 'Uploaded document must receive a UUID');
    assert.strictEqual(uploadJson.data.file_name, 'sample_indian_passport.jpg');
    assert.strictEqual(uploadJson.data.document_type, 'passport');
    assert.strictEqual(uploadJson.data.status, 'uploaded');
    assert.strictEqual(uploadJson.data.file_hash, expectedSha256, 'SHA-256 hash must exactly match computed buffer hash');
    const uploadedDocId = uploadJson.data.id;
    console.log(`✓ Document uploaded successfully. ID: ${uploadedDocId}`);
    console.log(`✓ Document SHA-256: ${uploadJson.data.file_hash}`);
    console.log(`✓ Storage path: ${uploadJson.data.storage_path}\n`);

    // -------------------------------------------------------------
    // Test 7: Document Listing - GET /api/documents
    // -------------------------------------------------------------
    console.log('[Test 7] GET /api/documents with Bearer token:');
    const listRes = await fetch(`${baseUrl}/api/documents`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    assert.strictEqual(listRes.status, 200, 'Document listing must return 200');
    const listJson = await listRes.json();
    assert.strictEqual(listJson.success, true);
    assert.ok(Array.isArray(listJson.data), 'Data must be an array of documents');
    assert.ok(listJson.data.length >= 1, 'At least 1 document must be present');
    console.log(`✓ Document list retrieved: ${listJson.data.length} document(s) found\n`);

    // -------------------------------------------------------------
    // Test 8: Document Fetch by ID - GET /api/documents/:id
    // -------------------------------------------------------------
    console.log(`[Test 8] GET /api/documents/${uploadedDocId} with Bearer token:`);
    const getByIdRes = await fetch(`${baseUrl}/api/documents/${uploadedDocId}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    assert.strictEqual(getByIdRes.status, 200, 'Fetch by ID must return 200');
    const getByIdJson = await getByIdRes.json();
    assert.strictEqual(getByIdJson.success, true);
    assert.strictEqual(getByIdJson.data.id, uploadedDocId);
    assert.strictEqual(getByIdJson.data.file_hash, expectedSha256);
    console.log(`✓ Fetched document details for ${uploadedDocId}\n`);

    // -------------------------------------------------------------
    // Test 9: Document Fetch 404 - GET /api/documents/:id with non-existent ID
    // -------------------------------------------------------------
    console.log('[Test 9] GET /api/documents/non-existent-id:');
    const notFoundDocRes = await fetch(`${baseUrl}/api/documents/00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    assert.strictEqual(notFoundDocRes.status, 404, 'Non-existent document must return 404');
    console.log('✓ Non-existent document correctly returned 404\n');

    // -------------------------------------------------------------
    // Test 10: Authentication - Logout
    // -------------------------------------------------------------
    console.log('[Test 10] POST /api/auth/logout:');
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    assert.strictEqual(logoutRes.status, 200, 'Logout should return 200');
    console.log('✓ Logout completed successfully\n');

    console.log('================================================================');
    console.log('  ALL INTEGRATION TESTS PASSED SUCCESSFULLY! (10/10)            ');
    console.log('================================================================\n');
  } catch (err) {
    console.error('❌ Integration test failed with error:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
