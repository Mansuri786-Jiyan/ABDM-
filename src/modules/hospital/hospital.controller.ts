import { Request, Response, NextFunction } from 'express';
import { hospitalService } from './hospital.service';
import { z } from 'zod';

const CreateHospitalSchema = z
  .object({
    name: z.string().min(2, 'Name is required'),
    code: z.string().optional(),
    id: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    hfrId: z.string().optional(),
    state: z.string().optional(),
    district: z.string().optional(),
  })
  .transform((data) => ({
    name: data.name,
    code: (data.code || data.id || 'LIFELINE_AHD_01').toUpperCase(),
    email: data.email || 'contact@lifelinehospital.in',
    phone: data.phone || '9408111252',
    address: data.address || [data.district, data.state].filter(Boolean).join(', ') || 'Ahmedabad, Gujarat',
  }));

const CreateClientSchema = z
  .object({
    hospitalId: z.string().optional(),
    name: z.string().min(2, 'Client application name is required'),
    rateLimit: z.number().int().positive().optional(),
  })
  .transform((data) => ({
    hospitalId: data.hospitalId || 'LIFELINE_AHD_01',
    name: data.name,
    rateLimit: data.rateLimit || 500,
  }));

const StatusSchema = z.object({
  isActive: z.boolean(),
});

export class HospitalController {
  public async createHospital(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = CreateHospitalSchema.parse(req.body);
      const hospital = await hospitalService.createHospital(validated);
      res.status(201).json({
        success: true,
        data: hospital,
      });
    } catch (error) {
      next(error);
    }
  }

  public async createClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = CreateClientSchema.parse(req.body);
      const result = await hospitalService.createConnectorClient(validated);
      res.status(201).json({
        success: true,
        message: 'Save this clientSecret securely. It will not be shown again.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async rotateSecret(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId } = req.params;
      const result = await hospitalService.rotateClientSecret(clientId);
      res.status(200).json({
        success: true,
        message: 'Client secret rotated successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async setStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId } = req.params;
      const { isActive } = StatusSchema.parse(req.body);
      await hospitalService.setClientStatus(clientId, isActive);
      res.status(200).json({
        success: true,
        message: `Client ${clientId} is now ${isActive ? 'enabled' : 'disabled'}.`,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const hospitalController = new HospitalController();
