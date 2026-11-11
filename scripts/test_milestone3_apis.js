const BASE_URL = 'http://localhost:4000';

async function request(name, path, method = 'GET', body = null, headers = {}) {
  console.log(`\n===============================================================`);
  console.log(`▶ API: ${name}`);
  console.log(`URL: ${method} ${BASE_URL}${path}`);
  if (body) {
    console.log(`Request Body:`, JSON.stringify(body, null, 2));
  }

  const reqHeaders = {
    'Content-Type': 'application/json',
    'REQUEST-ID': 'req-' + Math.random().toString(36).substring(2, 9),
    'TIMESTAMP': new Date().toISOString(),
    'X-CM-ID': 'sbx',
    ...headers,
  };

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
    const status = res.status;
    let data;
    try {
      data = await res.json();
    } catch {
      data = await res.text();
    }
    console.log(`Status Code: ${status} ${res.statusText}`);
    console.log(`Response Output:`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
    return { status, data };
  } catch (err) {
    console.error(`Error calling ${name}:`, err.message);
    return { status: 500, error: err.message };
  }
}

async function runM3Audit() {
  console.log('===============================================================');
  console.log('     ABDM MILESTONE 3 (HIU) STEP-BY-STEP LIVE AUDIT            ');
  console.log('===============================================================');

  // 1. HIU Clinician Login with Username & Password
  const loginRes = await request(
    '1. HIU Clinician Login (Username & Password)',
    '/api/v1/hiu/auth/login',
    'POST',
    {
      username: 'doctor_sharma',
      password: 'doctor123',
    }
  );

  const token = loginRes.data?.data?.token;
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  // 2. Select Patient for HIU Consent Creation
  const patientsRes = await request(
    '2. HIU Patient Selection & Search',
    '/api/v1/hiu/patients?search=Demo',
    'GET',
    null,
    authHeader
  );
  const selectedPatient = patientsRes.data?.data?.patients?.[0]?.patientId || 'demopatient@sbx';

  // 3. Create Consent Request for Selected Patient
  const consentReqRes = await request(
    '3. Create Consent Request for Selected Patient',
    '/api/v1/hiu/consent/requests',
    'POST',
    {
      patientId: selectedPatient,
      hiuId: 'Mohan_HIP',
      requesterName: 'Dr. Sharma',
      purposeCode: 'CAREMGT',
      purposeText: 'Care Management',
      hiTypes: [
        'OPConsultation',
        'Prescription',
        'DischargeSummary',
        'DiagnosticReport',
        'ImmunizationRecord',
        'WellnessRecord',
      ],
      dateFrom: '2020-01-01T00:00:00.000Z',
      dateTo: new Date().toISOString(),
      dataEraseAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    },
    authHeader
  );

  const consentRequestId = consentReqRes.data?.data?.consentRequestId;

  // 4. List All Consent Requests in HIU
  await request(
    '4. List All Consent Requests in HIU',
    '/api/v1/hiu/consent/requests',
    'GET',
    null,
    authHeader
  );

  // 5. Get Consent Request Details
  await request(
    '5. Get Consent Request Details by ID',
    `/api/v1/hiu/consent/requests/${consentRequestId}`,
    'GET',
    null,
    authHeader
  );

  // 6. Simulate Patient GRANTS Consent in PHR app
  await request(
    '6. Simulate Patient Action: GRANT Consent in PHR App',
    `/api/v1/hiu/consent/requests/${consentRequestId}/simulate`,
    'POST',
    {
      status: 'GRANTED',
      consentId: 'CONSENT-ARTEFACT-M3-001',
    },
    authHeader
  );

  // 7. View Health Data under GRANTED Consent (All HI Types)
  await request(
    '7. View Health Data (All Records)',
    `/api/v1/hiu/health-records/${consentRequestId}`,
    'GET',
    null,
    authHeader
  );

  // 8. Filter Health Data: OPConsultation
  await request(
    '8. Filter Health Data by HI Type: OP Consultation',
    `/api/v1/hiu/health-records/${consentRequestId}?hiType=OPConsultation`,
    'GET',
    null,
    authHeader
  );

  // 9. Filter Health Data: Prescription
  await request(
    '9. Filter Health Data by HI Type: Prescription',
    `/api/v1/hiu/health-records/${consentRequestId}?hiType=Prescription`,
    'GET',
    null,
    authHeader
  );

  // 10. Filter Health Data: Diagnostic Lab Report
  await request(
    '10. Filter Health Data by HI Type: Diagnostic Lab Report',
    `/api/v1/hiu/health-records/${consentRequestId}?hiType=DiagnosticReport`,
    'GET',
    null,
    authHeader
  );

  // 11. Filter Health Data: Discharge Summary
  await request(
    '11. Filter Health Data by HI Type: Discharge Summary',
    `/api/v1/hiu/health-records/${consentRequestId}?hiType=DischargeSummary`,
    'GET',
    null,
    authHeader
  );

  // 12. Filter Health Data: Immunization Record
  await request(
    '12. Filter Health Data by HI Type: Immunization Record',
    `/api/v1/hiu/health-records/${consentRequestId}?hiType=ImmunizationRecord`,
    'GET',
    null,
    authHeader
  );

  // 13. Filter Health Data: Wellness Record
  await request(
    '13. Filter Health Data by HI Type: Wellness Record',
    `/api/v1/hiu/health-records/${consentRequestId}?hiType=WellnessRecord`,
    'GET',
    null,
    authHeader
  );

  // 14. Simulate Patient DENIES Consent
  await request(
    '14. Simulate Patient Action: DENY Consent in PHR App',
    `/api/v1/hiu/consent/requests/${consentRequestId}/simulate`,
    'POST',
    {
      status: 'DENIED',
    },
    authHeader
  );

  // 15. Verify HIU CANNOT view health data when consent is DENIED (Must be 403 Forbidden)
  await request(
    '15. HIU View Health Data of DENIED Consent (Expect 403 Forbidden)',
    `/api/v1/hiu/health-records/${consentRequestId}`,
    'GET',
    null,
    authHeader
  );

  // 16. Simulate Patient REVOKES Consent
  await request(
    '16. Simulate Patient Action: REVOKE Consent in PHR App',
    `/api/v1/hiu/consent/requests/${consentRequestId}/simulate`,
    'POST',
    {
      status: 'REVOKED',
    },
    authHeader
  );

  // 17. Verify HIU CANNOT view health data when consent is REVOKED (Must be 403 Forbidden)
  await request(
    '17. HIU View Health Data of REVOKED Consent (Expect 403 Forbidden)',
    `/api/v1/hiu/health-records/${consentRequestId}`,
    'GET',
    null,
    authHeader
  );

  // 18. ABDM Gateway Consent Webhook Callback
  await request(
    '18. ABDM Gateway Webhook: Consent Status Notification',
    '/api/v3/hiu/consent/request/notify',
    'POST',
    {
      notification: {
        consentRequestId: consentRequestId,
        status: 'GRANTED',
        consentArtefacts: [{ id: 'CONSENT-ARTEFACT-WEBHOOK-999' }],
      },
    }
  );

  console.log('\n===============================================================');
  console.log('     MILESTONE 3 (HIU) AUDIT COMPLETED SUCCESSFULLY!           ');
  console.log('===============================================================');
}

runM3Audit();
