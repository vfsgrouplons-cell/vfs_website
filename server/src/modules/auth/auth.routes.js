import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../middleware/auth.js';
import { requireCsrf } from '../../middleware/csrf.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendData } from '../../utils/apiResponse.js';
import { loginSchema, registerContractorSchema, registerCustomerSchema } from './auth.schemas.js';
import * as authService from './auth.service.js';

export const authRouter = Router();
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts. Please try again later.' } } });

authRouter.get('/csrf', (_request, response) => { const token = randomBytes(32).toString('hex'); response.cookie('vfs_csrf', token, { httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', path: '/' }); sendData(response, { csrfToken: token }); });
authRouter.post('/customer/register', authLimit, validate(registerCustomerSchema), asyncHandler(async (request, response) => sendData(response, { user: await authService.registerCustomer(request.body, request, response) }, 201)));
authRouter.post('/contractor/register', authLimit, validate(registerContractorSchema), asyncHandler(async (request, response) => sendData(response, { user: await authService.registerContractor(request.body, request, response) }, 201)));
authRouter.post('/customer/login', authLimit, validate(loginSchema), asyncHandler(async (request, response) => sendData(response, { user: await authService.login(request.body, request, response, 'customer') })));
authRouter.post('/contractor/login', authLimit, validate(loginSchema), asyncHandler(async (request, response) => sendData(response, { user: await authService.login(request.body, request, response, 'contractor') })));
authRouter.post('/admin/login', authLimit, validate(loginSchema), asyncHandler(async (request, response) => sendData(response, { user: await authService.login(request.body, request, response, 'admin') })));
authRouter.post('/login', authLimit, validate(loginSchema), asyncHandler(async (request, response) => sendData(response, { user: await authService.login(request.body, request, response) })));
authRouter.post('/refresh', authLimit, asyncHandler(async (request, response) => sendData(response, { user: await authService.refresh(request, response) })));
authRouter.post('/logout', requireCsrf, asyncHandler(async (request, response) => { await authService.logout(request, response); sendData(response, { loggedOut: true }); }));
authRouter.get('/me', requireAuth, asyncHandler(async (request, response) => sendData(response, { user: request.user })));
