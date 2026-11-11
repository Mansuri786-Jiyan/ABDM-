import { describe, it, expect } from 'vitest';
import { hipLinkingService } from '../../src/modules/hip-linking/hip-linking.service';

describe('Milestone 2: HIP Care Context Linking & Data Transfer Tests', () => {
  const sampleAbhaAddress = 'demopatient@sbx';
  const sampleCareContextRef = 'OPD-VISIT-2026-9901';

  it('should link patient care context with ABHA address in HIP', async () => {
    const result = await hipLinkingService.linkCareContexts({
      hipId: 'Mohan_HIP',
      abhaAddress: sampleAbhaAddress,
      patientName: 'Demo Patient',
      patientReferenceNumber: 'MRN-2026-0042',
      careContexts: [
        {
          referenceNumber: sampleCareContextRef,
          display: 'General Medicine OPD Consultation',
          hiType: 'OPConsultation',
          content: JSON.stringify({ resourceType: 'Bundle', type: 'document' }),
        },
      ],
      notify: false, // skip gateway network call in unit test
    });

    expect(result.success).toBe(true);
    expect(result.linkedContexts.length).toBe(1);
    expect(result.linkedContexts[0].careContextReference).toBe(sampleCareContextRef);
    expect(result.linkedContexts[0].abhaAddress).toBe(sampleAbhaAddress);
    expect(result.linkedContexts[0].status).toBe('LINKED');
  });

  it('should retrieve linked care contexts for a patient ABHA address', () => {
    const contexts = hipLinkingService.getLinkedCareContexts(sampleAbhaAddress);
    expect(contexts.length).toBeGreaterThan(0);
    expect(contexts.some((c) => c.careContextReference === sampleCareContextRef)).toBe(true);
  });

  it('should match patient care contexts during user discovery webhook', async () => {
    const discoveryResult = await hipLinkingService.handleDiscoverWebhook(
      'req-disc-123',
      {
        transactionId: 'txn-disc-abc',
        patient: {
          id: sampleAbhaAddress,
          name: 'Demo Patient',
        },
      }
    );

    expect(discoveryResult.status).toBe('SUCCESS');
    expect(discoveryResult.matchedCount).toBeGreaterThan(0);
    expect(discoveryResult.patient[0].careContexts.length).toBeGreaterThan(0);
  });

  it('should manage consent lifecycle: GRANT, REVOKE, and EXPIRE enforcement', async () => {
    const consentId = 'consent-test-uuid-444';

    // 1. Consent GRANTED
    const grantedAck = await hipLinkingService.handleConsentNotifyWebhook(
      'req-consent-1',
      {
        notification: {
          consentId,
          status: 'GRANTED',
          consentDetail: {
            patient: { id: sampleAbhaAddress },
            careContexts: [{ careContextReference: sampleCareContextRef }],
            hiTypes: ['OPConsultation'],
            permission: {
              dataEraseAt: new Date(Date.now() + 86400000).toISOString(), // valid for 24 hours
            },
          },
        },
      }
    );

    expect(grantedAck.consentStatus).toBe('GRANTED');

    // 2. Health information transfer succeeds when consent is GRANTED
    const dataTransferResult = await hipLinkingService.handleHealthInfoRequestWebhook(
      'req-hi-1',
      {
        transactionId: 'txn-hi-777',
        hiRequest: {
          consent: { id: consentId },
          dataPushUrl: 'https://dev.abdm.gov.in/api-hiu/data/notification',
          keyMaterial: {
            cryptoAlg: 'ECDH',
            curve: 'Curve25519',
            dhPublicKey: { expiry: '2026-12-31', parameters: '32byte', keyValue: 'test-key' },
            nonce: 'nonce-123',
          },
        },
      }
    );

    expect(dataTransferResult.status).toBe('ACKNOWLEDGED');
    expect(dataTransferResult.recordsTransferred).toBeGreaterThan(0);

    // 3. User Revokes Consent
    const revokedAck = await hipLinkingService.handleConsentNotifyWebhook(
      'req-consent-2',
      {
        notification: {
          consentId,
          status: 'REVOKED',
        },
      }
    );

    expect(revokedAck.consentStatus).toBe('REVOKED');

    // 4. Data transfer MUST BE REJECTED (403 Forbidden) when consent is REVOKED
    await expect(
      hipLinkingService.handleHealthInfoRequestWebhook('req-hi-2', {
        transactionId: 'txn-hi-888',
        hiRequest: {
          consent: { id: consentId },
          dataPushUrl: 'https://dev.abdm.gov.in/api-hiu/data/notification',
          keyMaterial: {
            cryptoAlg: 'ECDH',
            curve: 'Curve25519',
            dhPublicKey: { expiry: '2026-12-31', parameters: '32byte', keyValue: 'test-key' },
            nonce: 'nonce-123',
          },
        },
      })
    ).rejects.toThrow(/rejected: Consent is REVOKED/i);
  });
});
