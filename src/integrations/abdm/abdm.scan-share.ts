import { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { abdmConfig, ABDM_ENDPOINTS } from '../../config/abdm.config';
import { createAbdmHttpClient } from './abdm.client';
import { abdmAuthService } from './abdm.auth';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';

export interface ProfileSharePayload {
  intent: string;
  metaData: {
    hipId: string;
    context?: string;
    hprId?: string;
    latitude?: string;
    longitude?: string;
  };
  profile: {
    patient: {
      abhaNumber?: string;
      abhaAddress?: string;
      name: string;
      gender: string;
      dayOfBirth?: string;
      monthOfBirth?: string;
      yearOfBirth?: string;
      address?: {
        line?: string;
        district?: string | null;
        state?: string | null;
        pinCode?: string | null;
      };
      phoneNumber?: string;
    };
  };
}

export interface OnShareAcknowledgmentParams {
  requestId: string;
  abhaAddress: string;
  tokenNumber: string;
  context?: string;
  expiry?: string;
  status?: 'SUCCESS' | 'FAILED';
  error?: {
    code: string;
    message: string;
  };
}

export class ABDMScanShareClient {
  private gatewayClient: AxiosInstance;
  private facilityClient: AxiosInstance;

  constructor() {
    this.gatewayClient = createAbdmHttpClient(abdmConfig.gatewayBaseUrl, abdmConfig.timeoutMs);
    this.facilityClient = createAbdmHttpClient(abdmConfig.facilityBaseUrl, abdmConfig.timeoutMs);
  }

  /**
   * Helper to execute request with automatic ABDM session token
   */
  private async executeWithAuth<T>(fn: (token: string) => Promise<T>): Promise<T> {
    let token = await abdmAuthService.getAccessToken();
    try {
      return await fn(token);
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 401) {
        logger.warn('Received 401 from ABDM Gateway. Invalidate token and retry...');
        abdmAuthService.invalidateToken();
        token = await abdmAuthService.getAccessToken(true);
        return await fn(token);
      }
      throw err;
    }
  }

  /**
   * Update Bridge Callback URL on ABDM Gateway
   * PATCH /gateway/v3/bridge/url
   */
  public async updateBridgeUrl(url: string): Promise<any> {
    return this.executeWithAuth(async (token) => {
      logger.info('Updating ABDM Bridge Callback URL...', { url });

      const response = await this.gatewayClient.patch(
        ABDM_ENDPOINTS.GATEWAY_BRIDGE_URL,
        { url },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-CM-ID': abdmConfig.cmId,
          },
        }
      );

      return {
        status: response.status,
        message: 'Bridge URL updated successfully',
      };
    });
  }

  /**
   * Register Facility Bridge Services (HIP / HIU)
   * POST https://facilitysbx.abdm.gov.in/v1/bridges/MutipleHRPAddUpdateServices
   */
  public async registerBridgeServices(params: {
    facilityId: string;
    facilityName: string;
    hrp: Array<{
      bridgeId: string;
      hipName: string;
      type: 'HIP' | 'HIU';
      active: boolean;
    }>;
  }): Promise<any> {
    return this.executeWithAuth(async (token) => {
      logger.info('Registering Bridge Services with Facility Registry...', {
        facilityId: params.facilityId,
        facilityName: params.facilityName,
      });

      const response = await this.facilityClient.post(
        ABDM_ENDPOINTS.FACILITY_HRP_SERVICES,
        {
          facilityId: params.facilityId,
          facilityName: params.facilityName,
          HRP: params.hrp,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    });
  }

  /**
   * Find Bridge Service by Service ID
   * GET /gateway/v3/bridge-service/serviceId/:serviceId
   */
  public async findBridgeServiceById(serviceId: string): Promise<any> {
    return this.executeWithAuth(async (token) => {
      logger.info('Finding Bridge Service by Service ID...', { serviceId });

      const response = await this.gatewayClient.get(
        `${ABDM_ENDPOINTS.GATEWAY_BRIDGE_SERVICE_BY_ID}/${serviceId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-CM-ID': abdmConfig.cmId,
          },
        }
      );

      return response.data;
    });
  }

  /**
   * Find Services by Bridge ID
   * GET /gateway/v3/bridge-services/:bridgeId
   */
  public async findServicesByBridgeId(bridgeId?: string): Promise<any> {
    return this.executeWithAuth(async (token) => {
      const targetBridgeId = bridgeId || abdmConfig.clientId;
      logger.info('Finding Services by Bridge ID...', { bridgeId: targetBridgeId });

      const url = targetBridgeId
        ? `${ABDM_ENDPOINTS.GATEWAY_BRIDGE_SERVICES}/${targetBridgeId}`
        : ABDM_ENDPOINTS.GATEWAY_BRIDGE_SERVICES;

      const response = await this.gatewayClient.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-CM-ID': abdmConfig.cmId,
        },
      });

      return response.data;
    });
  }

  /**
   * Send Scan and Share on-share Acknowledgment to ABDM Gateway
   * POST /patient-share/v3/on-share
   */
  public async sendOnShareAcknowledgment(params: OnShareAcknowledgmentParams): Promise<any> {
    return this.executeWithAuth(async (token) => {
      logger.info('Sending profile-on-share acknowledgment to ABDM Gateway...', {
        requestId: params.requestId,
        abhaAddress: params.abhaAddress,
        tokenNumber: params.tokenNumber,
      });

      const body: Record<string, any> = {
        acknowledgement: {
          status: params.status || 'SUCCESS',
          abhaAddress: params.abhaAddress,
          profile: {
            context: params.context || '1',
            tokenNumber: params.tokenNumber,
            expiry: params.expiry || '1800',
          },
        },
        response: {
          requestId: params.requestId,
        },
      };

      if (params.error) {
        body.error = params.error;
      }

      const response = await this.gatewayClient.post(
        ABDM_ENDPOINTS.PATIENT_SHARE_ON_SHARE,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-CM-ID': abdmConfig.cmId,
          },
        }
      );

      return response.data;
    });
  }

  /**
   * Fetch ABDM Gateway Public Certs
   * GET /gateway/v3/certs
   */
  public async getGatewayCerts(): Promise<any> {
    const response = await this.gatewayClient.get(ABDM_ENDPOINTS.GATEWAY_CERTS, {
      headers: {
        'X-CM-ID': abdmConfig.cmId,
      },
    });
    return response.data;
  }

  /**
   * Fetch Gateway OpenID Configuration
   * GET /gateway/v3/.well-known/openid-configuration
   */
  public async getOpenIdConfig(): Promise<any> {
    const response = await this.gatewayClient.get(ABDM_ENDPOINTS.GATEWAY_OPENID_CONFIG, {
      headers: {
        'X-CM-ID': abdmConfig.cmId,
      },
    });
    return response.data;
  }

  /**
   * Request Running Token Status from ABDM Gateway
   * POST /patient-share/v3/running-token/status
   */
  public async requestRunningTokenStatus(params: {
    hipId: string;
    context: string;
    hiuId?: string;
    userAuthToken?: string;
  }): Promise<any> {
    return this.executeWithAuth(async (token) => {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'X-CM-ID': abdmConfig.cmId,
        'REQUEST-ID': uuidv4(),
        TIMESTAMP: new Date().toISOString(),
      };

      if (params.hiuId) {
        headers['X-HIU-ID'] = params.hiuId;
      }
      if (params.userAuthToken) {
        headers['X-AUTH-TOKEN'] = params.userAuthToken;
      }

      const response = await this.gatewayClient.post(
        ABDM_ENDPOINTS.PATIENT_SHARE_RUNNING_TOKEN_STATUS,
        {
          hipId: params.hipId,
          context: params.context,
        },
        { headers }
      );

      return response.data;
    });
  }

  /**
   * Send Running Token on-status update to ABDM Gateway
   * POST /patient-share/v3/running-token/on-status
   */
  public async sendRunningTokenOnStatus(params: {
    hipId: string;
    context: string;
    runningTokenNumber: string;
    averageTokenServiceTimeInMinutes: number;
    originalRequestId?: string;
  }): Promise<any> {
    return this.executeWithAuth(async (token) => {
      const body = {
        token: {
          hipId: params.hipId,
          context: params.context,
          runningTokenNumber: params.runningTokenNumber,
          averageTokenServiceTimeInMinutes: params.averageTokenServiceTimeInMinutes,
        },
        response: {
          requestId: params.originalRequestId || uuidv4(),
        },
      };

      const response = await this.gatewayClient.post(
        ABDM_ENDPOINTS.PATIENT_SHARE_RUNNING_TOKEN_ON_STATUS,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-CM-ID': abdmConfig.cmId,
            'REQUEST-ID': uuidv4(),
            TIMESTAMP: new Date().toISOString(),
          },
        }
      );

      return response.data;
    });
  }
}

export const abdmScanShareClient = new ABDMScanShareClient();
