import { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { abdmConfig, ABDM_ENDPOINTS } from '../../config/abdm.config';
import { createAbdmHttpClient } from './abdm.client';
import { abdmAuthService } from './abdm.auth';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';

export interface CareContextItem {
  referenceNumber: string;
  display: string;
}

export interface PatientCareContextEntry {
  referenceNumber: string;
  display: string;
  careContexts: CareContextItem[];
  hiType: string;
  count: number;
}

export class ABDMHipLinkingClient {
  private gatewayClient: AxiosInstance;

  constructor() {
    this.gatewayClient = createAbdmHttpClient(abdmConfig.gatewayBaseUrl, abdmConfig.timeoutMs);
  }

  private async executeWithAuth<T>(fn: (token: string) => Promise<T>): Promise<T> {
    let token = await abdmAuthService.getAccessToken();
    try {
      return await fn(token);
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 401) {
        logger.warn('Received 401 from ABDM Gateway in HIP Linking. Retrying with fresh session...');
        abdmAuthService.invalidateToken();
        token = await abdmAuthService.getAccessToken(true);
        return await fn(token);
      }
      throw err;
    }
  }

  /**
   * 1. Generate Link Token
   * POST /v3/token/generate-token
   */
  public async generateLinkToken(params: {
    abhaNumber?: string;
    abhaAddress?: string;
    name: string;
    gender: string;
    yearOfBirth: number;
    hipId: string;
  }): Promise<{ linkToken: string; [key: string]: any }> {
    return this.executeWithAuth(async (token) => {
      logger.info('Generating ABDM Link Token...', { hipId: params.hipId, name: params.name });

      const requestId = uuidv4();
      const headers = {
        Authorization: `Bearer ${token}`,
        'REQUEST-ID': requestId,
        TIMESTAMP: new Date().toISOString(),
        'X-HIP-ID': params.hipId,
        'X-CM-ID': abdmConfig.cmId,
      };

      const body: Record<string, any> = {
        name: params.name,
        gender: params.gender,
        yearOfBirth: params.yearOfBirth,
      };

      if (params.abhaNumber) {
        const cleanNum = params.abhaNumber.replace(/[^0-9]/g, '');
        body.abhaNumber = Number(cleanNum) || cleanNum;
      }
      if (params.abhaAddress) body.abhaAddress = params.abhaAddress;

      const response = await this.gatewayClient.post(
        ABDM_ENDPOINTS.LINK_TOKEN_GENERATE,
        body,
        { headers }
      );

      // NHA V3 returns 202 Accepted with empty body (""). Deliver clear asynchronous acknowledgment.
      if (!response.data || response.data === '') {
        return {
          status: 'REQUEST_ACCEPTED',
          statusCode: response.status || 202,
          requestId,
          message: 'Link token request successfully accepted by ABDM Gateway (HTTP 202). NHA dispatches the token asynchronously to bridge callback /api/v3/hip/token/on-generate-token.',
          hipId: params.hipId,
          abhaAddress: params.abhaAddress,
        };
      }

      return response.data;
    });
  }

  /**
   * 2. HIP-Initiated Care Context Linking
   * POST /hip/v3/link/carecontext
   */
  public async linkCareContext(params: {
    hipId: string;
    linkToken: string;
    abhaNumber?: string;
    abhaAddress?: string;
    patient: PatientCareContextEntry[];
  }): Promise<any> {
    return this.executeWithAuth(async (token) => {
      logger.info('Submitting HIP-initiated Care Context Linking...', {
        hipId: params.hipId,
        patientCount: params.patient.length,
      });

      const headers = {
        Authorization: `Bearer ${token}`,
        'REQUEST-ID': uuidv4(),
        TIMESTAMP: new Date().toISOString(),
        'X-HIP-ID': params.hipId,
        'X-LINK-TOKEN': params.linkToken,
        'X-CM-ID': abdmConfig.cmId,
      };

      const body: Record<string, any> = {
        patient: params.patient,
      };

      if (params.abhaNumber) {
        const cleanNum = params.abhaNumber.replace(/[^0-9]/g, '');
        body.abhaNumber = Number(cleanNum) || cleanNum;
      }
      if (params.abhaAddress) body.abhaAddress = params.abhaAddress;

      const response = await this.gatewayClient.post(
        ABDM_ENDPOINTS.HIP_LINK_CARE_CONTEXT,
        body,
        { headers }
      );

      return (
        response.data || {
          status: 'ACCEPTED',
          statusCode: response.status || 202,
          message: 'Care contexts link request successfully accepted by ABDM Gateway',
          hipId: params.hipId,
          patientReference: params.patient[0]?.referenceNumber,
        }
      );
    });
  }

  /**
   * 3. Link Care Context Notify
   * POST /hip/v3/link/context/notify
   */
  public async notifyCareContext(params: {
    hipId: string;
    linkToken: string;
    abhaAddress: string;
    patientReference: string;
    careContextReference: string;
    hiTypes?: string[];
    date?: string;
  }): Promise<any> {
    return this.executeWithAuth(async (token) => {
      logger.info('Sending Care Context Link Notification...', {
        hipId: params.hipId,
        careContextRef: params.careContextReference,
      });

      const headers = {
        Authorization: `Bearer ${token}`,
        'REQUEST-ID': uuidv4(),
        TIMESTAMP: new Date().toISOString(),
        'X-HIP-ID': params.hipId,
        'X-LINK-TOKEN': params.linkToken,
        'X-CM-ID': abdmConfig.cmId,
      };

      const body = {
        notification: {
          patient: {
            id: params.abhaAddress,
          },
          careContext: {
            patientReference: params.patientReference,
            careContextReference: params.careContextReference,
          },
          hiTypes: params.hiTypes || ['Prescription', 'OPConsultation'],
          date: params.date || new Date().toISOString(),
          hip: {
            id: params.hipId,
          },
        },
      };

      const response = await this.gatewayClient.post(
        ABDM_ENDPOINTS.HIP_LINK_CONTEXT_NOTIFY,
        body,
        { headers }
      );

      return response.data;
    });
  }

  /**
   * 4. SMS Deep Link Notification
   * POST /hip/v3/link/patient/links/sms/notify2
   */
  public async sendSmsDeepLink(params: {
    hipId: string;
    hipName: string;
    phoneNo: string;
  }): Promise<any> {
    return this.executeWithAuth(async (token) => {
      logger.info('Sending SMS Deep Link Notification...', {
        hipId: params.hipId,
        phoneNo: params.phoneNo.slice(0, 4) + '****',
      });

      const headers = {
        Authorization: `Bearer ${token}`,
        'REQUEST-ID': uuidv4(),
        TIMESTAMP: new Date().toISOString(),
        'X-CM-ID': abdmConfig.cmId,
      };

      const body = {
        requestId: uuidv4(),
        timestamp: new Date().toISOString(),
        notification: {
          phoneNo: params.phoneNo,
          hip: {
            name: params.hipName,
            id: params.hipId,
          },
        },
      };

      const response = await this.gatewayClient.post(
        ABDM_ENDPOINTS.HIP_LINK_SMS_NOTIFY,
        body,
        { headers }
      );

      return response.data;
    });
  }

  /**
   * 5. User-Initiated Linking: on-discover Callback
   * POST /user-initiated-linking/v3/patient/care-context/on-discover
   */
  public async sendOnDiscover(params: {
    transactionId: string;
    patient: any;
    matchedBy?: string[];
    requestId: string;
  }): Promise<any> {
    return this.executeWithAuth(async (token) => {
      const outgoingReqId = uuidv4();
      const timestamp = new Date().toISOString();
      const headers = {
        Authorization: `Bearer ${token}`,
        'REQUEST-ID': outgoingReqId,
        TIMESTAMP: timestamp,
        'X-CM-ID': abdmConfig.cmId,
      };

      // V3 specification: patient must be a single object, not an array
      const patientSource = Array.isArray(params.patient) ? params.patient[0] : params.patient;
      const formattedPatient = patientSource
        ? {
            referenceNumber: patientSource.referenceNumber,
            display: patientSource.display,
            careContexts: (patientSource.careContexts || []).map((c: any) => ({
              referenceNumber: c.referenceNumber,
              display: c.display,
              hiType: c.hiType || patientSource.hiType || 'OPConsultation',
            })),
          }
        : null;

      const body = {
        requestId: outgoingReqId,
        timestamp,
        transactionId: params.transactionId,
        patient: formattedPatient,
        matchedBy: params.matchedBy || ['MOBILE'],
        response: {
          requestId: params.requestId,
        },
      };

      const response = await this.gatewayClient.post(
        ABDM_ENDPOINTS.USER_LINKING_ON_DISCOVER,
        body,
        { headers }
      );

      return response.data || { status: 'ACCEPTED', statusCode: response.status || 202 };
    });
  }

  /**
   * 6. User-Initiated Linking: on-init Callback
   * POST /user-initiated-linking/v3/link/care-context/on-init
   */
  public async sendOnInit(params: {
    transactionId: string;
    referenceNumber: string;
    authenticationType?: string;
    communicationMedium?: string;
    communicationHint?: string;
    communicationExpiry?: string;
    requestId: string;
  }): Promise<any> {
    return this.executeWithAuth(async (token) => {
      const headers = {
        Authorization: `Bearer ${token}`,
        'REQUEST-ID': uuidv4(),
        TIMESTAMP: new Date().toISOString(),
        'X-CM-ID': abdmConfig.cmId,
      };

      const body = {
        transactionId: params.transactionId,
        link: {
          referenceNumber: params.referenceNumber,
          authenticationType: params.authenticationType || 'DIRECT',
          meta: {
            communicationMedium: params.communicationMedium || 'MOBILE',
            communicationHint: params.communicationHint || 'OTP',
            communicationExpiry:
              params.communicationExpiry ||
              new Date(Date.now() + 15 * 60000).toISOString(),
          },
        },
        response: {
          requestId: params.requestId,
        },
      };

      const response = await this.gatewayClient.post(
        ABDM_ENDPOINTS.USER_LINKING_ON_INIT,
        body,
        { headers }
      );

      return response.data;
    });
  }

  /**
   * 7. User-Initiated Linking: on-confirm Callback
   * POST /user-initiated-linking/v3/link/care-context/on-confirm
   */
  public async sendOnConfirm(params: {
    patient: PatientCareContextEntry[];
    requestId: string;
  }): Promise<any> {
    return this.executeWithAuth(async (token) => {
      const headers = {
        Authorization: `Bearer ${token}`,
        'REQUEST-ID': uuidv4(),
        TIMESTAMP: new Date().toISOString(),
        'X-CM-ID': abdmConfig.cmId,
      };

      const body = {
        patient: params.patient,
        response: {
          requestId: params.requestId,
        },
      };

      const response = await this.gatewayClient.post(
        ABDM_ENDPOINTS.USER_LINKING_ON_CONFIRM,
        body,
        { headers }
      );

      return response.data;
    });
  }

  /**
   * 8. Consent HIP: on-notify Callback
   * POST /consent/v3/request/hip/on-notify
   */
  public async sendConsentOnNotify(params: {
    consentId: string;
    status: 'GRANTED' | 'REVOKED' | 'EXPIRED';
    requestId: string;
  }): Promise<any> {
    return this.executeWithAuth(async (token) => {
      const headers = {
        Authorization: `Bearer ${token}`,
        'REQUEST-ID': uuidv4(),
        TIMESTAMP: new Date().toISOString(),
        'X-CM-ID': abdmConfig.cmId,
      };

      const body = {
        acknowledgement: {
          status: params.status,
          consentId: params.consentId,
        },
        response: {
          requestId: params.requestId,
        },
      };

      const response = await this.gatewayClient.post(
        ABDM_ENDPOINTS.CONSENT_HIP_ON_NOTIFY,
        body,
        { headers }
      );

      return response.data;
    });
  }

  /**
   * 9. Health Information Request: on-request Callback
   * POST /data-flow/v3/health-information/hip/on-request
   */
  public async sendHealthInfoOnRequest(params: {
    transactionId: string;
    sessionStatus?: string;
    requestId: string;
  }): Promise<any> {
    return this.executeWithAuth(async (token) => {
      const headers = {
        Authorization: `Bearer ${token}`,
        'REQUEST-ID': uuidv4(),
        TIMESTAMP: new Date().toISOString(),
        'X-CM-ID': abdmConfig.cmId,
      };

      const body = {
        hiRequest: {
          transactionId: params.transactionId,
          sessionStatus: params.sessionStatus || 'ACKNOWLEDGED',
        },
        response: {
          requestId: params.requestId,
        },
      };

      const response = await this.gatewayClient.post(
        ABDM_ENDPOINTS.DATA_FLOW_HIP_ON_REQUEST,
        body,
        { headers }
      );

      return response.data;
    });
  }

  /**
   * 10. Data Flow Notification: notify Callback
   * POST /data-flow/v3/health-information/notify
   */
  public async sendDataFlowNotification(params: {
    consentId: string;
    transactionId: string;
    hipId: string;
    sessionStatus?: string;
    statusResponses: Array<{
      careContextReference: string;
      hiStatus: string;
      description?: string;
    }>;
  }): Promise<any> {
    return this.executeWithAuth(async (token) => {
      const headers = {
        Authorization: `Bearer ${token}`,
        'REQUEST-ID': uuidv4(),
        TIMESTAMP: new Date().toISOString(),
        'X-CM-ID': abdmConfig.cmId,
      };

      const body = {
        notification: {
          consentId: params.consentId,
          transactionId: params.transactionId,
          doneAt: new Date().toISOString(),
          notifier: {
            type: 'HIP',
            id: params.hipId,
          },
          statusNotification: {
            sessionStatus: params.sessionStatus || 'TRANSFERRED',
            hipId: params.hipId,
            statusResponses: params.statusResponses,
          },
        },
      };

      const response = await this.gatewayClient.post(
        ABDM_ENDPOINTS.DATA_FLOW_NOTIFY,
        body,
        { headers }
      );

      return response.data;
    });
  }
}

export const abdmHipLinkingClient = new ABDMHipLinkingClient();
