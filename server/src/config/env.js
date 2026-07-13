import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: resolve(serverRoot, '.env') });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  ADDITIONAL_ALLOWED_ORIGINS: z.string().default(''),
  MONGODB_URI: z.string().default(''),
  JWT_ACCESS_SECRET: z.string().min(32).default('development-access-secret-change-me-now'),
  JWT_REFRESH_SECRET: z.string().min(32).default('development-refresh-secret-change-me-now'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: z.string().min(32).default('development-cookie-secret-change-me-now'),
  ENCRYPTION_KEY: z.string().default(''),
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  EMAIL_PROVIDER: z.string().default('mock'),
  AI_PROVIDER: z.string().default('mock'),
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().default('gemini-3.5-flash'),
  INITIAL_ADMIN_NAME: z.string().default(''),
  INITIAL_ADMIN_EMAIL: z.string().default(''),
  INITIAL_ADMIN_MOBILE: z.string().default(''),
  INITIAL_ADMIN_PASSWORD: z.string().default(''),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.issues.map((issue) => issue.path.join('.') + ' ' + issue.message).join('; ')}`);
}

if (parsed.data.NODE_ENV === 'production') {
  const required = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'COOKIE_SECRET', 'ENCRYPTION_KEY', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const missing = required.filter((key) => !process.env[key]);
  if (parsed.data.AI_PROVIDER === 'gemini' && !parsed.data.GEMINI_API_KEY) missing.push('GEMINI_API_KEY');
  if (missing.length) throw new Error(`Missing production environment variables: ${missing.join(', ')}`);
}

export const env = parsed.data;
const normalizeOrigin = (value) => {
  try { return new URL(value).origin; }
  catch { return value.trim().replace(/\/+$/, ''); }
};
const deployedFrontendOrigins = env.NODE_ENV === 'production' ? ['https://vfs-groups.netlify.app'] : [];
export const allowedOrigins = [...new Set([
  env.CLIENT_URL,
  ...env.ADDITIONAL_ALLOWED_ORIGINS.split(',').map((value) => value.trim()).filter(Boolean),
  ...deployedFrontendOrigins,
].map(normalizeOrigin))];
export const isAllowedOrigin = (origin) => !origin || allowedOrigins.includes(normalizeOrigin(origin));
