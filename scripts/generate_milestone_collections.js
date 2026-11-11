const fs = require('fs');
const path = require('path');

const fullM1M2 = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/postman_collection.json'), 'utf8'));
const m3 = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/Milestone_3_Connector.postman_collection.json'), 'utf8'));
const m4 = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/Milestone_4_HFR_HPR_Connector.postman_collection.json'), 'utf8'));

// 1. Milestone 1
const m1Collection = {
  info: {
    name: 'ABDM - Milestone 1 (ABHA Enrollment & Reception)',
    description: 'Official ABDM V3 Milestone 1: Patient Registration, Aadhaar/Mobile OTP, ABHA Card Generation, Face Auth, and Scan & Share (OPD Queue Token Management).',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  variable: fullM1M2.variable.filter(v => ['baseUrl', 'connectorToken', 'transactionId', 'abhaNumber', 'abhaAddress'].includes(v.key)),
  item: fullM1M2.item.slice(0, 5) // Auth, Certificate, Aadhaar OTP, Face Auth, Scan & Share
};

// 2. Milestone 2
const m2Collection = {
  info: {
    name: 'ABDM - Milestone 2 (HIP - Care Context Linking & Webhooks)',
    description: 'Official ABDM V3 Milestone 2 (HIP - Health Information Provider): Link Token Generation, Care Context Linking (Lab/OPD), SMS Deep-Link, Consent Tracking, and Inbound ABDM Gateway Webhooks (Discover, Link Init, Link Confirm, Consent Notify, Encrypted FHIR Health Info Transfer).',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  variable: fullM1M2.variable.filter(v => ['baseUrl', 'connectorToken', 'hipId', 'linkToken', 'careContextRef', 'consentId', 'abhaAddress'].includes(v.key)),
  item: [
    fullM1M2.item[0], // Authentication
    fullM1M2.item[5], // Milestone 2 - HIP Care Context Linking
    fullM1M2.item[6], // Milestone 2 - Consent & Health Data Flow
    fullM1M2.item[7]  // Milestone 2 - ABDM Gateway Webhooks
  ]
};

// 3. Milestone 3
const m3Collection = {
  info: {
    name: 'ABDM - Milestone 3 (HIU - Doctor Portal & FHIR Records)',
    description: 'Official ABDM V3 Milestone 3 (HIU - Health Information User): Clinician Login, Patient Search by ABHA, Digital Consent Request Creation, Status Tracking, FHIR Clinical Records Viewer (OPD Note, Prescription, Discharge Summary, Lab CBC, Immunization, Wellness), and Strict Privacy Revocation Enforcement.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  variable: m3.variable,
  item: m3.item
};

// 4. Milestone 4
const m4Collection = {
  info: {
    name: 'ABDM - Milestone 4 (HFR & HPR - Doctor & Facility Registries)',
    description: 'Official ABDM V3 Milestone 4: Healthcare Professional Registry (HPR / NHPR) for Doctor NMC Degree Verification, Digital HPR Photo Card, and Health Facility Registry (HFR) for Hospital Onboarding & Facility ID Generation.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  variable: m4.variable,
  item: m4.item
};

// 5. Scan & Pay V3
const scanPayCollection = {
  info: {
    name: 'ABDM - Scan and Pay V3 (Digital OPD Payments)',
    description: 'Official ABDM V3 Scan & Pay: Dynamic UPI Intent QR Generation for OPD Consultation Fees, Payment Handshake Confirmation with UTR, and Digital Payment Receipts.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:4000', type: 'string' },
    { key: 'tokenNumber', value: '8', type: 'string' },
    { key: 'amount', value: '500.00', type: 'string' },
    { key: 'payerVpa', value: '9408111252@upi', type: 'string' },
    { key: 'utr', value: 'UPI-UTR-202611059988', type: 'string' }
  ],
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

// Write files to docs/milestones/
const outDir = path.join(__dirname, '../docs/milestones');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(path.join(outDir, 'Milestone_1_ABHA_Enrollment.postman_collection.json'), JSON.stringify(m1Collection, null, 2));
fs.writeFileSync(path.join(outDir, 'Milestone_2_HIP_Care_Contexts.postman_collection.json'), JSON.stringify(m2Collection, null, 2));
fs.writeFileSync(path.join(outDir, 'Milestone_3_HIU_Doctor_Portal.postman_collection.json'), JSON.stringify(m3Collection, null, 2));
fs.writeFileSync(path.join(outDir, 'Milestone_4_HFR_HPR_Registries.postman_collection.json'), JSON.stringify(m4Collection, null, 2));
fs.writeFileSync(path.join(outDir, 'Scan_and_Pay_V3.postman_collection.json'), JSON.stringify(scanPayCollection, null, 2));

console.log('SUCCESS: All 5 separate milestone files created successfully in docs/milestones/');
