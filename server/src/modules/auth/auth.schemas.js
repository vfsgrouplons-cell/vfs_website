import { z } from 'zod';

const indianMobile = z.string().trim().regex(/^\+?[1-9]\d{9,14}$/, 'Enter a valid mobile number');
const password = z.string().min(10, 'Use at least 10 characters').max(128).regex(/[A-Z]/, 'Include an uppercase letter').regex(/[a-z]/, 'Include a lowercase letter').regex(/\d/, 'Include a number');
const gmail = z.string().trim().email('Enter a valid Gmail address').toLowerCase().regex(/^[^@\s]+@gmail\.com$/, 'Only @gmail.com addresses can enroll');

const registrationBase = { fullName: z.string().trim().min(2).max(100), mobile: indianMobile, email: gmail, password, country: z.literal('India').default('India'), city: z.string().trim().min(2).max(80), state: z.string().trim().min(2).max(80), referredByCode: z.string().trim().toUpperCase().max(40).optional().or(z.literal('')), consent: z.literal(true, { errorMap: () => ({ message: 'Consent is required' }) }) };
export const registerCustomerSchema = z.object(registrationBase);
export const registerContractorSchema = z.object({ ...registrationBase, businessName: z.string().trim().max(150).optional().or(z.literal('')) });
export const loginSchema = z.object({ identifier: z.string().trim().min(3).max(254), password: z.string().min(1).max(128) });
