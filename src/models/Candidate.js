import mongoose from 'mongoose';

const CandidateSchema = new mongoose.Schema({
  chestNo: {
    type: String,
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Candidate name is required'],
    trim: true,
  },
  houseName: {
    type: String,
    required: [true, 'House name is required'],
    trim: true,
  },
  dob: {
    type: String,
    required: [true, 'Date of birth is required'],
  },
  phone: {
    type: String,
    trim: true,
  },
  sakha: {
    type: String,
    required: [true, 'Sakha is required'],
    trim: true,
  },
  mekhala: {
    type: String,
    required: [true, 'Mekhala is required'],
    trim: true,
  },
  section: {
    type: String,
    required: [true, 'Section is required'],
    trim: true,
  },
  sex: {
    type: String,
    required: [true, 'Sex is required'],
    enum: ['Male', 'Female'],
  },
  event: {
    type: String,
    required: [true, 'Event is required'],
    trim: true,
  },
  position: {
    type: String,
    enum: ['First', 'Second', 'Third', 'None'],
    default: 'None',
  },
  grade: {
    type: String,
    enum: ['A', 'B', 'C', 'None'],
    default: 'None',
  },
  totalPoints: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

if (mongoose.models && mongoose.models.Candidate) {
  delete mongoose.models.Candidate;
}

export default mongoose.model('Candidate', CandidateSchema);
