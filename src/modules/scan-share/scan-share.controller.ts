import { Request, Response, NextFunction } from 'express';
import { scanShareService } from './scan-share.service';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const UpdateBridgeUrlSchema = z.object({
  url: z.string().url('Must be a valid HTTPS/HTTP URL'),
});

const RegisterBridgeServicesSchema = z.object({
  facilityId: z.string().min(1, 'facilityId is required'),
  facilityName: z.string().min(1, 'facilityName is required'),
  HRP: z
    .array(
      z.object({
        bridgeId: z.string(),
        hipName: z.string(),
        type: z.enum(['HIP', 'HIU']),
        active: z.boolean(),
      })
    )
    .min(1, 'At least one HRP service is required'),
});

const CompleteTokenSchema = z.object({
  patientReferenceId: z.string().optional(),
});

const UpdateRunningTokenSchema = z.object({
  hipId: z.string().min(1, 'hipId is required'),
  context: z.string().default('1'),
  runningTokenNumber: z.string().min(1, 'runningTokenNumber is required'),
  averageTokenServiceTimeInMinutes: z.number().int().positive().optional().default(2),
  notifyGateway: z.boolean().optional().default(true),
});

const QueryGatewayRunningTokenSchema = z.object({
  hipId: z.string().min(1, 'hipId is required'),
  context: z.string().default('1'),
  hiuId: z.string().optional(),
  userAuthToken: z.string().optional(),
});

export class ScanShareController {
  /**
   * Official ABDM Webhook: POST /api/v3/hip/patient/share
   * ABDM Gateway calls this when a patient scans hospital QR code
   */
  public async handleProfileShareCallback(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const requestId = (req.headers['request-id'] as string) || uuidv4();
      const payload = req.body;

      const result = await scanShareService.handleProfileShare(requestId, payload);

      // ABDM expects 200/202 acknowledgment
      res.status(200).json({
        success: true,
        message: 'Patient profile received and queued successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/scan-share/tokens
   * Hospital Receptionist views all waiting scanned patients in queue
   */
  public async getQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.query;
      const tokens = scanShareService.getQueue(status as string | undefined);
      res.status(200).json({
        success: true,
        data: {
          total: tokens.length,
          queue: tokens,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/scan-share/tokens/:tokenNumber
   * Hospital Receptionist pulls scanned patient data to auto-fill registration
   */
  public async getToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tokenNumber } = req.params;
      const token = scanShareService.getTokenByNumber(tokenNumber);
      res.status(200).json({
        success: true,
        data: token,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/scan-share/tokens/:tokenNumber/complete
   * Mark token as registered and associate patient MRN / reference
   */
  public async completeToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tokenNumber } = req.params;
      const validated = CompleteTokenSchema.parse(req.body);
      const token = scanShareService.completeToken(tokenNumber, validated.patientReferenceId);
      res.status(200).json({
        success: true,
        message: `Token #${tokenNumber} completed successfully`,
        data: token,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/scan-share/bridge/url
   * Update ABDM Gateway bridge callback URL
   */
  public async updateBridgeUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = UpdateBridgeUrlSchema.parse(req.body);
      const result = await scanShareService.updateBridgeUrl(validated.url);
      res.status(200).json({
        success: true,
        message: 'Bridge URL updated on ABDM Gateway',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/scan-share/bridge/services
   * Register Facility Bridge Services with NHA Facility Registry
   */
  public async registerBridgeServices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = RegisterBridgeServicesSchema.parse(req.body);
      const result = await scanShareService.registerBridgeServices({
        facilityId: validated.facilityId,
        facilityName: validated.facilityName,
        hrp: validated.HRP,
      });
      res.status(200).json({
        success: true,
        message: 'Facility services registered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/scan-share/bridge/services
   */
  public async getBridgeServices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bridgeId } = req.query;
      const result = await scanShareService.findServicesByBridgeId(bridgeId as string | undefined);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/scan-share/bridge/services/:serviceId
   */
  public async getBridgeServiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { serviceId } = req.params;
      const result = await scanShareService.findBridgeServiceById(serviceId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/scan-share/certs
   */
  public async getGatewayCerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await scanShareService.getGatewayCerts();
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/scan-share/openid-configuration
   */
  public async getOpenIdConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await scanShareService.getOpenIdConfig();
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/scan-share/running-token
   * HMIS updates currently served token number for a counter
   * Also asynchronously pushes on-status update to ABDM Gateway
   */
  public async updateRunningToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = UpdateRunningTokenSchema.parse(req.body);
      const requestId = (req.headers['request-id'] as string) || uuidv4();
      const result = await scanShareService.updateRunningToken({
        ...validated,
        requestId,
      });
      res.status(200).json({
        success: true,
        message: 'Running token updated and notified to ABDM Gateway',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/scan-share/running-token
   * HMIS views running token for a specific counter or all counters
   */
  public async getRunningToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { context } = req.query;
      const result = scanShareService.getRunningToken(context as string | undefined);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/scan-share/running-token/query-gateway
   * Query running token status from ABDM Gateway POST /patient-share/v3/running-token/status
   */
  public async queryGatewayRunningToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = QueryGatewayRunningTokenSchema.parse(req.body);
      const result = await scanShareService.queryGatewayRunningTokenStatus(validated);
      res.status(200).json({
        success: true,
        message: 'Running token status request sent to ABDM Gateway',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Webhook: POST /api/v3/hip/patient-share/running-token/status
   * Gateway queries hospital for current running token status
   */
  public async handleRunningTokenStatusCallback(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const requestId = (req.headers['request-id'] as string) || uuidv4();
      const result = await scanShareService.handleRunningTokenStatusCallback(requestId, req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Scan & Pay: POST /api/v1/scan-share/pay/initiate
   * Generate an OPD consultation fee invoice & UPI payment intent for token
   */
  public async initiatePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = scanShareService.initiatePayment(req.body);
      res.status(200).json({
        success: true,
        message: 'OPD fee payment initiated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Scan & Pay: POST /api/v1/scan-share/pay/confirm
   * Confirm UPI payment receipt (mark token as PAID)
   */
  public async confirmPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = scanShareService.confirmPayment(req.body);
      res.status(200).json({
        success: true,
        message: 'Payment confirmed and receipt generated',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Scan & Pay: GET /api/v1/scan-share/pay/receipt/:tokenNumber
   * Retrieve printable OPD payment receipt
   */
  public async getPaymentReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tokenNumber = req.params.tokenNumber;
      const result = scanShareService.getPaymentReceipt(tokenNumber);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const scanShareController = new ScanShareController();
