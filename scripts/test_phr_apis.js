const BASE_URL = 'http://localhost:4000';

async function step(title, url, method, body, token) {
  console.log('\n===============================================================');
  console.log('▶ ' + title);
  console.log(method + ' ' + url);
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(BASE_URL + url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  console.log('HTTP Status: ' + res.status + ' ' + res.statusText);
  const json = await res.json();
  console.log('Response:\n' + JSON.stringify(json, null, 2));
  return { status: res.status, json };
}

async function run() {
  console.log('===============================================================');
  console.log('     PHR REGISTRATION, FINGERPRINT & RECOVERY LIVE AUDIT       ');
  console.log('===============================================================');

  // Step 0: Get Connector Token
  const auth = await step(
    '0. Hospital Client Authentication',
    '/api/v1/auth/token',
    'POST',
    {
      clientId: 'dev_hospital_client_id',
      clientSecret: 'dev_hospital_client_secret_2026'
    }
  );
  const token = auth.json.data.accessToken;

  // 1. Document OTP Request
  const docOtp = await step(
    '1. Generate Mobile OTP for Document Registration (Driving License / PAN)',
    '/api/v1/phr/document/generate-otp',
    'POST',
    { mobile: '9999999999' },
    token
  );
  const txnId = docOtp.json.data.txnId;

  // 2. Document OTP Verify
  await step(
    '2. Verify Mobile OTP for Document Registration',
    '/api/v1/phr/document/verify-otp',
    'POST',
    { otp: '123456', txnId },
    token
  );

  // 3. Validate Driving License
  await step(
    '3. Validate Government Document (Driving License)',
    '/api/v1/phr/document/validate',
    'POST',
    {
      documentType: 'DRIVING_LICENCE',
      documentNumber: 'DL0000000000000',
      firstName: 'Demo',
      lastName: 'Patient',
      gender: 'M',
      yearOfBirth: 2000
    },
    token
  );

  // 4. Create ABHA with Document
  await step(
    '4. Create New ABHA with Driving License',
    '/api/v1/phr/document/create-abha',
    'POST',
    {
      txnId,
      documentType: 'DRIVING_LICENCE',
      documentNumber: 'DL0000000000000',
      firstName: 'Demo',
      lastName: 'Patient',
      gender: 'M',
      mobile: '9999999999',
      yearOfBirth: 2000,
      stateCode: 24
    },
    token
  );

  // 5. Fingerprint Biometric Auth Init
  const bioInit = await step(
    '5. Fingerprint Biometric Auth - Init',
    '/api/v1/phr/auth/init',
    'POST',
    {
      healthid: 'demopatient@sbx',
      authMethod: 'AADHAAR_BIO'
    },
    token
  );

  // 6. Confirm Fingerprint Biometric Auth
  await step(
    '6. Fingerprint Biometric Auth - Confirm with FMR PID (Mantra / Morpho)',
    '/api/v1/phr/auth/confirm-fingerprint',
    'POST',
    {
      authType: 'FINGERSCAN',
      bioType: 'FMR',
      pid: 'PD94bWwgdmVyc2lvbj0iMS4wIj8+DQo8UGlkRGF0YT4NCiAgPFJlc3AgZXJyQ29kZT0iMCIgZXJySW5mbz0iU3VjY2VzcyIgZkNvdW50PSIxIiBmVHlwZT0iMCIgbm1Qb2ludHM9IjM5IiBxU2NvcmU9IjY4IiAvPg0KICA8RGV2aWNlSW5mbyBkcElkPSJNQU5UUkEuTVNJUEwiIHJkc0lkPSJNQU5UUkEuV0lOLjAwMSIgcmRzVmVyPSIxLjAuMyIgbWk9Ik1GUzEwMCIgbWM9Ik1JSUVHRENDQXdDZ0F3SUJBZ0lFQWdiTWdEQU5CZ2txaGtpRzl3MEJBUXNGQURDQjZqRXFNQ2dHQTFVRUF4TWhSRk1nVFdGdWRISmhJRk52Wm5SbFkyZ2dTVzVrYVdFZ1VIWjBJRXgwWkNBM01VTZXMG1SZz08L0RhdGE+DQo8L1BpZERhdGE+',
      txnId: bioInit.json.data.txnId
    },
    token
  );

  // 7. Forgot Health ID - Mobile Recovery
  const forgotMob = await step(
    '7. Forgot ABHA Number - Request OTP by Mobile',
    '/api/v1/phr/forgot/mobile/generate-otp',
    'POST',
    { mobile: '9999999999' },
    token
  );

  await step(
    '8. Forgot ABHA Number - Verify Mobile OTP & Recover ABHA',
    '/api/v1/phr/forgot/mobile/verify',
    'POST',
    {
      txnId: forgotMob.json.data.txnId,
      otp: 123456,
      name: 'Demo Patient',
      yearOfBirth: 2000,
      gender: 'M'
    },
    token
  );

  // 8. Download ABHA QR & Card
  await step(
    '9. Download Patient ABHA QR Code',
    '/api/v1/phr/card/qr',
    'GET',
    null,
    token
  );

  await step(
    '10. Download Patient ABHA Card as PNG',
    '/api/v1/phr/card/png',
    'GET',
    null,
    token
  );

  // 9. LGD Directory
  await step(
    '11. Fetch Indian States (LGD Directory)',
    '/api/v1/phr/utility/states',
    'GET',
    null,
    token
  );

  await step(
    '12. Fetch Districts for Gujarat (State Code 24)',
    '/api/v1/phr/utility/districts?stateCode=24',
    'GET',
    null,
    token
  );

  console.log('\n===============================================================');
  console.log('     PHR REGISTRATION & RECOVERY AUDIT COMPLETED!              ');
  console.log('===============================================================');
}

run();
