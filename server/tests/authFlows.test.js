import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { Role } from '../src/models/Role.js';
import { Application } from '../src/models/Application.js';
import { Contractor } from '../src/models/Contractor.js';
import { Faq } from '../src/models/Faq.js';
import { GalleryItem } from '../src/models/GalleryItem.js';
import { Service } from '../src/models/Service.js';
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
    ['customer', { fullName: 'Test Customer', mobile: '919100000001', email: 'customer@example.com', password: 'CustomerPass123', city: 'Hyderabad', state: 'Telangana', referredByCode: '', consent: true }],
    ['contractor', { fullName: 'Test Contractor', mobile: '919100000002', email: 'contractor@example.com', password: 'ContractorPass123', city: 'Hyderabad', state: 'Telangana', businessName: 'Test Agency', referredByCode: '', consent: true }],
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
      personal: { fullName: 'Draft Customer', mobile: '919100000099', email: 'draft@example.com', dateOfBirth: '1990-01-01', city: 'Hyderabad', state: 'Telangana', pinCode: '500001' },
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

  it('lets administrators reorder gallery media and blocks publication without consent', async () => {
    const adminRole = await Role.findOne({ slug: 'super-admin' });
    const config = { INITIAL_ADMIN_NAME: 'Gallery Admin', INITIAL_ADMIN_EMAIL: 'gallery@example.com', INITIAL_ADMIN_MOBILE: '919100000077', INITIAL_ADMIN_PASSWORD: 'GalleryAdminPass123' };
    await syncInitialAdmin(config, adminRole);
    const browser = request.agent(app);
    expect((await browser.post('/api/v1/auth/admin/login').send({ identifier: config.INITIAL_ADMIN_EMAIL, password: config.INITIAL_ADMIN_PASSWORD })).status).toBe(200);
    const csrf = await browser.get('/api/v1/auth/csrf');
    const token = csrf.body.data.csrfToken;

    const [first, second, draft] = await GalleryItem.create([
      { title: 'First image', altText: 'First gallery image', category: 'Office', status: 'published', consentConfirmed: true, sortOrder: 0, media: { resourceType: 'image', url: 'https://example.com/first.jpg' } },
      { title: 'Second video', altText: 'Second gallery video', category: 'Events', status: 'published', consentConfirmed: true, sortOrder: 1, media: { resourceType: 'video', url: 'https://example.com/second.mp4' } },
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

  it('answers chat greetings through the working mock provider', async () => {
    await Service.create({ name: 'Personal Loans', slug: 'personal-loans', category: 'Loans', shortDescription: 'Personal funding assistance.', overview: 'Guided assistance.', status: 'published', eligibility: ['Salaried and self-employed'], documents: ['Identity proof'], process: ['Share requirement'] });
    const response = await request(app).post('/api/v1/chat/messages').send({ message: 'hi', history: [] });
    expect(response.status).toBe(200);
    expect(response.body.data.message).toContain('Hello');
    expect(response.body.data.provider).toBe('mock-ai');
  });
});
