import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'public' },
  contact: {
    phone: { type: String, trim: true, default: '919160353295' },
    whatsapp: { type: String, trim: true, default: '919160353295' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    addressLines: { type: [String], default: [] },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    pinCode: { type: String, trim: true, default: '' },
    officeHours: { type: String, trim: true, default: '' },
  },
  legal: {
    legalName: { type: String, trim: true, default: 'VFS Groups' },
    registrationNumber: { type: String, trim: true, default: '' },
    gstNumber: { type: String, trim: true, default: '' },
    regulatoryDisclosure: { type: String, trim: true, default: '' },
    providerRelationship: { type: String, trim: true, default: 'VFS Groups provides financial-service application assistance and guidance. Product approval, pricing, issuance, cover, returns, and final terms are decided by the relevant regulated provider.' },
  },
  cashback: {
    enabled: { type: Boolean, default: false },
    terms: { type: String, trim: true, default: '' },
  },
  social: {
    facebook: { type: String, trim: true, default: '' },
    instagram: { type: String, trim: true, default: '' },
    linkedin: { type: String, trim: true, default: '' },
    youtube: { type: String, trim: true, default: '' },
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const SiteSettings = mongoose.model('SiteSettings', schema);
