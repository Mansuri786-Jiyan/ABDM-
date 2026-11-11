import { Router } from 'express';
import { phrController } from './phr.controller';
import { authenticateHospitalClient } from '../../middleware/authentication';

const phrRouter: Router = Router();

// Allow authenticated connector clients or clinicians
phrRouter.use(authenticateHospitalClient);

// 1. Document-based ABHA Registration (Driving License / PAN / Passport)
phrRouter.post('/document/generate-otp', (req, res, next) =>
  phrController.generateDocumentMobileOtp(req, res, next)
);
phrRouter.post('/document/verify-otp', (req, res, next) =>
  phrController.verifyDocumentMobileOtp(req, res, next)
);
phrRouter.post('/document/validate', (req, res, next) =>
  phrController.validateDocument(req, res, next)
);
phrRouter.post('/document/create-abha', (req, res, next) =>
  phrController.createHealthIdWithDocument(req, res, next)
);

// 2. Fingerprint Biometric Authentication
phrRouter.post('/auth/init', (req, res, next) =>
  phrController.initAuth(req, res, next)
);
phrRouter.post('/auth/confirm-fingerprint', (req, res, next) =>
  phrController.confirmFingerprint(req, res, next)
);

// 3. Forgot Health ID / Number Recovery
phrRouter.post('/forgot/mobile/generate-otp', (req, res, next) =>
  phrController.forgotHealthIdMobileOtp(req, res, next)
);
phrRouter.post('/forgot/mobile/verify', (req, res, next) =>
  phrController.forgotHealthIdMobileVerify(req, res, next)
);
phrRouter.post('/forgot/aadhaar/generate-otp', (req, res, next) =>
  phrController.forgotHealthIdAadhaarOtp(req, res, next)
);
phrRouter.post('/forgot/aadhaar/verify', (req, res, next) =>
  phrController.forgotHealthIdAadhaarVerify(req, res, next)
);

// 4. Download ABHA Card (QR, PNG, SVG)
phrRouter.get('/card/:format', (req, res, next) =>
  phrController.getCard(req, res, next)
);

// 5. LGD Government State & District Directory
phrRouter.get('/utility/states', (req, res, next) =>
  phrController.getLgdStates(req, res, next)
);
phrRouter.get('/utility/districts', (req, res, next) =>
  phrController.getLgdDistricts(req, res, next)
);

export { phrRouter };
