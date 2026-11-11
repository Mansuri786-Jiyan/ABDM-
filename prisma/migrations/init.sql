-- CreateTable
CREATE TABLE IF NOT EXISTS "hospitals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL UNIQUE,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "connector_clients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hospitalId" TEXT NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
    "clientId" TEXT NOT NULL UNIQUE,
    "clientSecretHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rateLimit" INTEGER NOT NULL DEFAULT 100,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "abdm_configurations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hospitalId" TEXT NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
    "env" TEXT NOT NULL DEFAULT 'sandbox',
    "clientId" TEXT NOT NULL,
    "clientSecretEncrypted" TEXT NOT NULL,
    "gatewayUrl" TEXT NOT NULL,
    "abhaUrl" TEXT NOT NULL,
    "cmId" TEXT NOT NULL DEFAULT 'sbx',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "abdm_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "configurationId" TEXT REFERENCES "abdm_configurations"("id") ON DELETE SET NULL,
    "tokenType" TEXT NOT NULL DEFAULT 'bearer',
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresIn" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "abha_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hospitalId" TEXT NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
    "clientId" TEXT NOT NULL REFERENCES "connector_clients"("id") ON DELETE CASCADE,
    "patientReferenceId" TEXT,
    "abdmTxnId" TEXT,
    "operationType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INITIATED',
    "healthIdNumber" TEXT,
    "abhaAddress" TEXT,
    "userToken" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "abha_patient_references" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hospitalId" TEXT NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
    "patientReferenceId" TEXT NOT NULL,
    "abdmTxnId" TEXT,
    "healthIdNumber" TEXT,
    "abhaAddress" TEXT,
    "name" TEXT,
    "gender" TEXT,
    "dob" TEXT,
    "mobile" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "abha_patient_references_hospitalId_patientReferenceId_key" UNIQUE ("hospitalId", "patientReferenceId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hospitalId" TEXT REFERENCES "hospitals"("id") ON DELETE SET NULL,
    "clientId" TEXT REFERENCES "connector_clients"("id") ON DELETE SET NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "requestIp" TEXT,
    "userAgent" TEXT,
    "executionTimeMs" INTEGER NOT NULL,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS "connector_clients_hospitalId_idx" ON "connector_clients"("hospitalId");
CREATE INDEX IF NOT EXISTS "connector_clients_clientId_idx" ON "connector_clients"("clientId");
CREATE INDEX IF NOT EXISTS "abdm_configurations_hospitalId_idx" ON "abdm_configurations"("hospitalId");
CREATE INDEX IF NOT EXISTS "abdm_configurations_env_idx" ON "abdm_configurations"("env");
CREATE INDEX IF NOT EXISTS "abdm_tokens_expiresAt_idx" ON "abdm_tokens"("expiresAt");
CREATE INDEX IF NOT EXISTS "abdm_tokens_isActive_idx" ON "abdm_tokens"("isActive");
CREATE INDEX IF NOT EXISTS "abha_transactions_hospitalId_idx" ON "abha_transactions"("hospitalId");
CREATE INDEX IF NOT EXISTS "abha_transactions_abdmTxnId_idx" ON "abha_transactions"("abdmTxnId");
CREATE INDEX IF NOT EXISTS "abha_transactions_status_idx" ON "abha_transactions"("status");
CREATE INDEX IF NOT EXISTS "abha_transactions_patientReferenceId_idx" ON "abha_transactions"("patientReferenceId");
CREATE INDEX IF NOT EXISTS "abha_patient_references_healthIdNumber_idx" ON "abha_patient_references"("healthIdNumber");
CREATE INDEX IF NOT EXISTS "abha_patient_references_abhaAddress_idx" ON "abha_patient_references"("abhaAddress");
CREATE INDEX IF NOT EXISTS "audit_logs_hospitalId_idx" ON "audit_logs"("hospitalId");
CREATE INDEX IF NOT EXISTS "audit_logs_endpoint_idx" ON "audit_logs"("endpoint");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
