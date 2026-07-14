import { Router } from 'express';
import { z } from 'zod';
import { ADMIN_ROLES, requireAuth, requireRole } from '../../middleware/auth.js';
import { requireCsrf } from '../../middleware/csrf.js';
import { validate } from '../../middleware/validate.js';
import { AuditLog } from '../../models/AuditLog.js';
import { Application, APPLICATION_STATUSES } from '../../models/Application.js';
import { ApplicationDocument } from '../../models/ApplicationDocument.js';
import { ApplicationStatusHistory } from '../../models/ApplicationStatusHistory.js';
import { LoanReferral, LOAN_REFERRAL_STATUSES } from '../../models/LoanReferral.js';
import { LoginActivity } from '../../models/LoginActivity.js';
import { Role } from '../../models/Role.js';
import { User } from '../../models/User.js';
import { ApiError } from '../../utils/apiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendData } from '../../utils/apiResponse.js';
import { storageProvider } from '../../providers/storage.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

async function memberDashboard(userId) {
  const [user, referredUsers, recentLogins, loanReferrals, referredCount, loanReferralCount] = await Promise.all([
    User.findById(userId).populate('roles', 'name slug').populate('referredBy', 'fullName referralCode').lean(),
    User.find({ referredBy: userId }).select('fullName email mobile referralCode referredByCode createdAt roles').populate('roles', 'name slug').sort({ createdAt: -1 }).limit(5).lean(),
    LoginActivity.find({ user: userId }).sort({ loginAt: -1 }).limit(5).lean(),
    LoanReferral.find({ submittedBy: userId }).populate('service', 'name slug').sort({ createdAt: -1 }).limit(5).lean(),
    User.countDocuments({ referredBy: userId }), LoanReferral.countDocuments({ submittedBy: userId }),
  ]);
  return { user, metrics: { successfulLogins: user.successfulLoginCount || 0, registeredThroughCode: referredCount, loanReferralsSubmitted: loanReferralCount }, referredUsers, recentLogins, recentLoanReferrals: loanReferrals };
}

dashboardRouter.get('/customer', requireRole('customer'), asyncHandler(async (request, response) => sendData(response, await memberDashboard(request.user._id))));
dashboardRouter.get('/contractor', requireRole('contractor'), asyncHandler(async (request, response) => sendData(response, await memberDashboard(request.user._id))));

for (const portal of ['customer', 'contractor']) {
  dashboardRouter.get(`/${portal}/referred-users`, requireRole(portal), paginatedMemberCollection('referred-users'));
  dashboardRouter.get(`/${portal}/service-referrals`, requireRole(portal), paginatedMemberCollection('service-referrals'));
  dashboardRouter.get(`/${portal}/login-activity`, requireRole(portal), paginatedMemberCollection('login-activity'));
}

function paginatedMemberCollection(collection) {
  return asyncHandler(async (request, response) => {
    const page = Math.max(1, Number(request.query.page) || 1); const limit = Math.min(50, Math.max(5, Number(request.query.limit) || 10)); const skip = (page - 1) * limit; const userId = request.user._id;
    let query; let count;
    if (collection === 'referred-users') {
      query = User.find({ referredBy: userId }).select('fullName email mobile referralCode referredByCode createdAt roles').populate('roles', 'name slug').sort({ createdAt: -1 });
      count = User.countDocuments({ referredBy: userId });
    } else if (collection === 'service-referrals') {
      query = LoanReferral.find({ submittedBy: userId }).populate('service', 'name slug').sort({ createdAt: -1 });
      count = LoanReferral.countDocuments({ submittedBy: userId });
    } else {
      query = LoginActivity.find({ user: userId }).sort({ loginAt: -1 });
      count = LoginActivity.countDocuments({ user: userId });
    }
    const [items, total] = await Promise.all([query.skip(skip).limit(limit).lean(), count]);
    sendData(response, items, 200, { page, limit, total, pages: Math.ceil(total / limit) });
  });
}

