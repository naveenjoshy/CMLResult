import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide an event name'],
    trim: true,
  },
  category: {
    type: String,
    default: 'General',
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  points: {
    first: { type: Number, default: 5 },
    second: { type: Number, default: 3 },
    third: { type: Number, default: 1 },
    gradeA: { type: Number, default: 5 },
    gradeB: { type: Number, default: 3 },
    gradeC: { type: Number, default: 1 },
  },
  status: {
    type: String,
    enum: ['Upcoming', 'In Progress', 'Completed'],
    default: 'Upcoming',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Event || mongoose.model('Event', EventSchema);
