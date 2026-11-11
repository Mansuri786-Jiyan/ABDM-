import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { abdmScanShareClient, ProfileSharePayload } from '../../integrations/abdm/abdm.scan-share';
import { logger } from '../../utils/logger';
import { AppError, ErrorCodes } from '../../utils/errors';

export interface ScanShareTokenRecord {
  id: string;
  tokenNumber: string;
  context: string;
  requestId: string;
  hipId: string;
  abhaNumber?: string;
  abhaAddress?: string;
  name: string;
  gender: string;
  dob?: string;
  phoneNumber?: string;
  address?: {
    line?: string;
    district?: string | null;
    state?: string | null;
    pinCode?: string | null;
  };
  status: 'WAITING' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
  patientReferenceId?: string;
  paymentStatus?: 'PENDING' | 'PAID' | 'EXEMPTED' | 'FAILED';
  paymentAmount?: number;
  paymentTransactionId?: string;
  paymentMode?: 'UPI_QR' | 'CASH' | 'CARD' | 'NET_BANKING';
  paidAt?: string;
  createdAt: string;
  expiresAt: string;
}

export interface RunningTokenRecord {
  hipId: string;
  context: string;
  runningTokenNumber: string;
  averageTokenServiceTimeInMinutes: number;
  updatedAt: string;
}

export class ScanShareService {
  private tokens = new Map<string, ScanShareTokenRecord>();
  private runningTokens = new Map<string, RunningTokenRecord>();
  private cacheFilePath = path.join(process.cwd(), '.scan-share-cache.json');
  private dailyCounter = 1;

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const raw = fs.readFileSync(this.cacheFilePath, 'utf8');
        const data = JSON.parse(raw);

        if (data.tokens && typeof data.tokens === 'object') {
          for (const [key, val] of Object.entries(data.tokens)) {
            this.tokens.set(key, val as ScanShareTokenRecord);
          }
          if (data.runningTokens && typeof data.runningTokens === 'object') {
            for (const [key, val] of Object.entries(data.runningTokens)) {
              this.runningTokens.set(key, val as RunningTokenRecord);
            }
          }
        } else {
          // Legacy flat map format
          for (const [key, val] of Object.entries(data)) {
            this.tokens.set(key, val as ScanShareTokenRecord);
          }
        }

