import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { Role } from '../src/models/Role.js';
import { Application } from '../src/models/Application.js';
import { CallbackRequest } from '../src/models/CallbackRequest.js';
import { Contractor } from '../src/models/Contractor.js';
import { Customer } from '../src/models/Customer.js';
import { Faq } from '../src/models/Faq.js';
import { GalleryItem } from '../src/models/GalleryItem.js';
import { Service } from '../src/models/Service.js';
import { User } from '../src/models/User.js';
import { syncInitialAdmin } from '../src/seeds/initialAdmin.js';

describe('portal authentication flows', () => {
  let database;
  let app;

  beforeAll(async () => {
    database = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(database.getUri());
    app = createApp();
  }, 60_000);

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
    await Role.create([
      { name: 'Customer', slug: 'customer', permissions: [], isSystem: true },
      { name: 'Contractor', slug: 'contractor', permissions: [], isSystem: true },
      { name: 'Super Admin', slug: 'super-admin', permissions: [], isSystem: true },
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await database?.stop();
  });

  it.each([
    ['customer', { fullName: 'Test Customer', mobile: '919100000001', email: 'customer@gmail.com', password: 'CustomerPass123', country: 'India', city: 'Hyderabad', state: 'Telangana', referredByCode: '', consent: true }],
    ['contractor', { fullName: 'Test Contractor', mobile: '919100000002', email: 'contractor@gmail.com', password: 'ContractorPass123', country: 'India', city: 'Hyderabad', state: 'Telangana', businessName: 'Test Agency', referredByCode: '', consent: true }],
  ])('creates a %s session that can open its protected dashboard', async (portal, registration) => {
    const browser = request.agent(app);
    const registered = await browser.post(`/api/v1/auth/${portal}/register`).send(registration);

    expect(registered.status).toBe(201);
    expect(registered.headers['set-cookie'].some((cookie) => cookie.startsWith('vfs_access='))).toBe(true);
    expect(registered.headers['set-cookie'].some((cookie) => cookie.startsWith('vfs_refresh='))).toBe(true);

    const session = await browser.get('/api/v1/auth/me');
    expect(session.status).toBe(200);
    expect(session.body.data.user.roles.map((role) => role.slug)).toContain(portal);

    const dashboard = await browser.get(`/api/v1/dashboard/${portal}`);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.user.fullName).toBe(registration.fullName);

    for (const collection of ['referred-users', 'service-referrals', 'login-activity']) {
      const page = await browser.get(`/api/v1/dashboard/${portal}/${collection}?page=1&limit=10`);
      expect(page.status).toBe(200);
      expect(page.body.meta).toMatchObject({ page: 1, limit: 10 });
      expect(Array.isArray(page.body.data)).toBe(true);
    }
  }, 15_000);

  it('creates and synchronizes the environment-configured administrator credentials', async () => {
    const role = await Role.findOne({ slug: 'super-admin' });
    const config = {
      INITIAL_ADMIN_NAME: 'VFS Administrator',
      INITIAL_ADMIN_EMAIL: 'admin@example.com',
      INITIAL_ADMIN_MOBILE: '919100000003',
      INITIAL_ADMIN_PASSWORD: 'FirstAdminPass123',
    };

    expect((await syncInitialAdmin(config, role)).status).toBe('created');
    expect((await request(app).post('/api/v1/auth/admin/login').send({ identifier: config.INITIAL_ADMIN_EMAIL, password: config.INITIAL_ADMIN_PASSWORD })).status).toBe(200);

    const nextConfig = { ...config, INITIAL_ADMIN_PASSWORD: 'SecondAdminPass456' };
    expect((await syncInitialAdmin(nextConfig, role)).status).toBe('password_synchronized');
    expect((await request(app).post('/api/v1/auth/admin/login').send({ identifier: config.INITIAL_ADMIN_EMAIL, password: config.INITIAL_ADMIN_PASSWORD })).status).toBe(401);
    expect((await request(app).post('/api/v1/auth/admin/login').send({ identifier: config.INITIAL_ADMIN_EMAIL, password: nextConfig.INITIAL_ADMIN_PASSWORD })).status).toBe(200);
  }, 15_000);

  it('saves, resumes, submits, and securely tracks a public application', async () => {
    const service = await Service.create({ name: 'Test Personal Loan', slug: 'test-personal-loan', category: 'Loans', shortDescription: 'Test service', overview: 'Test overview', status: 'published' });
    const browser = request.agent(app);
    const draft = await browser.post('/api/v1/applications/public/drafts').send({ service: service.id, personal: { fullName: 'Draft Customer', mobile: '919100000099' }, financial: { employmentType: 'salaried', requestedAmount: 500000 }, serviceSpecific: { requirementSummary: 'Need assistance' } });
    expect(draft.status).toBe(201);
    const resumed = await browser.get(`/api/v1/applications/public/drafts/${draft.body.data.draftId}`).set('x-resume-token', draft.body.data.resumeToken);
    expect(resumed.status).toBe(200);
    expect(resumed.body.data.personal.fullName).toBe('Draft Customer');

    const submitted = await browser.post('/api/v1/applications/public/submit').set('x-resume-token', draft.body.data.resumeToken).send({
      draftId: draft.body.data.draftId, service: service.id,
      personal: { fullName: 'Draft Customer', mobile: '919100000099', email: 'draft@example.com', dateOfBirth: '1990-01-01', country: 'India', city: 'Hyderabad', state: 'Telangana', pinCode: '500001' },
      financial: { employmentType: 'salaried', employerOrBusinessName: 'Test Employer', monthlyIncome: 50000, annualTurnover: 0, existingEmi: 0, requestedAmount: 500000, itrStatus: 'not_sure', creditProfile: 'not_sure' },
      serviceSpecific: { requirementSummary: 'Need personal loan guidance' }, referralCode: '', consents: { privacy: true, communication: false, accuracy: true, terms: true }, website: '',
    });
    expect(submitted.status).toBe(201);
    expect(await Application.countDocuments()).toBe(1);

    const adminRole = await Role.findOne({ slug: 'super-admin' });
    const adminConfig = { INITIAL_ADMIN_NAME: 'Application Admin', INITIAL_ADMIN_EMAIL: 'applications@example.com', INITIAL_ADMIN_MOBILE: '919100000088', INITIAL_ADMIN_PASSWORD: 'ApplicationAdmin123' };
    await syncInitialAdmin(adminConfig, adminRole);
    const adminBrowser = request.agent(app);
    expect((await adminBrowser.post('/api/v1/auth/admin/login').send({ identifier: adminConfig.INITIAL_ADMIN_EMAIL, password: adminConfig.INITIAL_ADMIN_PASSWORD })).status).toBe(200);
    const adminApplications = await adminBrowser.get('/api/v1/dashboard/admin/applications?page=1&limit=25');
    expect(adminApplications.status).toBe(200);
    expect(adminApplications.body.data.map((item) => item.applicationId)).toContain(submitted.body.data.applicationId);

    const challenge = await browser.post('/api/v1/applications/public/track/request').send({ applicationId: submitted.body.data.applicationId, mobile: '919100000099' });
    expect(challenge.status).toBe(202);
    expect(challenge.body.data.mockCode).toMatch(/^\d{6}$/);
    const verified = await browser.post('/api/v1/applications/public/track/verify').send({ challengeId: challenge.body.data.challengeId, code: challenge.body.data.mockCode });
    expect(verified.status).toBe(200);
    expect(verified.body.data.application.applicationId).toBe(submitted.body.data.applicationId);
    const tracked = await browser.get(`/api/v1/applications/public/track/${submitted.body.data.applicationId}`).set('x-tracking-token', verified.body.data.trackToken);
    expect(tracked.status).toBe(200);
    expect(tracked.body.data.history).toHaveLength(1);
  }, 20_000);

  it('saves a customer-owned draft, restores account details, and links the submitted application', async () => {
    const service = await Service.create({ name: 'Customer Home Loan', slug: 'customer-home-loan', category: 'Loans', shortDescription: 'Test service', overview: 'Test overview', status: 'published' });
    const browser = request.agent(app);
    const registered = await browser.post('/api/v1/auth/customer/register').send({ fullName: 'Account Applicant', mobile: '919100000097', email: 'account-applicant@gmail.com', password: 'AccountApplicant123', country: 'India', city: 'Bengaluru', state: 'Karnataka', referredByCode: '', consent: true });
    expect(registered.status).toBe(201);
    const csrfToken = (await browser.get('/api/v1/auth/csrf')).body.data.csrfToken;

    const initial = await browser.get('/api/v1/applications/customer/draft');
    expect(initial.status).toBe(200);
    expect(initial.body.data.account).toMatchObject({ fullName: 'Account Applicant', mobile: '919100000097', email: 'account-applicant@gmail.com', country: 'India', city: 'Bengaluru', state: 'Karnataka' });
    expect(initial.body.data.draft).toBeNull();

    const saved = await browser.put('/api/v1/applications/customer/draft').set('x-csrf-token', csrfToken).send({ service: service.id, personal: { fullName: 'Account Applicant', mobile: '919100000097', email: 'account-applicant@gmail.com', country: 'India', city: 'Bengaluru', state: 'Karnataka' }, financial: { employmentType: 'salaried', requestedAmount: 750000 }, serviceSpecific: { requirementSummary: 'Need home loan assistance' }, referralCode: '', consents: { privacy: false, communication: false, accuracy: false, terms: false } });
    expect(saved.status).toBe(201);
    expect(saved.body.data.draftId).toBeTruthy();

    const restored = await browser.get('/api/v1/applications/customer/draft');
    expect(restored.body.data.draft.personal.fullName).toBe('Account Applicant');

    const submitted = await browser.post('/api/v1/applications/customer/submit').set('x-csrf-token', csrfToken).send({
      draftId: saved.body.data.draftId, service: service.id,
      personal: { fullName: 'Account Applicant', mobile: '919100000097', email: 'account-applicant@gmail.com', dateOfBirth: '1990-01-01', country: 'India', city: 'Bengaluru', state: 'Karnataka', pinCode: '560079' },
      financial: { employmentType: 'salaried', employerOrBusinessName: 'Test Employer', monthlyIncome: 80000, annualTurnover: 0, existingEmi: 0, requestedAmount: 750000, itrStatus: 'available', creditProfile: 'good' },
      serviceSpecific: { requirementSummary: 'Need home loan assistance' }, referralCode: '', consents: { privacy: true, communication: true, accuracy: true, terms: true }, website: '',
    });
    expect(submitted.status).toBe(201);
    const customer = await Customer.findOne({ user: registered.body.data.user._id });
    expect(await Application.findOne({ applicationId: submitted.body.data.applicationId }).lean()).toMatchObject({ customer: customer._id, createdBy: new mongoose.Types.ObjectId(registered.body.data.user._id), status: 'submitted' });
    expect((await browser.get('/api/v1/applications/customer/draft')).body.data.draft).toBeNull();
  }, 20_000);

  it('returns exact application field names for validation errors', async () => {
    const response = await request(app).post('/api/v1/applications/public/submit').send({
      service: 'not-an-object-id',
      personal: { fullName: '', mobile: '123', email: 'not-an-email', dateOfBirth: '2999-01-01', country: 'India', city: '', state: '', pinCode: '123' },
      financial: { employmentType: 'salaried', requestedAmount: 0 }, serviceSpecific: { requirementSummary: '' }, referralCode: '', consents: { privacy: false, communication: false, accuracy: false, terms: false }, website: '',
    });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.fields).toMatchObject({ service: expect.any(String), 'personal.email': expect.any(String), 'financial.requestedAmount': expect.any(String), 'consents.privacy': expect.any(String) });
  });

  it('validates an approved contractor referral code before application submission', async () => {
    await Contractor.create({ contractorId: 'VFS-CON-TEST-001', referralCode: 'VFSC123456', user: new mongoose.Types.ObjectId(), onboardingStatus: 'approved' });
    const valid = await request(app).post('/api/v1/applications/public/referrals/validate').send({ referralCode: 'vfsc123456' });
    expect(valid.status).toBe(200);
    expect(valid.body.data).toMatchObject({ valid: true, referralCode: 'VFSC123456' });

    const invalid = await request(app).post('/api/v1/applications/public/referrals/validate').send({ referralCode: 'VFSC000000' });
    expect(invalid.status).toBe(422);
    expect(invalid.body.error.code).toBe('REFERRAL_INVALID');
  });

  it('publishes only approved FAQ records', async () => {
    await Faq.create([{ category: 'Applications', question: 'Published question?', answer: 'This answer is publicly available.', status: 'published' }, { category: 'Applications', question: 'Draft question?', answer: 'This answer must remain private.', status: 'draft' }]);
    const response = await request(app).get('/api/v1/content/faqs');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].question).toBe('Published question?');
  });

  it('stores quick service enquiries and lets an administrator manage their status', async () => {
    const service = await Service.create({ name: 'Quick Home Loan', slug: 'quick-home-loan', category: 'Loans', shortDescription: 'Home loan assistance', overview: 'Home loan guidance', status: 'published' });
    const submitted = await request(app).post('/api/v1/contact/callbacks').send({ name: 'Service Customer', mobile: '919100000055', service: service.id, consent: true, website: '' });
    expect(submitted.status).toBe(201);
    expect(await CallbackRequest.countDocuments({ service: service._id, mobile: '919100000055' })).toBe(1);

    const adminRole = await Role.findOne({ slug: 'super-admin' });
    const config = { INITIAL_ADMIN_NAME: 'Enquiry Admin', INITIAL_ADMIN_EMAIL: 'enquiries@example.com', INITIAL_ADMIN_MOBILE: '919100000056', INITIAL_ADMIN_PASSWORD: 'EnquiryAdminPass123' };
    await syncInitialAdmin(config, adminRole);
    const browser = request.agent(app);
    expect((await browser.post('/api/v1/auth/admin/login').send({ identifier: config.INITIAL_ADMIN_EMAIL, password: config.INITIAL_ADMIN_PASSWORD })).status).toBe(200);
    const csrf = await browser.get('/api/v1/auth/csrf');
    const enquiries = await browser.get('/api/v1/dashboard/admin/callback-requests?page=1&limit=25');
    expect(enquiries.status).toBe(200);
    expect(enquiries.body.data[0]).toMatchObject({ name: 'Service Customer', mobile: '919100000055', status: 'new' });
    expect(enquiries.body.data[0].service.name).toBe('Quick Home Loan');
    const updated = await browser.patch(`/api/v1/dashboard/admin/callback-requests/${enquiries.body.data[0]._id}/status`).set('x-csrf-token', csrf.body.data.csrfToken).send({ status: 'scheduled' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.status).toBe('scheduled');
  }, 15_000);

  it('lets administrators reorder gallery media and publishes only approved visible items', async () => {
    const adminRole = await Role.findOne({ slug: 'super-admin' });
    const config = { INITIAL_ADMIN_NAME: 'Gallery Admin', INITIAL_ADMIN_EMAIL: 'gallery@example.com', INITIAL_ADMIN_MOBILE: '919100000077', INITIAL_ADMIN_PASSWORD: 'GalleryAdminPass123' };
    await syncInitialAdmin(config, adminRole);
    const browser = request.agent(app);
    expect((await browser.post('/api/v1/auth/admin/login').send({ identifier: config.INITIAL_ADMIN_EMAIL, password: config.INITIAL_ADMIN_PASSWORD })).status).toBe(200);
    const csrf = await browser.get('/api/v1/auth/csrf');
    const token = csrf.body.data.csrfToken;

    const [first, second, draft] = await GalleryItem.create([
      { title: 'First image', altText: 'First gallery image', category: 'Office', status: 'published', consentConfirmed: true, websiteVisible: true, sortOrder: 0, media: { resourceType: 'image', url: 'https://example.com/first.jpg' } },
      { title: 'Second video', altText: 'Second gallery video', category: 'Events', status: 'published', consentConfirmed: true, websiteVisible: true, sortOrder: 1, media: { resourceType: 'video', url: 'https://example.com/second.mp4' } },
      { title: 'Private draft', altText: 'Private draft media', category: 'Team', status: 'draft', consentConfirmed: false, sortOrder: 2, media: { resourceType: 'image', url: 'https://example.com/draft.jpg' } },
    ]);

    const reordered = await browser.patch('/api/v1/content/admin/gallery/reorder').set('x-csrf-token', token).send({ ids: [second.id, first.id, draft.id] });
    expect(reordered.status).toBe(200);
    expect(reordered.body.data.map((item) => item.title)).toEqual(['Second video', 'First image', 'Private draft']);

    const rejected = await browser.patch(`/api/v1/content/admin/gallery/${draft.id}`).set('x-csrf-token', token).send({ status: 'published' });
    expect(rejected.status).toBe(422);
    expect(rejected.body.error.code).toBe('GALLERY_CONSENT_REQUIRED');

    const publicGallery = await request(app).get('/api/v1/content/gallery');
    expect(publicGallery.status).toBe(200);
    expect(publicGallery.body.data.map((item) => item.title)).toEqual(['Second video', 'First image']);
  }, 15_000);

  it('separates member directories and safely manages customer profile access', async () => {
    const customerBrowser = request.agent(app);
    const registered = await customerBrowser.post('/api/v1/auth/customer/register').send({ fullName: 'Original Customer', mobile: '919100000066', email: 'managed@gmail.com', password: 'ManagedCustomer123', country: 'India', city: 'Hyderabad', state: 'Telangana', referredByCode: '', consent: true });
    expect(registered.status).toBe(201); const customerId = registered.body.data.user._id;
    const contractorBrowser = request.agent(app);
    const contractor = await contractorBrowser.post('/api/v1/auth/contractor/register').send({ fullName: 'Listed Contractor', mobile: '919100000044', email: 'listed-contractor@gmail.com', password: 'ListedContractor123', country: 'India', city: 'Warangal', state: 'Telangana', businessName: 'Listed Finance Services', referredByCode: '', consent: true });
    expect(contractor.status).toBe(201);

    const adminRole = await Role.findOne({ slug: 'super-admin' });
    const config = { INITIAL_ADMIN_NAME: 'Member Admin', INITIAL_ADMIN_EMAIL: 'members@example.com', INITIAL_ADMIN_MOBILE: '919100000055', INITIAL_ADMIN_PASSWORD: 'MemberAdminPass123' };
    await syncInitialAdmin(config, adminRole);
    const adminBrowser = request.agent(app);
    expect((await adminBrowser.post('/api/v1/auth/admin/login').send({ identifier: config.INITIAL_ADMIN_EMAIL, password: config.INITIAL_ADMIN_PASSWORD })).status).toBe(200);
    const token = (await adminBrowser.get('/api/v1/auth/csrf')).body.data.csrfToken;

    const customers = await adminBrowser.get('/api/v1/dashboard/admin/users?role=customer&page=1&limit=25');
    expect(customers.status).toBe(200);
    expect(customers.body.data).toHaveLength(1);
    expect(customers.body.data[0].profile).toMatchObject({ country: 'India', city: 'Hyderabad', state: 'Telangana' });
    const contractors = await adminBrowser.get('/api/v1/dashboard/admin/users?role=contractor&page=1&limit=25');
    expect(contractors.body.data).toHaveLength(1);
    expect(contractors.body.data[0].profile).toMatchObject({ country: 'India', city: 'Warangal', state: 'Telangana', businessName: 'Listed Finance Services' });

    const details = await adminBrowser.get(`/api/v1/dashboard/admin/users/${customerId}`);
    expect(details.status).toBe(200);
    expect(details.body.data.user).toMatchObject({ email: 'managed@gmail.com', mobile: '919100000066' });
    expect(details.body.data.profile.customerId).toMatch(/^VFSCU-/);

    const protectedField = await adminBrowser.patch(`/api/v1/dashboard/admin/users/${customerId}`).set('x-csrf-token', token).send({ fullName: 'Changed Customer', country: 'India', city: 'Vijayawada', state: 'Andhra Pradesh', status: 'active', reason: 'Profile correction', email: 'changed@example.com' });
    expect(protectedField.status).toBe(422);
    const changed = await adminBrowser.patch(`/api/v1/dashboard/admin/users/${customerId}`).set('x-csrf-token', token).send({ fullName: 'Changed Customer', country: 'India', city: 'Vijayawada', state: 'Andhra Pradesh', status: 'active', reason: 'Profile correction' });
    expect(changed.status).toBe(200);
    expect(changed.body.data.user).toMatchObject({ fullName: 'Changed Customer', email: 'managed@gmail.com', mobile: '919100000066' });
    expect(await Customer.findOne({ user: customerId }).lean()).toMatchObject({ country: 'India', city: 'Vijayawada', state: 'Andhra Pradesh' });
    expect(await AuditLog.countDocuments({ resourceId: customerId, action: 'member.profile.updated' })).toBe(1);

    const removed = await adminBrowser.delete(`/api/v1/dashboard/admin/users/${customerId}`).set('x-csrf-token', token).send({ reason: 'Duplicate test account' });
    expect(removed.status).toBe(200);
    expect(removed.body.data).toMatchObject({ removed: true, recordsPreserved: true });
    expect(await User.findById(customerId).lean()).toMatchObject({ status: 'deleted' });
    expect(await Customer.exists({ user: customerId })).toBeTruthy();
    expect((await adminBrowser.get(`/api/v1/dashboard/admin/users/${customerId}`)).status).toBe(404);
    expect((await customerBrowser.get('/api/v1/dashboard/customer')).status).toBe(401);
    expect((await adminBrowser.get('/api/v1/dashboard/admin/users?role=customer&page=1&limit=25')).body.data).toHaveLength(0);
  }, 20_000);

  it('answers chat greetings through the working mock provider', async () => {
    await Service.create({ name: 'Personal Loans', slug: 'personal-loans', category: 'Loans', shortDescription: 'Personal funding assistance.', overview: 'Guided assistance.', status: 'published', eligibility: ['Salaried and self-employed'], documents: ['Identity proof'], process: ['Share requirement'] });
    const response = await request(app).post('/api/v1/chat/messages').send({ message: 'hi', history: [] });
    expect(response.status).toBe(200);
    expect(response.body.data.message).toContain('Hello');
    expect(response.body.data.provider).toBe('mock-ai');
  });
});
