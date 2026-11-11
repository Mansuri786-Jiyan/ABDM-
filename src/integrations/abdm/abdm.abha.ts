import { AxiosInstance } from 'axios';
import { createAbdmHttpClient } from './abdm.client';
import { abdmConfig, ABDM_ENDPOINTS } from '../../config/abdm.config';
import { abdmAuthService } from './abdm.auth';
import { logger } from '../../utils/logger';
import { AppError, ErrorCodes } from '../../utils/errors';

export interface CertificateResponse {
  publicKey?: string;
  certificate?: string;
  encryptionAlgorithm?: string;
}

export interface EnrollmentOtpResponse {
  txnId: string;
  message?: string;
}

export interface EnrolByAadhaarResponse {
  txnId: string;
  healthIdNumber?: string;
  jwtResponse?: {
    token: string;
    expiresIn?: number;
    refreshToken?: string;
    refreshExpiresIn?: number;
  };
  name?: string;
  gender?: string;
  birthdate?: string;
  careOf?: string;
  district?: string;
  state?: string;
  pincode?: string;
  photo?: string;
  mobile?: string;
  email?: string;
  new?: boolean;
}

export interface EnrolAbhaAddressResponse {
  txnId: string;
  healthIdNumber?: string;
  preferredAbhaAddress?: string;
}

export interface EnrolByDocumentParams {
  txnId: string;
  documentType: string;
  documentNumber: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  dob: string;
  gender: string;
  address: string;
  districtCode?: string;
  district?: string;
  stateCode?: string;
  state?: string;
  pincode: string;
  mobile?: string;
  frontSidePhoto?: string;
  backSidePhoto?: string;
}

export interface EnrolByDocumentResponse {
  enrolProfile: {
    abhaStatus: string;
    address: string;
    district?: string;
    districtCode?: string;
    dob: string;
    enrolmentNumber: string;
    enrolmentState: string;
    firstName: string;
    gender: string;
    lastName: string;
    middleName?: string;
    mobile: string;
    phrAddress?: string[];
    state?: string;
    stateCode?: string;
  };
  isNew: boolean;
  message?: string;
  jwtResponse?: {
    token: string;
    expiresIn?: number;
    refreshToken?: string;
    refreshExpiresIn?: number;
  };
}

export interface AbhaSearchRecord {
  index: number;
  ABHANumber: string;
  name: string;
  gender: string;
}

export interface AbhaSearchResponseItem {
  txnId: string;
  ABHA: AbhaSearchRecord[];
}

export interface CapturePidResponse {
  txnId?: string;
  [key: string]: any;
}

export interface LoginOtpResponse {
  txnId: string;
  message?: string;
}

export interface LoginVerifyResponse {
  txnId: string;
  jwtResponse?: {
    token: string;
    expiresIn?: number;
    refreshToken?: string;
  };
  healthIdNumber?: string;
  preferredAbhaAddress?: string;
}

export class ABDMAbhaClient {
  private httpClient: AxiosInstance;

  constructor() {
    this.httpClient = createAbdmHttpClient(abdmConfig.abhaBaseUrl, abdmConfig.timeoutMs);
  }

