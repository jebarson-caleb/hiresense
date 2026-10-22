import mongoose from 'mongoose';

export const JOB_TYPES = ['Full-time', 'Part-time', 'Internship', 'Contract', 'Remote'];

const jobSchema = new mongoose.Schema(
  {
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    location: { type: String, trim: true, default: 'Remote' },
    type: { type: String, enum: JOB_TYPES, default: 'Full-time' },
    description: { type: String, required: true },
    requiredSkills: { type: [String], default: [] },
    minExperience: { type: Number, min: 0, default: 0 },
    salaryRange: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
  },
  { timestamps: true }
);

jobSchema.index({ title: 'text', description: 'text', company: 'text' });

export default mongoose.model('Job', jobSchema);
