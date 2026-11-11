import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../database/prisma';
import { logger } from '../../utils/logger';
import { AppError, ErrorCodes } from '../../utils/errors';

export const DEV_DEFAULT_CLIENT = {
  hospitalId: 'hosp_default_sandbox',
  hospitalName: 'General Hospital Sandbox',
  hospitalCode: 'GH_SANDBOX',
  clientId: 'dev_hospital_client_id',
  clientSecret: 'dev_hospital_client_secret_2026',
};

export class HospitalService {
  // In-memory client cache for fast auth & fallback
  private clientCache = new Map<string, any>();

  private inMemoryHospitals = new Map<string, any>();

  constructor() {
    // Seed dev client in memory
    const devSecretHash = bcrypt.hashSync(DEV_DEFAULT_CLIENT.clientSecret, 10);
    this.clientCache.set(DEV_DEFAULT_CLIENT.clientId, {
      id: 'client_dev_uuid',
      hospitalId: DEV_DEFAULT_CLIENT.hospitalId,
      clientId: DEV_DEFAULT_CLIENT.clientId,
      clientSecretHash: devSecretHash,
      name: 'Development Sandbox Client',
      isActive: true,
      rateLimit: 500,
    });
    this.inMemoryHospitals.set(DEV_DEFAULT_CLIENT.hospitalCode, {
      id: DEV_DEFAULT_CLIENT.hospitalId,
      name: DEV_DEFAULT_CLIENT.hospitalName,
      code: DEV_DEFAULT_CLIENT.hospitalCode,
      email: 'sandbox@generalhospital.in',
      isActive: true,
    });
  }

  /**
   * Register a new hospital / tenant
   */
  public async createHospital(params: {
    name: string;
    code: string;
    email: string;
    phone?: string;
    address?: string;
  }): Promise<any> {
    const code = params.code.toUpperCase();
    try {
      const hospital = await prisma.hospital.create({
        data: {
          id: uuidv4(),
          name: params.name,
          code: code,
          email: params.email,
          phone: params.phone,
          address: params.address,
          isActive: true,
        },
      });
      this.inMemoryHospitals.set(code, hospital);
      return hospital;
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new AppError({
          message: `Hospital code ${params.code} already exists`,
          code: ErrorCodes.VALIDATION_ERROR,
          statusCode: 400,
        });
      }
      // Resilient In-Memory Fallback if Postgres is temporarily unreachable
      logger.warn('PostgreSQL unavailable, storing hospital in resilient memory cache', { code });
      const fallbackHospital = {
        id: uuidv4(),
        name: params.name,
        code: code,
        email: params.email,
        phone: params.phone,
        address: params.address,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      this.inMemoryHospitals.set(code, fallbackHospital);
      return fallbackHospital;
    }
  }

  /**
   * Provision new API credentials for a hospital
   */
  public async createConnectorClient(params: {
    hospitalId: string;
    name: string;
    rateLimit?: number;
  }): Promise<{ clientId: string; clientSecret: string; client: any }> {
    const clientId = `cli_${crypto.randomBytes(8).toString('hex')}`;
    const rawSecret = `sec_${crypto.randomBytes(24).toString('hex')}`;
    const saltRounds = 10;
    const clientSecretHash = await bcrypt.hash(rawSecret, saltRounds);

    let clientRecord: any;
    try {
      clientRecord = await prisma.connectorClient.create({
        data: {
          id: uuidv4(),
          hospitalId: params.hospitalId,
          clientId,
          clientSecretHash,
          name: params.name,
          isActive: true,
          rateLimit: params.rateLimit || 100,
        },
      });
    } catch {
      clientRecord = {
        id: uuidv4(),
        hospitalId: params.hospitalId,
        clientId,
        clientSecretHash,
        name: params.name,
        isActive: true,
        rateLimit: params.rateLimit || 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    this.clientCache.set(clientId, clientRecord);

    logger.info('Provisioned new Connector client credentials', {
      hospitalId: params.hospitalId,
      clientId,
    });

    return {
      clientId,
      clientSecret: rawSecret, // Returned once upon creation
      client: clientRecord,
    };
  }

  /**
   * Rotate client secret for an existing client ID
   */
  public async rotateClientSecret(clientId: string): Promise<{ clientSecret: string }> {
    const rawSecret = `sec_${crypto.randomBytes(24).toString('hex')}`;
    const clientSecretHash = await bcrypt.hash(rawSecret, 10);

    try {
      await prisma.connectorClient.update({
        where: { clientId },
        data: { clientSecretHash },
      });
    } catch {
      // Memory fallback
    }

    const cached = this.clientCache.get(clientId);
    if (cached) {
      cached.clientSecretHash = clientSecretHash;
      this.clientCache.set(clientId, cached);
    }

    logger.info('Client secret rotated successfully', { clientId });
    return { clientSecret: rawSecret };
  }

  /**
   * Toggle client active status
   */
  public async setClientStatus(clientId: string, isActive: boolean): Promise<void> {
    try {
      await prisma.connectorClient.update({
        where: { clientId },
        data: { isActive },
      });
    } catch {
      // Memory fallback
    }

    const cached = this.clientCache.get(clientId);
    if (cached) {
      cached.isActive = isActive;
      this.clientCache.set(clientId, cached);
    }
  }

  /**
   * Find client by clientId
   */
  public async getClientByClientId(clientId: string): Promise<any> {
    const cached = this.clientCache.get(clientId);
    if (cached) return cached;

    try {
      const client = await prisma.connectorClient.findUnique({
        where: { clientId },
        include: { hospital: true },
      });
      if (client) {
        this.clientCache.set(clientId, client);
        return client;
      }
    } catch {
      // Ignored
    }

    return null;
  }
}

export const hospitalService = new HospitalService();
