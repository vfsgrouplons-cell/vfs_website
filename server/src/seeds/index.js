import bcrypt from 'bcrypt';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { Permission } from '../models/Permission.js';
import { Role } from '../models/Role.js';
import { Service } from '../models/Service.js';
import { User } from '../models/User.js';
import { permissions, roleDefinitions, services } from './referenceData.js';

const roleNames = { 'super-admin': 'Super Admin', admin: 'Admin', 'operations-manager': 'Operations Manager', 'application-manager': 'Application Manager', 'finance-manager': 'Finance Manager', 'support-agent': 'Support Agent', 'content-manager': 'Content Manager', contractor: 'Contractor', customer: 'Customer' };

async function seed() {
  await connectDatabase();
  const permissionDocs = {};
  for (const [key, description] of permissions) permissionDocs[key] = await Permission.findOneAndUpdate({ key }, { $set: { description } }, { new: true, upsert: true });
  const roleDocs = {};
  for (const [slug, keys] of Object.entries(roleDefinitions)) roleDocs[slug] = await Role.findOneAndUpdate({ slug }, { $set: { name: roleNames[slug], permissions: keys.map((key) => permissionDocs[key]._id), isSystem: true } }, { new: true, upsert: true });
  for (const service of services) await Service.findOneAndUpdate({ slug: service.slug }, { $set: service }, { new: true, upsert: true, runValidators: true });
  if (env.INITIAL_ADMIN_EMAIL && env.INITIAL_ADMIN_PASSWORD && env.INITIAL_ADMIN_NAME) {
    await User.findOneAndUpdate({ email: env.INITIAL_ADMIN_EMAIL.toLowerCase() }, { $setOnInsert: { fullName: env.INITIAL_ADMIN_NAME, email: env.INITIAL_ADMIN_EMAIL.toLowerCase(), mobile: `admin-${Date.now()}`, passwordHash: await bcrypt.hash(env.INITIAL_ADMIN_PASSWORD, 12), roles: [roleDocs['super-admin']._id], status: 'active', emailVerifiedAt: new Date() } }, { upsert: true });
  }
  console.info(`Seeded ${permissions.length} permissions, ${Object.keys(roleDefinitions).length} roles, and ${services.length} services.`);
}

seed().then(disconnectDatabase).catch(async (error) => { console.error(error); await disconnectDatabase(); process.exit(1); });
