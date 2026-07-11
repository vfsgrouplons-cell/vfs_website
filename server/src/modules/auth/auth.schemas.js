import { z } from 'zod';

const indianMobile = z.string().trim().regex(/^\+?[1-9]\d{9,14}$/, 'Enter a valid mobile number');
const password = z.string().min(10, 'Use at least 10 characters').max(128).regex(/[A-Z]/, 'Include an uppercase letter').regex(/[a-z]/, 'Include a lowercase letter').regex(/\d/, 'Include a number');

export const registerCustomerSchema = z.object({ fullName: z.string().trim().min(2).max(100), mobile: indianMobile, email: z.string().trim().email().toLowerCase().optional().or(z.literal('')), password, city: z.string().trim().min(2).max(80), state: z.string().trim().min(2).max(80), consent: z.literal(true, { errorMap: () => ({ message: 'Consent is required' }) }) });
export const loginSchema = z.object({ identifier: z.string().trim().min(3).max(254), password: z.string().min(1).max(128) });
