import { env } from './env';

export interface ABDMConfig {
  env: 'sandbox' | 'production';
  clientId: string;
  clientSecret: string;
  gatewayBaseUrl: string;
  abhaBaseUrl: string;
  facilityBaseUrl: string;
  hidBaseUrl: string;
  hprBaseUrl: string;
  cmId: string;
  timeoutMs: number;
}

export const abdmConfig: ABDMConfig = {
  env: env.ABDM_ENV,
  clientId: env.ABDM_CLIENT_ID,
  clientSecret: env.ABDM_CLIENT_SECRET,
  gatewayBaseUrl: env.ABDM_GATEWAY_BASE_URL.replace(/\/+$/, ''),
  abhaBaseUrl: env.ABDM_ABHA_BASE_URL.replace(/\/+$/, ''),
  facilityBaseUrl: env.ABDM_ENV === 'production'
    ? 'https://facility.abdm.gov.in'
    : 'https://facilitysbx.abdm.gov.in',
  hidBaseUrl: env.ABDM_ENV === 'production'
    ? 'https://healthid.abdm.gov.in/api'
    : 'https://healthidsbx.abdm.gov.in/api',
  hprBaseUrl: env.ABDM_ENV === 'production'
    ? 'https://apihsp.abdm.gov.in/v4/int'
    : 'https://apihspsbx.abdm.gov.in/v4/int',
  cmId: env.ABDM_CM_ID,
  timeoutMs: 30000, // 30 seconds HTTP timeout
};

export const ABDM_ENDPOINTS = {
  // Gateway V3 Session & Config
  GATEWAY_SESSIONS: '/gateway/v3/sessions',
  GATEWAY_CERTS: '/gateway/v3/certs',
  GATEWAY_OPENID_CONFIG: '/gateway/v3/.well-known/openid-configuration',

  // Bridge Registration & Services
  GATEWAY_BRIDGE_URL: '/gateway/v3/bridge/url',
  GATEWAY_BRIDGE_SERVICES: '/gateway/v3/bridge-services',
  GATEWAY_BRIDGE_SERVICE_BY_ID: '/gateway/v3/bridge-service/serviceId',
  FACILITY_HRP_SERVICES: '/v1/bridges/MutipleHRPAddUpdateServices',

  // Scan and Share V3
  PATIENT_SHARE_ON_SHARE: '/patient-share/v3/on-share',
  PATIENT_SHARE_RUNNING_TOKEN_STATUS: '/patient-share/v3/running-token/status',
  PATIENT_SHARE_RUNNING_TOKEN_ON_STATUS: '/patient-share/v3/running-token/on-status',
  HIP_PATIENT_SHARE_CALLBACK: '/api/v3/hip/patient/share',
  HIP_RUNNING_TOKEN_STATUS_CALLBACK: '/api/v3/hip/patient-share/running-token/status',

  // ABHA Profile & Public Certificate
  PUBLIC_CERTIFICATE: '/profile/public/certificate',
  ACCOUNT_PROFILE: '/profile/account',
  ACCOUNT_ABHA_CARD: '/profile/account/abha-card',
  ACCOUNT_ABHA_SEARCH: '/profile/account/abha/search',
  EMAIL_VERIFICATION_LINK: '/profile/account/request/emailVerificationLink',

  // ABHA Enrollment V3
  ENROLLMENT_REQUEST_OTP: '/enrollment/request/otp',
  ENROLLMENT_AUTH_INIT: '/enrollment/enrol/auth/init',
  ENROLLMENT_CAPTURE_PID: '/enrollment/enrol/capturePID',
  ENROLLMENT_ENROL_BY_AADHAAR: '/enrollment/enrol/byAadhaar',
  ENROLLMENT_ENROL_BY_DOCUMENT: '/enrollment/enrol/byDocument',
  ENROLLMENT_AUTH_BY_ABDM: '/enrollment/auth/byAbdm',
  ENROLLMENT_ENROL_SUGGESTION: '/enrollment/enrol/suggestion',
  ENROLLMENT_ENROL_ABHA_ADDRESS: '/enrollment/enrol/abha-address',

  // ABHA Login V3
  LOGIN_REQUEST_OTP: '/profile/login/request/otp',
  LOGIN_VERIFY: '/profile/login/verify',

  // HIP Linking & Care Contexts V3
  LINK_TOKEN_GENERATE: '/v3/token/generate-token',
  HIP_LINK_CARE_CONTEXT: '/hip/v3/link/carecontext',
  HIP_LINK_CONTEXT_NOTIFY: '/hip/v3/link/context/notify',
  HIP_LINK_SMS_NOTIFY: '/hip/v3/link/patient/links/sms/notify2',

  // User-Initiated Linking V3 (Outbound responses to Gateway)
  USER_LINKING_ON_DISCOVER: '/user-initiated-linking/v3/patient/care-context/on-discover',
  USER_LINKING_ON_INIT: '/user-initiated-linking/v3/link/care-context/on-init',
  USER_LINKING_ON_CONFIRM: '/user-initiated-linking/v3/link/care-context/on-confirm',

  // Data Transfer & Consents V3
  CONSENT_HIP_ON_NOTIFY: '/consent/v3/request/hip/on-notify',
  DATA_FLOW_HIP_ON_REQUEST: '/data-flow/v3/health-information/hip/on-request',
  DATA_FLOW_NOTIFY: '/data-flow/v3/health-information/notify',

  // Milestone 3: HIU (Health Information User) Endpoints V3
  HIU_CONSENT_REQUEST_INIT: '/consent/v3/request/init',
  HIU_CONSENT_REQUEST_STATUS: '/consent/v3/request/status',
  HIU_CONSENT_ON_NOTIFY: '/consent/v3/request/hiu/on-notify',
  HIU_CONSENT_FETCH: '/consent/v3/fetch',
  HIU_HEALTH_INFORMATION_REQUEST: '/data-flow/v3/health-information/request',
  HIU_HEALTH_INFORMATION_NOTIFY: '/data-flow/v3/health-information/notify',
};
