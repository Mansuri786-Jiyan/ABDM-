import { Router } from 'express';
import { hiuController } from './hiu.controller';
import { authenticateHospitalClient } from '../../middleware/authentication';

// 1. Router for Hospital HIU Management Endpoints (Clinician Interface)
const hospitalHiuRouter: Router = Router();

/**
 * @swagger
 * /api/v1/hiu/auth/login:
 *   post:
 *     summary: HIU Clinician Login with Username and Password
 *     tags: [Milestone 3 - HIU]
 */
hospitalHiuRouter.post('/auth/login', (req, res, next) =>
  hiuController.login(req, res, next)
);

// Protected routes below
hospitalHiuRouter.use(authenticateHospitalClient);

/**
 * @swagger
 * /api/v1/hiu/patients:
 *   get:
 *     summary: List or Search Patients for HIU Consent Creation
 *     tags: [Milestone 3 - HIU]
 */
hospitalHiuRouter.get('/patients', (req, res, next) =>
  hiuController.getPatients(req, res, next)
);

/**
 * @swagger
 * /api/v1/hiu/consent/requests:
 *   post:
 *     summary: Create Consent Request for Selected Patient
 *     tags: [Milestone 3 - HIU]
 *   get:
 *     summary: List All Consent Requests
 *     tags: [Milestone 3 - HIU]
 */
hospitalHiuRouter.post('/consent/requests', (req, res, next) =>
  hiuController.createConsentRequest(req, res, next)
);
hospitalHiuRouter.get('/consent/requests', (req, res, next) =>
  hiuController.listConsentRequests(req, res, next)
);

/**
 * @swagger
 * /api/v1/hiu/consent/requests/{id}:
 *   get:
 *     summary: Get Details of a Consent Request
 *     tags: [Milestone 3 - HIU]
 */
hospitalHiuRouter.get('/consent/requests/:id', (req, res, next) =>
  hiuController.getConsentRequest(req, res, next)
);

/**
 * @swagger
 * /api/v1/hiu/consent/requests/{id}/simulate:
 *   post:
 *     summary: Simulate Patient Action (Grant, Deny, Revoke, Expire) for Testing
 *     tags: [Milestone 3 - HIU]
 */
hospitalHiuRouter.post('/consent/requests/:id/simulate', (req, res, next) =>
  hiuController.simulateConsentAction(req, res, next)
);

/**
 * @swagger
 * /api/v1/hiu/health-records/{consentId}:
 *   get:
 *     summary: View Health Data of Approved Consent (Filtered by HI Type, Denied/Revoked/Expired strictly blocked)
 *     tags: [Milestone 3 - HIU]
 */
hospitalHiuRouter.get('/health-records/:consentId', (req, res, next) =>
  hiuController.getHealthData(req, res, next)
);

// 2. Router for ABDM Gateway Webhooks (Incoming Callbacks to HIU)
const abdmHiuWebhookRouter: Router = Router();

/**
 * @swagger
 * /api/v3/hiu/consent/request/notify:
 *   post:
 *     summary: ABDM Gateway Notification Webhook for Consent Status Changes
 *     tags: [Milestone 3 - HIU Gateway Webhooks]
 */
abdmHiuWebhookRouter.post('/api/v3/hiu/consent/request/notify', (req, res, next) =>
  hiuController.handleGatewayConsentNotify(req, res, next)
);

export { hospitalHiuRouter, abdmHiuWebhookRouter };
