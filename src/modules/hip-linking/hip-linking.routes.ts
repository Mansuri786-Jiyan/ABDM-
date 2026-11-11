import { Router } from 'express';
import { hipLinkingController } from './hip-linking.controller';
import { authenticateHospitalClient } from '../../middleware/authentication';

// 1. Router for Hospital HMIS Management Endpoints
const hospitalHipLinkingRouter: Router = Router();
hospitalHipLinkingRouter.use(authenticateHospitalClient);

/**
 * @swagger
 * /api/v1/hip/token/generate:
 *   post:
 *     summary: Generate Link Token for HIP-Initiated Linking
 *     tags: [HIP Care Context Linking]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - gender
 *               - yearOfBirth
 *             properties:
 *               hipId:
 *                 type: string
 *                 default: "IN0410000183"
 *                 example: "IN0410000183"
 *               name:
 *                 type: string
 *                 example: "Mansuri Jiyan"
 *               gender:
 *                 type: string
 *                 enum: [M, F, O]
 *                 example: "M"
 *               yearOfBirth:
 *                 type: integer
 *                 example: 2004
 *               abhaAddress:
 *                 type: string
 *                 example: "mansurijiyan2004@sbx"
 *               abhaNumber:
 *                 type: string
 *                 example: "91-5685-0627-1606"
 *     responses:
 *       200:
 *         description: Link token generated successfully
 */
hospitalHipLinkingRouter.post('/token/generate', (req, res, next) =>
  hipLinkingController.generateLinkToken(req, res, next)
);

/**
 * @swagger
 * /api/v1/hip/link/care-contexts:
 *   post:
 *     summary: Link Patient Care Contexts with ABHA Address (Single or Multiple)
 *     tags: [HIP Care Context Linking]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - abhaAddress
 *               - patientReferenceNumber
 *               - careContexts
 *             properties:
 *               hipId:
 *                 type: string
 *                 default: "IN0410000183"
 *                 example: "IN0410000183"
 *               hipName:
 *                 type: string
 *                 default: "City General Hospital"
 *                 example: "City General Hospital"
 *               abhaAddress:
 *                 type: string
 *                 example: "mansurijiyan2004@sbx"
 *               patientName:
 *                 type: string
 *                 example: "Mansuri Jiyan"
 *               patientReferenceNumber:
 *                 type: string
 *                 example: "MRN-JIYAN-2026"
 *               phoneNo:
 *                 type: string
 *                 example: "9408111252"
 *               careContexts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - referenceNumber
 *                     - display
 *                   properties:
 *                     referenceNumber:
 *                       type: string
 *                       example: "OPD-REC-901"
 *                     display:
 *                       type: string
 *                       example: "General OPD Consultation - Dr. Sharma"
 *                     hiType:
 *                       type: string
 *                       enum: [OPConsultation, Prescription, DiagnosticReport, DischargeSummary, ImmunizationRecord]
 *                       default: "OPConsultation"
 *                       example: "OPConsultation"
 *               notify:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *               sendSms:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *     responses:
 *       200:
 *         description: Care contexts linked successfully
 */
hospitalHipLinkingRouter.post('/link/care-contexts', (req, res, next) =>
  hipLinkingController.linkCareContexts(req, res, next)
);

/**
 * @swagger
 * /api/v1/hip/link/sms-notify:
 *   post:
 *     summary: Send SMS Deep Link Notification to Patient
 *     tags: [HIP Care Context Linking]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNo
 *             properties:
 *               hipId:
 *                 type: string
 *                 default: "IN0410000183"
 *                 example: "IN0410000183"
 *               hipName:
 *                 type: string
 *                 default: "City General Hospital"
 *                 example: "City General Hospital"
 *               phoneNo:
 *                 type: string
 *                 example: "9408111252"
 *     responses:
 *       200:
 *         description: SMS notification queued for delivery
 */
hospitalHipLinkingRouter.post('/link/sms-notify', (req, res, next) =>
  hipLinkingController.sendSmsDeepLink(req, res, next)
);

