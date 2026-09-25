import mongoose from 'mongoose';

const CertificateFieldSchema = new mongoose.Schema({
  key: { type: String, required: true },
  x: { type: Number, required: true, min: 0, max: 100 },
  y: { type: Number, required: true, min: 0, max: 100 },
  fontSize: { type: Number, required: true, min: 8, max: 72 },
  color: { type: String, required: true },
  align: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
  groupId: { type: String, default: '' },
}, { _id: false });

const CertificateDesignSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  mode: { type: String, enum: ['blank', 'uploaded'], default: 'blank' },
  title: { type: String, default: 'CERTIFICATE OF ACHIEVEMENT' },
  subtitle: { type: String, default: 'This certificate is proudly presented to' },
  backgroundImage: { type: String, default: '' },
  fields: { type: [CertificateFieldSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.CertificateDesign || mongoose.model('CertificateDesign', CertificateDesignSchema);