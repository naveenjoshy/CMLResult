import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true,
  },
  minAge: {
    type: Number,
    default: 0,
  },
  maxAge: {
    type: Number,
    default: 99,
  },
  minDob: {
    type: String, // 'YYYY-MM-DD'
    default: '',
  },
  maxDob: {
    type: String, // 'YYYY-MM-DD'
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  order: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Category || mongoose.model('Category', CategorySchema);
