import mongoose from 'mongoose';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { Application } from '../../models/Application.js';
import { ApplicationStatusHistory } from '../../models/ApplicationStatusHistory.js';
import { AuditLog } from '../../models/AuditLog.js';
import { Contractor } from '../../models/Contractor.js';
import { Service } from '../../models/Service.js';
import { ApiError } from '../../utils/apiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendData } from '../../utils/apiResponse.js';
import { nextPublicId } from '../../utils/identifiers.js';

export const applicationRouter = Router();
const mobile = z.string().trim().regex(/^\+?[1-9]\d{9,14}$/);
const schema = z.object({
  service: z.string().regex(/^[a-f\d]{24}$/i),
  personal: z.object({ fullName: z.string().trim().min(2).max(100), mobile, email: z.string().trim().email().toLowerCase(), dateOfBirth: z.coerce.date().max(new Date()), city: z.string().trim().min(2).max(80), state: z.string().trim().min(2).max(80), pinCode: z.string().trim().regex(/^\d{6}$/) }),
  financial: z.object({ employmentType: z.enum(['salaried','self_employed','business','other']), employerOrBusinessName: z.string().trim().max(150).optional(), monthlyIncome: z.coerce.number().min(0).max(1_000_000_000).optional(), annualTurnover: z.coerce.number().min(0).max(100_000_000_000).optional(), existingEmi: z.coerce.number().min(0).max(1_000_000_000).default(0), requestedAmount: z.coerce.number().positive().max(100_000_000_000), itrStatus: z.enum(['available','not_available','not_sure']).optional(), creditProfile: z.enum(['low','fair','good','not_sure']).optional() }),
  serviceSpecific: z.record(z.string().max(1000)).default({}), referralCode: z.string().trim().toUpperCase().max(40).optional().or(z.literal('')),
  consents: z.object({ privacy: z.literal(true), communication: z.boolean(), accuracy: z.literal(true), terms: z.literal(true) }), website: z.string().max(0).optional(),
});

applicationRouter.post('/public/submit', rateLimit({ windowMs: 60 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false }), validate(schema), asyncHandler(async (request, response) => {
  const input = { ...request.body }; delete input.website;
  const service = await Service.findOne({ _id: input.service, status: 'published' }).select('_id');
  if (!service) throw new ApiError(422, 'SERVICE_UNAVAILABLE', 'Choose an available service.');
  const contractor = input.referralCode ? await Contractor.findOne({ referralCode: input.referralCode, onboardingStatus: 'approved' }).select('_id referralCode') : null;
  if (input.referralCode && !contractor) throw new ApiError(422, 'REFERRAL_INVALID', 'The referral code is not valid or active.');

  const session = await mongoose.startSession(); let application;
  try {
    await session.withTransaction(async () => {
      const now = new Date();
      const [created] = await Application.create([{ applicationId: await nextPublicId('application', session), leadId: await nextPublicId('lead', session), service: service._id, contractor: contractor?._id, referralCode: contractor?.referralCode, referralLockedAt: contractor ? now : undefined, personal: input.personal, financial: input.financial, serviceSpecific: input.serviceSpecific, consents: { ...input.consents, capturedAt: now, ip: request.ip, userAgent: request.get('user-agent') }, status: 'submitted', submittedAt: now }], { session });
      application = created;
      await ApplicationStatusHistory.create([{ application: application._id, newStatus: 'submitted', changedByRole: 'public_applicant', publicNote: 'Your application was submitted to VFS Groups for an initial completeness review.', reason: 'Public application submission' }], { session });
      await AuditLog.create([{ action: 'application.public.submitted', resourceType: 'Application', resourceId: application._id, newValues: { status: 'submitted', referralCode: contractor?.referralCode }, ip: request.ip, userAgent: request.get('user-agent'), requestId: request.id }], { session });
    });
  } finally { await session.endSession(); }
  sendData(response, { applicationId: application.applicationId, leadId: application.leadId, status: application.status, submittedAt: application.submittedAt, acknowledgement: 'Your application has been received for an initial completeness review. This is not an approval or offer.' }, 201);
}));
