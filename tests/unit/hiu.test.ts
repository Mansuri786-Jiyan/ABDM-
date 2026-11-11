import { describe, it, expect } from 'vitest';
import { hiuService } from '../../src/modules/hiu/hiu.service';

describe('Milestone 3: HIU Clinician Login, Consents & Health Data Flow', () => {
  const patientId = 'demopatient@sbx';

  it('should authenticate clinician with username and password', async () => {
    const loginResult = await hiuService.login({
      username: 'doctor_sharma',
      password: 'doctor123',
    });

    expect(loginResult).toBeDefined();
    expect(loginResult.token).toBeDefined();
    expect(loginResult.user.username).toBe('doctor_sharma');
    expect(loginResult.user.role).toBe('DOCTOR');
  });

  it('should reject invalid clinician credentials', async () => {
    await expect(
      hiuService.login({
        username: 'doctor_sharma',
        password: 'wrongpassword',
      })
    ).rejects.toThrow(/invalid username or password/i);
  });

  it('should list and search patients for HIU selection', () => {
    const patients = hiuService.getPatients('Demo');
    expect(patients.length).toBeGreaterThan(0);
    expect(patients[0].patientId).toBe(patientId);
  });

  it('should create a consent request for the selected patient', async () => {
    const result = await hiuService.createConsentRequest({
      patientId,
      hiuId: 'Mohan_HIP',
      requesterName: 'Dr. Sharma',
      hiTypes: [
        'OPConsultation',
        'Prescription',
        'DischargeSummary',
        'DiagnosticReport',
        'ImmunizationRecord',
        'WellnessRecord',
      ],
    });

    expect(result.consentRequestId).toBeDefined();
    expect(result.status).toBe('REQUESTED');
    expect(result.details.patientId).toBe(patientId);
  });

  it('should list active consent requests', () => {
    const list = hiuService.listConsentRequests();
    expect(list.length).toBeGreaterThan(0);
  });

  it('should view health data when consent is GRANTED (including HI Type filtering)', async () => {
    // 1. Create a request
    const consent = await hiuService.createConsentRequest({
      patientId,
      hiuId: 'Mohan_HIP',
      requesterName: 'Dr. Sharma',
    });

    // 2. Patient GRANTS consent
    hiuService.updateConsentStatus(consent.consentRequestId, 'GRANTED');

    // 3. HIU views all health data
    const allData = hiuService.getHealthData(consent.consentRequestId);
    expect(allData.consentStatus).toBe('GRANTED');
    expect(allData.totalRecords).toBeGreaterThan(0);

    // 4. HIU views specific HI Type: OPConsultation
    const opData = hiuService.getHealthData(consent.consentRequestId, 'OPConsultation');
    expect(opData.records.length).toBeGreaterThan(0);
    expect(opData.records.every((r) => r.hiType === 'OPConsultation')).toBe(true);

    // 5. HIU views specific HI Type: Prescription
    const rxData = hiuService.getHealthData(consent.consentRequestId, 'Prescription');
    expect(rxData.records.length).toBeGreaterThan(0);
    expect(rxData.records.every((r) => r.hiType === 'Prescription')).toBe(true);

    // 6. HIU views specific HI Type: DiagnosticReport
    const labData = hiuService.getHealthData(consent.consentRequestId, 'DiagnosticReport');
    expect(labData.records.length).toBeGreaterThan(0);
    expect(labData.records.every((r) => r.hiType === 'DiagnosticReport')).toBe(true);
  });

  it('should strictly block health data view when consent is DENIED (403 Forbidden)', async () => {
    const consent = await hiuService.createConsentRequest({
      patientId,
      hiuId: 'Mohan_HIP',
    });

    // Patient DENIES consent in PHR app
    hiuService.updateConsentStatus(consent.consentRequestId, 'DENIED');

    expect(() => hiuService.getHealthData(consent.consentRequestId)).toThrow(
      /Patient has DENIED this consent request/i
    );
  });

  it('should strictly block health data view when consent is REVOKED (403 Forbidden)', async () => {
    const consent = await hiuService.createConsentRequest({
      patientId,
      hiuId: 'Mohan_HIP',
    });

    // Initially GRANTED, then REVOKED
    hiuService.updateConsentStatus(consent.consentRequestId, 'GRANTED');
    hiuService.updateConsentStatus(consent.consentRequestId, 'REVOKED');

    expect(() => hiuService.getHealthData(consent.consentRequestId)).toThrow(
      /Patient has REVOKED this consent/i
    );
  });

  it('should strictly block health data view when consent is EXPIRED (403 Forbidden)', async () => {
    const consent = await hiuService.createConsentRequest({
      patientId,
      hiuId: 'Mohan_HIP',
      dataEraseAt: new Date(Date.now() - 10000).toISOString(), // expired in the past
    });

    hiuService.updateConsentStatus(consent.consentRequestId, 'GRANTED');

    expect(() => hiuService.getHealthData(consent.consentRequestId)).toThrow(
      /Consent has EXPIRED/i
    );
  });
});
