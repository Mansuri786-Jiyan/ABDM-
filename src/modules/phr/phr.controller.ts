import { Request, Response, NextFunction } from 'express';
import { phrService } from './phr.service';

export class PHRController {
  // 1. Document OTP
  public async generateDocumentMobileOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { mobile } = req.body;
      const result = await phrService.generateDocumentMobileOtp(mobile);
      res.status(200).json({ success: true, message: 'Document OTP dispatched', data: result });
    } catch (err) {
      next(err);
    }
  }

  // 2. Document Verify OTP
  public async verifyDocumentMobileOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await phrService.verifyDocumentMobileOtp(req.body);
      res.status(200).json({ success: true, message: 'Document mobile OTP verified', data: result });
    } catch (err) {
      next(err);
    }
  }

  // 3. Document Validate
  public async validateDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await phrService.validateDocument(req.body);
      res.status(200).json({ success: true, message: 'Document validated successfully', data: result });
    } catch (err) {
      next(err);
    }
  }

  // 4. Create ABHA with Document
  public async createHealthIdWithDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await phrService.createHealthIdWithDocument(req.body);
      res.status(201).json({ success: true, message: 'ABHA Card created with government document', data: result });
    } catch (err) {
      next(err);
    }
  }

  // 5. Fingerprint Auth Init
  public async initAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await phrService.initAuth(req.body);
      res.status(200).json({ success: true, message: 'Authentication initiated', data: result });
    } catch (err) {
      next(err);
    }
  }

  // 6. Confirm Fingerprint
  public async confirmFingerprint(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await phrService.confirmFingerprint(req.body);
      res.status(200).json({ success: true, message: 'Fingerprint biometric authentication successful', data: result });
    } catch (err) {
      next(err);
    }
  }

  // 7. Forgot Health ID: Mobile OTP
  public async forgotHealthIdMobileOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { mobile } = req.body;
      const result = await phrService.forgotHealthIdMobileOtp(mobile);
      res.status(200).json({ success: true, message: 'Recovery OTP sent to mobile', data: result });
    } catch (err) {
      next(err);
    }
  }

  // 8. Forgot Health ID: Mobile Verify
  public async forgotHealthIdMobileVerify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await phrService.forgotHealthIdMobileVerify(req.body);
      res.status(200).json({ success: true, message: 'Health ID recovered successfully', data: result });
    } catch (err) {
      next(err);
    }
  }

  // 9. Forgot Health ID: Aadhaar OTP
  public async forgotHealthIdAadhaarOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { aadhaar } = req.body;
      const result = await phrService.forgotHealthIdAadhaarOtp(aadhaar);
      res.status(200).json({ success: true, message: 'Recovery OTP sent to Aadhaar-registered mobile', data: result });
    } catch (err) {
      next(err);
    }
  }

  // 10. Forgot Health ID: Aadhaar Verify
  public async forgotHealthIdAadhaarVerify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await phrService.forgotHealthIdAadhaarVerify(req.body);
      res.status(200).json({ success: true, message: 'Health ID recovered successfully', data: result });
    } catch (err) {
      next(err);
    }
  }

  // 11. Download QR / PNG / SVG Card
  public async getCard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const format = (req.params.format || 'qr') as 'qr' | 'png' | 'svg';
      const xToken = (req.headers['x-token'] || req.headers['X-Token']) as string | undefined;
      const result = await phrService.getCard(format, xToken);
      res.status(200).json({ success: true, message: 'Card fetched successfully', data: result });
    } catch (err) {
      next(err);
    }
  }

  // 12. LGD States & Districts
  public async getLgdStates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await phrService.getLgdStates();
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async getLgdDistricts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stateCode = req.query.stateCode as string;
      const result = await phrService.getLgdDistricts(stateCode);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const phrController = new PHRController();
