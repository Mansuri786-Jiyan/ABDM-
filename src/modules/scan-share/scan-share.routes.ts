import { Router } from 'express';
import { scanShareController } from './scan-share.controller';
import { authenticateHospitalClient } from '../../middleware/authentication';

// Router for hospital-facing management endpoints
const hospitalScanShareRouter: Router = Router();

// Hospital client authentication for HMIS endpoints
hospitalScanShareRouter.use(authenticateHospitalClient);

/**
 * @swagger
 * /api/v1/scan-share/tokens:
 *   get:
 *     summary: View Scanned Patients Queue (HMIS Reception)
 *     tags: [Scan and Share]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [WAITING, COMPLETED, EXPIRED]
 *     responses:
 *       200:
 *         description: List of patients waiting in queue
 */
hospitalScanShareRouter.get('/tokens', (req, res, next) =>
  scanShareController.getQueue(req, res, next)
);

/**
 * @swagger
 * /api/v1/scan-share/tokens/{tokenNumber}:
 *   get:
 *     summary: Get Scanned Patient Details by Token # (Auto-fill)
 *     tags: [Scan and Share]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     parameters:
 *       - in: path
 *         name: tokenNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Patient demographics and token info
 */
hospitalScanShareRouter.get('/tokens/:tokenNumber', (req, res, next) =>
  scanShareController.getToken(req, res, next)
);

/**
 * @swagger
 * /api/v1/scan-share/tokens/{tokenNumber}/complete:
 *   post:
 *     summary: Complete Token Registration (OPD card issued)
 *     tags: [Scan and Share]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     parameters:
 *       - in: path
 *         name: tokenNumber
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               patientReferenceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token marked completed
 */
hospitalScanShareRouter.post('/tokens/:tokenNumber/complete', (req, res, next) =>
  scanShareController.completeToken(req, res, next)
);

// ==========================================
// Scan & Pay: OPD Fee Payment & Receipts
// ==========================================

hospitalScanShareRouter.post('/pay/initiate', (req, res, next) =>
  scanShareController.initiatePayment(req, res, next)
);

hospitalScanShareRouter.post('/pay/confirm', (req, res, next) =>
  scanShareController.confirmPayment(req, res, next)
);

hospitalScanShareRouter.get('/pay/receipt/:tokenNumber', (req, res, next) =>
  scanShareController.getPaymentReceipt(req, res, next)
);

/**
 * @swagger
 * /api/v1/scan-share/bridge/url:
 *   patch:
 *     summary: Update Bridge URL on ABDM Gateway
 *     tags: [Bridge Management]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bridge URL updated
 */
hospitalScanShareRouter.patch('/bridge/url', (req, res, next) =>
  scanShareController.updateBridgeUrl(req, res, next)
);

/**
 * @swagger
 * /api/v1/scan-share/bridge/services:
 *   post:
 *     summary: Register Facility Bridge Services (HIP/HIU)
 *     tags: [Bridge Management]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *   get:
 *     summary: Find Services by Bridge ID
 *     tags: [Bridge Management]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 */
hospitalScanShareRouter.post('/bridge/services', (req, res, next) =>
  scanShareController.registerBridgeServices(req, res, next)
);

hospitalScanShareRouter.get('/bridge/services', (req, res, next) =>
  scanShareController.getBridgeServices(req, res, next)
);

hospitalScanShareRouter.get('/bridge/services/:serviceId', (req, res, next) =>
  scanShareController.getBridgeServiceById(req, res, next)
);

hospitalScanShareRouter.get('/certs', (req, res, next) =>
  scanShareController.getGatewayCerts(req, res, next)
);

hospitalScanShareRouter.get('/openid-configuration', (req, res, next) =>
  scanShareController.getOpenIdConfig(req, res, next)
);

/**
 * @swagger
 * /api/v1/scan-share/running-token:
 *   post:
 *     summary: Update Counter Running Token (Advances Queue and Notifies ABDM Gateway)
 *     tags: [Scan and Share]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [hipId, runningTokenNumber]
 *             properties:
 *               hipId:
 *                 type: string
 *                 example: Mohan_HIP
 *               context:
 *                 type: string
 *                 example: "1"
 *               runningTokenNumber:
 *                 type: string
 *                 example: "51"
 *               averageTokenServiceTimeInMinutes:
 *                 type: number
 *                 example: 2
 *               notifyGateway:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Running token updated successfully
 *   get:
 *     summary: Get Current Running Token for Counter(s)
 *     tags: [Scan and Share]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     parameters:
 *       - in: query
 *         name: context
 *         schema:
 *           type: string
 *         description: Counter / department context (e.g. 1)
 *     responses:
 *       200:
 *         description: Current running token
 */
hospitalScanShareRouter.post('/running-token', (req, res, next) =>
  scanShareController.updateRunningToken(req, res, next)
);

hospitalScanShareRouter.get('/running-token', (req, res, next) =>
  scanShareController.getRunningToken(req, res, next)
);

/**
 * @swagger
 * /api/v1/scan-share/running-token/query-gateway:
 *   post:
 *     summary: Query Running Token Status from ABDM Gateway
 *     tags: [Scan and Share]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 */
hospitalScanShareRouter.post('/running-token/query-gateway', (req, res, next) =>
  scanShareController.queryGatewayRunningToken(req, res, next)
);

// Router for official incoming ABDM Gateway webhook
const abdmCallbackRouter: Router = Router();

/**
 * @swagger
 * /api/v3/hip/patient/share:
 *   post:
 *     summary: Official ABDM Webhook - Patient Profile Share (QR Scan)
 *     tags: [Scan and Share Webhook]
 *     responses:
 *       200:
 *         description: Profile acknowledged and token assigned
 */
abdmCallbackRouter.post('/api/v3/hip/patient/share', (req, res, next) =>
  scanShareController.handleProfileShareCallback(req, res, next)
);

/**
 * @swagger
 * /api/v3/hip/patient-share/running-token/status:
 *   post:
 *     summary: Official ABDM Webhook - Running Token Status Request
 *     tags: [Scan and Share Webhook]
 *     responses:
 *       200:
 *         description: Running token status returned
 */
abdmCallbackRouter.post('/api/v3/hip/patient-share/running-token/status', (req, res, next) =>
  scanShareController.handleRunningTokenStatusCallback(req, res, next)
);

export { hospitalScanShareRouter, abdmCallbackRouter };
