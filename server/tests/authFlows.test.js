import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { Role } from '../src/models/Role.js';
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
  });

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
  });
});
