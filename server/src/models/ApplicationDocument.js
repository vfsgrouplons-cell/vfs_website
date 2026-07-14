import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
  category: { type: String, enum: ['identity', 'address', 'income', 'bank_statement', 'property', 'vehicle', 'insurance', 'investment', 'other'], default: 'other' },
  originalName: { type: String, required: true, trim: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  storage: {
    provider: String, publicId: String, version: Number, resourceType: String, deliveryType: String,
    format: String, bytes: Number,
  },
  status: { type: String, enum: ['uploaded', 'verified', 'rejected'], default: 'uploaded', index: true },
  rejectionReason: String,
  uploadedByRole: { type: String, default: 'verified_applicant' },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,
}, { timestamps: true });
schema.index({ application: 1, createdAt: -1 });
export const ApplicationDocument = mongoose.model('ApplicationDocument', schema);