dashboardRouter.get('/admin', requireRole(...ADMIN_ROLES), asyncHandler(async (_request, response) => {
  const [customerRole, contractorRole] = await Promise.all([Role.findOne({ slug: 'customer' }), Role.findOne({ slug: 'contractor' })]);
  const [totalUsers, totalCustomers, totalContractors, loginTotals, referredRegistrations, directRegistrations, totalCodes, totalLoanReferrals, recentRegistrations, recentLogins, recentLoanReferrals, mostUsedCodes, topCustomers, topContractors, loanReferralsByUser, totalApplications, applicationStatusTotals] = await Promise.all([
    User.countDocuments({ status: { $ne: 'deleted' } }),
    User.countDocuments({ roles: customerRole?._id, status: { $ne: 'deleted' } }),
    User.countDocuments({ roles: contractorRole?._id, status: { $ne: 'deleted' } }),
    User.aggregate([{ $group: { _id: null, total: { $sum: '$successfulLoginCount' }, unique: { $sum: { $cond: [{ $gt: ['$successfulLoginCount', 0] }, 1, 0] } } } }]),
    User.countDocuments({ referredBy: { $exists: true, $ne: null } }), User.countDocuments({ referredBy: { $exists: false } }), User.countDocuments({ referralCode: { $exists: true, $ne: null } }), LoanReferral.countDocuments(),
    User.find().populate('roles', 'name slug').populate('referredBy', 'fullName referralCode').sort({ createdAt: -1 }).limit(10).lean(),
    LoginActivity.find().populate('user', 'fullName email mobile referralCode').sort({ loginAt: -1 }).limit(15).lean(),
    LoanReferral.find().populate('submittedBy', 'fullName referralCode').populate('service', 'name').sort({ createdAt: -1 }).limit(15).lean(),
    User.aggregate([{ $match: { referredByCode: { $exists: true, $ne: null } } }, { $group: { _id: '$referredByCode', registrations: { $sum: 1 } } }, { $sort: { registrations: -1 } }, { $limit: 10 }, { $lookup: { from: 'users', localField: '_id', foreignField: 'referralCode', as: 'owner' } }, { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } }, { $project: { _id: 0, referralCode: '$_id', registrations: 1, owner: { _id: '$owner._id', fullName: '$owner.fullName' } } }]),
    topReferrers(customerRole?._id), topReferrers(contractorRole?._id),
    LoanReferral.aggregate([{ $group: { _id: '$submittedBy', submissions: { $sum: 1 } } }, { $sort: { submissions: -1 } }, { $limit: 20 }, { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } }, { $unwind: '$user' }, { $project: { _id: 0, user: { _id: '$user._id', fullName: '$user.fullName', referralCode: '$user.referralCode' }, submissions: 1 } }]),
    Application.countDocuments({ status: { $ne: 'draft' } }), Application.aggregate([{ $match: { status: { $ne: 'draft' } } }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
  ]);
  sendData(response, { metrics: { totalUsers, totalCustomers, totalContractors, totalSuccessfulLogins: loginTotals[0]?.total || 0, uniqueUsersLoggedIn: loginTotals[0]?.unique || 0, referredRegistrations, directRegistrations, totalReferralCodes: totalCodes, totalLoanReferrals, totalApplications }, applicationStatusTotals, recentRegistrations, recentLogins, recentLoanReferrals, mostUsedReferralCodes: mostUsedCodes, topReferringCustomers: topCustomers, topReferringContractors: topContractors, loanReferralsByUser });
}));

function topReferrers(roleId) {
  if (!roleId) return [];
  return User.aggregate([{ $match: { referredBy: { $exists: true, $ne: null } } }, { $group: { _id: '$referredBy', registrations: { $sum: 1 } } }, { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'owner' } }, { $unwind: '$owner' }, { $match: { 'owner.roles': roleId } }, { $sort: { registrations: -1 } }, { $limit: 10 }, { $project: { _id: 0, owner: { _id: '$owner._id', fullName: '$owner.fullName', referralCode: '$owner.referralCode' }, registrations: 1 } }]);
}

dashboardRouter.get('/admin/users', requireRole(...ADMIN_ROLES), asyncHandler(async (request, response) => {
  const page = Math.max(1, Number(request.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 25));
  const filter = { status: { $ne: 'deleted' } }; const q = String(request.query.q || '').trim();
  if (q) { const regex = new RegExp(escapeRegex(q), 'i'); filter.$or = [{ fullName: regex }, { email: regex }, { mobile: regex }, { referralCode: regex }]; }
  if (request.query.role) { const role = await Role.findOne({ slug: request.query.role }); filter.roles = role?._id || null; }
  const [users, total] = await Promise.all([User.find(filter).populate('roles', 'name slug').populate('referredBy', 'fullName referralCode').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), User.countDocuments(filter)]);
  const ids = users.map((user) => user._id); const [registrationCounts, loanCounts] = await Promise.all([User.aggregate([{ $match: { referredBy: { $in: ids } } }, { $group: { _id: '$referredBy', count: { $sum: 1 } } }]), LoanReferral.aggregate([{ $match: { submittedBy: { $in: ids } } }, { $group: { _id: '$submittedBy', count: { $sum: 1 } } }])]);
  const registrationMap = new Map(registrationCounts.map((item) => [String(item._id), item.count])); const loanMap = new Map(loanCounts.map((item) => [String(item._id), item.count]));
  sendData(response, users.map((user) => ({ ...user, referredUsersCount: registrationMap.get(String(user._id)) || 0, loanReferralsCount: loanMap.get(String(user._id)) || 0 })), 200, { page, limit, total, pages: Math.ceil(total / limit) });
}));

