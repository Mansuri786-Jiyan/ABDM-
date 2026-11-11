import { Request, Response, NextFunction } from 'express';
import { hiuService, ConsentStatus, HIType } from './hiu.service';
import { AppError } from '../../utils/errors';

export class HIUController {
  /**
   * 1. Clinician Login (Username and Password)
   * POST /api/v1/hiu/auth/login
   */
  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        throw new AppError('Both username and password are required', 400);
      }

      const result = await hiuService.login({ username, password });
      res.status(200).json({
        success: true,
        message: 'HIU Clinician logged in successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 2. List / Search Patients
   * GET /api/v1/hiu/patients
   */
  public async getPatients(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = req.query.search as string;
      const patients = hiuService.getPatients(search);
      res.status(200).json({
        success: true,
        message: 'Patients retrieved successfully',
        data: { total: patients.length, patients },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 3. Create Consent Request for Selected Patient
   * POST /api/v1/hiu/consent/requests
   */
  public async createConsentRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        patientId,
        hiuId,
        hipId,
        requesterName,
        purposeCode,
        purposeText,
        hiTypes,
        dateFrom,
        dateTo,
        dataEraseAt,
      } = req.body;

      if (!patientId) {
        throw new AppError('Patient ID (ABHA address or number) is required', 400);
      }

      const result = await hiuService.createConsentRequest({
        patientId,
        hiuId,
        hipId,
        requesterName,
        purposeCode,
        purposeText,
        hiTypes,
        dateFrom,
        dateTo,
        dataEraseAt,
      });

      res.status(201).json({
        success: true,
        message: 'Consent request created and notified to ABDM Gateway',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 4. List Consent Requests
   * GET /api/v1/hiu/consent/requests
   */
  public async listConsentRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as ConsentStatus;
      const patientId = req.query.patientId as string;
      const list = hiuService.listConsentRequests({ status, patientId });
      res.status(200).json({
        success: true,
        message: 'Consent requests retrieved',
        data: { total: list.length, consentRequests: list },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 5. Get Consent Request Details
   * GET /api/v1/hiu/consent/requests/:id
   */
  public async getConsentRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      const details = hiuService.getConsentRequest(id);
      res.status(200).json({
        success: true,
        message: 'Consent request details retrieved',
        data: details,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 6. Simulate Patient Action (Grant, Deny, Revoke, Expire) for Testing
   * POST /api/v1/hiu/consent/requests/:id/simulate
   */
  public async simulateConsentAction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      const { status, consentId } = req.body;
      if (!status) {
        throw new AppError('Status is required (GRANTED, DENIED, REVOKED, EXPIRED)', 400);
      }

      const updated = hiuService.updateConsentStatus(id, status as ConsentStatus, consentId);
      res.status(200).json({
        success: true,
        message: `Consent request status updated to ${status}`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 7. View Health Data with HI Type Filtering & Strict Privacy Enforcement
   * GET /api/v1/hiu/health-records/:consentId
   */
  public async getHealthData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const consentId = req.params.consentId;
      const hiType = req.query.hiType as HIType;

      const data = hiuService.getHealthData(consentId, hiType);
      res.status(200).json({
        success: true,
        message: 'Health information retrieved successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 8. ABDM Gateway Consent Webhook
   * POST /api/v3/hiu/consent/request/notify
   */
  public async handleGatewayConsentNotify(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const requestId =
        (req.headers['request-id'] as string) || (req.headers['REQUEST-ID'] as string) || '';
      const result = await hiuService.handleGatewayNotifyWebhook(requestId, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const hiuController = new HIUController();
