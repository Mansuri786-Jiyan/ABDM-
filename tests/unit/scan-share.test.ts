import { describe, it, expect, beforeEach } from 'vitest';
import { scanShareService } from '../../src/modules/scan-share/scan-share.service';

describe('Scan and Share Service Unit Tests', () => {
  it('should process incoming profile-share callback and assign token', async () => {
    const payload = {
      intent: 'PROFILE_SHARE',
      metaData: {
        hipId: 'TEST_HIP_01',
        context: '1',
      },
      profile: {
        patient: {
          abhaNumber: '91-0000-0000-0000',
          abhaAddress: 'demopatient@sbx',
          name: 'Demo Patient',
          gender: 'M',
          dayOfBirth: '01',
          monthOfBirth: '01',
          yearOfBirth: '2000',
          phoneNumber: '9999999999',
          address: {
            line: 'Civil Lines',
          },
        },
      },
    };

    const result = await scanShareService.handleProfileShare('test-request-id-123', payload);

    expect(result).toBeDefined();
    expect(result.tokenNumber).toBeDefined();
    expect(result.abhaAddress).toBe('demopatient@sbx');
    expect(result.context).toBe('1');

    // Retrieve by token number
    const token = scanShareService.getTokenByNumber(result.tokenNumber);
    expect(token).toBeDefined();
    expect(token.name).toBe('Demo Patient');
    expect(token.status).toBe('WAITING');
    expect(token.dob).toBe('01-01-2000');

    // Complete token
    const completed = scanShareService.completeToken(result.tokenNumber, 'MRN-9021');
    expect(completed.status).toBe('COMPLETED');
    expect(completed.patientReferenceId).toBe('MRN-9021');
  });

  it('should retrieve queue filtered by status', () => {
    const queue = scanShareService.getQueue();
    expect(Array.isArray(queue)).toBe(true);
    expect(queue.length).toBeGreaterThan(0);
  });

  it('should update and retrieve running token for a counter', async () => {
    const updated = await scanShareService.updateRunningToken({
      hipId: 'Mohan_HIP',
      context: '1',
      runningTokenNumber: '51',
      averageTokenServiceTimeInMinutes: 2,
      notifyGateway: false, // disable network call in unit test
    });

    expect(updated).toBeDefined();
    expect(updated.runningTokenNumber).toBe('51');
    expect(updated.context).toBe('1');
    expect(updated.averageTokenServiceTimeInMinutes).toBe(2);

    // Retrieve specific counter
    const fetched = scanShareService.getRunningToken('1') as any;
    expect(fetched).toBeDefined();
    expect(fetched.runningTokenNumber).toBe('51');
    expect(fetched.hipId).toBe('Mohan_HIP');

    // Retrieve default for uninitialized counter
    const emptyCounter = scanShareService.getRunningToken('99') as any;
    expect(emptyCounter.runningTokenNumber).toBe('0');
  });

  it('should handle incoming ABDM Gateway running-token status request callback', async () => {
    const response = await scanShareService.handleRunningTokenStatusCallback(
      'req-status-guid-999',
      {
        hipId: 'Mohan_HIP',
        context: '1',
      }
    );

    expect(response).toBeDefined();
    expect(response.status).toBe('SUCCESS');
    expect(response.token.runningTokenNumber).toBe('51');
  });

  it('should initiate OPD payment with dynamic UPI QR payload', async () => {
    // Generate a token first
    const token = await scanShareService.handleProfileShare('req-pay-1', {
      intent: 'PROFILE_SHARE',
      metaData: { hipId: 'Mohan_HIP', context: '1' },
      profile: {
        patient: {
          abhaNumber: '91-0000-0000-0000',
          abhaAddress: 'demopatient@sbx',
          name: 'Demo Patient',
          gender: 'M',
          phoneNumber: '9999999999',
        },
      },
    });

    const paymentInit = scanShareService.initiatePayment({
      tokenNumber: token.tokenNumber,
      amount: 250,
      description: 'Senior Consultant OPD Fee',
      doctorName: 'Dr. Sharma',
    });

    expect(paymentInit).toBeDefined();
    expect(paymentInit.amount).toBe(250);
    expect(paymentInit.status).toBe('PENDING');
    expect(paymentInit.upiString).toContain('upi://pay');
    expect(paymentInit.upiString).toContain('am=250');
  });

  it('should confirm OPD fee payment and generate printable payment receipt', async () => {
    // Generate a token first
    const token = await scanShareService.handleProfileShare('req-pay-2', {
      intent: 'PROFILE_SHARE',
      metaData: { hipId: 'Mohan_HIP', context: '1' },
      profile: {
        patient: {
          abhaNumber: '91-0000-0000-0000',
          abhaAddress: 'demopatient@sbx',
          name: 'Demo Patient',
          gender: 'M',
          phoneNumber: '9999999999',
        },
      },
    });

    const confirmed = scanShareService.confirmPayment({
      tokenNumber: token.tokenNumber,
      transactionId: 'UPI-UTR-9988776655',
      amount: 250,
      paymentMode: 'UPI_QR',
    });

    expect(confirmed.paymentStatus).toBe('PAID');
    expect(confirmed.transactionId).toBe('UPI-UTR-9988776655');

    const receipt = scanShareService.getPaymentReceipt(token.tokenNumber);
    expect(receipt).toBeDefined();
    expect(receipt.paymentStatus).toBe('PAID');
    expect(receipt.amount).toBe(250);
    expect(receipt.receiptNumber).toContain('UPI-UTR');
  });
});