  /**
   * Helper to execute ABHA request with automatic gateway authentication token
   */
  private async executeWithAuth<T>(fn: (token: string) => Promise<T>): Promise<T> {
    let token = await abdmAuthService.getAccessToken();
    try {
      return await fn(token);
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 401) {
        logger.warn('Received 401 from ABDM ABHA endpoint. Retrying with fresh session token...');
        abdmAuthService.invalidateToken();
        token = await abdmAuthService.getAccessToken(true);
        return await fn(token);
      }
      throw err;
    }
  }

  /**
   * Fetch ABDM Public Certificate / Public Key
   * GET /profile/public/certificate
   */
  public async getPublicCertificate(): Promise<string> {
    return this.executeWithAuth(async (token) => {
      logger.info('Fetching ABDM Public Certificate from ABHA endpoint...', {
        url: `${abdmConfig.abhaBaseUrl}${ABDM_ENDPOINTS.PUBLIC_CERTIFICATE}`,
      });

      const response = await this.httpClient.get<CertificateResponse | string>(
        ABDM_ENDPOINTS.PUBLIC_CERTIFICATE,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = response.data;
      if (typeof data === 'string') {
        return data;
      }

      if (data && (data.publicKey || data.certificate)) {
        return data.publicKey || (data.certificate as string);
      }

      throw new AppError({
        message: 'Unexpected public certificate response format from ABDM',
        code: ErrorCodes.ABDM_CERTIFICATE_ERROR,
        statusCode: 502,
        details: data,
      });
    });
  }

  /**
   * Request OTP for ABHA Enrollment (Aadhaar or Mobile)
   * POST /enrollment/request/otp
   */
  public async requestEnrollmentOtp(params: {
    loginHint: 'aadhaar' | 'mobile';
    encryptedLoginId: string;
    txnId?: string;
    otpSystem?: 'aadhaar' | 'abdm';
    scope?: string[];
  }): Promise<EnrollmentOtpResponse> {
    return this.executeWithAuth(async (token) => {
      const scope =
        params.scope ||
        (params.loginHint === 'mobile'
          ? ['abha-enrol', 'mobile-verify']
          : ['abha-enrol']);

      logger.info('Requesting ABHA Enrollment OTP from ABDM...', {
        loginHint: params.loginHint,
        otpSystem: params.otpSystem || (params.loginHint === 'aadhaar' ? 'aadhaar' : 'abdm'),
        scope,
        hasTxnId: !!params.txnId,
      });

      const requestBody: Record<string, any> = {
        scope,
        loginHint: params.loginHint,
        loginId: params.encryptedLoginId,
        otpSystem: params.otpSystem || (params.loginHint === 'aadhaar' ? 'aadhaar' : 'abdm'),
      };
      if (params.txnId) {
        requestBody.txnId = params.txnId;
      }

      const response = await this.httpClient.post<EnrollmentOtpResponse>(
        ABDM_ENDPOINTS.ENROLLMENT_REQUEST_OTP,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    });
  }

  /**
   * Verify Aadhaar OTP and complete ABHA creation
   * POST /enrollment/enrol/byAadhaar
   */
  public async enrolByAadhaar(params: {
    txnId: string;
    encryptedOtp: string;
    mobile?: string;
  }): Promise<EnrolByAadhaarResponse> {
    return this.executeWithAuth(async (token) => {
      logger.info('Submitting OTP to complete ABHA Aadhaar enrollment...', {
        txnId: params.txnId,
        hasMobile: !!params.mobile,
      });

      const otpPayload: Record<string, any> = {
        txnId: params.txnId,
        otpValue: params.encryptedOtp,
      };

      if (params.mobile) {
        otpPayload.mobile = params.mobile;
      }

      const response = await this.httpClient.post<any>(
        ABDM_ENDPOINTS.ENROLLMENT_ENROL_BY_AADHAAR,
        {
          authData: {
            authMethods: ['otp'],
            otp: otpPayload,
          },
          consent: {
            code: 'abha-enrollment',
            version: '1.4',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const rawData = response.data;

      // Map response format (supports both tokens.token and jwtResponse.token, and ABHAProfile)
      const jwtToken = rawData?.tokens?.token || rawData?.jwtResponse?.token;
      const expiresIn = rawData?.tokens?.expiresIn || rawData?.jwtResponse?.expiresIn;
      const refreshToken = rawData?.tokens?.refreshToken || rawData?.jwtResponse?.refreshToken;
      const refreshExpiresIn = rawData?.tokens?.refreshExpiresIn || rawData?.jwtResponse?.refreshExpiresIn;

      const profile = rawData?.ABHAProfile || rawData;
      const healthIdNumber = profile?.ABHANumber || rawData?.healthIdNumber || profile?.healthIdNumber;
      const name =
        profile?.name ||
        [profile?.firstName, profile?.middleName, profile?.lastName].filter(Boolean).join(' ') ||
        rawData?.name;
      const gender = profile?.gender || rawData?.gender;
      const birthdate = profile?.dob || rawData?.birthdate;
      const photo = profile?.photo || profile?.profilePhoto || rawData?.photo;
      const mobile = profile?.mobile || rawData?.mobile;

      return {
        txnId: rawData?.txnId || params.txnId,
        healthIdNumber,
        jwtResponse: jwtToken
          ? {
              token: jwtToken,
              expiresIn,
              refreshToken,
              refreshExpiresIn,
            }
          : undefined,
        name,
        gender,
        birthdate,
        photo,
        mobile,
        careOf: profile?.careOf,
        district: profile?.districtName || profile?.district,
        state: profile?.stateName || profile?.state,
        pincode: profile?.pinCode || profile?.pincode,
        new: rawData?.isNew ?? rawData?.new ?? true,
      };
    });
  }

  /**
   * Request OTP for Mobile Linking during enrollment
   * POST /enrollment/request/otp with scope: ["abha-enrol", "mobile-verify"]
   */
  public async requestMobileLinkingOtp(params: {
    txnId: string;
    encryptedMobile: string;
  }): Promise<{ txnId: string; message: string }> {
    return this.executeWithAuth(async (token) => {
      logger.info('Requesting OTP to link mobile number in enrollment...', { txnId: params.txnId });

      const response = await this.httpClient.post<{ txnId: string; message: string }>(
        ABDM_ENDPOINTS.ENROLLMENT_REQUEST_OTP,
        {
          txnId: params.txnId,
          scope: ['abha-enrol', 'mobile-verify'],
          loginHint: 'mobile',
          loginId: params.encryptedMobile,
          otpSystem: 'abdm',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    });
  }

  /**
   * Verify Mobile OTP during enrollment
   * POST /enrollment/auth/byAbdm
   */
  public async verifyMobileLinkingOtp(params: {
    txnId: string;
    encryptedOtp: string;
  }): Promise<{ txnId: string; authResult: string; message: string; accounts?: any[] }> {
    return this.executeWithAuth(async (token) => {
      logger.info('Verifying mobile linking OTP in enrollment...', { txnId: params.txnId });

      const response = await this.httpClient.post<any>(
        ABDM_ENDPOINTS.ENROLLMENT_AUTH_BY_ABDM,
        {
          scope: ['abha-enrol', 'mobile-verify'],
          authData: {
            authMethods: ['otp'],
            otp: {
              timeStamp: new Date().toISOString(),
              txnId: params.txnId,
              otpValue: params.encryptedOtp,
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    });
  }

  /**
   * Get ABHA Address suggestions for current enrollment transaction
   * GET /enrollment/enrol/suggestion
   */
  public async getAbhaAddressSuggestions(txnId: string): Promise<string[]> {
    return this.executeWithAuth(async (token) => {
      logger.info('Fetching ABHA address suggestions...', { txnId });

      const response = await this.httpClient.get<{ txnId: string; abhaAddressList: string[] }>(
        ABDM_ENDPOINTS.ENROLLMENT_ENROL_SUGGESTION,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Transaction_Id: txnId,
          },
        }
      );

      return response.data?.abhaAddressList || [];
    });
  }

  /**
   * Create custom ABHA Address linked to user
   * POST /enrollment/enrol/abha-address
   */
  public async enrolAbhaAddress(params: {
    txnId: string;
    abhaAddress: string;
    preferred?: number;
  }): Promise<EnrolAbhaAddressResponse> {
    return this.executeWithAuth(async (token) => {
      const cleanAddress = params.abhaAddress.trim().replace(/@(abdm|sbx)$/i, '');

      logger.info('Creating ABHA Address...', {
        txnId: params.txnId,
        abhaAddress: cleanAddress,
      });

      const response = await this.httpClient.post<EnrolAbhaAddressResponse>(
        ABDM_ENDPOINTS.ENROLLMENT_ENROL_ABHA_ADDRESS,
        {
          txnId: params.txnId,
          abhaAddress: cleanAddress,
          preferred: params.preferred ?? 1,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    });
  }

  /**
   * Request OTP for ABHA Login
   * POST /profile/login/request/otp
   */
  public async requestLoginOtp(params: {
    loginHint: 'mobile' | 'aadhaar' | 'abha-number';
    encryptedLoginId: string;
    otpSystem?: string;
  }): Promise<LoginOtpResponse> {
    return this.executeWithAuth(async (token) => {
      logger.info('Requesting ABHA Login OTP...', {
        loginHint: params.loginHint,
      });

      const scope =
        params.loginHint === 'mobile'
          ? ['abha-login', 'mobile-verify']
          : params.loginHint === 'aadhaar'
          ? ['abha-login', 'aadhaar-verify']
          : ['abha-login', params.otpSystem === 'aadhaar' ? 'aadhaar-verify' : 'mobile-verify'];

      const otpSystem =
        params.otpSystem || (params.loginHint === 'aadhaar' ? 'aadhaar' : 'abdm');

      const response = await this.httpClient.post<LoginOtpResponse>(
        ABDM_ENDPOINTS.LOGIN_REQUEST_OTP,
        {
          scope,
          loginHint: params.loginHint,
          loginId: params.encryptedLoginId,
          otpSystem,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    });
  }

  /**
   * Verify ABHA Login OTP
   * POST /profile/login/verify
   */
  public async verifyLoginOtp(params: {
    txnId: string;
    encryptedOtp: string;
    scope?: string[];
  }): Promise<LoginVerifyResponse> {
    return this.executeWithAuth(async (token) => {
      logger.info('Verifying ABHA Login OTP...', {
        txnId: params.txnId,
      });

      const scope = params.scope || ['abha-login', 'mobile-verify'];

      const response = await this.httpClient.post<LoginVerifyResponse>(
        ABDM_ENDPOINTS.LOGIN_VERIFY,
        {
          scope,
          txnId: params.txnId,
          authData: {
            authMethods: ['otp'],
            otp: {
              txnId: params.txnId,
              otpValue: params.encryptedOtp,
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    });
  }

  /**
   * Fetch authenticated user's ABHA account profile
   * GET /profile/account
   */
  public async getAccountProfile(userToken: string): Promise<any> {
    return this.executeWithAuth(async (gatewayToken) => {
      logger.info('Retrieving user ABHA profile from ABDM...');

      const xToken = userToken.startsWith('Bearer ') ? userToken : `Bearer ${userToken}`;

      const response = await this.httpClient.get(ABDM_ENDPOINTS.ACCOUNT_PROFILE, {
        headers: {
          Authorization: `Bearer ${gatewayToken}`,
          'X-token': xToken,
        },
      });

      return response.data;
    });
  }

  /**
   * Download user's ABHA Card
   * GET /profile/account/abha-card
   */
  public async downloadAbhaCard(userToken: string): Promise<any> {
    return this.executeWithAuth(async (gatewayToken) => {
      logger.info('Downloading user ABHA card from ABDM...');

      const xToken = userToken.startsWith('Bearer ') ? userToken : `Bearer ${userToken}`;

      const response = await this.httpClient.get(ABDM_ENDPOINTS.ACCOUNT_ABHA_CARD, {
        headers: {
          Authorization: `Bearer ${gatewayToken}`,
          'X-token': xToken,
        },
        responseType: 'arraybuffer',
      });

      return response.data;
    });
  }

  /**
   * Search ABHA profiles by mobile number
   * POST /profile/account/abha/search
   */
  public async searchAbhaByMobile(encryptedMobile: string): Promise<AbhaSearchResponseItem[]> {
    return this.executeWithAuth(async (token) => {
      logger.info('Searching ABHA profiles by mobile...');

      const response = await this.httpClient.post<AbhaSearchResponseItem[]>(
        ABDM_ENDPOINTS.ACCOUNT_ABHA_SEARCH,
        {
          scope: ['search-abha'],
          mobile: encryptedMobile,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            BENEFIT_NAME: 'healthid api',
          },
        }
      );

      return response.data;
    });
  }

  /**
   * Request Face Auth OTP/Authentication for selected ABHA index
   * POST /profile/login/request/otp
   */
  public async requestFaceAuthLogin(params: {
    txnId: string;
    encryptedIndex: string;
    scope?: string[];
  }): Promise<LoginOtpResponse> {
    return this.executeWithAuth(async (token) => {
      logger.info('Requesting Face Auth login for ABHA index...', {
        txnId: params.txnId,
      });

      const response = await this.httpClient.post<LoginOtpResponse>(
        ABDM_ENDPOINTS.LOGIN_REQUEST_OTP,
        {
          scope: params.scope || ['abha-login', 'search-abha', 'qr-verify'],
          loginHint: 'index',
          loginId: params.encryptedIndex,
          otpSystem: 'aadhaar',
          txnId: params.txnId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    });
  }

  /**
   * Capture PID for Face Auth (UIDAI RD Service Integration)
   * POST /enrollment/enrol/capturePID
   */
  public async capturePid(params: {
    txnId: string;
    scope: string[];
  }): Promise<CapturePidResponse> {
    return this.executeWithAuth(async (token) => {
      logger.info('Calling capturePID for Face Auth...', {
        txnId: params.txnId,
        scope: params.scope,
      });

      const response = await this.httpClient.post<CapturePidResponse>(
        ABDM_ENDPOINTS.ENROLLMENT_CAPTURE_PID,
        {
          scope: params.scope,
          txnId: params.txnId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    });
  }

  /**
   * Verify Face Auth PID for ABHA Login
   * POST /profile/login/verify
   */
  public async verifyFaceLogin(params: {
    txnId: string;
    faceAuthPid: string;
    scope?: string[];
  }): Promise<any> {
    return this.executeWithAuth(async (token) => {
      logger.info('Verifying Face Auth PID for ABHA Login...', {
        txnId: params.txnId,
      });

      const response = await this.httpClient.post<any>(
        ABDM_ENDPOINTS.LOGIN_VERIFY,
        {
          scope: params.scope || ['abha-login', 'aadhaar-face-verify'],
          authData: {
            authMethods: ['face'],
            face: {
              txnId: params.txnId,
              faceAuthPid: params.faceAuthPid,
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    });
  }

  /**
   * Initialize Transaction for Face Auth ABHA Creation
   * POST /enrollment/enrol/auth/init
   */
  public async initEnrollmentAuth(scope?: string[]): Promise<{ txnId: string }> {
    return this.executeWithAuth(async (token) => {
      logger.info('Initializing Face Auth Enrollment Transaction...');

      const response = await this.httpClient.post<{ txnId: string }>(
        ABDM_ENDPOINTS.ENROLLMENT_AUTH_INIT,
        {
          scope: scope || ['abha-enrol', 'face-verify'],
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    });
  }

  /**
   * Create ABHA Account via Face Auth PID & Aadhaar
   * POST /enrollment/enrol/byAadhaar
   */
  public async enrolByFace(params: {
    encryptedAadhaar: string;
    rdPidData: string;
    mobile: string;
  }): Promise<EnrolByAadhaarResponse> {
    return this.executeWithAuth(async (token) => {
      logger.info('Enrolling ABHA by Face Auth and Aadhaar...');

      const response = await this.httpClient.post<any>(
        ABDM_ENDPOINTS.ENROLLMENT_ENROL_BY_AADHAAR,
        {
          authData: {
            authMethods: ['face'],
            face: {
              aadhaar: params.encryptedAadhaar,
              rdPidData: params.rdPidData,
              mobile: params.mobile,
            },
          },
          consent: {
            code: 'abha-enrollment',
            version: '1.4',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const rawData = response.data;
      const jwtToken = rawData?.tokens?.token || rawData?.jwtResponse?.token;
      const expiresIn = rawData?.tokens?.expiresIn || rawData?.jwtResponse?.expiresIn;
      const refreshToken = rawData?.tokens?.refreshToken || rawData?.jwtResponse?.refreshToken;
      const refreshExpiresIn = rawData?.tokens?.refreshExpiresIn || rawData?.jwtResponse?.refreshExpiresIn;

      const profile = rawData?.ABHAProfile || rawData;
      const healthIdNumber = profile?.ABHANumber || rawData?.healthIdNumber || profile?.healthIdNumber;
      const name =
        profile?.name ||
        [profile?.firstName, profile?.middleName, profile?.lastName].filter(Boolean).join(' ') ||
        rawData?.name;

      return {
        txnId: rawData?.txnId,
        healthIdNumber,
        jwtResponse: jwtToken
          ? {
              token: jwtToken,
              expiresIn,
              refreshToken,
              refreshExpiresIn,
            }
          : undefined,
        name,
        gender: profile?.gender || rawData?.gender,
        birthdate: profile?.dob || rawData?.birthdate,
        photo: profile?.photo || profile?.profilePhoto || rawData?.photo,
        mobile: profile?.mobile || rawData?.mobile,
        careOf: profile?.careOf,
        district: profile?.districtName || profile?.district,
        state: profile?.stateName || profile?.state,
        pincode: profile?.pinCode || profile?.pincode,
        new: rawData?.isNew ?? rawData?.new ?? true,
      };
    });
  }

  /**
   * Request OTP for Driving Licence (DL) Enrollment
   * POST /enrollment/request/otp with scope: ["abha-enrol", "dl-flow"]
   */
  public async requestDlEnrollmentOtp(params: {
    encryptedMobile: string;
    txnId?: string;
  }): Promise<EnrollmentOtpResponse> {
    return this.requestEnrollmentOtp({
      loginHint: 'mobile',
      encryptedLoginId: params.encryptedMobile,
      txnId: params.txnId,
      otpSystem: 'abdm',
      scope: ['abha-enrol', 'mobile-verify', 'dl-flow'],
    });
  }

  /**
   * Verify Mobile OTP for Driving Licence (DL) Enrollment
   * POST /enrollment/auth/byAbdm with scope: ["abha-enrol", "mobile-verify", "dl-flow"]
   */
  public async verifyDlOtp(params: {
    txnId: string;
    encryptedOtp: string;
  }): Promise<{ txnId: string; authResult: string; message: string; accounts?: any[] }> {
    return this.executeWithAuth(async (token) => {
      logger.info('Verifying OTP for DL based enrollment...', { txnId: params.txnId });

      const response = await this.httpClient.post<any>(
        ABDM_ENDPOINTS.ENROLLMENT_AUTH_BY_ABDM,
        {
          scope: ['abha-enrol', 'mobile-verify', 'dl-flow'],
          authData: {
            authMethods: ['otp'],
            otp: {
              timeStamp: new Date().toISOString(),
              txnId: params.txnId,
              otpValue: params.encryptedOtp,
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    });
  }

  /**
   * Create Enrolment Number via Document (Driving Licence)
   * POST /enrollment/enrol/byDocument
   */
  public async enrolByDocument(params: EnrolByDocumentParams): Promise<EnrolByDocumentResponse> {
    return this.executeWithAuth(async (token) => {
      logger.info('Submitting document details to complete DL enrollment...', {
        txnId: params.txnId,
        documentType: params.documentType,
        gender: params.gender,
        dob: params.dob,
      });

      const payload: Record<string, any> = {
        documentType: params.documentType || 'DRIVING_LICENCE',
        documentId: params.documentNumber,
        documentNumber: params.documentNumber,
        txnId: params.txnId,
        firstName: params.firstName,
        middleName: params.middleName || '',
        lastName: params.lastName || '',
        dob: params.dob,
        gender: params.gender,
        address: params.address,
        districtCode: params.districtCode || '',
        district: params.district || '',
        stateCode: params.stateCode || '',
        state: params.state || '',
        pinCode: params.pincode,
        pincode: params.pincode,
        mobile: params.mobile,
        consent: {
          code: 'abha-enrollment',
          version: '1.4',
        },
      };

      const cleanBase64 = (str?: string) =>
        str ? str.replace(/^data:image\/[a-z]+;base64,/, '').trim() : undefined;

      if (params.frontSidePhoto) {
        payload.frontSidePhoto = cleanBase64(params.frontSidePhoto);
      }
      if (params.backSidePhoto) {
        payload.backSidePhoto = cleanBase64(params.backSidePhoto);
      }

      const response = await this.httpClient.post<any>(
        ABDM_ENDPOINTS.ENROLLMENT_ENROL_BY_DOCUMENT,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const raw = response.data;
      const enrolProfile = raw?.enrolProfile || raw;
      const jwtToken = raw?.tokens?.token || raw?.jwtResponse?.token;

      return {
        enrolProfile: {
          abhaStatus: enrolProfile?.abhaStatus || 'ACTIVE',
          address: enrolProfile?.address || params.address,
          district: enrolProfile?.district,
          districtCode: enrolProfile?.districtCode || params.districtCode,
          dob: enrolProfile?.dob || params.dob,
          enrolmentNumber: enrolProfile?.enrolmentNumber || enrolProfile?.ABHANumber || raw?.enrolmentNumber,
          enrolmentState: enrolProfile?.enrolmentState || 'PROVISIONAL',
          firstName: enrolProfile?.firstName || params.firstName,
          gender: enrolProfile?.gender || params.gender,
          lastName: enrolProfile?.lastName || params.lastName || '',
          middleName: enrolProfile?.middleName || params.middleName || '',
          mobile: enrolProfile?.mobile || params.mobile || '',
          phrAddress: enrolProfile?.phrAddress || [],
          state: enrolProfile?.state,
          stateCode: enrolProfile?.stateCode || params.stateCode,
        },
        isNew: raw?.isNew ?? raw?.new ?? true,
        message: raw?.message || 'Account enrolled successfully via Document',
        jwtResponse: jwtToken
          ? {
              token: jwtToken,
              expiresIn: raw?.tokens?.expiresIn || raw?.jwtResponse?.expiresIn,
              refreshToken: raw?.tokens?.refreshToken || raw?.jwtResponse?.refreshToken,
              refreshExpiresIn: raw?.tokens?.refreshExpiresIn || raw?.jwtResponse?.refreshExpiresIn,
            }
          : undefined,
      };
    });
  }
}

export const abdmAbhaClient = new ABDMAbhaClient();
