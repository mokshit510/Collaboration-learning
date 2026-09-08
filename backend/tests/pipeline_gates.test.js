import app from '../src/app.js';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

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

    // 5. Face Verification (Live Mobile Capture with Real FaceNet512)
    console.log('\n[Test 5] POST /api/v1/face/verify:');
    const defaultDocB64 = 'data:image/jpeg;base64,' + fs.readFileSync(path.resolve(process.cwd(), '../frontend/public/images/passport_photo.jpg')).toString('base64');
    const defaultLiveB64 = 'data:image/jpeg;base64,' + fs.readFileSync(path.resolve(process.cwd(), '../frontend/public/images/live_capture.jpg')).toString('base64');

    const faceRes = await fetch(`${baseUrl}/api/v1/face/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        documentPhoto: defaultDocB64,
        livePhoto: defaultLiveB64,
      }),
    });
    assert.strictEqual(faceRes.status, 200);
    const faceJson = await faceRes.json();
    assert.strictEqual(faceJson.success, true);
    assert.strictEqual(faceJson.data.status, 'PASS');
    assert.ok(faceJson.data.matchScore >= 80, 'Match score should be high for genuine match');
    assert.strictEqual(faceJson.data.liveness, 'NOT_EVALUATED');
    console.log(`✓ Face Match Score: ${faceJson.data.matchScore}%, Liveness: ${faceJson.data.liveness}`);

    // 6. Latest NFC and Face endpoints
    console.log('\n[Test 6] GET /api/v1/nfc/latest and /api/v1/face/latest:');
    const latestNfc = await fetch(`${baseUrl}/api/v1/nfc/latest?sessionId=${sessionId}`);
    const latestNfcJson = await latestNfc.json();
    assert.ok(latestNfcJson.data, 'Latest NFC result must exist');

    const latestFace = await fetch(`${baseUrl}/api/v1/face/latest?sessionId=${sessionId}`);
    const latestFaceJson = await latestFace.json();
    assert.ok(latestFaceJson.data, 'Latest Face result must exist');

    // 7. Face Root Alias Endpoint: POST /api/v1/face
    console.log('\n[Test 7] POST /api/v1/face (Root alias for frontend):');
    const faceRootRes = await fetch(`${baseUrl}/api/v1/face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        documentPhoto: defaultDocB64,
        livePhoto: defaultLiveB64,
      }),
    });
    assert.strictEqual(faceRootRes.status, 200);
    const faceRootJson = await faceRootRes.json();
    assert.strictEqual(faceRootJson.success, true);
    assert.strictEqual(faceRootJson.data.status, 'PASS');
    console.log('✓ POST /api/v1/face successfully handled by root route');

    // 8. Tampering Endpoint Validation: POST /api/v1/tampering
    console.log('\n[Test 8] POST /api/v1/tampering (Validation & Mount Check):');
    const tamperEmptyRes = await fetch(`${baseUrl}/api/v1/tampering`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.strictEqual(tamperEmptyRes.status, 400);
    const tamperEmptyJson = await tamperEmptyRes.json();
    assert.strictEqual(tamperEmptyJson.success, false);
    console.log('✓ POST /api/v1/tampering properly mounted and validates missing input (400)');

    // 9. Stage 5 Reference Lookup: Genuine match (T1234587 - RAHUL SHARMA)
    console.log('\n[Test 9] POST /api/v1/reference/compare (Genuine Match T1234587):');
    const refGenuineRes = await fetch(`${baseUrl}/api/v1/reference/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-jwt-token-investigator',
      },
      body: JSON.stringify({
        documentNumber: 'T1234587',
        fullName: 'RAHUL SHARMA',
        dateOfBirth: '2005-01-15',
      }),
    });
    assert.strictEqual(refGenuineRes.status, 200);
    const refGenuineJson = await refGenuineRes.json();
    assert.strictEqual(refGenuineJson.success, true);
    assert.strictEqual(refGenuineJson.data.found, true);
    assert.strictEqual(refGenuineJson.data.status, 'VERIFIED');
    assert.strictEqual(refGenuineJson.data.mismatchedFields.length, 0);
    console.log(`✓ T1234587 correctly verified: status=${refGenuineJson.data.status}, matches=${refGenuineJson.data.matchedFields.join(', ')}`);

    // 10. Stage 5 Reference Lookup: Tampered Mismatch (T4567890 - AMAN VERMA vs AMAN SINGH)
    console.log('\n[Test 10] POST /api/v1/reference/compare (Tampered Mismatch T4567890):');
    const refMismatchRes = await fetch(`${baseUrl}/api/v1/reference/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-jwt-token-investigator',
      },
      body: JSON.stringify({
        documentNumber: 'T4567890',
        fullName: 'AMAN VERMA',
        dateOfBirth: '1997-08-08',
      }),
    });
    assert.strictEqual(refMismatchRes.status, 200);
    const refMismatchJson = await refMismatchRes.json();
    assert.strictEqual(refMismatchJson.success, true);
    assert.strictEqual(refMismatchJson.data.found, true, 'Document T4567890 must be FOUND in database');
    assert.strictEqual(refMismatchJson.data.status, 'MISMATCH', 'Status must be MISMATCH when extracted name differs');
    assert.ok(refMismatchJson.data.matchedFields.includes('Passport Number'));
    const nameMismatch = refMismatchJson.data.mismatchedFields.find(f => f.field === 'fullName');
    assert.ok(nameMismatch, 'fullName must be flagged in mismatchedFields');
    assert.strictEqual(nameMismatch.extractedValue, 'AMAN VERMA');
    assert.strictEqual(nameMismatch.referenceValue, 'AMAN SINGH');
    console.log(`✓ T4567890 FOUND with MISMATCH: extracted "${nameMismatch.extractedValue}" vs record "${nameMismatch.referenceValue}"`);

    // 11. Stage 5 Reference Lookup: Non-existent document (NONEXIST999)
    console.log('\n[Test 11] POST /api/v1/reference/compare (Non-existent Document):');
    const refNotFoundRes = await fetch(`${baseUrl}/api/v1/reference/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-jwt-token-investigator',
      },
      body: JSON.stringify({
        documentNumber: 'NONEXIST999',
      }),
    });
    assert.strictEqual(refNotFoundRes.status, 200);
    const refNotFoundJson = await refNotFoundRes.json();
    assert.strictEqual(refNotFoundJson.success, true);
    assert.strictEqual(refNotFoundJson.data.found, false);
    assert.strictEqual(refNotFoundJson.data.status, 'NOT_FOUND');
    console.log('✓ NONEXIST999 correctly returned found: false, status: NOT_FOUND');

    // 12. Stage 5 Reference Lookup: Blacklisted document (TESTBLK001)
    console.log('\n[Test 12] POST /api/v1/reference/compare (Blacklisted Document TESTBLK001):');
    const refBlkRes = await fetch(`${baseUrl}/api/v1/reference/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-jwt-token-investigator',
      },
      body: JSON.stringify({
        documentNumber: 'TESTBLK001',
      }),
    });
    assert.strictEqual(refBlkRes.status, 200);
    const refBlkJson = await refBlkRes.json();
    assert.strictEqual(refBlkJson.data.found, true);
    assert.strictEqual(refBlkJson.data.status, 'BLACKLISTED');
    console.log('✓ TESTBLK001 correctly returned status: BLACKLISTED');

    // 13. Stage 5 Reference Lookup: Suspicious document (TESTSUS001)
    console.log('\n[Test 13] POST /api/v1/reference/compare (Suspicious Document TESTSUS001):');
    const refSusRes = await fetch(`${baseUrl}/api/v1/reference/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-jwt-token-investigator',
      },
      body: JSON.stringify({
        documentNumber: 'TESTSUS001',
      }),
    });
    assert.strictEqual(refSusRes.status, 200);
    const refSusJson = await refSusRes.json();
    assert.strictEqual(refSusJson.data.found, true);
    assert.strictEqual(refSusJson.data.status, 'SUSPICIOUS');
    console.log('✓ TESTSUS001 correctly returned status: SUSPICIOUS');

    // 14. Stage 5 Reference Lookup: Expired document (T3456789)
    console.log('\n[Test 14] POST /api/v1/reference/compare (Expired Document T3456789):');
    const refExpRes = await fetch(`${baseUrl}/api/v1/reference/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-jwt-token-investigator',
      },
      body: JSON.stringify({
        documentNumber: 'T3456789',
      }),
    });
    assert.strictEqual(refExpRes.status, 200);
    const refExpJson = await refExpRes.json();
    assert.strictEqual(refExpJson.data.found, true);
    assert.strictEqual(refExpJson.data.status, 'EXPIRED');
    console.log('✓ T3456789 correctly returned status: EXPIRED');

    // 15. Document-Session Isolation: Fresh Session Generation & State Reset (Document B)
    console.log('\n[Test 15] POST /api/v1/session/init (Create Fresh Session for Document B):');
    const sessBRes = await fetch(`${baseUrl}/api/v1/session/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document: {
          documentNumber: 'T4567890',
          holderName: 'AMAN VERMA',
        },
      }),
    });
    assert.strictEqual(sessBRes.status, 201);
    const sessBJson = await sessBRes.json();
    const sessionBId = sessBJson.data.sessionId;
    assert.notStrictEqual(sessionBId, sessionId, 'Document B session ID must be unique');
    assert.strictEqual(sessBJson.data.nfcResult, null, 'NFC evidence must be reset to null for Document B');
    assert.strictEqual(sessBJson.data.faceResult, null, 'Face evidence must be reset to null for Document B');
    assert.strictEqual(sessBJson.data.currentStage, 1, 'Stage must be reset to 1 for Document B');
    assert.strictEqual(sessBJson.data.phoneConnected, true, 'Phone connection must be preserved from previous heartbeat');
    console.log(`✓ Document B initialized with fresh session: ${sessionBId}, NFC/Face cleared, phone connected`);

    // 16. Stale Evidence Rejection: Reject NFC for Old Session (sessionId A)
    console.log('\n[Test 16] POST /api/v1/nfc/verify with stale sessionId A:');
    const staleNfcRes = await fetch(`${baseUrl}/api/v1/nfc/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionId, // Old session
        nfcData: { documentId: 'T1234567' },
      }),
    });
    assert.strictEqual(staleNfcRes.status, 409, 'Backend must reject stale session NFC submission with 409');
    const staleNfcJson = await staleNfcRes.json();
    assert.strictEqual(staleNfcJson.error, 'STALE_VERIFICATION_SESSION');

    // Verify Document B's session was NOT contaminated
    const checkSessBRes1 = await fetch(`${baseUrl}/api/v1/session/${sessionBId}`);
    const checkSessBJson1 = await checkSessBRes1.json();
    assert.strictEqual(checkSessBJson1.data.nfcResult, null, 'Document B must not inherit stale NFC evidence');
    console.log('✓ Stale session NFC properly rejected (409 STALE_VERIFICATION_SESSION)');

    // 17. Stale Evidence Rejection: Reject Face for Old Session (sessionId A)
    console.log('\n[Test 17] POST /api/v1/face/verify with stale sessionId A:');
    const staleFaceRes = await fetch(`${baseUrl}/api/v1/face/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionId, // Old session
        livePhoto: 'data:image/jpeg;base64,sampleStalePhoto...',
      }),
    });
    assert.strictEqual(staleFaceRes.status, 409, 'Backend must reject stale session Face submission with 409');
    const staleFaceJson = await staleFaceRes.json();
    assert.strictEqual(staleFaceJson.error, 'STALE_VERIFICATION_SESSION');

    // Verify Document B's session was NOT contaminated
    const checkSessBRes2 = await fetch(`${baseUrl}/api/v1/session/${sessionBId}`);
    const checkSessBJson2 = await checkSessBRes2.json();
    assert.strictEqual(checkSessBJson2.data.faceResult, null, 'Document B must not inherit stale Face evidence');
    console.log('✓ Stale session Face properly rejected (409 STALE_VERIFICATION_SESSION)');

    // 18. Fresh Evidence Acceptance: Accept NFC and Face for Document B
    console.log('\n[Test 18] POST /api/v1/nfc/verify & face/verify for Active Session B:');
    const freshNfcRes = await fetch(`${baseUrl}/api/v1/nfc/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionBId,
        documentId: 'T4567890',
        name: 'AMAN VERMA',
        dob: '08/08/1997',
        nationality: 'IND',
        expiry: '17/05/2029',
        printedData: {
          documentNumber: 'T4567890',
          holderName: 'AMAN VERMA',
          dob: '08/08/1997',
          nationality: 'IND',
          expiryDate: '17/05/2029',
        },
      }),
    });
    assert.strictEqual(freshNfcRes.status, 200);
    const freshNfcJson = await freshNfcRes.json();
    assert.strictEqual(freshNfcJson.data.sessionId, sessionBId, 'NFC evidence must be bound to Session B');

    const testLiveB64 = 'data:image/jpeg;base64,' + fs.readFileSync(path.resolve(process.cwd(), '../frontend/public/images/live_capture.jpg')).toString('base64');
    const testDocB64 = 'data:image/jpeg;base64,' + fs.readFileSync(path.resolve(process.cwd(), '../frontend/public/images/passport_photo.jpg')).toString('base64');

    const freshFaceRes = await fetch(`${baseUrl}/api/v1/face/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionBId,
        documentPhoto: testDocB64,
        livePhoto: testLiveB64,
      }),
    });
    assert.strictEqual(freshFaceRes.status, 200);
    const freshFaceJson = await freshFaceRes.json();
    assert.strictEqual(freshFaceJson.data.sessionId, sessionBId, 'Face evidence must be bound to Session B');
    assert.strictEqual(freshFaceJson.data.status, 'PASS');
    assert.strictEqual(freshFaceJson.data.liveness, 'NOT_EVALUATED');
    console.log(`✓ Active Session B successfully received and bound fresh NFC and Face evidence (score=${freshFaceJson.data.matchScore}%)`);

    // 19. Document C Cycle: Initializing Document C resets all evidence once again
    console.log('\n[Test 19] POST /api/v1/session/init (Document C Verification Cycle):');
    const sessCRes = await fetch(`${baseUrl}/api/v1/session/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document: {
          documentNumber: 'T2345678',
          holderName: 'PRIYA PATIL',
        },
      }),
    });
    assert.strictEqual(sessCRes.status, 201);
    const sessCJson = await sessCRes.json();
    const sessionCId = sessCJson.data.sessionId;
    assert.notStrictEqual(sessionCId, sessionBId);
    assert.strictEqual(sessCJson.data.nfcResult, null, 'NFC must be null for Document C');
    assert.strictEqual(sessCJson.data.faceResult, null, 'Face must be null for Document C');
    assert.strictEqual(sessCJson.data.phoneConnected, true, 'Phone connection maintained for Document C');
    console.log(`✓ Document C initialized fresh: ${sessionCId}, all prior evidence wiped, ready for new inputs`);

    // 20. Real Python AI Tampering Analysis: POST /api/v1/tampering
    console.log('\n[Test 20] POST /api/v1/tampering (Real AI Forensics Execution):');
    const imgPath = path.resolve(process.cwd(), '../frontend/public/images/passport_photo.jpg');
    const imgBuffer = fs.readFileSync(imgPath);
    const blob = new Blob([imgBuffer], { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('document', blob, 'passport_photo.jpg');
    formData.append('sessionId', sessionCId);

    const tamperRes = await fetch(`${baseUrl}/api/v1/tampering`, {
      method: 'POST',
      body: formData,
    });
    assert.strictEqual(tamperRes.status, 200);
    const tamperJson = await tamperRes.json();
    assert.strictEqual(tamperJson.success, true);
    assert.strictEqual(tamperJson.data.isSimulated, false, 'Tampering must be executed by real AI');
    assert.strictEqual(typeof tamperJson.data.tamperingScore, 'number');
    assert.ok(tamperJson.data.tamperingScore >= 0 && tamperJson.data.tamperingScore <= 100);
    assert.strictEqual(tamperJson.data.sessionId, sessionCId);
    console.log(`✓ Real AI Tampering Analysis Passed: score=${tamperJson.data.tamperingScore}%, verdict=${tamperJson.data.verdict}, confidence=${tamperJson.data.confidence}%, indicators=${tamperJson.data.indicators.length}`);

    // 21. Tampering Stale Session Isolation Check: POST /api/v1/tampering with stale sessionBId
    console.log('\n[Test 21] POST /api/v1/tampering (Stale Session Rejection):');
    const staleFormData = new FormData();
    staleFormData.append('document', blob, 'passport_photo.jpg');
    staleFormData.append('sessionId', sessionBId);

    const staleTamperRes = await fetch(`${baseUrl}/api/v1/tampering`, {
      method: 'POST',
      body: staleFormData,
    });
    assert.strictEqual(staleTamperRes.status, 409);
    const staleTamperJson = await staleTamperRes.json();
    assert.strictEqual(staleTamperJson.error, 'STALE_VERIFICATION_SESSION');
    console.log('✓ Stale session tampering request properly rejected (409 STALE_VERIFICATION_SESSION)');

    // 22. Real FaceNet512 Biometric Verification (Matching Faces)
    console.log('\n[Test 22] POST /api/v1/face/verify (Real FaceNet512 Matching Faces):');
    const matchFaceRes = await fetch(`${baseUrl}/api/v1/face/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionCId,
        documentPhoto: testDocB64,
        livePhoto: testLiveB64,
      }),
    });
    assert.strictEqual(matchFaceRes.status, 200);
    const matchFaceJson = await matchFaceRes.json();
    assert.strictEqual(matchFaceJson.success, true);
    assert.strictEqual(matchFaceJson.data.status, 'PASS');
    assert.strictEqual(matchFaceJson.data.liveness, 'NOT_EVALUATED');
    assert.strictEqual(matchFaceJson.data.documentFaceDetected, true);
    assert.ok(matchFaceJson.data.matchScore >= 80, `Expected match score >= 80, got ${matchFaceJson.data.matchScore}`);
    assert.strictEqual(matchFaceJson.data.details?.model, 'Facenet512');
    assert.strictEqual(matchFaceJson.data.details?.metric, 'cosine');
    assert.strictEqual(typeof matchFaceJson.data.details?.distance, 'number');
    console.log(`✓ FaceNet512 Matching Faces Passed: score=${matchFaceJson.data.matchScore}%, distance=${matchFaceJson.data.details.distance}, status=${matchFaceJson.data.status}, liveness=${matchFaceJson.data.liveness}`);

    // 23. Real FaceNet512 Biometric Verification (Non-Matching Faces)
    console.log('\n[Test 23] POST /api/v1/face/verify (Real FaceNet512 Non-Matching Faces):');
    const testMismatchB64 = 'data:image/jpeg;base64,' + fs.readFileSync(path.resolve(process.cwd(), '../frontend/public/images/admin_mehta.jpg')).toString('base64');
    const mismatchFaceRes = await fetch(`${baseUrl}/api/v1/face/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionCId,
        documentPhoto: testMismatchB64,
        livePhoto: testLiveB64,
      }),
    });
    assert.strictEqual(mismatchFaceRes.status, 200);
    const mismatchFaceJson = await mismatchFaceRes.json();
    assert.strictEqual(mismatchFaceJson.success, true);
    assert.notStrictEqual(mismatchFaceJson.data.status, 'PASS', 'Mismatch faces must not PASS');
    assert.ok(mismatchFaceJson.data.matchScore < 70, `Expected mismatch score < 70, got ${mismatchFaceJson.data.matchScore}`);
    console.log(`✓ FaceNet512 Mismatch Faces Passed: score=${mismatchFaceJson.data.matchScore}%, distance=${mismatchFaceJson.data.details.distance}, status=${mismatchFaceJson.data.status}`);

    // 24. Invalid Document Image Rejection (No fake fallback 94%)
    console.log('\n[Test 24] POST /api/v1/face/verify (Invalid Document Image):');
    const invalidDocRes = await fetch(`${baseUrl}/api/v1/face/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionCId,
        documentPhoto: 'not-a-valid-image-buffer',
        livePhoto: testLiveB64,
      }),
    });
    assert.strictEqual(invalidDocRes.status, 400);
    const invalidDocJson = await invalidDocRes.json();
    assert.strictEqual(invalidDocJson.error, 'DOCUMENT_IMAGE_UNAVAILABLE');
    console.log('✓ Invalid document image properly rejected (400 DOCUMENT_IMAGE_UNAVAILABLE) without fake fallback');

    // 25. Invalid Live Selfie Image Rejection (No fake fallback 94%)
    console.log('\n[Test 25] POST /api/v1/face/verify (Invalid Live Selfie):');
    const invalidLiveRes = await fetch(`${baseUrl}/api/v1/face/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionCId,
        documentPhoto: testDocB64,
        livePhoto: 'not-a-valid-image-buffer',
      }),
    });
    assert.strictEqual(invalidLiveRes.status, 400);
    const invalidLiveJson = await invalidLiveRes.json();
    assert.strictEqual(invalidLiveJson.error, 'LIVE_FACE_IMAGE_UNAVAILABLE');
    console.log('✓ Invalid live selfie properly rejected (400 LIVE_FACE_IMAGE_UNAVAILABLE) without fake fallback');

    // 26. Stale Session Face Verification Rejection
    console.log('\n[Test 26] POST /api/v1/face/verify (Stale Session Rejection):');
    const staleFaceVerifyRes = await fetch(`${baseUrl}/api/v1/face/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionBId, // Session B is stale since Session C is active
        documentPhoto: testDocB64,
        livePhoto: testLiveB64,
      }),
    });
    assert.strictEqual(staleFaceVerifyRes.status, 409);
    const staleFaceVerifyJson = await staleFaceVerifyRes.json();
    assert.strictEqual(staleFaceVerifyJson.error, 'STALE_VERIFICATION_SESSION');
    console.log('✓ Stale session face verification request properly rejected (409 STALE_VERIFICATION_SESSION)');

    console.log('\n================================================================');
    console.log('  ALL PIPELINE GATES & BIOMETRIC TESTS PASSED! (26/26)');
    console.log('================================================================\n');
  } finally {
    server.close();
  }
});
