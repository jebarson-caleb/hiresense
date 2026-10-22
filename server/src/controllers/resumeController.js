import fs from 'node:fs/promises';
import Resume from '../models/Resume.js';
import Application from '../models/Application.js';
import { extractText } from '../services/textExtractor.js';
import { analyzeResume } from '../services/resumeAnalyzer.js';
import HttpError from '../utils/httpError.js';

async function findOwnResume(req, withText = false) {
  const query = Resume.findOne({ _id: req.params.id, user: req.user._id });
  const resume = await (withText ? query.select('+rawText') : query);
  if (!resume) throw new HttpError(404, 'Resume not found');
  return resume;
}

export async function uploadResume(req, res) {
  if (!req.file) throw new HttpError(400, 'Please attach a resume file (field name "resume")');

  let rawText;
  try {
    rawText = await extractText(req.file.path, req.file.originalname);
  } catch (err) {
    await fs.unlink(req.file.path).catch(() => {});
    throw err;
  }

  const { analysis, analyzedBy, model, error } = await analyzeResume(rawText);

  // The newest upload becomes the primary resume used for matching.
  await Resume.updateMany({ user: req.user._id }, { isPrimary: false });
  const resume = await Resume.create({
    user: req.user._id,
    fileName: req.file.originalname,
    filePath: req.file.filename,
    mimeType: req.file.mimetype,
    rawText,
    analysis,
    analyzedBy,
    model,
    isPrimary: true,
  });

  const out = resume.toObject();
  delete out.rawText;
  res.status(201).json({ resume: out, aiError: error || null });
}

export async function myResumes(req, res) {
  const resumes = await Resume.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ resumes });
}

export async function getResume(req, res) {
  const resume = await findOwnResume(req);
  res.json({ resume });
}

export async function reanalyze(req, res) {
  const resume = await findOwnResume(req, true);
  const { analysis, analyzedBy, model, error } = await analyzeResume(resume.rawText);
  Object.assign(resume, { analysis, analyzedBy, model });
  await resume.save();
  const out = resume.toObject();
  delete out.rawText;
  res.json({ resume: out, aiError: error || null });
}

export async function setPrimary(req, res) {
  const resume = await findOwnResume(req);
  await Resume.updateMany({ user: req.user._id }, { isPrimary: false });
  resume.isPrimary = true;
  await resume.save();
  res.json({ resume });
}

export async function deleteResume(req, res) {
  const resume = await findOwnResume(req);
  if (await Application.exists({ resume: resume._id })) {
    throw new HttpError(409, 'This resume is attached to job applications and cannot be deleted');
  }
  await resume.deleteOne();
  if (resume.filePath) await fs.unlink(`uploads/${resume.filePath}`).catch(() => {});
  if (resume.isPrimary) {
    const latest = await Resume.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    if (latest) await latest.updateOne({ isPrimary: true });
  }
  res.json({ message: 'Resume deleted' });
}

/** Primary (or most recent) resume of a user, with raw text loaded for matching. */
export async function primaryResumeFor(userId) {
  return (
    (await Resume.findOne({ user: userId, isPrimary: true }).select('+rawText')) ||
    (await Resume.findOne({ user: userId }).sort({ createdAt: -1 }).select('+rawText'))
  );
}
