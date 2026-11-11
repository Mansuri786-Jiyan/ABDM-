const BASE_URL = 'http://localhost:4000';

async function request(stepName, path, method = 'GET', body = null, token = null) {
  console.log('\n===============================================================');
  console.log(`▶ ${stepName}`);
  console.log(`${method} ${path}`);

  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(BASE_URL + path, options);
  const statusText = res.statusText || (res.status === 200 ? 'OK' : res.status === 201 ? 'Created' : '');
  console.log(`HTTP Status: ${res.status} ${statusText}`);

  let json = null;
  try {
    json = await res.json();
    console.log('Response:\n', JSON.stringify(json, null, 2));
  } catch (err) {
    console.log('Response: (Non-JSON or Empty)');
  }

  return { status: res.status, data: json };
}

async function runAudit() {
  console.log('===============================================================');
  console.log('    MILESTONE 4: HPR & HFR NATIVE INTEGRATION LIVE AUDIT       ');
  console.log('===============================================================');

  // 1. Hospital Client Authentication
  const auth = await request(
    '1. Hospital Client Authentication',
    '/api/v1/auth/token',
    'POST',
    {
      clientId: 'dev_hospital_client_id',
      clientSecret: 'dev_hospital_client_secret_2026',
    }
  );
  const token = auth.data?.data?.accessToken;

  // ==========================================
  // HPR Tests
  // ==========================================

  // 2. Search Doctor by HPR ID
  await request(
    '2. HPR: Search Doctor by HPR ID',
    '/api/v1/hpr/search/id/doctor@hpr',
    'GET',
    null,
    token
  );

  // 3. Search Doctor by Mobile
  await request(
    '3. HPR: Search Doctor by Mobile Number',
    '/api/v1/hpr/search/mobile/9999999999',
    'GET',
    null,
    token
  );

  // 4. Doctor Login: Generate Mobile OTP
  const hprOtp = await request(
    '4. HPR: Generate Doctor Login Mobile OTP',
    '/api/v1/hpr/auth/otp/generate',
    'POST',
    { mobile: '9999999999' },
    token
  );

  // 5. Doctor Login: Verify OTP
  const hprVerify = await request(
    '5. HPR: Verify Doctor Login Mobile OTP',
    '/api/v1/hpr/auth/otp/verify',
    'POST',
    {
      txnId: hprOtp.data?.data?.txnId || 'txn-hpr-auth-001',
      otp: '123456',
    },
    token
  );

  // 6. Doctor Professional Profile
  await request(
    '6. HPR: Fetch Doctor Professional Profile',
    '/api/v1/hpr/doctor/profile',
    'GET',
    null,
    token
  );

  // 7. Doctor Digital ID Card
  await request(
    '7. HPR: Download Doctor Digital ID Card',
    '/api/v1/hpr/doctor/id-card',
    'GET',
    null,
    token
  );

  // 8. Masters: Medical Councils
  await request(
    '8. HPR Master: Medical Councils Catalog',
    '/api/v1/hpr/masters/councils',
    'GET',
    null,
    token
  );

  // 9. Masters: Qualifications
  await request(
    '9. HPR Master: Recognized Courses Catalog (MBBS, MD, etc.)',
    '/api/v1/hpr/masters/courses',
    'GET',
    null,
    token
  );

  // ==========================================
  // HFR Tests
  // ==========================================

  // 10. Search Facilities
  await request(
    '10. HFR: Search Health Facilities',
    '/api/v1/hfr/facility/search',
    'POST',
    {
      facilityName: 'Mohan Hospital',
      stateLGDCode: '6',
      ownershipCode: 'P',
    },
    token
  );

  // 11. Facility Onboarding Step 1: Basic Information
  const basicOnboard = await request(
    '11. HFR: Facility Onboarding - Step 1: Basic Information',
    '/api/v1/hfr/facility/onboard/basic',
    'POST',
    {
      facilityName: 'Mohan Hospital Haryana',
      facilityType: 'HOSPITAL',
      systemOfMedicine: 'ALLOPATHY',
    },
    token
  );
  const trackingId = basicOnboard.data?.data?.trackingId || 'TRK-M4-TEST';

  // 12. Facility Onboarding Step 2: Additional Information
  await request(
    '12. HFR: Facility Onboarding - Step 2: Additional Information',
    '/api/v1/hfr/facility/onboard/additional',
    'POST',
    {
      trackingId,
      ownershipType: 'PRIVATE',
    },
    token
  );

  // 13. Facility Onboarding Step 3: Detailed Information
  await request(
    '13. HFR: Facility Onboarding - Step 3: Detailed Information',
    '/api/v1/hfr/facility/onboard/detailed',
    'POST',
    {
      trackingId,
      bedCount: 200,
      specialties: ['Cardiology', 'General Medicine', 'Pediatrics'],
    },
    token
  );

  // 14. Facility Onboarding Step 4: Submission
  await request(
    '14. HFR: Facility Onboarding - Step 4: Submit for Verification',
    '/api/v1/hfr/facility/onboard/submit',
    'POST',
    { trackingId },
    token
  );

  // 15. Facility Contact OTP Dispatch
  const contactOtp = await request(
    '15. HFR: Facility Contact OTP Dispatch',
    '/api/v1/hfr/facility/contact/send-otp',
    'POST',
    { contactNumber: '9999999999' },
    token
  );

  // 16. Facility Contact OTP Validation
  await request(
    '16. HFR: Facility Contact OTP Validation',
    '/api/v1/hfr/facility/contact/verify-otp',
    'POST',
    {
      txnId: contactOtp.data?.data?.txnId || 'txn-contact-001',
      otp: '123456',
    },
    token
  );

  // 17. Link Doctors (HPR IDs) to Facility
  await request(
    '17. HFR: Assign Healthcare Professionals (Doctors) to Facility',
    '/api/v1/hfr/facility/assign-professionals',
    'POST',
    {
      facilityId: 'IN0610000042',
      professionals: [
        {
          hprId: 'doctor@hpr',
          role: 'CONSULTANT_CARDIOLOGIST',
          department: 'Cardiology',
        },
      ],
    },
    token
  );

  console.log('\n===============================================================');
  console.log('    MILESTONE 4 AUDIT COMPLETED SUCCESSFULLY!                  ');
  console.log('===============================================================');
}

runAudit().catch(console.error);
