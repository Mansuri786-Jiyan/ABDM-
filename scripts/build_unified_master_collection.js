const fs = require('fs');
const path = require('path');

const m1m2 = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/postman_collection.json'), 'utf8'));
const m3 = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/Milestone_3_Connector.postman_collection.json'), 'utf8'));
const m4 = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/Milestone_4_HFR_HPR_Connector.postman_collection.json'), 'utf8'));

// Build Folder 1: Milestone 1
const folderM1 = {
  name: '1. Milestone 1 - ABHA Creation & Reception (Scan & Share)',
  description: 'Official ABDM V3 Milestone 1: Master Authentication, Public Certificate, Aadhaar/Mobile OTP ABHA Creation, Face Auth, and Reception Scan & Share Queue.',
  item: [
    m1m2.item[0], // Authentication
    m1m2.item[1], // ABHA Certificate
    m1m2.item[2], // M1 ABHA Enrollment (Aadhaar OTP)
    m1m2.item[3], // Face Auth (Verification & Creation)
    m1m2.item[4]  // Scan and Share (OPD Queue)
  ]
};

// Build Folder 2: Milestone 2
const folderM2 = {
  name: '2. Milestone 2 - HIP Care Context Linking & Inbound Webhooks',
  description: 'Official ABDM V3 Milestone 2 (HIP): Link Token Generation, Lab/OPD Records Linking, SMS Deep Link Notification, Consent Register, and Inbound ABDM Gateway Webhooks (Discover, Link Init, Link Confirm, Health Info Transfer).',
  item: [
    m1m2.item[5], // Milestone 2 - HIP Care Context Linking
    m1m2.item[6], // Milestone 2 - Consent & Health Data Flow
    m1m2.item[7]  // Milestone 2 - ABDM Gateway Webhooks (Simulated Incoming)
  ]
};

// Build Folder 3: Milestone 3
const folderM3 = {
  name: '3. Milestone 3 - HIU Doctor Portal & FHIR Records',
  description: 'Official ABDM V3 Milestone 3 (HIU): Clinician Login (doctor_sharma / doctor123), Patient Search by ABHA, Digital Consent Request Creation, Status Tracking, Decrypted FHIR Records Viewer, and Privacy Revocation.',
  item: m3.item
};

// Build Folder 4: Milestone 4
const folderM4 = {
  name: '4. Milestone 4 - HPR Doctor & HFR Facility Registries',
  description: 'Official ABDM V3 Milestone 4: Healthcare Professional Registry (HPR) Doctor Search, Login OTP, Digital HPR Card, and Health Facility Registry (HFR) Facility Onboarding & ID Generation.',
  item: m4.item.filter(it => it.name.includes('HPR') || it.name.includes('HFR'))
};

// Build Folder 5: Scan & Pay V3
const folderM5 = {
  name: '5. Scan & Pay V3 - OPD Consultation Payments',
  description: 'Official ABDM V3 Scan & Pay: Reception Dynamic UPI Intent QR Generation, UTR Payment Confirmation Handshake, and Official Payment Receipts.',
  item: [
    {
      name: 'Step 1: Initiate Scan & Pay (UPI Intent)',
      request: {
        method: 'POST',
        header: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'x-client-id', value: 'dev_hospital_client_id' },
          { key: 'x-client-secret', value: 'dev_hospital_client_secret_2026' }
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            tokenNumber: '{{tokenNumber}}',
            amount: 500.00,
            purpose: 'OPD Consultation Fee',
            payerVpa: '{{payerVpa}}'
          }, null, 2)
        },
        url: { raw: '{{baseUrl}}/api/v1/scan-share/pay/initiate', host: ['{{baseUrl}}'], path: ['api', 'v1', 'scan-share', 'pay', 'initiate'] }
      }
    },
    {
      name: 'Step 2: Confirm Payment (Bank UTR)',
      request: {
        method: 'POST',
        header: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'x-client-id', value: 'dev_hospital_client_id' },
          { key: 'x-client-secret', value: 'dev_hospital_client_secret_2026' }
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            tokenNumber: '{{tokenNumber}}',
            utr: '{{utr}}',
            payerVpa: '{{payerVpa}}'
          }, null, 2)
        },
        url: { raw: '{{baseUrl}}/api/v1/scan-share/pay/confirm', host: ['{{baseUrl}}'], path: ['api', 'v1', 'scan-share', 'pay', 'confirm'] }
      }
    },
    {
      name: 'Step 3: Get Official Payment Receipt',
      request: {
        method: 'GET',
        header: [
          { key: 'x-client-id', value: 'dev_hospital_client_id' },
          { key: 'x-client-secret', value: 'dev_hospital_client_secret_2026' }
        ],
        url: { raw: '{{baseUrl}}/api/v1/scan-share/pay/receipt/{{tokenNumber}}', host: ['{{baseUrl}}'], path: ['api', 'v1', 'scan-share', 'pay', 'receipt', '{{tokenNumber}}'] }
      }
    }
  ]
};

// Master Unified Collection
const masterCollection = {
  info: {
    name: 'ABDM Master Connector - All Milestones (M1, M2, M3, M4)',
    description: 'Unified, sequential, official ABDM V3 connector collection organized cleanly into Milestone 1, Milestone 2, Milestone 3, Milestone 4, and Scan & Pay V3.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:4000', type: 'string' },
    { key: 'clientId', value: 'dev_hospital_client_id', type: 'string' },
    { key: 'clientSecret', value: 'dev_hospital_client_secret_2026', type: 'string' },
    { key: 'connectorToken', value: '', type: 'string' },
    { key: 'transactionId', value: '', type: 'string' },
    { key: 'abhaNumber', value: '91-5685-0627-1606', type: 'string' },
    { key: 'abhaAddress', value: 'mansurijiyan2004@sbx', type: 'string' },
    { key: 'mobile', value: '9408111252', type: 'string' },
    { key: 'hipId', value: 'GH_SANDBOX', type: 'string' },
    { key: 'linkToken', value: '', type: 'string' },
    { key: 'careContextRef', value: 'OPD-VISIT-2026-9901', type: 'string' },
    { key: 'consentId', value: 'consent-test-uuid-444', type: 'string' },
    { key: 'hiuToken', value: '', type: 'string' },
    { key: 'tokenNumber', value: '8', type: 'string' },
    { key: 'payerVpa', value: '9408111252@upi', type: 'string' },
    { key: 'utr', value: 'UPI-UTR-202611059988', type: 'string' }
  ],
  item: [
    folderM1,
    folderM2,
    folderM3,
    folderM4,
    folderM5
  ]
};

// Save to docs/ABDM_Master_Connector_M1_to_M4.postman_collection.json
const outputPath = path.join(__dirname, '../docs/ABDM_Master_Connector_M1_to_M4.postman_collection.json');
fs.writeFileSync(outputPath, JSON.stringify(masterCollection, null, 2), 'utf8');

console.log('SUCCESS: Master collection generated at:', outputPath);
console.log('Folders:');
masterCollection.item.forEach((f, idx) => console.log(`${idx + 1}. ${f.name} (${f.item.length} items)`));
