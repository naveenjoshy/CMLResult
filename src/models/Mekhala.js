import mongoose from 'mongoose';

const MekhalaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a Mekhala name'],
    unique: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Mekhala || mongoose.model('Mekhala', MekhalaSchema);
