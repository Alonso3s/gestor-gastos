import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import { authRateLimit } from '../../middlewares/rateLimit.js';
import { validate } from '../../middlewares/validate.js';
import * as authController from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.schemas.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  authRateLimit,
  validate({ body: registerSchema }),
  authController.register,
);
authRouter.post('/login', authRateLimit, validate({ body: loginSchema }), authController.login);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authController.logout);
authRouter.get('/me', requireAuth, authController.me);
