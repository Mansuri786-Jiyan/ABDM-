# ABDM Milestone 1 (M1) Connector Backend

A production-oriented, standalone Node.js (TypeScript) backend service that integrates directly with official **Ayushman Bharat Digital Mission (ABDM) V3 APIs** for Milestone 1 (M1).

The backend acts as an intermediary between hospital management systems (HMIS / EMR), healthcare applications, and ABDM Sandbox/Production environments.

---

## 1. Features & Capabilities

* **Exclusively ABDM V3 APIs:** Official V3 session authentication, profile encryption certificate retrieval, Aadhaar enrollment, ABHA address assignment, login verification, and profile management.
* **Zero Credential Exposure:** Hospital systems never handle raw ABDM credentials or session tokens.
* **RSA OAEP SHA-1 Encryption:** Native implementation of `RSA/ECB/OAEPWithSHA-1AndMGF1Padding` using Node.js `crypto`.
* **Single-Flight Concurrency Mutex:** Prevents duplicate concurrent authentication calls to ABDM Gateway.
* **Auto Token Renewal & Invalidation:** Automatically renews tokens 60s before expiration and recovers gracefully on 401.
* **Stateful Transaction Management:** Tracks every enrollment and login workflow via internal UUIDs correlated with ABDM `txnId`.
* **Zero Sensitive Data Logging:** Automatic redaction of Aadhaar numbers, OTPs, tokens, and secrets in logs.
* **Swagger / OpenAPI Documentation:** Interactive documentation at `/api-docs`.
* **Docker Ready:** Multi-stage Dockerfile and Docker Compose with PostgreSQL 16.

---

## 2. Technology Stack

* **Runtime:** Node.js 22+
* **Framework:** Express.js 4.x
* **Language:** TypeScript 5.x (Strict mode)
* **Database & ORM:** PostgreSQL + Prisma ORM
* **HTTP Client:** Axios with custom interceptors for `REQUEST-ID` and UTC `TIMESTAMP`
* **Cryptography:** Native Node.js `crypto` (RSA OAEP SHA-1 / MGF1)
* **Validation:** Zod schemas
* **Authentication:** JWT & bcryptjs for Hospital Clients
* **Logging:** Winston with automated sensitive data redaction
* **Testing:** Vitest

---

## 3. Getting Started

### 3.1 Prerequisites
* Node.js v22+
* pnpm, npm, or yarn
* PostgreSQL 16 (or Docker)

### 3.2 Environment Configuration
Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure your credentials in `.env`:

```env
ABDM_ENV=sandbox
ABDM_CLIENT_ID=your_abdm_sandbox_client_id
ABDM_CLIENT_SECRET=your_abdm_sandbox_client_secret
ABDM_GATEWAY_BASE_URL=https://dev.abdm.gov.in/api/hiecm
ABDM_ABHA_BASE_URL=https://abhasbx.abdm.gov.in/abha/api/v3
ABDM_CM_ID=sbx

DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/abdm_connector?schema=public
PORT=4000
JWT_SECRET=super_secret_jwt_key_abdm_connector_2026
```

### 3.3 Install Dependencies
```bash
pnpm install
```

### 3.4 Database Setup & Seed
If using local PostgreSQL:
```bash
# Push schema to database
pnpm prisma db push

# Seed initial hospital and development client
pnpm prisma:seed
```

Or using Docker Compose:
```bash
docker compose up -d
```

### 3.5 Run the Service
Development mode (with hot-reload):
```bash
pnpm dev
```

Production build & start:
```bash
pnpm build
pnpm start
```

* Service Health: [http://localhost:4000/health](http://localhost:4000/health)
* Swagger API Documentation: [http://localhost:4000/api-docs](http://localhost:4000/api-docs)

---

## 4. Default Development Credentials

For testing without additional setup, the seed script provisions:

* **Hospital Client ID:** `dev_hospital_client_id`
* **Hospital Client Secret:** `dev_hospital_client_secret_2026`

Authenticate via:
```bash
curl -X POST http://localhost:4000/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"clientId": "dev_hospital_client_id", "clientSecret": "dev_hospital_client_secret_2026"}'
```

---

## 5. Running Tests

Run all unit and integration tests:
```bash
pnpm test
```

Run unit tests only:
```bash
pnpm test:unit
```

Run integration tests against ABDM Sandbox:
```bash
pnpm test:integration
```

---

## 6. Project Architecture

```
src/
├── config/             # Environment, ABDM, and Database configs
├── database/prisma/    # Prisma client singleton and connection manager
├── integrations/abdm/  # Official ABDM V3 Gateway and ABHA API clients
├── middleware/         # Auth, request logger, error handler
├── modules/
│   ├── abha/           # Controller, service, routes, Zod schemas for M1
│   ├── auth/           # Hospital client JWT authentication
│   ├── encryption/     # RSA OAEP SHA-1/MGF1 encryption service
│   ├── hospital/       # Hospital and client management
│   └── transactions/   # Multi-step transaction state machine
├── swagger/            # OpenAPI 3.0 specification
├── utils/              # Request ID, UTC timestamp, Logger, AppError
├── app.ts              # Express application assembly
└── server.ts           # HTTP server bootstrap and graceful shutdown
```

---

## 7. Documentation

* [Architecture Documentation](docs/architecture.md)
* [ABDM M1 Integration Workflow](docs/abdm-m1-workflow.md)
* [API Reference](docs/api-reference.md)
* [Security Considerations](docs/security-considerations.md)
* [Sandbox Testing Report](docs/sandbox-testing-report.md)
* [Postman Collection](docs/postman_collection.json)
# ABDM-
