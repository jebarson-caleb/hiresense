import mongoose from 'mongoose';

export const APPLICATION_STATUSES = ['applied', 'shortlisted', 'rejected', 'hired'];

const breakdownSchema = new mongoose.Schema(
  {
    skillScore: { type: Number, default: 0 },
    textScore: { type: Number, default: 0 },
    aiScore: { type: Number, default: null },
    matchedSkills: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    aiReasoning: { type: String, default: '' },
    scoredBy: { type: String, enum: ['ollama', 'fallback'], default: 'fallback' },
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    seeker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', required: true },
    coverNote: { type: String, default: '', maxlength: 2000 },
    matchScore: { type: Number, default: 0 },
    matchBreakdown: { type: breakdownSchema, default: () => ({}) },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'applied' },
  },
  { timestamps: true }
);

applicationSchema.index({ job: 1, seeker: 1 }, { unique: true });

export default mongoose.model('Application', applicationSchema);
