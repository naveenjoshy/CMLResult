import mongoose from 'mongoose';

const ParishSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a Parish name'],
    unique: true,
    trim: true,
  },
  mekhala: {
    type: String,
    required: [true, 'Please specify the parent Mekhala'],
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Parish || mongoose.model('Parish', ParishSchema);