/**
 * @swagger
 * /api/v1/hip/care-contexts:
 *   get:
 *     summary: List All Linked Patient Care Contexts
 *     tags: [HIP Care Context Linking]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 */
hospitalHipLinkingRouter.get('/care-contexts', (req, res, next) =>
  hipLinkingController.getLinkedCareContexts(req, res, next)
);

/**
 * @swagger
 * /api/v1/hip/consents:
 *   get:
 *     summary: View All Consents & Lifecycle Status (Granted, Revoked, Expired)
 *     tags: [HIP Consent & Data Transfer]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 */
hospitalHipLinkingRouter.get('/consents', (req, res, next) =>
  hipLinkingController.getConsents(req, res, next)
);

/**
 * @swagger
 * /api/v1/hip/consents/test-simulate:
 *   post:
 *     summary: Test Simulator for Consent Grant / Revocation
 *     tags: [HIP Consent & Data Transfer]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 */
hospitalHipLinkingRouter.post('/consents/test-simulate', (req, res, next) =>
  hipLinkingController.simulateConsent(req, res, next)
);

// 2. Router for Official Incoming ABDM Gateway Webhooks (supporting V3, V0.5 & alias paths)
const abdmHipWebhookRouter: Router = Router();

// 1. Patient Care Context Discovery (V3 & V0.5)
const discoverPaths = [
  '/api/v3/hip/patient/care-context/discover',
  '/v3/patient/care-context/discover',
  '/user-initiated-linking/v3/patient/care-context/discover',
  '/v0.5/care-contexts/discover',
];
discoverPaths.forEach((path) => {
  abdmHipWebhookRouter.post(path, (req, res, next) =>
    hipLinkingController.handleDiscoverWebhook(req, res, next)
  );
});

// 2. User Initiated Link Init (V3 & V0.5)
const linkInitPaths = [
  '/api/v3/hip/link/care-context/init',
  '/v3/link/care-context/init',
  '/user-initiated-linking/v3/link/care-context/init',
  '/v0.5/links/link/init',
];
linkInitPaths.forEach((path) => {
  abdmHipWebhookRouter.post(path, (req, res, next) =>
    hipLinkingController.handleLinkInitWebhook(req, res, next)
  );
});

// 3. User Initiated Link Confirm (V3 & V0.5)
const linkConfirmPaths = [
  '/api/v3/hip/link/care-context/confirm',
  '/v3/link/care-context/confirm',
  '/user-initiated-linking/v3/link/care-context/confirm',
  '/v0.5/links/link/confirm',
];
linkConfirmPaths.forEach((path) => {
  abdmHipWebhookRouter.post(path, (req, res, next) =>
    hipLinkingController.handleLinkConfirmWebhook(req, res, next)
  );
});

// 4. Consent Request Notification (V3 & V0.5)
const consentNotifyPaths = [
  '/api/v3/hip/consent/request/notify',
  '/v3/consent/request/notify',
  '/v0.5/consents/hip/notify',
];
consentNotifyPaths.forEach((path) => {
  abdmHipWebhookRouter.post(path, (req, res, next) =>
    hipLinkingController.handleConsentNotifyWebhook(req, res, next)
  );
});

// 5. Health Information Request from HIU (V3 & V0.5)
const healthInfoRequestPaths = [
  '/api/v3/hip/health-information/request',
  '/v3/health-information/request',
  '/v0.5/health-information/hip/request',
];
healthInfoRequestPaths.forEach((path) => {
  abdmHipWebhookRouter.post(path, (req, res, next) =>
    hipLinkingController.handleHealthInfoRequestWebhook(req, res, next)
  );
});

// 6. Asynchronous Link Token Delivery from ABDM Gateway
const onTokenPaths = [
  '/api/v3/hip/token/on-generate-token',
  '/v3/token/on-generate-token',
  '/v3/hip/token/on-generate-token',
  '/v0.5/users/auth/on-fetch-modes',
];
onTokenPaths.forEach((path) => {
  abdmHipWebhookRouter.post(path, (req, res, next) =>
    hipLinkingController.handleOnGenerateTokenWebhook(req, res, next)
  );
});

export { hospitalHipLinkingRouter, abdmHipWebhookRouter };