dashboardRouter.get('/admin/users/:id', requireRole(...ADMIN_ROLES), asyncHandler(async (request, response) => {
  const user = await User.findById(request.params.id).populate('roles', 'name slug').populate('referredBy', 'fullName email mobile referralCode').lean();
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found.');
  const [referredUsers, loanReferrals, loginActivity] = await Promise.all([User.find({ referredBy: user._id }).select('fullName email mobile roles referralCode createdAt').populate('roles', 'name slug').sort({ createdAt: -1 }).lean(), LoanReferral.find({ submittedBy: user._id }).populate('service', 'name slug').sort({ createdAt: -1 }).lean(), LoginActivity.find({ user: user._id }).sort({ loginAt: -1 }).limit(50).lean()]);
  sendData(response, { user, referredUsers, loanReferrals, loginActivity, metrics: { referredUsers: referredUsers.length, loanReferrals: loanReferrals.length, successfulLogins: user.successfulLoginCount || 0 } });
}));

dashboardRouter.get('/admin/referrals/:code', requireRole(...ADMIN_ROLES), asyncHandler(async (request, response) => {
  const owner = await User.findOne({ referralCode: request.params.code.toUpperCase() }).populate('roles', 'name slug').lean();
  if (!owner) throw new ApiError(404, 'REFERRAL_CODE_NOT_FOUND', 'Referral code not found.');
  const [registrations, loanReferrals] = await Promise.all([User.find({ referredBy: owner._id }).select('fullName email mobile roles referralCode referredByCode createdAt').populate('roles', 'name slug').sort({ createdAt: -1 }).lean(), LoanReferral.find({ submittedBy: owner._id }).populate('service', 'name slug').sort({ createdAt: -1 }).lean()]);
  sendData(response, { referralCode: owner.referralCode, owner, registrations, loanReferrals, metrics: { registrations: registrations.length, loanReferrals: loanReferrals.length } });
}));

dashboardRouter.get('/admin/loan-referrals', requireRole(...ADMIN_ROLES), asyncHandler(async (request, response) => {
  const page = Math.max(1, Number(request.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 25)); const filter = {};
  if (request.query.role) filter.submitterRole = request.query.role; if (request.query.status) filter.status = request.query.status;
  if (request.query.dateFrom || request.query.dateTo) filter.createdAt = { ...(request.query.dateFrom ? { $gte: new Date(request.query.dateFrom) } : {}), ...(request.query.dateTo ? { $lte: new Date(request.query.dateTo) } : {}) };
  const q = String(request.query.q || '').trim();
  if (q) { const regex = new RegExp(escapeRegex(q), 'i'); const submitters = await User.find({ fullName: regex }).distinct('_id'); filter.$or = [{ referralId: regex }, { 'applicant.fullName': regex }, { submitterReferralCode: regex }, { submittedBy: { $in: submitters } }]; }
  const [items, total] = await Promise.all([LoanReferral.find(filter).populate('submittedBy', 'fullName email mobile referralCode').populate('service', 'name slug').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), LoanReferral.countDocuments(filter)]);
  sendData(response, items, 200, { page, limit, total, pages: Math.ceil(total / limit) });
}));

const statusSchema = z.object({ status: z.enum(LOAN_REFERRAL_STATUSES), reason: z.string().trim().min(3).max(500) });
dashboardRouter.patch('/admin/loan-referrals/:id/status', requireRole(...ADMIN_ROLES), requireCsrf, validate(statusSchema), asyncHandler(async (request, response) => {
  const item = await LoanReferral.findById(request.params.id); if (!item) throw new ApiError(404, 'LOAN_REFERRAL_NOT_FOUND', 'Loan referral not found.'); const oldStatus = item.status;
  item.status = request.body.status; item.statusUpdatedAt = new Date(); await item.save();
  await AuditLog.create({ actor: request.user._id, actorRoles: request.user.roles.map((role) => role.slug), action: 'loan_referral.status.updated', resourceType: 'LoanReferral', resourceId: item._id, oldValues: { status: oldStatus }, newValues: { status: item.status }, reason: request.body.reason, ip: request.ip, userAgent: request.get('user-agent'), requestId: request.id });
  sendData(response, await LoanReferral.findById(item._id).populate('submittedBy', 'fullName referralCode').populate('service', 'name slug'));
}));

