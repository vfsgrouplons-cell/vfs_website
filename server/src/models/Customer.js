import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  customerId: { type: String, required: true, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  city: { type: String, trim: true }, state: { type: String, trim: true },
  referralAttribution: { type: mongoose.Schema.Types.ObjectId, ref: 'ReferralAttribution' },
  communicationPreferences: { email: { type: Boolean, default: true }, sms: { type: Boolean, default: true }, whatsapp: { type: Boolean, default: false } },
}, { timestamps: true });
export const Customer = mongoose.model('Customer', schema);
