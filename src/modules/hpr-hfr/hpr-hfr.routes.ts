import { Router } from 'express';
import { hprHfrController } from './hpr-hfr.controller';
import { authenticateHospitalClient } from '../../middleware/authentication';

export const hprRouter: Router = Router();
export const hfrRouter: Router = Router();

// Require hospital client authentication
hprRouter.use(authenticateHospitalClient);
hfrRouter.use(authenticateHospitalClient);

// ==========================================
// HPR: Doctor Registry Routes (/api/v1/hpr/*)
// ==========================================

// Doctor Search & Verification
hprRouter.get('/search/id/:hprId', hprHfrController.searchDoctorByHprId.bind(hprHfrController));
hprRouter.get('/search/mobile/:mobile', hprHfrController.searchDoctorByMobile.bind(hprHfrController));

// Doctor Login & Auth
hprRouter.post('/auth/otp/generate', hprHfrController.sendDoctorLoginOtp.bind(hprHfrController));
hprRouter.post('/auth/otp/verify', hprHfrController.verifyDoctorLoginOtp.bind(hprHfrController));

// Doctor Profile & ID Card
hprRouter.get('/doctor/profile', hprHfrController.getDoctorProfile.bind(hprHfrController));
hprRouter.get('/doctor/id-card', hprHfrController.getDoctorIdCard.bind(hprHfrController));

// Medical Masters
hprRouter.get('/masters/councils', hprHfrController.getCouncils.bind(hprHfrController));
hprRouter.get('/masters/courses', hprHfrController.getCourses.bind(hprHfrController));

// ==========================================
// HFR: Health Facility Registry Routes (/api/v1/hfr/*)
// ==========================================

// Facility Search
hfrRouter.post('/facility/search', hprHfrController.searchFacility.bind(hprHfrController));

// Facility Onboarding (4 Steps)
hfrRouter.post('/facility/onboard/basic', hprHfrController.onboardFacilityBasic.bind(hprHfrController));
hfrRouter.post('/facility/onboard/additional', hprHfrController.onboardFacilityAdditional.bind(hprHfrController));
hfrRouter.post('/facility/onboard/detailed', hprHfrController.onboardFacilityDetailed.bind(hprHfrController));
hfrRouter.post('/facility/onboard/submit', hprHfrController.onboardFacilitySubmit.bind(hprHfrController));

// Facility Contact Person Verification
hfrRouter.post('/facility/contact/send-otp', hprHfrController.sendFacilityContactOtp.bind(hprHfrController));
hfrRouter.post('/facility/contact/verify-otp', hprHfrController.validateFacilityContactOtp.bind(hprHfrController));

// Assign Doctors to Facility
hfrRouter.post('/facility/assign-professionals', hprHfrController.assignProfessionalsToFacility.bind(hprHfrController));
