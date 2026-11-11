import { abdmHprHfrClient, FacilitySearchParams } from '../../integrations/abdm/abdm.hpr-hfr';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export class HprHfrService {
  // ==========================================
  // HPR: Doctor Search & Verification
  // ==========================================

  public async searchDoctorByHprId(hprId: string): Promise<any> {
    if (!hprId || !hprId.trim()) {
      throw new AppError('hprId is required', 400);
    }
    return abdmHprHfrClient.searchDoctorByHprId(hprId.trim());
  }

  public async searchDoctorByMobile(mobile: string): Promise<any> {
    if (!mobile || !/^\d{10}$/.test(mobile.replace(/\s+/g, ''))) {
      throw new AppError('Valid 10-digit mobile number is required', 400);
    }
    return abdmHprHfrClient.searchDoctorByMobile(mobile.replace(/\s+/g, ''));
  }

  public async sendDoctorLoginOtp(mobile: string): Promise<any> {
    if (!mobile || !/^\d{10}$/.test(mobile.replace(/\s+/g, ''))) {
      throw new AppError('Valid 10-digit mobile number is required', 400);
    }
    return abdmHprHfrClient.sendDoctorLoginOtp(mobile.replace(/\s+/g, ''));
  }

  public async verifyDoctorLoginOtp(params: { txnId: string; otp: string }): Promise<any> {
    if (!params.txnId || !params.otp) {
      throw new AppError('Both txnId and otp are required', 400);
    }
    return abdmHprHfrClient.verifyDoctorLoginOtp(params);
  }

  public async getDoctorProfile(doctorAuthToken?: string): Promise<any> {
    return abdmHprHfrClient.getDoctorProfile(doctorAuthToken);
  }

  public async getDoctorIdCard(doctorAuthToken?: string): Promise<any> {
    return abdmHprHfrClient.getDoctorIdCard(doctorAuthToken);
  }

  public async getCouncils(): Promise<any> {
    return abdmHprHfrClient.getCouncils();
  }

  public async getCourses(): Promise<any> {
    return abdmHprHfrClient.getCourses();
  }

  // ==========================================
  // HFR: Health Facility Registry
  // ==========================================

  public async searchFacility(params: FacilitySearchParams): Promise<any> {
    return abdmHprHfrClient.searchFacility(params);
  }

  public async onboardFacilityBasic(params: any): Promise<any> {
    if (!params.facilityName) {
      throw new AppError('facilityName is required', 400);
    }
    return abdmHprHfrClient.onboardFacilityBasic(params);
  }

  public async onboardFacilityAdditional(params: any): Promise<any> {
    if (!params.trackingId) {
      throw new AppError('trackingId is required from basic information step', 400);
    }
    return abdmHprHfrClient.onboardFacilityAdditional(params);
  }

  public async onboardFacilityDetailed(params: any): Promise<any> {
    if (!params.trackingId) {
      throw new AppError('trackingId is required from basic information step', 400);
    }
    return abdmHprHfrClient.onboardFacilityDetailed(params);
  }

  public async onboardFacilitySubmit(trackingId: string): Promise<any> {
    if (!trackingId || !trackingId.trim()) {
      throw new AppError('trackingId is required for submission', 400);
    }
    return abdmHprHfrClient.onboardFacilitySubmit(trackingId.trim());
  }

  public async sendFacilityContactOtp(params: { contactNumber: string; trackingId?: string }): Promise<any> {
    if (!params.contactNumber || !/^\d{10}$/.test(params.contactNumber.replace(/\s+/g, ''))) {
      throw new AppError('Valid 10-digit contactNumber is required', 400);
    }
    return abdmHprHfrClient.sendFacilityContactOtp(params);
  }

  public async validateFacilityContactOtp(params: { otp: string; txnId?: string; trackingId?: string }): Promise<any> {
    if (!params.otp) {
      throw new AppError('otp is required', 400);
    }
    return abdmHprHfrClient.validateFacilityContactOtp(params);
  }

  public async assignProfessionalsToFacility(params: {
    facilityId: string;
    professionals: Array<{
      hprId: string;
      role: string;
      department?: string;
    }>;
  }): Promise<any> {
    if (!params.facilityId) {
      throw new AppError('facilityId is required', 400);
    }
    if (!Array.isArray(params.professionals) || params.professionals.length === 0) {
      throw new AppError('At least one healthcare professional is required', 400);
    }
    return abdmHprHfrClient.assignProfessionalsToFacility(params);
  }
}

export const hprHfrService = new HprHfrService();
