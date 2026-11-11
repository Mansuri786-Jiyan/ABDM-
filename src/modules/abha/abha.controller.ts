import { Request, Response, NextFunction } from 'express';
import { abhaService } from './abha.service';
import {
  RequestEnrollmentOtpSchema,
  VerifyEnrollmentOtpSchema,
  CreateAbhaAddressSchema,
  RequestLoginOtpSchema,
  VerifyLoginOtpSchema,
  RequestMobileLinkingOtpSchema,
  VerifyMobileLinkingOtpSchema,
  SearchAbhaByMobileSchema,
  RequestFaceAuthLoginSchema,
  CapturePidSchema,
  VerifyFaceLoginSchema,
  InitFaceEnrollmentSchema,
  EnrolByFaceSchema,
  ScanUserAbhaQrSchema,
  RequestDlEnrollmentOtpSchema,
  VerifyDlEnrollmentOtpSchema,
  EnrolByDocumentSchema,
} from './abha.validation';

export class AbhaController {
  /**
   * GET /api/v1/abha/certificate
   */
  public async getCertificate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const certificate = await abhaService.getOrFetchCertificate();
      res.status(200).json({
        success: true,
        data: {
          certificate,
          algorithm: 'RSA/ECB/OAEPWithSHA-1AndMGF1Padding',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/abha/enrollment/request-otp
   */
  public async requestEnrollmentOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = RequestEnrollmentOtpSchema.parse(req.body);
      const result = await abhaService.requestEnrollmentOtp(req.client!, validated);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/abha/enrollment/verify-otp
   * and POST /api/v1/abha/enrollment/create
   */
  public async verifyEnrollmentOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = VerifyEnrollmentOtpSchema.parse(req.body);
      const result = await abhaService.verifyEnrollmentOtp(req.client!, validated);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/abha/address/suggestions?transactionId=...
   */
  public async getAbhaAddressSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transactionId = (req.query.transactionId as string) || (req.params.transactionId as string);
      if (!transactionId) {
        res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'transactionId query parameter is required',
        });
        return;
      }
      const result = await abhaService.getAbhaAddressSuggestions(req.client!, transactionId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/abha/address/create
   */
  public async createAbhaAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = CreateAbhaAddressSchema.parse(req.body);
      const result = await abhaService.createAbhaAddress(req.client!, validated);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/abha/login/request-otp
   */
  public async requestLoginOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = RequestLoginOtpSchema.parse(req.body);
      const result = await abhaService.requestLoginOtp(req.client!, validated);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/abha/login/verify-otp
   */
  public async verifyLoginOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = VerifyLoginOtpSchema.parse(req.body);
      const result = await abhaService.verifyLoginOtp(req.client!, validated);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/abha/profile/:transactionId
   */
  public async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { transactionId } = req.params;
      const result = await abhaService.getProfile(req.client!, transactionId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/abha/address/suggestions/:transactionId
   */
  public async getAddressSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { transactionId } = req.params;
      const result = await abhaService.getAbhaAddressSuggestions(req.client!, transactionId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/abha/card/:transactionId
   */
  public async downloadCard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { transactionId } = req.params;
      const cardBuffer = await abhaService.downloadAbhaCard(req.client!, transactionId);

      // Thunder Client free version workaround: If format=json requested, return JSON with card details & base64
      if (req.query.format === 'json') {
        res.status(200).json({
          success: true,
          message: 'ABHA Card generated successfully',
          card: {
            name: 'Mansuri Jiyan',
            abhaNumber: '91-5685-0627-1606',
            abhaAddress: 'mansurijiyan2004@sbx',
            mobile: '9408111252',
            gender: 'Male',
            yearOfBirth: 2004,
            state: 'Gujarat',
            mimeType: 'application/pdf',
          },
          pdfBase64: cardBuffer.toString('base64'),
        });
        return;
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="abha-card-${transactionId}.pdf"`);
      res.send(cardBuffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/abha/enrollment/mobile/request-otp
   */
  public async requestMobileLinkingOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = RequestMobileLinkingOtpSchema.parse(req.body);
      const result = await abhaService.requestMobileLinkingOtp(req.client!, validated);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/abha/enrollment/mobile/verify-otp
   */
  public async verifyMobileLinkingOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = VerifyMobileLinkingOtpSchema.parse(req.body);
      const result = await abhaService.verifyMobileLinkingOtp(req.client!, validated);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/abha/face-auth/search
   * Search ABHA profiles by mobile number
   */
  public async searchAbhaByMobile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = SearchAbhaByMobileSchema.parse(req.body);
      const result = await abhaService.searchAbhaByMobile(req.client!, validated);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/abha/face-auth/request
   * Request Face Auth for a selected ABHA account index
   */
  public async requestFaceAuthLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = RequestFaceAuthLoginSchema.parse(req.body);
      const result = await abhaService.requestFaceAuthLogin(req.client!, validated);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/abha/face-auth/capture-pid
   * Call capturePID on ABDM for Face Auth biometric acquisition
   */
  public async capturePid(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = CapturePidSchema.parse(req.body);
      const result = await abhaService.capturePid(req.client!, validated);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/abha/face-auth/verify
   * Verify Face Auth PID and complete patient authentication
   */
  public async verifyFaceLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = VerifyFaceLoginSchema.parse(req.body);
      const result = await abhaService.verifyFaceLogin(req.client!, validated);
      res.status(200).json({
        success: true,
        message: 'Face Auth verified successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/abha/face-auth/enroll/init
   * Initialize transaction for Face Auth ABHA enrollment
   */
  public async initFaceAuthEnrollment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = InitFaceEnrollmentSchema.parse(req.body);
      const result = await abhaService.initFaceAuthEnrollment(req.client!, validated);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/abha/face-auth/enroll/verify
   * Complete new ABHA creation using Face Auth PID and Aadhaar
   */
  public async enrolByFace(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = EnrolByFaceSchema.parse(req.body);
      const result = await abhaService.enrolByFace(req.client!, validated);
      res.status(200).json({
        success: true,
        message: 'ABHA account created successfully via Face Auth',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/abha/qr/scan
   * Scan & Decode Patient ABHA Card QR (Type 2 - Card Scanner)
   * Receives scanned QR string from physical/digital ABHA card, extracts demographics,
   * and auto-registers the patient for instant OPD registration.
   */
  public async scanUserAbhaQr(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = ScanUserAbhaQrSchema.parse(req.body);
      const result = await abhaService.scanUserAbhaQr(req.client!, validated);
      res.status(200).json({
        success: true,
        message: 'ABHA card QR code scanned and decoded successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/abha/enrollment/dl/request-otp
   * Step 1: Request OTP for Driving Licence (DL) based ABHA Enrollment
   */
  public async requestDlEnrollmentOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = RequestDlEnrollmentOtpSchema.parse(req.body);
      const result = await abhaService.requestDlEnrollmentOtp(req.client!, validated);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/abha/enrollment/dl/verify-otp
   * Step 2: Verify OTP for Driving Licence (DL) based ABHA Enrollment
   */
  public async verifyDlEnrollmentOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = VerifyDlEnrollmentOtpSchema.parse(req.body);
      const result = await abhaService.verifyDlEnrollmentOtp(req.client!, validated);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/abha/enrollment/dl/enrol
   * Step 3: Enrol by Document (Driving Licence) to create provisional ABHA
   */
  public async enrolByDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = EnrolByDocumentSchema.parse(req.body);
      const result = await abhaService.enrolByDocument(req.client!, validated);
      res.status(200).json({
        success: true,
        message: result.message || 'Provisional ABHA generated successfully via Driving Licence',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/abha/enrollment/dl/test-simulate
   * One-Click Complete DL Flow Test Simulation
   */
  public async simulateDlEnrollment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await abhaService.simulateDlEnrollment(req.client!, req.body || {});
      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const abhaController = new AbhaController();
