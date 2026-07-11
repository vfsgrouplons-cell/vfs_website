import { Counter } from '../models/Counter.js';

const PREFIXES = { customer: 'VFSCU', contractor: 'VFSC', lead: 'VFS-LEAD', application: 'VFS-APP', subscription: 'VFS-SUB', payment: 'VFS-PAY', commission: 'VFS-COM' };

export async function nextPublicId(kind, session) {
  if (!PREFIXES[kind]) throw new Error(`Unknown identifier kind: ${kind}`);
  const year = new Date().getUTCFullYear();
  const counter = await Counter.findOneAndUpdate({ key: `${kind}:${year}` }, { $inc: { value: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true, session });
  return `${PREFIXES[kind]}-${year}-${String(counter.value).padStart(6, '0')}`;
}
