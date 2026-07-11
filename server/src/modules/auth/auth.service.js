import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../../config/env.js';
import { AuditLog } from '../../models/AuditLog.js';
import { Customer } from '../../models/Customer.js';
import { RefreshToken } from '../../models/RefreshToken.js';
import { Role } from '../../models/Role.js';
import { User } from '../../models/User.js';
import { ApiError } from '../../utils/apiError.js';
import { nextPublicId } from '../../utils/identifiers.js';

const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const cookieBase = () => ({ httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax', path: '/' });

function signAccess(user) { return jwt.sign({ sub: user.id, type: 'access' }, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN }); }
function signRefresh(user, family) { return jwt.sign({ sub: user.id, family, type: 'refresh' }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN }); }

async function issueSession(user, request, response, family = randomUUID()) {
  const accessToken = signAccess(user);
  const refreshToken = signRefresh(user, family);
  const decoded = jwt.decode(refreshToken);
  await RefreshToken.create({ user: user._id, family, tokenHash: hashToken(refreshToken), expiresAt: new Date(decoded.exp * 1000), userAgent: request.get('user-agent'), ip: request.ip });
  response.cookie('vfs_access', accessToken, { ...cookieBase(), maxAge: 15 * 60 * 1000 });
  response.cookie('vfs_refresh', refreshToken, { ...cookieBase(), maxAge: Math.max(0, decoded.exp * 1000 - Date.now()) });
}

export async function registerCustomer(input, request, response) {
  const session = await mongoose.startSession();
  let user;
  try {
    await session.withTransaction(async () => {
      const existing = await User.exists({ $or: [{ mobile: input.mobile }, ...(input.email ? [{ email: input.email }] : [])] }).session(session);
      if (existing) throw new ApiError(409, 'ACCOUNT_EXISTS', 'An account already exists for this mobile number or email.');
      const role = await Role.findOne({ slug: 'customer' }).session(session);
      if (!role) throw new ApiError(503, 'SETUP_REQUIRED', 'Application roles have not been initialized. Run the seed command.');
      const [created] = await User.create([{ fullName: input.fullName, mobile: input.mobile, email: input.email || undefined, passwordHash: await bcrypt.hash(input.password, 12), roles: [role._id], status: 'active', mobileVerifiedAt: env.NODE_ENV === 'development' ? new Date() : undefined }], { session });
      user = created;
      await Customer.create([{ customerId: await nextPublicId('customer', session), user: user._id, city: input.city, state: input.state }], { session });
      await AuditLog.create([{ actor: user._id, actorRoles: ['customer'], action: 'customer.registered', resourceType: 'User', resourceId: user._id, newValues: { consent: input.consent }, ip: request.ip, userAgent: request.get('user-agent'), requestId: request.id }], { session });
    });
  } finally { await session.endSession(); }
  await issueSession(user, request, response);
  return user;
}

export async function login(input, request, response) {
  const normalized = input.identifier.toLowerCase();
  const user = await User.findOne({ $or: [{ email: normalized }, { mobile: input.identifier }] }).select('+passwordHash +failedLoginAttempts +lockedUntil');
  const valid = user && await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    if (user) await User.updateOne({ _id: user._id }, { $inc: { failedLoginAttempts: 1 } });
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'The sign-in details are incorrect.');
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) throw new ApiError(423, 'ACCOUNT_LOCKED', 'This account is temporarily locked.');
  if (user.status !== 'active') throw new ApiError(403, 'ACCOUNT_INACTIVE', 'This account is not active.');
  await User.updateOne({ _id: user._id }, { $set: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await issueSession(user, request, response);
  await AuditLog.create({ actor: user._id, action: 'auth.login.succeeded', resourceType: 'User', resourceId: user._id, ip: request.ip, userAgent: request.get('user-agent'), requestId: request.id });
  return User.findById(user._id).populate('roles', 'name slug');
}

export async function refresh(request, response) {
  const token = request.cookies?.vfs_refresh;
  if (!token) throw new ApiError(401, 'REFRESH_REQUIRED', 'Please sign in again.');
  let payload;
  try { payload = jwt.verify(token, env.JWT_REFRESH_SECRET); } catch { throw new ApiError(401, 'REFRESH_INVALID', 'Please sign in again.'); }
  const tokenHash = hashToken(token);
  const stored = await RefreshToken.findOne({ tokenHash });
  if (!stored || stored.revokedAt) {
    if (payload.family) await RefreshToken.updateMany({ family: payload.family, revokedAt: null }, { revokedAt: new Date() });
    throw new ApiError(401, 'SESSION_REVOKED', 'This session is no longer valid.');
  }
  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'active') throw new ApiError(401, 'ACCOUNT_UNAVAILABLE', 'Please sign in again.');
  stored.revokedAt = new Date();
  await stored.save();
  await issueSession(user, request, response, payload.family);
  return user;
}

export async function logout(request, response) {
  const token = request.cookies?.vfs_refresh;
  if (token) await RefreshToken.updateOne({ tokenHash: hashToken(token), revokedAt: null }, { revokedAt: new Date() });
  response.clearCookie('vfs_access', cookieBase());
  response.clearCookie('vfs_refresh', cookieBase());
}
