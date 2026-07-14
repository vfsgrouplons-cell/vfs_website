import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { Permission } from '../models/Permission.js';
import { Role } from '../models/Role.js';
import { Service } from '../models/Service.js';
import { ContentPage } from '../models/ContentPage.js';
import { Faq } from '../models/Faq.js';
import { SiteSettings } from '../models/SiteSettings.js';
import { Contractor } from '../models/Contractor.js';
import { User } from '../models/User.js';
import { nextReferralCode } from '../utils/identifiers.js';
import { syncInitialAdmin } from './initialAdmin.js';
import { contentPages, generalFaqs, permissions, roleDefinitions, services } from './referenceData.js';

const roleNames = { 'super-admin': 'Super Admin', admin: 'Admin', 'operations-manager': 'Operations Manager', 'application-manager': 'Application Manager', 'finance-manager': 'Finance Manager', 'support-agent': 'Support Agent', 'content-manager': 'Content Manager', contractor: 'Contractor', customer: 'Customer' };

async function seed() {
  await connectDatabase();
  const removedPermissions = await Permission.find({ key: { $in: ['payments.view', 'payments.manage'] } }).select('_id');
  if (removedPermissions.length) {
    await Role.updateMany({}, { $pull: { permissions: { $in: removedPermissions.map((item) => item._id) } } });
    await Permission.deleteMany({ _id: { $in: removedPermissions.map((item) => item._id) } });
  }
  const permissionDocs = {};
  for (const [key, description] of permissions) permissionDocs[key] = await Permission.findOneAndUpdate({ key }, { $set: { description } }, { new: true, upsert: true });
  const roleDocs = {};
  for (const [slug, keys] of Object.entries(roleDefinitions)) roleDocs[slug] = await Role.findOneAndUpdate({ slug }, { $set: { name: roleNames[slug], permissions: keys.map((key) => permissionDocs[key]._id), isSystem: true } }, { new: true, upsert: true });
  const usersWithoutCodes = await User.find({ referralCode: { $exists: false }, roles: { $in: [roleDocs.customer._id, roleDocs.contractor._id] } });
  for (const user of usersWithoutCodes) {
    const accountType = user.roles.some((role) => String(role) === String(roleDocs.contractor._id)) ? 'contractor' : 'customer';
    const code = await nextReferralCode(accountType);
    await User.updateOne({ _id: user._id, referralCode: { $exists: false } }, { $set: { referralCode: code } });
    if (accountType === 'contractor') await Contractor.updateOne({ user: user._id }, { $set: { referralCode: code } });
  }
  const activeServiceSlugs = services.map((service) => service.slug);
  const archivedServices = await Service.updateMany({ slug: { $nin: activeServiceSlugs }, status: { $ne: 'archived' } }, { $set: { status: 'archived' } });
  for (const service of services) await Service.findOneAndUpdate({ slug: service.slug }, { $set: service }, { new: true, upsert: true, runValidators: true });
  await SiteSettings.findOneAndUpdate({ key: 'public' }, { $setOnInsert: { key: 'public' } }, { new: true, upsert: true, setDefaultsOnInsert: true });
  for (const faq of generalFaqs) await Faq.findOneAndUpdate({ question: faq.question }, { $setOnInsert: faq }, { new: true, upsert: true, setDefaultsOnInsert: true });
  for (const page of contentPages) await ContentPage.findOneAndUpdate({ slug: page.slug }, { $setOnInsert: page }, { new: true, upsert: true, setDefaultsOnInsert: true });
  const initialAdmin = await syncInitialAdmin(env, roleDocs['super-admin']);
  console.info(`Seeded ${permissions.length} permissions, ${Object.keys(roleDefinitions).length} roles, ${services.length} services, ${generalFaqs.length} FAQs, ${contentPages.length} content pages, archived ${archivedServices.modifiedCount} retired services, initialized ${usersWithoutCodes.length} referral codes, and admin status is ${initialAdmin.status}.`);
}

seed().then(disconnectDatabase).catch(async (error) => { console.error(error); await disconnectDatabase(); process.exit(1); });
