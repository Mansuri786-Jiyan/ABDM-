import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ABDM M1 Connector API Specification',
      version: '1.0.0',
      description: `
### Production-Grade ABDM V3 Milestone 1 Connector Service

This connector acts as a secure intermediary between Hospital Information Management Systems (HMIS) and the official National Health Authority (NHA) Ayushman Bharat Digital Mission (ABDM) V3 APIs.

#### Key Architectural Principles:
1. **Zero ABDM Credential Exposure:** Hospital applications never see or handle ABDM Client ID, Client Secret, or ABDM Gateway session tokens.
2. **Standardized Restful Interface:** Simplifies complex ABDM RSA OAEP SHA-1 encryption and stateful multi-step enrollment workflows into intuitive REST endpoints.
3. **Transaction Management:** Tracks every workflow through an internal transaction ID alongside official ABDM transaction IDs.
4. **Tenant Isolation & Security:** Provides dedicated API keys and rate limiting for each hospital system.
      `,
      contact: {
        name: 'ABDM Connector Integration Team',
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'STEP 1: Hospital Client Authentication & Bearer Token Generation',
      },
      {
        name: 'ABHA',
        description: 'STEP 2: ABDM Public Encryption Certificate & Key Handshake',
      },
      {
        name: 'Scan and Share',
        description: 'STEP 3: Milestone 1 - Scan & Share Token Management & Queue',
      },
      {
        name: 'Scan and Share Webhook',
        description: 'STEP 3b: Milestone 1 - Gateway Profile Share Webhook Callback',
      },
      {
        name: 'ABHA Enrollment',
        description: 'STEP 4: Milestone 1 - ABHA Generation via Aadhaar / Mobile OTP',
      },
      {
        name: 'ABHA Login & Verification',
        description: 'STEP 5: Milestone 1 - Search & Verify Existing ABHA',
      },
      {
        name: 'ABHA Face Auth',
        description: 'STEP 6: Milestone 1 - Biometric & Face Authentication',
      },
      {
        name: 'HIP Care Context Linking',
        description: 'STEP 7: Milestone 2 - Patient Discovery & Care Context Linking',
      },
      {
        name: 'HIP Consent & Data Transfer',
        description: 'STEP 8: Milestone 2 - HIP Health Information Transfer (FHIR Data)',
      },
      {
        name: 'Milestone 3 - HIU',
        description: 'STEP 9: Milestone 3 - Doctor Consent Request & Records Fetching',
      },
      {
        name: 'Bridge Management',
        description: 'STEP 10: NHA Bridge Registration & Status Verification',
      },
    ],
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Connector JWT token obtained from POST /api/v1/auth/token',
        },
        ClientCredentials: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Client-Id',
          description: 'Hospital Client ID header paired with X-Client-Secret',
        },
      },
      schemas: {
        StandardSuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
          },
        },
        StandardErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            code: { type: 'string', example: 'ABDM_AUTH_ERROR' },
            message: { type: 'string', example: 'Unable to authenticate with ABDM' },
            transactionId: { type: 'string', format: 'uuid', example: '8f7a9d30-b184-482a-a92c-5b2382c0b621' },
            details: { type: 'object' },
          },
        },
      },
    },
  },
  apis: ['./src/modules/**/*.routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
