import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hprHfrService } from '../../src/modules/hpr-hfr/hpr-hfr.service';
import { abdmAuthService } from '../../src/integrations/abdm/abdm.auth';

describe('Milestone 4: HPR (Doctor Registry) & HFR (Facility Registry) Tests', () => {
  const dummyHprId = 'doctor@hpr';
  const dummyMobile = '9999999999';
  const dummyFacilityId = 'IN0610000042';

  beforeEach(() => {
    vi.spyOn(abdmAuthService, 'getAccessToken').mockResolvedValue('mock_token_hpr_test');
  });

  // ==========================================
  // HPR Tests
  // ==========================================

  it('should search doctor by HPR ID', async () => {
    const res = await hprHfrService.searchDoctorByHprId(dummyHprId);
    expect(res).toBeDefined();
    expect(res.hprId).toBe(dummyHprId);
    expect(res.exists).toBe(true);
  });

  it('should search doctor by mobile number', async () => {
    const res = await hprHfrService.searchDoctorByMobile(dummyMobile);
    expect(res).toBeDefined();
    expect(res.doctors).toBeDefined();
    expect(res.doctors.length).toBeGreaterThan(0);
  });

  it('should reject invalid mobile numbers in doctor search', async () => {
    await expect(hprHfrService.searchDoctorByMobile('123')).rejects.toThrow(/valid 10-digit/i);
  });

  it('should dispatch login OTP to doctor mobile', async () => {
    const res = await hprHfrService.sendDoctorLoginOtp(dummyMobile);
    expect(res).toBeDefined();
    expect(res.txnId).toBeDefined();
  });

  it('should verify doctor login OTP and return authorized token', async () => {
    const res = await hprHfrService.verifyDoctorLoginOtp({
      txnId: 'txn-hpr-auth-001',
      otp: '123456',
    });
    expect(res).toBeDefined();
    expect(res.status).toBe('SUCCESS');
    expect(res.token).toBeDefined();
  });

  it('should fetch doctor professional profile', async () => {
    const profile = await hprHfrService.getDoctorProfile();
    expect(profile).toBeDefined();
    expect(profile.hprId).toBeDefined();
    expect(profile.registration).toBeDefined();
    expect(profile.status).toContain('VERIFIED');
  });

  it('should retrieve doctor digital HPR ID card', async () => {
    const idCard = await hprHfrService.getDoctorIdCard();
    expect(idCard).toBeDefined();
    expect(idCard.cardType).toBe('HPR_PROFESSIONAL_ID_CARD');
    expect(idCard.data).toBeDefined();
  });

  it('should list recognized medical councils and qualifications (MBBS, MD)', async () => {
    const councils = await hprHfrService.getCouncils();
    expect(Array.isArray(councils)).toBe(true);
    expect(councils.some((c: any) => c.code === 'NMC')).toBe(true);

    const courses = await hprHfrService.getCourses();
    expect(Array.isArray(courses)).toBe(true);
    expect(courses.some((c: any) => c.code === 'MBBS')).toBe(true);
  });

  // ==========================================
  // HFR Tests
  // ==========================================

  it('should search health facilities in HFR', async () => {
    const res = await hprHfrService.searchFacility({
      facilityName: 'General Hospital',
      stateLGDCode: '27',
    });
    expect(res).toBeDefined();
    expect(res.facilities).toBeDefined();
    expect(res.facilities.length).toBeGreaterThan(0);
  });

  it('should execute 4-step facility onboarding pipeline', async () => {
    // Step 1: Basic Information
    const basicRes = await hprHfrService.onboardFacilityBasic({
      facilityName: 'Community Health Hospital',
      systemOfMedicine: 'ALLOPATHY',
    });
    expect(basicRes.trackingId).toBeDefined();
    expect(basicRes.status).toBe('BASIC_INFO_SAVED');

    const trackingId = basicRes.trackingId;

    // Step 2: Additional Information
    const addRes = await hprHfrService.onboardFacilityAdditional({
      trackingId,
      ownershipType: 'PRIVATE',
    });
    expect(addRes.status).toBe('ADDITIONAL_INFO_SAVED');

    // Step 3: Detailed Information
    const detRes = await hprHfrService.onboardFacilityDetailed({
      trackingId,
      bedCount: 150,
      specialties: ['Cardiology', 'Pediatrics'],
    });
    expect(detRes.status).toBe('DETAILED_INFO_SAVED');

    // Step 4: Submission for Verification
    const submitRes = await hprHfrService.onboardFacilitySubmit(trackingId);
    expect(submitRes.status).toBe('SUBMITTED_FOR_VERIFICATION');
    expect(submitRes.facilityId).toBeDefined();
  });

  it('should handle facility contact OTP verification', async () => {
    const sendRes = await hprHfrService.sendFacilityContactOtp({
      contactNumber: dummyMobile,
    });
    expect(sendRes.txnId).toBeDefined();

    const verifyRes = await hprHfrService.validateFacilityContactOtp({
      otp: '123456',
      txnId: sendRes.txnId,
    });
    expect(verifyRes.valid).toBe(true);
    expect(verifyRes.status).toBe('VERIFIED');
  });

  it('should link verified healthcare professionals (doctors) to facility', async () => {
    const assignRes = await hprHfrService.assignProfessionalsToFacility({
      facilityId: dummyFacilityId,
      professionals: [
        {
          hprId: 'dr.sharma@hpr',
          role: 'CONSULTANT_CARDIOLOGIST',
          department: 'Cardiology',
        },
      ],
    });
    expect(assignRes.success).toBe(true);
    expect(assignRes.linkedProfessionalsCount).toBe(1);
    expect(assignRes.professionals[0].status).toBe('LINKED_TO_FACILITY');
  });
});