        // Set dailyCounter to max existing token + 1
        let maxNum = 0;
        for (const t of this.tokens.values()) {
          const n = parseInt(t.tokenNumber, 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
        this.dailyCounter = maxNum + 1;
      }
    } catch (err: any) {
      logger.debug('Could not load scan-share cache from disk:', err.message);
    }
  }

  private saveToDisk(): void {
    try {
      const obj: Record<string, any> = {
        tokens: Object.fromEntries(this.tokens.entries()),
        runningTokens: Object.fromEntries(this.runningTokens.entries()),
      };
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err: any) {
      logger.debug('Could not save scan-share cache to disk:', err.message);
    }
  }

  /**
   * Handle incoming ABDM Gateway profile-share callback
   * POST /api/v3/hip/patient/share
   */
  public async handleProfileShare(
    requestId: string,
    payload: ProfileSharePayload
  ): Promise<{ tokenNumber: string; abhaAddress?: string; context: string; expiry: string }> {
    const p = payload.profile?.patient;
    if (!p) {
      throw new AppError({
        message: 'Invalid profile-share payload: patient details missing',
        statusCode: 400,
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    const tokenNumber = String(this.dailyCounter++);
    const context = payload.metaData?.context || '1';
    const expirySeconds = 1800; // 30 minutes
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expirySeconds * 1000).toISOString();

    // Construct DOB string
    let dob: string | undefined = undefined;
    if (p.yearOfBirth) {
      dob = [p.dayOfBirth || '01', p.monthOfBirth || '01', p.yearOfBirth].join('-');
    }

    const record: ScanShareTokenRecord = {
      id: uuidv4(),
      tokenNumber,
      context,
      requestId,
      hipId: payload.metaData?.hipId || '',
      abhaNumber: p.abhaNumber ? String(p.abhaNumber) : undefined,
      abhaAddress: p.abhaAddress,
      name: p.name,
      gender: p.gender,
      dob,
      phoneNumber: p.phoneNumber,
      address: p.address,
      status: 'WAITING',
      createdAt: now.toISOString(),
      expiresAt,
    };

    this.tokens.set(tokenNumber, record);
    this.saveToDisk();

    logger.info('Scan & Share: patient profile received and token assigned', {
      tokenNumber,
      name: p.name,
      abhaAddress: p.abhaAddress,
      hipId: payload.metaData?.hipId,
    });

    // Send asynchronous profile-on-share acknowledgment to ABDM Gateway
    try {
      await abdmScanShareClient.sendOnShareAcknowledgment({
        requestId,
        abhaAddress: p.abhaAddress || '',
        tokenNumber,
        context,
        expiry: String(expirySeconds),
        status: 'SUCCESS',
      });
    } catch (err: any) {
      logger.warn('Failed to send on-share acknowledgment to ABDM Gateway:', {
        error: err.message,
        requestId,
      });
    }

    return {
      tokenNumber,
      abhaAddress: p.abhaAddress,
      context,
      expiry: String(expirySeconds),
    };
  }

  /**
   * Get all active / waiting tokens for hospital reception queue
   */
  public getQueue(status?: string): ScanShareTokenRecord[] {
    const list: ScanShareTokenRecord[] = [];
    const now = new Date().getTime();

    for (const item of this.tokens.values()) {
      // Check expiry
      if (item.status === 'WAITING' && new Date(item.expiresAt).getTime() < now) {
        item.status = 'EXPIRED';
      }

      if (!status || item.status.toLowerCase() === status.toLowerCase()) {
        list.push(item);
      }
    }

    // Sort by tokenNumber ascending
    return list.sort((a, b) => parseInt(a.tokenNumber, 10) - parseInt(b.tokenNumber, 10));
  }

  /**
   * Get specific token by token number
   */
  public getTokenByNumber(tokenNumber: string): ScanShareTokenRecord {
    const token = this.tokens.get(tokenNumber);
    if (!token) {
      throw new AppError({
        message: `Token #${tokenNumber} not found in active queue`,
        statusCode: 404,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    // Check expiry
    if (token.status === 'WAITING' && new Date(token.expiresAt).getTime() < Date.now()) {
      token.status = 'EXPIRED';
      this.saveToDisk();
    }

    return token;
  }

  /**
   * Scan & Pay: Generate UPI QR / Payment Intent for OPD Token
   */
  public initiatePayment(params: {
    tokenNumber: string;
    amount: number;
    description?: string;
    doctorName?: string;
    department?: string;
  }): any {
    const token = this.getTokenByNumber(params.tokenNumber);
    const amount = Number(params.amount) || 100;
    const invoiceNumber = 'INV-' + uuidv4().substring(0, 8).toUpperCase();
    const upiPayload = `upi://pay?pa=hospital@upi&pn=City%20Hospital&am=${amount}&cu=INR&tn=OPD_Token_${params.tokenNumber}_${invoiceNumber}`;

    token.paymentStatus = 'PENDING';
    token.paymentAmount = amount;
    this.saveToDisk();

    return {
      tokenNumber: params.tokenNumber,
      invoiceNumber,
      amount,
      currency: 'INR',
      status: 'PENDING',
      patientName: token.name,
      abhaAddress: token.abhaAddress,
      upiString: upiPayload,
      description: params.description || 'OPD Doctor Consultation Fee',
      doctorName: params.doctorName || 'Dr. General Physician',
      department: params.department || 'General Medicine',
    };
  }

  /**
   * Scan & Pay: Confirm payment receipt (Webhook or Counter submission)
   */
  public confirmPayment(params: {
    tokenNumber: string;
    transactionId: string;
    amount?: number;
    paymentMode?: 'UPI_QR' | 'CASH' | 'CARD';
  }): any {
    const token = this.getTokenByNumber(params.tokenNumber);
    token.paymentStatus = 'PAID';
    token.paymentAmount = Number(params.amount) || token.paymentAmount || 100;
    token.paymentTransactionId = params.transactionId;
    token.paymentMode = params.paymentMode || 'UPI_QR';
    token.paidAt = new Date().toISOString();
    this.saveToDisk();

    logger.info('Scan & Pay: Payment confirmed for OPD token', {
      tokenNumber: params.tokenNumber,
      transactionId: params.transactionId,
      amount: token.paymentAmount,
    });

    return {
      success: true,
      tokenNumber: params.tokenNumber,
      paymentStatus: 'PAID',
      transactionId: params.transactionId,
      amount: token.paymentAmount,
      paidAt: token.paidAt,
      patientName: token.name,
      abhaAddress: token.abhaAddress,
    };
  }

  /**
   * Scan & Pay: Generate printable payment receipt
   */
  public getPaymentReceipt(tokenNumber: string): any {
    const token = this.getTokenByNumber(tokenNumber);
    return {
      receiptNumber: 'REC-' + (token.paymentTransactionId || uuidv4().substring(0, 8)).toUpperCase(),
      tokenNumber: token.tokenNumber,
      patientName: token.name,
      abhaAddress: token.abhaAddress || 'N/A',
      abhaNumber: token.abhaNumber || 'N/A',
      amount: token.paymentAmount || 100,
      currency: 'INR',
      paymentStatus: token.paymentStatus || 'UNPAID',
      paymentMode: token.paymentMode || 'N/A',
      transactionId: token.paymentTransactionId || 'N/A',
      paidAt: token.paidAt || 'N/A',
      hospitalName: 'Mohan Hospital Haryana',
    };
  }

  /**
   * Mark token as registered / completed by hospital receptionist
   */
  public completeToken(
    tokenNumber: string,
    patientReferenceId?: string
  ): ScanShareTokenRecord {
    const token = this.getTokenByNumber(tokenNumber);
    token.status = 'COMPLETED';
    if (patientReferenceId) {
      token.patientReferenceId = patientReferenceId;
    }
    this.saveToDisk();

    logger.info('Scan & Share: Token completed / patient registered in HMIS', {
      tokenNumber,
      patientReferenceId,
    });

    return token;
  }

  /**
   * Bridge URL Management
   */
  public async updateBridgeUrl(url: string): Promise<any> {
    return abdmScanShareClient.updateBridgeUrl(url);
  }

  /**
   * Bridge Facility Services Registration
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
    return abdmScanShareClient.registerBridgeServices(params);
  }

  /**
   * Find Bridge Service by ID
   */
  public async findBridgeServiceById(serviceId: string): Promise<any> {
    return abdmScanShareClient.findBridgeServiceById(serviceId);
  }

  /**
   * Find Services by Bridge ID
   */
  public async findServicesByBridgeId(bridgeId?: string): Promise<any> {
    return abdmScanShareClient.findServicesByBridgeId(bridgeId);
  }

  /**
   * Gateway Certs & OpenID Config
   */
  public async getGatewayCerts(): Promise<any> {
    return abdmScanShareClient.getGatewayCerts();
  }

  public async getOpenIdConfig(): Promise<any> {
    return abdmScanShareClient.getOpenIdConfig();
  }

  /**
   * Update Running Token for a Counter / Department
   * Stores locally and dispatches POST /patient-share/v3/running-token/on-status to ABDM Gateway
   */
  public async updateRunningToken(params: {
    hipId: string;
    context: string;
    runningTokenNumber: string;
    averageTokenServiceTimeInMinutes?: number;
    notifyGateway?: boolean;
    requestId?: string;
  }): Promise<RunningTokenRecord> {
    const record: RunningTokenRecord = {
      hipId: params.hipId,
      context: params.context || '1',
      runningTokenNumber: params.runningTokenNumber,
      averageTokenServiceTimeInMinutes: params.averageTokenServiceTimeInMinutes ?? 2,
      updatedAt: new Date().toISOString(),
    };

    this.runningTokens.set(record.context, record);
    this.saveToDisk();

    logger.info('Scan & Share: Running token updated for counter', {
      hipId: record.hipId,
      context: record.context,
      runningTokenNumber: record.runningTokenNumber,
      avgMinutes: record.averageTokenServiceTimeInMinutes,
    });

    // Notify ABDM Gateway asynchronously
    if (params.notifyGateway !== false) {
      abdmScanShareClient
        .sendRunningTokenOnStatus({
          hipId: record.hipId,
          context: record.context,
          runningTokenNumber: record.runningTokenNumber,
          averageTokenServiceTimeInMinutes: record.averageTokenServiceTimeInMinutes,
          originalRequestId: params.requestId,
        })
        .then(() => {
          logger.info('Running token on-status successfully delivered to ABDM Gateway', {
            context: record.context,
            runningTokenNumber: record.runningTokenNumber,
          });
        })
        .catch((err) => {
          logger.warn('Failed to publish running token on-status to ABDM Gateway:', {
            error: err.message,
            context: record.context,
          });
        });
    }

    return record;
  }

  /**
   * Get Running Token for a counter or all counters
   */
  public getRunningToken(context?: string): RunningTokenRecord | RunningTokenRecord[] {
    if (context) {
      const found = this.runningTokens.get(context);
      if (found) return found;

      return {
        hipId: '',
        context,
        runningTokenNumber: '0',
        averageTokenServiceTimeInMinutes: 2,
        updatedAt: new Date().toISOString(),
      };
    }

    return Array.from(this.runningTokens.values());
  }

  /**
   * Query Running Token Status from ABDM Gateway
   * POST /patient-share/v3/running-token/status
   */
  public async queryGatewayRunningTokenStatus(params: {
    hipId: string;
    context: string;
    hiuId?: string;
    userAuthToken?: string;
  }): Promise<any> {
    return abdmScanShareClient.requestRunningTokenStatus(params);
  }

  /**
   * Handle incoming ABDM Gateway webhook asking for Running Token status
   * Responds via on-status back to gateway
   */
  public async handleRunningTokenStatusCallback(
    requestId: string,
    payload: { hipId: string; context: string }
  ): Promise<{ status: string; token: RunningTokenRecord }> {
    const context = payload.context || '1';
    let record = this.runningTokens.get(context);

    if (!record) {
      record = {
        hipId: payload.hipId,
        context,
        runningTokenNumber: '0',
        averageTokenServiceTimeInMinutes: 2,
        updatedAt: new Date().toISOString(),
      };
      this.runningTokens.set(context, record);
      this.saveToDisk();
    }

    // Acknowledge back to ABDM Gateway asynchronously via on-status
    abdmScanShareClient
      .sendRunningTokenOnStatus({
        hipId: record.hipId || payload.hipId,
        context: record.context,
        runningTokenNumber: record.runningTokenNumber,
        averageTokenServiceTimeInMinutes: record.averageTokenServiceTimeInMinutes,
        originalRequestId: requestId,
      })
      .catch((err) => {
        logger.warn('Failed to send running-token on-status in callback:', err.message);
      });

    return {
      status: 'SUCCESS',
      token: record,
    };
  }
}

export const scanShareService = new ScanShareService();
