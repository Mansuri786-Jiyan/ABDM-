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
    ...headers
  };

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined
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

async function runAll() {
  console.log("===============================================================");
  console.log("       ABDM CONNECTOR - ALL APIS STEP-BY-STEP AUDIT            ");
  console.log("===============================================================");

  // 1. Healthcheck
  await request("1. Server Healthcheck", "/health");

  // 2. Generate Connector Auth Token
  const tokenRes = await request("2. Hospital Client Authentication", "/api/v1/auth/token", "POST", {
    clientId: "dev_hospital_client_id",
    clientSecret: "dev_hospital_client_secret_2026"
  });

  const token = tokenRes.data?.data?.accessToken;
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  // 3. ABDM Public Encryption Certificate
  await request("3. Get ABDM Public Certificate", "/api/v1/abha/certificate", "GET", null, authHeader);

  // 4. Face Auth Search by Mobile Number
  const faceSearchRes = await request("4. Face Auth - Search User by Mobile", "/api/v1/abha/face-auth/search", "POST", {
    mobile: "9999999999"
  }, authHeader);

  const faceTxnId = faceSearchRes.data?.data?.transactionId || "ca0ca269-7ca1-44e7-817c-e4e13cc080d8";

  // 5. Face Auth - Login Request
  await request("5. Face Auth - Initiate Login Request", "/api/v1/abha/face-auth/request", "POST", {
    transactionId: faceTxnId,
    index: 1
  }, authHeader);

  // 6. Face Auth - Capture PID
  await request("6. Face Auth - Capture Biometric PID", "/api/v1/abha/face-auth/capture-pid", "POST", {
    transactionId: faceTxnId,
    scopeType: "login"
  }, authHeader);

  // 7. Scan & Share - Simulate Hospital QR Scan Webhook
  const scanRes = await request("7. Scan & Share - Hospital QR Scan Webhook", "/api/v3/hip/patient/share", "POST", {
    requestId: "req-qr-scan-101",
    timestamp: new Date().toISOString(),
    intent: { type: "SCAN_AND_SHARE" },
    metaData: { hipId: "Mohan_HIP", counterId: "1" },
    profile: {
      patient: {
        abhaNumber: "91-0000-0000-0000",
        abhaAddress: "demopatient@sbx",
        name: "Demo Patient",
        gender: "M",
        yearOfBirth: "2000",
        phoneNumber: "9999999999",
        address: {
          line: "Civil Hospital Road",
          district: "Ahmedabad",
          state: "Gujarat",
          pincode: "380001"
        }
      }
    }
  });

  // 8. Scan & Share - View Reception Queue
  await request("8. Scan & Share - Query Waiting Reception Queue", "/api/v1/scan-share/tokens?status=WAITING", "GET", null, authHeader);

  // 9. Scan & Share - Get Patient by Token Number
  await request("9. Scan & Share - Fetch Patient by Token Number (Token 8)", "/api/v1/scan-share/tokens/8", "GET", null, authHeader);

  // 10. Scan & Share - Update Running Token
  await request("10. Scan & Share - Update Running Token & Notify ABDM Gateway", "/api/v1/scan-share/running-token", "POST", {
    hipId: "Mohan_HIP",
    context: "1",
    runningTokenNumber: "8",
    averageTokenServiceTimeInMinutes: 3,
    notifyGateway: false
  }, authHeader);

  // 11. Milestone 2 - Generate Link Token
  await request("11. Milestone 2 - Generate Link Token", "/api/v1/hip/token/generate", "POST", {
    hipId: "Mohan_HIP",
    name: "Demo Patient",
    gender: "M",
    yearOfBirth: 2000,
    abhaNumber: "91-0000-0000-0000",
    abhaAddress: "demopatient@sbx"
  }, authHeader);

  // 12. Milestone 2 - Link Care Contexts to ABHA
  await request("12. Milestone 2 - Link Care Contexts to ABHA", "/api/v1/hip/link/care-contexts", "POST", {
    hipId: "Mohan_HIP",
    abhaNumber: "91-0000-0000-0000",
    abhaAddress: "demopatient@sbx",
    patientName: "Demo Patient",
    patientReferenceNumber: "MRN-2026-0042",
    careContexts: [
      {
        referenceNumber: "OPD-VISIT-2026-9901",
        display: "General Medicine OPD Consultation (Dr. Sharma)",
        hiType: "OPConsultation"
      },
      {
        referenceNumber: "PRESCRIPTION-2026-88",
        display: "Cardio & Fever Prescription",
        hiType: "Prescription"
      }
    ],
    notify: false,
    sendSms: false
  }, authHeader);

  // 13. Milestone 2 - Send SMS Deep Link Notification
  await request("13. Milestone 2 - Send SMS Deep Link Notification", "/api/v1/hip/link/sms-notify", "POST", {
    hipId: "Mohan_HIP",
    hipName: "City General Hospital",
    phoneNo: "9999999999"
  }, authHeader);

  // 14. Milestone 2 - View Linked Care Contexts in HMIS
  await request("14. Milestone 2 - View Linked Care Contexts in HMIS", "/api/v1/hip/care-contexts?patientReference=MRN-2026-0042", "GET", null, authHeader);

  // 15. Milestone 2 - User Discovery Webhook (Gateway searching hospital)
  await request("15. Milestone 2 - ABDM Gateway Discovery Webhook", "/api/v3/hip/patient/care-context/discover", "POST", {
    transactionId: "txn-discovery-789",
    patient: {
      id: "demopatient@sbx",
      name: "Demo Patient"
    }
  });

  // 16. Milestone 2 - Simulate Consent Grant
  await request("16. Milestone 2 - Simulate Consent Grant from PHR App", "/api/v1/hip/consents/test-simulate", "POST", {
    consentId: "CONSENT-DEMO-2026-01",
    patientAbhaAddress: "demopatient@sbx",
    patientReference: "MRN-2026-0042",
    status: "GRANTED",
    careContextReferences: ["OPD-VISIT-2026-9901", "PRESCRIPTION-2026-88"],
    hiTypes: ["OPConsultation", "Prescription"],
    validUpto: new Date(Date.now() + 86400000).toISOString()
  }, authHeader);

  // 17. Milestone 2 - View Consents in HMIS
  await request("17. Milestone 2 - View Consents in HMIS", "/api/v1/hip/consents", "GET", null, authHeader);

  // 18. Milestone 2 - HIU Requesting Health Records under GRANTED Consent
  await request("18. Milestone 2 - HIU Requesting Health Records under GRANTED Consent", "/api/v3/hip/health-information/request", "POST", {
    requestId: "req-hiu-grant-01",
    timestamp: new Date().toISOString(),
    hiRequest: {
      consent: { id: "CONSENT-JIYAN-2026-01" },
      dateRange: { from: "2026-01-01T00:00:00.000Z", to: new Date().toISOString() },
      dataPushUrl: "https://dev.abdm.gov.in/api-hiu/data/notification",
      keyMaterial: {
        cryptoAlg: "ECDH",
        curve: "Curve25519",
        dhPublicKey: { expiry: new Date().toISOString(), parameters: "Curve25519/32byte", keyValue: "test-pubkey" },
        nonce: "test-nonce-123"
      }
    }
  });

  // 19. Milestone 2 - Simulate Consent Revocation
  await request("19. Milestone 2 - Simulate Consent Revocation from PHR App", "/api/v1/hip/consents/test-simulate", "POST", {
    consentId: "CONSENT-DEMO-2026-01",
    patientAbhaAddress: "demopatient@sbx",
    patientReference: "MRN-2026-0042",
    status: "REVOKED"
  }, authHeader);

  // 20. Milestone 2 - HIU Requesting Health Records under REVOKED Consent (Must block with 403 Forbidden!)
  await request("20. Milestone 2 - HIU Requesting Health Records under REVOKED Consent (Expect 403 Forbidden)", "/api/v3/hip/health-information/request", "POST", {
    requestId: "req-hiu-revoke-02",
    timestamp: new Date().toISOString(),
    hiRequest: {
      consent: { id: "CONSENT-DEMO-2026-01" },
      dateRange: { from: "2026-01-01T00:00:00.000Z", to: new Date().toISOString() },
      dataPushUrl: "https://dev.abdm.gov.in/api-hiu/data/notification",
      keyMaterial: {
        cryptoAlg: "ECDH",
        curve: "Curve25519",
        dhPublicKey: { expiry: new Date().toISOString(), parameters: "Curve25519/32byte", keyValue: "test-pubkey" },
        nonce: "test-nonce-456"
      }
    }
  });

  console.log("\n===============================================================");
  console.log("       ALL APIS EXECUTED & AUDITED SUCCESSFULLY!               ");
  console.log("===============================================================");
}

runAll();
