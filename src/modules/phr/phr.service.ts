import { abdmPHRClient } from '../../integrations/abdm/abdm.phr';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';

export class PHRService {
  /**
   * 1. Document Registration: Generate Mobile OTP
   */
  public async generateDocumentMobileOtp(mobile: string): Promise<any> {
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      throw new AppError('Valid 10-digit mobile number is required', 400);
    }
    return abdmPHRClient.generateDocumentMobileOtp(mobile);
  }

  /**
   * 2. Document Registration: Verify Mobile OTP
   */
  public async verifyDocumentMobileOtp(params: { otp: string; txnId: string }): Promise<any> {
    if (!params.otp || !params.txnId) {
      throw new AppError('Both otp and txnId are required', 400);
    }
    return abdmPHRClient.verifyDocumentMobileOtp(params);
  }

  /**
   * 3. Validate Identity Document (Driving License, PAN, Passport)
   */
  public async validateDocument(params: {
    documentType: string;
    documentNumber: string;
    firstName?: string;
    lastName?: string;
    gender?: string;
    yearOfBirth?: number;
    monthOfBirth?: string;
    dayOfBirth?: number;
  }): Promise<any> {
    if (!params.documentType || !params.documentNumber) {
      throw new AppError('documentType and documentNumber are required', 400);
    }
    return abdmPHRClient.validateDocument({
      ...params,
      firstName: params.firstName || 'Applicant',
      gender: params.gender || 'M',
      yearOfBirth: params.yearOfBirth || 2000,
    });
  }

  /**
   * 4. Create ABHA with Verified Document
   */
  public async createHealthIdWithDocument(params: any): Promise<any> {
    if (!params.txnId || !params.documentNumber || !params.firstName || !params.mobile) {
      throw new AppError('txnId, documentNumber, firstName and mobile are required', 400);
    }
    return abdmPHRClient.createHealthIdWithDocument(params);
  }

  /**
   * 5. Fingerprint Biometric Authentication: Init
   */
  public async initAuth(params: { authMethod?: string; healthid: string }): Promise<any> {
    if (!params.healthid) {
      throw new AppError('healthid (ABHA Number or Address) is required', 400);
    }
    return abdmPHRClient.initAuth({
      authMethod: params.authMethod || 'AADHAAR_BIO',
      healthid: params.healthid,
    });
  }

  /**
   * 6. Confirm Authentication with Fingerprint Biometrics
   */
  public async confirmFingerprint(params: {
    authType?: 'FINGERSCAN' | 'IRIS';
    bioType?: 'FMR' | 'FIR';
    pid: string;
    txnId: string;
  }): Promise<any> {
    if (!params.pid || !params.txnId) {
      throw new AppError('Both biometric pid (base64) and txnId are required', 400);
    }
    return abdmPHRClient.confirmWithFingerprint({
      authType: params.authType || 'FINGERSCAN',
      bioType: params.bioType || 'FMR',
      pid: params.pid,
      txnId: params.txnId,
    });
  }

  /**
   * 7. Forgot Health ID: Request Mobile OTP
   */
  public async forgotHealthIdMobileOtp(mobile: string): Promise<any> {
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      throw new AppError('Valid 10-digit mobile number is required', 400);
    }
    return abdmPHRClient.forgotHealthIdMobileOtp(mobile);
  }

  /**
   * 8. Forgot Health ID: Verify Mobile OTP and Retrieve ABHA
   */
  public async forgotHealthIdMobileVerify(params: {
    txnId: string;
    otp: number | string;
    name?: string;
    yearOfBirth?: number;
    gender?: string;
  }): Promise<any> {
    if (!params.txnId || !params.otp) {
      throw new AppError('Both txnId and otp are required', 400);
    }
    return abdmPHRClient.forgotHealthIdMobileVerify(params);
  }

  /**
   * 9. Forgot Health ID: Request Aadhaar OTP
   */
  public async forgotHealthIdAadhaarOtp(aadhaar: string): Promise<any> {
    if (!aadhaar || !/^\d{12}$/.test(aadhaar.replace(/\s+/g, ''))) {
      throw new AppError('Valid 12-digit Aadhaar number is required', 400);
    }
    return abdmPHRClient.forgotHealthIdAadhaarOtp(aadhaar.replace(/\s+/g, ''));
  }

  /**
   * 10. Forgot Health ID: Verify Aadhaar OTP and Retrieve ABHA
   */
  public async forgotHealthIdAadhaarVerify(params: {
    txnId: string;
    otp: number | string;
  }): Promise<any> {
    if (!params.txnId || !params.otp) {
      throw new AppError('Both txnId and otp are required', 400);
    }
    return abdmPHRClient.forgotHealthIdAadhaarVerify(params);
  }

  /**
   * 11. Download ABHA Card (QR, PNG, SVG)
   */
  public async getCard(format: 'qr' | 'png' | 'svg', xToken?: string): Promise<any> {
    return abdmPHRClient.getCard(format, xToken);
  }

  /**
   * 12. Get LGD Indian States & Districts
   */
  public async getLgdStates(): Promise<any> {
    return abdmPHRClient.getLgdStates();
  }

  public async getLgdDistricts(stateCode: number | string): Promise<any> {
    if (!stateCode) {
      throw new AppError('stateCode is required', 400);
    }
    return abdmPHRClient.getLgdDistricts(stateCode);
  }
}

export const phrService = new PHRService();
