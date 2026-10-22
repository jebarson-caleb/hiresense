import mongoose from 'mongoose';

const analysisSchema = new mongoose.Schema(
  {
    summary: { type: String, default: '' },
    skills: { type: [String], default: [] },
    experienceYears: { type: Number, default: 0 },
    education: { type: [String], default: [] },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    suggestions: { type: [String], default: [] },
    suggestedRoles: { type: [String], default: [] },
    atsScore: { type: Number, min: 0, max: 100, default: 0 },
  },
  { _id: false }
);

const resumeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: { type: String, required: true },
    filePath: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    rawText: { type: String, default: '', select: false },
    analysis: { type: analysisSchema, default: () => ({}) },
    analyzedBy: { type: String, enum: ['ollama', 'fallback'], default: 'fallback' },
    model: { type: String, default: '' },
    isPrimary: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Resume', resumeSchema);
