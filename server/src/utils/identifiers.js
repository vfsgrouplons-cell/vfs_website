import { Counter } from '../models/Counter.js';

const PREFIXES = { customer: 'VFSCU', contractor: 'VFSC', lead: 'VFS-LEAD', application: 'VFS-APP', subscription: 'VFS-SUB', commission: 'VFS-COM', loanReferral: 'VFS-REF' };

export async function nextPublicId(kind, session) {
  if (!PREFIXES[kind]) throw new Error(`Unknown identifier kind: ${kind}`);
  const year = new Date().getUTCFullYear();
  const counter = await Counter.findOneAndUpdate({ key: `${kind}:${year}` }, { $inc: { value: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true, session });
  return `${PREFIXES[kind]}-${year}-${String(counter.value).padStart(6, '0')}`;
}

export async function nextReferralCode(role, session) {
  if (!['customer', 'contractor'].includes(role)) throw new Error(`Unsupported referral role: ${role}`);
  const year = new Date().getUTCFullYear();
  const counter = await Counter.findOneAndUpdate({ key: `referral:${role}:${year}` }, { $inc: { value: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true, session });
  const roleCode = role === 'customer' ? 'CU' : 'CO';
  return `VFS-${roleCode}-${year}-${String(counter.value).padStart(6, '0')}`;
}
