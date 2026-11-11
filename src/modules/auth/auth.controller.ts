import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { z } from 'zod';

const TokenRequestSchema = z.object({
  clientId: z.string().min(1, 'clientId is required'),
  clientSecret: z.string().min(1, 'clientSecret is required'),
});

export class AuthController {
  /**
   * POST /api/v1/auth/token
   * Exchange hospital client credentials for connector JWT token
   */
  public async generateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId, clientSecret } = TokenRequestSchema.parse(req.body);
      const result = await authService.generateClientToken(clientId, clientSecret);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
