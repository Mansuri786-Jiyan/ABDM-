import { Router } from 'express';
import { authController } from './auth.controller';

const router = Router();

/**
 * @swagger
 * /api/v1/auth/token:
 *   post:
 *     summary: Exchange Hospital Client Credentials for Connector Token
 *     description: Authenticate your hospital management system with the connector service.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientId
 *               - clientSecret
 *             properties:
 *               clientId:
 *                 type: string
 *                 example: "dev_hospital_client_id"
 *               clientSecret:
 *                 type: string
 *                 example: "dev_hospital_client_secret_2026"
 *     responses:
 *       200:
 *         description: JWT Access Token issued
 *       401:
 *         description: Invalid credentials
 */
router.post('/token', (req, res, next) => authController.generateToken(req, res, next));

export const authRouter: Router = router;
