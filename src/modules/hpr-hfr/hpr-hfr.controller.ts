import { Request, Response, NextFunction } from 'express';
import { hprHfrService } from './hpr-hfr.service';

export class HprHfrController {
  // ==========================================
  // HPR: Doctor Search & Verification
  // ==========================================

  public async searchDoctorByHprId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hprId = req.params.hprId || (req.query.hprId as string);
      const result = await hprHfrService.searchDoctorByHprId(hprId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async searchDoctorByMobile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const mobile = req.params.mobile || (req.query.mobile as string);
      const result = await hprHfrService.searchDoctorByMobile(mobile);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async sendDoctorLoginOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { mobile } = req.body;
      const result = await hprHfrService.sendDoctorLoginOtp(mobile);
      res.status(200).json({ success: true, message: 'Doctor login OTP dispatched', data: result });
    } catch (err) {
      next(err);
    }
  }

  public async verifyDoctorLoginOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await hprHfrService.verifyDoctorLoginOtp(req.body);
      res.status(200).json({ success: true, message: 'Doctor authenticated successfully', data: result });
    } catch (err) {
      next(err);
    }
  }

  public async getDoctorProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctorToken = req.headers['x-token'] as string;
      const result = await hprHfrService.getDoctorProfile(doctorToken);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async getDoctorIdCard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctorToken = req.headers['x-token'] as string;
      const result = await hprHfrService.getDoctorIdCard(doctorToken);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async getCouncils(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await hprHfrService.getCouncils();
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async getCourses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await hprHfrService.getCourses();
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // HFR: Health Facility Registry
  // ==========================================

  public async searchFacility(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await hprHfrService.searchFacility(req.body);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async onboardFacilityBasic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await hprHfrService.onboardFacilityBasic(req.body);
      res.status(200).json({ success: true, message: 'Basic facility info saved', data: result });
    } catch (err) {
      next(err);
    }
  }

  public async onboardFacilityAdditional(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await hprHfrService.onboardFacilityAdditional(req.body);
      res.status(200).json({ success: true, message: 'Additional facility info saved', data: result });
    } catch (err) {
      next(err);
    }
  }

  public async onboardFacilityDetailed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await hprHfrService.onboardFacilityDetailed(req.body);
      res.status(200).json({ success: true, message: 'Detailed facility info saved', data: result });
    } catch (err) {
      next(err);
    }
  }

  public async onboardFacilitySubmit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { trackingId } = req.body;
      const result = await hprHfrService.onboardFacilitySubmit(trackingId);
      res.status(200).json({ success: true, message: 'Facility submitted for verification', data: result });
    } catch (err) {
      next(err);
    }
  }

  public async sendFacilityContactOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await hprHfrService.sendFacilityContactOtp(req.body);
      res.status(200).json({ success: true, message: 'Contact OTP sent', data: result });
    } catch (err) {
      next(err);
    }
  }

  public async validateFacilityContactOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await hprHfrService.validateFacilityContactOtp(req.body);
      res.status(200).json({ success: true, message: 'Contact verified successfully', data: result });
    } catch (err) {
      next(err);
    }
  }

  public async assignProfessionalsToFacility(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await hprHfrService.assignProfessionalsToFacility(req.body);
      res.status(200).json({ success: true, message: 'Professionals assigned to facility', data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const hprHfrController = new HprHfrController();
