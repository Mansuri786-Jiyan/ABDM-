import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { hipLinkingService } from './hip-linking.service';

const GenerateLinkTokenSchema = z.object({
  hipId: z.string().optional().default('IN0410000183'),
  name: z.string().min(1, 'name is required'),
  gender: z.string().min(1, 'gender is required'),
  yearOfBirth: z.number().int().min(1900).max(2100),
  abhaNumber: z.union([z.string(), z.number()]).transform((val) => String(val)).optional(),
  abhaAddress: z.string().optional(),
});

const LinkCareContextsSchema = z.object({
  hipId: z.string().optional().default('IN0410000183'),
  linkToken: z.string().optional(),
  abhaNumber: z.union([z.string(), z.number()]).transform(String).optional(),
  abhaAddress: z.string().min(1, 'abhaAddress is required'),
  patientName: z.string().optional().default('Patient'),
  patientReferenceNumber: z.string().min(1, 'patientReferenceNumber is required'),
  careContexts: z
    .array(
      z.object({
        referenceNumber: z.string().min(1),
        display: z.string().min(1),
        hiType: z.string().optional().default('OPConsultation'),
        content: z.string().optional(),
      })
    )
    .min(1, 'At least one care context is required'),
  notify: z.boolean().optional().default(true),
  sendSms: z.boolean().optional().default(false),
  phoneNo: z.string().optional(),
  hipName: z.string().optional(),
});

const SendSmsDeepLinkSchema = z
  .object({
    hipId: z.string().optional().default('IN0410000183'),
    hipName: z.string().optional().default('City General Hospital'),
    phoneNo: z.string().optional(),
    phone: z.string().optional(),
  })
  .transform((data) => ({
    hipId: data.hipId,
    hipName: data.hipName,
    phoneNo: (data.phoneNo || data.phone || '').trim(),
  }))
  .refine((data) => /^\d{10}$/.test(data.phoneNo), {
    message: 'phoneNo or phone must be a 10-digit number',
    path: ['phoneNo'],
  });

const SimulateConsentSchema = z.object({
  consentId: z.string().min(1),
  status: z.enum(['GRANTED', 'REVOKED', 'EXPIRED']),
  patientId: z.string().optional(),
  careContextReferences: z.array(z.string()).default([]),
  hiTypes: z.array(z.string()).default(['Prescription', 'OPConsultation']),
  expiry: z.string().optional(),
});

export class HipLinkingController {
  /**
   * POST /api/v1/hip/token/generate
   */
  public async generateLinkToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = GenerateLinkTokenSchema.parse(req.body);
      const result = await hipLinkingService.generateLinkToken(validated);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/hip/link/care-contexts
   */
  public async linkCareContexts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = LinkCareContextsSchema.parse(req.body);
      const result = await hipLinkingService.linkCareContexts(validated);
      res.status(200).json({
        success: true,
        message: 'Care context(s) linked successfully to ABHA address',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/hip/link/sms-notify
   */
  public async sendSmsDeepLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = SendSmsDeepLinkSchema.parse(req.body);
      const result = await hipLinkingService.sendSmsDeepLink(validated);
      res.status(200).json({
        success: true,
        message: 'SMS deep link sent successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/hip/care-contexts
   */
  public async getLinkedCareContexts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { abhaAddress } = req.query;
      const result = hipLinkingService.getLinkedCareContexts(abhaAddress as string | undefined);
      res.status(200).json({
        success: true,
        data: {
          total: result.length,
          careContexts: result,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/hip/consents
   */
  public async getConsents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.query;
      const result = hipLinkingService.getConsents(status as any);
      res.status(200).json({
        success: true,
        data: {
          total: result.length,
          consents: result,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/hip/consents/test-simulate
   */
  public async simulateConsent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = SimulateConsentSchema.parse(req.body);
      const requestId = (req.headers['request-id'] as string) || uuidv4();
      const result = await hipLinkingService.handleConsentNotifyWebhook(requestId, {
        notification: {
          consentId: validated.consentId,
          status: validated.status,
          consentDetail: {
            patient: { id: validated.patientId || 'patient@sbx' },
            careContexts: validated.careContextReferences.map((r) => ({ careContextReference: r })),
            hiTypes: validated.hiTypes,
            permission: {
              dataEraseAt: validated.expiry,
            },
          },
        },
      });
      res.status(200).json({
        success: true,
        message: `Consent status simulated as ${validated.status}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * ABDM Webhook: POST /api/v3/hip/patient/care-context/discover
   */
  public async handleDiscoverWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = (req.headers['request-id'] as string) || uuidv4();
      const result = await hipLinkingService.handleDiscoverWebhook(requestId, req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * ABDM Webhook: POST /api/v3/hip/link/care-context/init
   */
  public async handleLinkInitWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = (req.headers['request-id'] as string) || uuidv4();
      const result = await hipLinkingService.handleLinkInitWebhook(requestId, req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * ABDM Webhook: POST /api/v3/hip/link/care-context/confirm
   */
  public async handleLinkConfirmWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = (req.headers['request-id'] as string) || uuidv4();
      const result = await hipLinkingService.handleLinkConfirmWebhook(requestId, req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * ABDM Webhook: POST /api/v3/hip/consent/request/notify
   */
  public async handleConsentNotifyWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = (req.headers['request-id'] as string) || uuidv4();
      const result = await hipLinkingService.handleConsentNotifyWebhook(requestId, req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * ABDM Webhook: POST /api/v3/hip/health-information/request
   */
  public async handleHealthInfoRequestWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = (req.headers['request-id'] as string) || uuidv4();
      const result = await hipLinkingService.handleHealthInfoRequestWebhook(requestId, req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * ABDM Webhook: POST /api/v3/hip/token/on-generate-token
   */
  public handleOnGenerateTokenWebhook(req: Request, res: Response, next: NextFunction): void {
    try {
      hipLinkingService.handleOnGenerateTokenWebhook(req.body);
      res.status(202).json({
        success: true,
        message: 'on-generate-token callback received',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const hipLinkingController = new HipLinkingController();