dashboardRouter.get('/admin/applications', requireRole(...ADMIN_ROLES), asyncHandler(async (request, response) => {
  const page = Math.max(1, Number(request.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 25)); const filter = { status: { $ne: 'draft' } };
  if (request.query.status) filter.status = request.query.status;
  if (request.query.service) filter.service = request.query.service;
  if (request.query.dateFrom || request.query.dateTo) filter.createdAt = { ...(request.query.dateFrom ? { $gte: new Date(request.query.dateFrom) } : {}), ...(request.query.dateTo ? { $lte: new Date(`${request.query.dateTo}T23:59:59.999Z`) } : {}) };
  const q = String(request.query.q || '').trim(); if (q) { const regex = new RegExp(escapeRegex(q), 'i'); filter.$or = [{ applicationId: regex }, { leadId: regex }, { 'personal.fullName': regex }, { 'personal.mobile': regex }, { 'personal.email': regex }]; }
  const [items, total] = await Promise.all([Application.find(filter).populate('service', 'name slug category').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), Application.countDocuments(filter)]);
  sendData(response, items, 200, { page, limit, total, pages: Math.ceil(total / limit) });
}));

dashboardRouter.get('/admin/applications/:id', requireRole(...ADMIN_ROLES), asyncHandler(async (request, response) => {
  const application = await Application.findById(request.params.id).populate('service', 'name slug category').lean(); if (!application) throw new ApiError(404, 'APPLICATION_NOT_FOUND', 'Application not found.');
  const [history, documents] = await Promise.all([ApplicationStatusHistory.find({ application: application._id }).select('+internalNote').populate('changedBy', 'fullName').sort({ createdAt: 1 }).lean(), ApplicationDocument.find({ application: application._id }).sort({ createdAt: -1 }).lean()]);
  sendData(response, { application, history, documents });
}));

const applicationStatusSchema = z.object({ status: z.enum(APPLICATION_STATUSES), publicNote: z.string().trim().min(5).max(1000), internalNote: z.string().trim().max(2000).optional(), reason: z.string().trim().min(3).max(500) });
dashboardRouter.patch('/admin/applications/:id/status', requireRole(...ADMIN_ROLES), requireCsrf, validate(applicationStatusSchema), asyncHandler(async (request, response) => {
  const application = await Application.findById(request.params.id); if (!application) throw new ApiError(404, 'APPLICATION_NOT_FOUND', 'Application not found.'); const oldStatus = application.status;
  application.status = request.body.status; application.updatedBy = request.user._id; await application.save();
  await Promise.all([
    ApplicationStatusHistory.create({ application: application._id, oldStatus, newStatus: application.status, changedBy: request.user._id, changedByRole: request.user.roles[0]?.slug, publicNote: request.body.publicNote, internalNote: request.body.internalNote, reason: request.body.reason }),
    AuditLog.create({ actor: request.user._id, actorRoles: request.user.roles.map((role) => role.slug), action: 'application.status.updated', resourceType: 'Application', resourceId: application._id, oldValues: { status: oldStatus }, newValues: { status: application.status }, reason: request.body.reason, ip: request.ip, userAgent: request.get('user-agent'), requestId: request.id }),
  ]);
  sendData(response, { id: application.id, applicationId: application.applicationId, status: application.status });
}));

const documentStatusSchema = z.object({ status: z.enum(['verified', 'rejected']), reason: z.string().trim().max(500).optional() });
dashboardRouter.patch('/admin/documents/:id/status', requireRole(...ADMIN_ROLES), requireCsrf, validate(documentStatusSchema), asyncHandler(async (request, response) => {
  const document = await ApplicationDocument.findById(request.params.id); if (!document) throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'Document not found.');
  document.status = request.body.status; document.rejectionReason = request.body.status === 'rejected' ? request.body.reason : undefined; document.verifiedBy = request.user._id; document.verifiedAt = new Date(); await document.save();
  sendData(response, document);
}));

dashboardRouter.get('/admin/documents/:id/access', requireRole(...ADMIN_ROLES), asyncHandler(async (request, response) => {
  const document = await ApplicationDocument.findById(request.params.id).lean(); if (!document) throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'Document not found.');
  sendData(response, { url: storageProvider.signedUrl(document.storage.publicId, { resourceType: document.storage.resourceType, expiresInSeconds: 300 }), expiresInSeconds: 300 });
}));

function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
