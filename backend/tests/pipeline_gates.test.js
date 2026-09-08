import app from '../src/app.js';
import assert from 'node:assert';

console.log('================================================================');
console.log('  PRAMAAN Pipeline Gates Test Suite');
console.log('  Testing Session Management, NFC Verification, and Face Capture');
console.log('================================================================\n');

const server = app.listen(0, async () => {
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // 1. Session Init & Retrieval
    console.log('[Test 1] GET /api/v1/session/current:');
    const sessRes = await fetch(`${baseUrl}/api/v1/session/current`);
    assert.strictEqual(sessRes.status, 200);
    const sessJson = await sessRes.json();
    assert.strictEqual(sessJson.success, true);
    assert.ok(sessJson.data.sessionId.startsWith('PRM-'), 'Session ID must start with PRM-');
    const sessionId = sessJson.data.sessionId;
    console.log(`✓ Active Session: ${sessionId}, stage: ${sessJson.data.stageName}`);

    // 2. Mobile Heartbeat
    console.log('\n[Test 2] POST /api/v1/session/:sessionId/heartbeat:');
    const hbRes = await fetch(`${baseUrl}/api/v1/session/${sessionId}/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceInfo: { userAgent: 'Mobile Chrome Test' } }),
    });
    assert.strictEqual(hbRes.status, 200);
    const hbJson = await hbRes.json();
    assert.strictEqual(hbJson.success, true);
    assert.strictEqual(hbJson.data.phoneConnected, true, 'Phone must be connected after heartbeat');
    console.log(`✓ Phone Connected Status: ${hbJson.data.phoneConnected}`);

    // 3. NFC Verification (Genuine match)
    console.log('\n[Test 3] POST /api/v1/nfc/verify (Genuine):');
    const nfcRes = await fetch(`${baseUrl}/api/v1/nfc/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        documentId: 'T1234567',
        name: 'RAHUL SHARMA',
        dob: '14/02/1999',
        nationality: 'IND',
        expiry: '09/01/2030',
        printedData: {
          documentNumber: 'T1234567',
          holderName: 'RAHUL SHARMA',
          dob: '14/02/1999',
          nationality: 'IND',
          expiryDate: '09/01/2030',
        },
      }),
    });
    assert.strictEqual(nfcRes.status, 200);
    const nfcJson = await nfcRes.json();
    assert.strictEqual(nfcJson.readStatus, 'SUCCESS');
    assert.strictEqual(nfcJson.status, 'PASS');
    assert.strictEqual(nfcJson.crossVerification.dobMatch, true);
    assert.ok(nfcJson.isPrototype, 'Prototype label must be present');
    console.log(`✓ NFC Status: ${nfcJson.status}, ReadStatus: ${nfcJson.readStatus}`);

    // 4. NFC Verification (Tampered mismatch)
    console.log('\n[Test 4] POST /api/v1/nfc/verify (Tampered DOB Mismatch):');
    const nfcMismatchRes = await fetch(`${baseUrl}/api/v1/nfc/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        documentId: 'T1234567',
        name: 'RAHUL SHARMA',
        dob: '14/02/1998', // Chip has 1998
        printedData: {
          documentNumber: 'T1234567',
          holderName: 'RAHUL SHARMA',
          dob: '14/02/1999', // Printed has 1999
        },
      }),
    });
    assert.strictEqual(nfcMismatchRes.status, 200);
    const nfcMismatchJson = await nfcMismatchRes.json();
    assert.strictEqual(nfcMismatchJson.readStatus, 'MISMATCH');
    assert.strictEqual(nfcMismatchJson.status, 'WARNING');
    assert.strictEqual(nfcMismatchJson.crossVerification.dobMatch, false);
    console.log(`✓ NFC Mismatch flagged: ${nfcMismatchJson.explanation}`);

    // 5. Face Verification (Live Mobile Capture)
    console.log('\n[Test 5] POST /api/v1/face/verify:');
    const faceRes = await fetch(`${baseUrl}/api/v1/face/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        livePhoto: 'data:image/jpeg;base64,sampleLivePhotoData...',
      }),
    });
    assert.strictEqual(faceRes.status, 200);
    const faceJson = await faceRes.json();
    assert.strictEqual(faceJson.success, true);
    assert.strictEqual(faceJson.data.status, 'PASS');
    assert.ok(faceJson.data.matchScore >= 80, 'Match score should be high for genuine match');
    assert.strictEqual(faceJson.data.liveness, 'PASS');
    console.log(`✓ Face Match Score: ${faceJson.data.matchScore}%, Liveness: ${faceJson.data.liveness}`);

    // 6. Latest NFC and Face endpoints
    console.log('\n[Test 6] GET /api/v1/nfc/latest and /api/v1/face/latest:');
    const latestNfc = await fetch(`${baseUrl}/api/v1/nfc/latest?sessionId=${sessionId}`);
    const latestNfcJson = await latestNfc.json();
    assert.ok(latestNfcJson.data, 'Latest NFC result must exist');

    const latestFace = await fetch(`${baseUrl}/api/v1/face/latest?sessionId=${sessionId}`);
    const latestFaceJson = await latestFace.json();
    assert.ok(latestFaceJson.data, 'Latest Face result must exist');
    console.log(`✓ Polling endpoints return latest results properly`);

    console.log('\n================================================================');
    console.log('  ALL PIPELINE GATES TESTS PASSED SUCCESSFULLY! (6/6)');
    console.log('================================================================\n');
  } finally {
    server.close();
  }
});
