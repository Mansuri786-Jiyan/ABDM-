import { Router } from 'express';
import { hospitalController } from './hospital.controller';
import { authenticateHospitalClient } from '../../middleware/authentication';

const router = Router();

// Hospital administration endpoints
router.post('/', authenticateHospitalClient, (req, res, next) =>
  hospitalController.createHospital(req, res, next)
);

router.post('/clients', authenticateHospitalClient, (req, res, next) =>
  hospitalController.createClient(req, res, next)
);

router.post('/clients/:clientId/rotate-secret', authenticateHospitalClient, (req, res, next) =>
  hospitalController.rotateSecret(req, res, next)
);

router.patch('/clients/:clientId/status', authenticateHospitalClient, (req, res, next) =>
  hospitalController.setStatus(req, res, next)
);

export const hospitalRouter: Router = router;
