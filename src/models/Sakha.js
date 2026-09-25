import mongoose from 'mongoose';

const SakhaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a Sakha name'],
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

export default mongoose.models.Sakha || mongoose.model('Sakha', SakhaSchema);
