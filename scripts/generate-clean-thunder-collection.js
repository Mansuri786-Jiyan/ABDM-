const fs = require('fs');
const path = require('path');

const collection = {
  info: {
    _postman_id: "abdm-master-connector-sequenced-v1",
    name: "ABDM Connector - Complete Sequenced Flow (M1 to M4)",
    description: "Complete, sequence-wise ABDM V3 collection ready for Thunder Client (VS Code) & Postman. Every request has exact direct URL (http://localhost:4000), headers, and working sample body.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  item: [
    // ==========================================
    // 0. Setup & Health Check
    // ==========================================
    {
      name: "0. Setup & Health Check",
      item: [
        {
          name: "0.1 GET Server Health & DB Status",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "http://localhost:4000/health",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["health"]
            },
            description: "Verify that the local ABDM connector server is running and Postgres DB is connected."
          }
        },
        {
          name: "0.2 POST Register Hospital in Connector",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Client-Id", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "Lifeline Multispeciality Hospital",
                code: "LIFELINE_AHD_01",
                email: "contact@lifelinehospital.in",
                phone: "9408111252",
                address: "Drive-In Road, Ahmedabad, Gujarat"
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/hospitals",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hospitals"]
            },
            description: "Register a hospital with HFR ID in the local database."
          }
        },
        {
          name: "0.3 POST Generate Hospital Client ID & Secret",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Client-Id", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                hospitalId: "LIFELINE_AHD_01",
                name: "Lifeline Reception & OPD Client"
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/hospitals/clients",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hospitals", "clients"]
            },
            description: "Generates clientId and secret for the hospital HMIS to call connector APIs."
          }
        }
      ]
    },

    // ==========================================
    // 1. Milestone 1 - ABHA Enrollment & Reception
    // ==========================================
    {
      name: "1. Milestone 1 - ABHA Enrollment (Patient Onboarding)",
      item: [
        {
          name: "1.1a POST Request OTP via Mobile Number",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                authMethod: "mobile",
                loginId: "9408111252",
                patientReferenceId: "MRN-JIYAN-2026"
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/abha/enrollment/request-otp",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "abha", "enrollment", "request-otp"]
            },
            description: "Triggers ABDM Enrollment OTP directly to patient mobile: 9408111252."
          }
        },
        {
          name: "1.1b POST Request OTP via Aadhaar Number",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                authMethod: "aadhaar",
                loginId: "999999990019",
                patientReferenceId: "MRN-JIYAN-2026"
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/abha/enrollment/request-otp",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "abha", "enrollment", "request-otp"]
            },
            description: "Triggers ABDM Enrollment OTP to registered Aadhaar (Sandbox: 999999990019)."
          }
        },
        {
          name: "1.2 POST Step 2: Verify OTP & Create ABHA Number",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                transactionId: "simulated-tx-12345",
                otp: "123456",
                mobile: "9408111252"
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/abha/enrollment/verify-otp",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "abha", "enrollment", "verify-otp"]
            },
            description: "Submit the 6-digit OTP received by the patient to activate their 14-digit ABHA Number."
          }
        },
        {
          name: "1.3 GET Step 3: Get ABHA Address Suggestions",
          request: {
            method: "GET",
            header: [
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            url: {
              raw: "http://localhost:4000/api/v1/abha/address/suggestions?transactionId=simulated-tx-12345",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "abha", "address", "suggestions"],
              query: [{ key: "transactionId", value: "simulated-tx-12345" }]
            },
            description: "Fetches auto-generated ABHA address suggestions based on patient name/year."
          }
        },
        {
          name: "1.4 POST Step 4: Create Custom ABHA Address (PHR)",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                transactionId: "simulated-tx-12345",
                abhaAddress: "mansurijiyan2004",
                preferred: 1
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/abha/address/create",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "abha", "address", "create"]
            },
            description: "Assigns the selected ABHA handle (e.g. mansurijiyan2004@sbx) to the patient profile."
          }
        },
        {
          name: "1.5 GET Step 5: View Patient ABHA Profile",
          request: {
            method: "GET",
            header: [
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            url: {
              raw: "http://localhost:4000/api/v1/abha/profile/simulated-tx-12345",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "abha", "profile", "simulated-tx-12345"]
            },
            description: "Retrieves complete demographic details returned by ABDM."
          }
        },
        {
          name: "1.6 GET Step 6: Download ABHA Card (PDF/PNG)",
          request: {
            method: "GET",
            header: [
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            url: {
              raw: "http://localhost:4000/api/v1/abha/card/simulated-tx-12345",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "abha", "card", "simulated-tx-12345"]
            },
            description: "Downloads the official ABHA Card with photo & QR code."
          }
        },
        {
          name: "1.7 POST Scan Patient ABHA Card QR (Card Scanner & Auto-Registration)",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                qrCode: JSON.stringify({
                  hidn: "91-5685-0627-1606",
                  hid: "mansurijiyan2004@sbx",
                  name: "Mansuri Jiyan",
                  gender: "M",
                  dob: "2004-05-15",
                  mobile: "9408111252",
                  address: "Drive-In Road, Ahmedabad, Gujarat",
                  state_name: "Gujarat",
                  distname: "Ahmedabad",
                  pincode: "380001"
                }),
                autoRegister: true,
                hipId: "LIFELINE_AHD_01"
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/abha/qr/scan",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "abha", "qr", "scan"]
            },
            description: "Scans and decodes patient's physical/digital ABHA card QR code from receptionist scanner gun or camera. Extracts demographics and auto-registers the patient for instant OPD check-in."
          }
        },
        {
          name: "1.8a POST Step 1: Request OTP for DL Enrollment",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                mobile: "9408111252",
                patientReferenceId: "PAT-DL-001"
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/abha/enrollment/dl/request-otp",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "abha", "enrollment", "dl", "request-otp"]
            },
            description: "Requests OTP via ABDM to registered mobile number for Driving Licence based ABHA creation."
          }
        },
        {
          name: "1.8b POST Step 2: Verify OTP for DL Enrollment",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                transactionId: "REPLACE_WITH_TRANSACTION_ID_FROM_STEP_1_8a",
                otp: "123456"
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/abha/enrollment/dl/verify-otp",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "abha", "enrollment", "dl", "verify-otp"]
            },
            description: "Submits 6-digit OTP received by patient to authorize DL enrollment."
          }
        },
        {
          name: "1.8c POST Step 3: Enrol by Document (Driving Licence)",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                transactionId: "REPLACE_WITH_TRANSACTION_ID_FROM_STEP_1_8b",
                documentType: "DRIVING_LICENCE",
                documentNumber: "GJ0120200012345",
                firstName: "Jiyan",
                middleName: "",
                lastName: "Mansuri",
                dob: "2004-05-15",
                gender: "M",
                address: "Drive-In Road, Ahmedabad",
                districtCode: "476",
                district: "Ahmedabad",
                stateCode: "24",
                state: "Gujarat",
                pincode: "380001",
                mobile: "9408111252",
                autoRegister: true
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/abha/enrollment/dl/enrol",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "abha", "enrollment", "dl", "enrol"]
            },
            description: "Submits Driving Licence details and demographics to create a provisional 14-digit ABHA number."
          }
        },
        {
          name: "1.8d POST Step 4: Simulate Complete DL Flow (One-Click Test)",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                mobile: "9408111252",
                documentNumber: "GJ0120200012345",
                firstName: "Jiyan",
                lastName: "Mansuri",
                dob: "2004-05-15",
                gender: "M",
                address: "Drive-In Road, Ahmedabad, Gujarat",
                pincode: "380001",
                withPhoto: true,
                autoRegister: true
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/abha/enrollment/dl/test-simulate",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "abha", "enrollment", "dl", "test-simulate"]
            },
            description: "One-click complete test simulation of Driving Licence ABHA enrollment (Step 1 OTP -> Step 2 Verify -> Step 3 Document creation with photos -> EHR registration)."
          }
        }
      ]
    },

    // ==========================================
    // 2. Milestone 2 - HIP Care Context Linking
    // ==========================================
    {
      name: "2. Milestone 2 - HIP Care Context Linking (Hospital Records)",
      item: [
        {
          name: "2.1 POST Step 1: Generate Link Token",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                abhaAddress: "mansurijiyan2004@sbx"
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/hip/token/generate",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hip", "token", "generate"]
            },
            description: "Requests temporary link token from ABDM to link records to patient's ABHA."
          }
        },
        {
          name: "2.2 POST Step 2: Link Care Contexts to Patient ABHA",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                abhaAddress: "mansurijiyan2004@sbx",
                patientReferenceNumber: "MRN-JIYAN-2026",
                careContexts: [
                  {
                    referenceNumber: "OPD-VISIT-101",
                    display: "OPD Consultation - General Medicine (Dr. Sharma)"
                  },
                  {
                    referenceNumber: "LAB-CBC-202",
                    display: "Complete Blood Count (CBC) Lab Report"
                  }
                ]
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/hip/link/care-contexts",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hip", "link", "care-contexts"]
            },
            description: "Pushes hospital visit/test references to patient's central ABHA record."
          }
        },
        {
          name: "2.3 POST Step 3: Send SMS Deep Link Notification",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                hipId: "IN0410000183",
                hipName: "City General Hospital",
                phoneNo: "9408111252"
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/hip/link/sms-notify",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hip", "link", "sms-notify"]
            },
            description: "Sends an SMS to the patient with a deep link to view linked hospital records."
          }
        },
        {
          name: "2.4 GET View All Linked Records in HMIS",
          request: {
            method: "GET",
            header: [
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            url: {
              raw: "http://localhost:4000/api/v1/hip/care-contexts",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hip", "care-contexts"]
            },
            description: "Hospital receptionist views all patient care contexts linked so far."
          }
        },
        {
          name: "2.5 GET View Hospital Legal Consent Register",
          request: {
            method: "GET",
            header: [
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            url: {
              raw: "http://localhost:4000/api/v1/hip/consents",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hip", "consents"]
            },
            description: "View all granted, revoked, and expired patient consents recorded at this hospital."
          }
        },
        {
          name: "2.6 POST Test Simulator: Simulate Patient Consent Grant/Revoke",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                consentId: "CONSENT-SIM-001",
                status: "GRANTED",
                patientId: "mansurijiyan2004@sbx"
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/hip/consents/test-simulate",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hip", "consents", "test-simulate"]
            },
            description: "Simulates patient granting or revoking consent without opening real phone."
          }
        }
      ]
    },

    // ==========================================
    // 3. Milestone 3 - HIU Doctor Portal & FHIR
    // ==========================================
    {
      name: "3. Milestone 3 - HIU Doctor Portal (Doctor View FHIR)",
      item: [
        {
          name: "3.1 POST Step 1: Clinician Login",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                username: "doctor.sharma",
                password: "Password@123"
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/hiu/auth/login",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hiu", "auth", "login"]
            },
            description: "Doctor logs into their hospital EHR/EMR clinician portal."
          }
        },
        {
          name: "3.2 GET Step 2: Search / Select Patient",
          request: {
            method: "GET",
            header: [
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            url: {
              raw: "http://localhost:4000/api/v1/hiu/patients?search=mansurijiyan",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hiu", "patients"],
              query: [{ key: "search", value: "mansurijiyan" }]
            },
            description: "Doctor looks up patient Mansuri Jiyan before requesting medical records."
          }
        },
        {
          name: "3.3 POST Step 3: Create Consent Request",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                patientId: "mansurijiyan2004@sbx",
                purpose: "Consultation",
                hiTypes: ["OPConsultation", "DiagnosticReport", "DischargeSummary"],
                dateRange: {
                  from: "2024-01-01T00:00:00.000Z",
                  to: "2026-11-06T00:00:00.000Z"
                },
                expiry: "2026-11-07T00:00:00.000Z"
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/hiu/consent/requests",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hiu", "consent", "requests"]
            },
            description: "Doctor requests patient's permission to view their past medical records."
          }
        },
        {
          name: "3.4 GET Step 4: Check Consent Request Status",
          request: {
            method: "GET",
            header: [
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            url: {
              raw: "http://localhost:4000/api/v1/hiu/consent/requests/CR-SIMULATED-001",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hiu", "consent", "requests", "CR-SIMULATED-001"]
            },
            description: "Checks if the patient has approved (GRANTED), DENIED, or if it is pending."
          }
        },
        {
          name: "3.5 POST Step 5: Test Simulator: Patient Approves Consent",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                status: "GRANTED"
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/hiu/consent/requests/CR-BC2A15D0/simulate",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hiu", "consent", "requests", "CR-BC2A15D0", "simulate"]
            },
            description: "Simulates patient tapping 'GRANT' on their phone to approve the doctor's request."
          }
        },
        {
          name: "3.6 GET Step 6: Decrypt & View FHIR Health Data",
          request: {
            method: "GET",
            header: [
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            url: {
              raw: "http://localhost:4000/api/v1/hiu/health-records/CR-BC2A15D0",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hiu", "health-records", "CR-BC2A15D0"]
            },
            description: "Doctor views decrypted FHIR bundle (Prescriptions, Lab Results, Doctor Notes)."
          }
        }
      ]
    },

    // ==========================================
    // 4. Milestone 4 - HFR & HPR Registries (All 16 APIs in Sequential Flow)
    // ==========================================
    {
      name: "4. Milestone 4 - HFR & HPR Registries (Sequential Flow)",
      item: [
        // --- PHASE 1: HPR Doctor Verification (8 APIs) ---
        {
          name: "4.1 GET Medical Courses Master (MBBS, MD)",
          request: {
            method: "GET",
            header: [
              { key: "X-Client-Id", value: "dev_hospital_client_id" }
            ],
            url: {
              raw: "http://localhost:4000/api/v1/hpr/masters/courses",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hpr", "masters", "courses"]
            },
            description: "Step 1: Returns recognized medical courses master list (MBBS, MD, MS, BDS, etc.)."
          }
        },
        {
          name: "4.2 GET Medical Councils Master (NMC, etc.)",
          request: {
            method: "GET",
            header: [
              { key: "X-Client-Id", value: "dev_hospital_client_id" }
            ],
            url: {
              raw: "http://localhost:4000/api/v1/hpr/masters/councils",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hpr", "masters", "councils"]
            },
            description: "Step 2: Returns master list of State Medical Councils (NMC, Gujarat Medical Council, etc.)."
          }
        },
        {
          name: "4.3 GET Search Doctor by HPR ID",
          request: {
            method: "GET",
            header: [
              { key: "X-Client-Id", value: "dev_hospital_client_id" }
            ],
            url: {
              raw: "http://localhost:4000/api/v1/hpr/search/id/21-8845-9281-0192",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hpr", "search", "id", "21-8845-9281-0192"]
            },
            description: "Step 3: Looks up doctor verification status and degree by national HPR ID."
          }
        },
        {
          name: "4.4 GET Search Doctor by Mobile Number",
          request: {
            method: "GET",
            header: [
              { key: "X-Client-Id", value: "dev_hospital_client_id" }
            ],
            url: {
              raw: "http://localhost:4000/api/v1/hpr/search/mobile/9408111252",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hpr", "search", "mobile", "9408111252"]
            },
            description: "Step 4: Checks whether doctor is registered in HPR by mobile number."
          }
        },
        {
          name: "4.5 POST Send Doctor Login OTP",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Client-Id", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                mobile: "9408111252"
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/hpr/auth/otp/generate",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hpr", "auth", "otp", "generate"]
            },
            description: "Step 5: Triggers OTP to doctor mobile for authenticated login."
          }
        },
        {
          name: "4.6 POST Verify Doctor Login OTP",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Client-Id", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                txnId: "simulated-hpr-txn-001",
                otp: "123456"
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/hpr/auth/otp/verify",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hpr", "auth", "otp", "verify"]
            },
            description: "Step 6: Verifies doctor login OTP and returns doctor auth session token (X-Token)."
          }
        },
        {
          name: "4.7 GET Doctor Full Profile",
          request: {
            method: "GET",
            header: [
              { key: "X-Client-Id", value: "dev_hospital_client_id" },
              { key: "X-Token", value: "jwt_hpr_doctor_sample" }
            ],
            url: {
              raw: "http://localhost:4000/api/v1/hpr/doctor/profile",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hpr", "doctor", "profile"]
            },
            description: "Step 7: Retrieves complete doctor profile, degrees, and council registration validity."
          }
        },
        {
          name: "4.8 GET Doctor Official ID Card",
          request: {
            method: "GET",
            header: [
              { key: "X-Client-Id", value: "dev_hospital_client_id" },
              { key: "X-Token", value: "jwt_hpr_doctor_sample" }
            ],
            url: {
              raw: "http://localhost:4000/api/v1/hpr/doctor/id-card",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hpr", "doctor", "id-card"]
            },
            description: "Step 8: Retrieves official digital HPR ID card image for healthcare professional."
          }
        },

        // --- PHASE 2: HFR Hospital Onboarding (5 APIs) ---
        {
          name: "4.9 POST Search Hospital in HFR Registry",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Client-Id", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                stateCode: "GJ",
                districtCode: "AHD",
                facilityName: "Lifeline"
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/hfr/facility/search",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hfr", "facility", "search"]
            },
            description: "Step 9: Checks if hospital is already registered in Govt HFR before creating a new one."
          }
        },
        {
          name: "4.10 POST Onboard Facility Step 1: Basic Info",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Client-Id", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                facilityName: "Lifeline Multispeciality Hospital",
                state: "Gujarat",
                district: "Ahmedabad",
                pincode: "380054",
                contactNumber: "9408111252",
                email: "contact@lifelinehospital.in"
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/hfr/facility/onboard/basic",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hfr", "facility", "onboard", "basic"]
            },
            description: "Step 10 (Onboarding 1/4): Submits hospital name, location, and generates trackingId."
          }
        },
        {
          name: "4.11 POST Onboard Facility Step 2: Additional Info",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Client-Id", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                trackingId: "TRK-DEMO-1001",
                facilityType: "Hospital",
                ownership: "Private",
                systemOfMedicine: ["Allopathy"]
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/hfr/facility/onboard/additional",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hfr", "facility", "onboard", "additional"]
            },
            description: "Step 11 (Onboarding 2/4): Records hospital ownership and system of medicine."
          }
        },
        {
          name: "4.12 POST Onboard Facility Step 3: Detailed Info",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Client-Id", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                trackingId: "TRK-DEMO-1001",
                totalBeds: 150,
                icuBeds: 25,
                specialties: ["General Medicine", "Cardiology", "Orthopedics"]
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/hfr/facility/onboard/detailed",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hfr", "facility", "onboard", "detailed"]
            },
            description: "Step 12 (Onboarding 3/4): Records bed capacity, ICU, and clinical departments."
          }
        },
        {
          name: "4.13 POST Onboard Facility Step 4: Final Submit",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Client-Id", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                trackingId: "TRK-DEMO-1001"
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/hfr/facility/onboard/submit",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hfr", "facility", "onboard", "submit"]
            },
            description: "Step 13 (Onboarding 4/4): Final submission to Govt State Registrar; returns approved facilityId (IN...)."
          }
        },

        // --- PHASE 3: Security & Linkage (3 APIs) ---
        {
          name: "4.14 POST Send Facility Owner Contact OTP",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Client-Id", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                contactNumber: "9408111252"
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/hfr/facility/contact/send-otp",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hfr", "facility", "contact", "send-otp"]
            },
            description: "Step 14: Sends authorization OTP to facility nodal officer before linking doctors."
          }
        },
        {
          name: "4.15 POST Verify Facility Contact OTP",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Client-Id", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                txnId: "simulated-hfr-contact-txn",
                otp: "123456"
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/hfr/facility/contact/verify-otp",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hfr", "facility", "contact", "verify-otp"]
            },
            description: "Step 15: Verifies hospital nodal officer OTP and confirms facility authorization."
          }
        },
        {
          name: "4.16 POST Assign Doctors & Staff to Facility",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Client-Id", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                facilityId: "IN0610000042",
                professionals: [
                  {
                    hprId: "dr.sharma@hpr",
                    role: "DOCTOR",
                    department: "Cardiology"
                  }
                ]
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/hfr/facility/assign-professionals",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "hfr", "facility", "assign-professionals"]
            },
            description: "Step 16: Links verified Doctor (HPR ID) to Hospital (Facility ID). Completes Milestone 4!"
          }
        }
      ]
    },

    // ==========================================
    // 5. Scan & Share (Fast OPD Check-in)
    // ==========================================
    {
      name: "5. Scan & Share (Fast OPD Check-in)",
      item: [
        {
          name: "5.1 POST Scan Hospital QR & Generate Token",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                hipId: "IN2410000123",
                counterId: "OPD-REG-01"
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/scan-share/scan",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "scan-share", "scan"]
            },
            description: "Patient scans the QR code at hospital OPD reception."
          }
        },
        {
          name: "5.2 POST Share ABHA Profile to Hospital Queue",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                abhaAddress: "mansurijiyan2004@sbx",
                tokenNumber: 42,
                counterId: "OPD-REG-01"
              }, null, 2)
            },
            url: {
              raw: "http://localhost:4000/api/v1/scan-share/on-share",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "scan-share", "on-share"]
            },
            description: "ABHA profile arrives automatically into the hospital receptionist's queue."
          }
        },
        {
          name: "5.3 GET View OPD Reception Queue",
          request: {
            method: "GET",
            header: [
              { key: "X-Hospital-ID", value: "LIFELINE_AHD_01" },
              { key: "X-Client-ID", value: "dev_hospital_client_id" }
            ],
            url: {
              raw: "http://localhost:4000/api/v1/scan-share/queue",
              protocol: "http",
              host: ["localhost"],
              port: "4000",
              path: ["api", "v1", "scan-share", "queue"]
            },
            description: "Hospital receptionist sees all patients waiting in line with pre-filled ABHA forms."
          }
        }
      ]
    }
  ]
};

const file1 = path.join(__dirname, '..', 'ABDM_ThunderClient_Sequenced_Collection.json');
const file2 = path.join(__dirname, '..', 'ABDM_Postman_Ready.json');
const docsDir = path.join(__dirname, '..', 'docs');
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
const file3 = path.join(docsDir, 'ABDM_Master_Connector_M1_to_M4.postman_collection.json');

const jsonStr = JSON.stringify(collection, null, 2);
fs.writeFileSync(file1, jsonStr, 'utf-8');
fs.writeFileSync(file2, jsonStr, 'utf-8');
fs.writeFileSync(file3, jsonStr, 'utf-8');
console.log('Successfully written to:');
console.log('1.', file1);
console.log('2.', file2);
console.log('3.', file3);
