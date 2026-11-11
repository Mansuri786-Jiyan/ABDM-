import { describe, it, expect } from 'vitest';
import { transactionService } from '../../src/modules/transactions/transaction.service';

describe('Module 6: Transaction Management Unit Tests', () => {
  it('should create an internal transaction with INITIATED status', async () => {
    const txn = await transactionService.createTransaction({
      hospitalId: 'hosp_test_001',
      clientId: 'cli_test_001',
      patientReferenceId: 'MRN-90210',
      operationType: 'ENROLLMENT_AADHAAR_OTP',
    });

    expect(txn.id).toBeDefined();
    expect(txn.status).toBe('INITIATED');
    expect(txn.operationType).toBe('ENROLLMENT_AADHAAR_OTP');
    expect(txn.patientReferenceId).toBe('MRN-90210');
  });

  it('should update transaction to OTP_PENDING with ABDM txnId', async () => {
    const txn = await transactionService.createTransaction({
      hospitalId: 'hosp_test_001',
      clientId: 'cli_test_001',
      operationType: 'ENROLLMENT_AADHAAR_OTP',
    });

    const abdmTxnId = 'abdm-txn-uuid-12345';
    const updated = await transactionService.updateTransaction(txn.id, {
      status: 'OTP_PENDING',
      abdmTxnId,
      metadata: { dispatchedTo: 'registered Aadhaar mobile' },
    });

    expect(updated.status).toBe('OTP_PENDING');
    expect(updated.abdmTxnId).toBe(abdmTxnId);
    expect(updated.metadata.dispatchedTo).toBe('registered Aadhaar mobile');
  });

  it('should update transaction to COMPLETED upon ABHA address creation', async () => {
    const txn = await transactionService.createTransaction({
      hospitalId: 'hosp_test_001',
      clientId: 'cli_test_001',
      operationType: 'ENROLLMENT_AADHAAR_OTP',
    });

    const completed = await transactionService.updateTransaction(txn.id, {
      status: 'COMPLETED',
      healthIdNumber: '91-1234-5678-9012',
      abhaAddress: 'john_doe@abdm',
    });

    expect(completed.status).toBe('COMPLETED');
    expect(completed.healthIdNumber).toBe('91-1234-5678-9012');
    expect(completed.abhaAddress).toBe('john_doe@abdm');
  });

  it('should throw 404 for non-existent transaction', async () => {
    await expect(transactionService.getTransactionById('non-existent-uuid')).rejects.toThrow(
      'Transaction not found'
    );
  });
});
