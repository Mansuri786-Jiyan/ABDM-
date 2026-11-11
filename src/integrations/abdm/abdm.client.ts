import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { generateRequestId } from '../../utils/request-id';
import { generateUtcTimestamp } from '../../utils/timestamp';
import { logger } from '../../utils/logger';
import { AppError, ErrorCodes } from '../../utils/errors';

export function createAbdmHttpClient(baseURL: string, timeoutMs = 30000): AxiosInstance {
  const instance = axios.create({
    baseURL,
    timeout: timeoutMs,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  // Request Interceptor
  instance.interceptors.request.use(
    (config) => {
      if (!config.headers['REQUEST-ID']) {
        config.headers['REQUEST-ID'] = generateRequestId();
      }
      if (!config.headers['TIMESTAMP']) {
        config.headers['TIMESTAMP'] = generateUtcTimestamp();
      }

      logger.debug('ABDM Outgoing Request', {
        method: config.method?.toUpperCase(),
        url: `${config.baseURL || ''}${config.url || ''}`,
        requestId: config.headers['REQUEST-ID'],
        timestamp: config.headers['TIMESTAMP'],
      });

      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response Interceptor
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      logger.debug('ABDM Incoming Response', {
        status: response.status,
        url: response.config.url,
        requestId: response.config.headers?.['REQUEST-ID'],
      });
      return response;
    },
    (error: AxiosError) => {
      const config = error.config;
      const response = error.response;
      const status = response?.status;
      const requestId = config?.headers?.['REQUEST-ID'] as string | undefined;

      // Check timeout
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        logger.error('ABDM Gateway Request Timed Out', {
          url: config?.url,
          requestId,
          timeoutMs,
        });
        throw new AppError({
          message: 'ABDM service timed out. Please try again later.',
          statusCode: 504,
          code: ErrorCodes.ABDM_GATEWAY_TIMEOUT,
        });
      }

      // Check network connectivity
      if (!response) {
        logger.error('ABDM Network Connection Failed', {
          url: config?.url,
          requestId,
          errorMessage: error.message,
        });
        throw new AppError({
          message: `Unable to connect to ABDM service (${error.message})`,
          statusCode: 503,
          code: ErrorCodes.ABDM_SERVICE_UNAVAILABLE,
        });
      }

      let responseData: any = response.data || {};
      if (Buffer.isBuffer(responseData)) {
        try {
          responseData = JSON.parse(responseData.toString('utf8'));
        } catch {
          responseData = responseData.toString('utf8');
        }
      }
      const abdmErrorCode = responseData?.code || responseData?.error?.code || `HTTP_${status}`;
      const abdmErrorMessage =
        responseData?.message ||
        responseData?.error?.message ||
        responseData?.details?.[0]?.message ||
        error.message;

      logger.warn('ABDM API Error Response', {
        status,
        abdmErrorCode,
        abdmErrorMessage,
        requestId,
        url: config?.url,
      });

      let code: string = ErrorCodes.ABDM_API_ERROR;
      if (status === 401) code = ErrorCodes.ABDM_AUTH_ERROR;
      else if (status === 429) code = ErrorCodes.ABDM_RATE_LIMIT;
      else if (status === 502) code = ErrorCodes.ABDM_BAD_GATEWAY;
      else if (status === 503 || status === 504) code = ErrorCodes.ABDM_SERVICE_UNAVAILABLE;

      throw new AppError({
        message: abdmErrorMessage || `ABDM error response (Status ${status})`,
        statusCode: status,
        code,
        originalAbdmCode: abdmErrorCode,
        details: responseData,
      });
    }
  );

  return instance;
}
