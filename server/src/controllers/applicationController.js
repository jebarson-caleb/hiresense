import path from 'node:path';
import fs from 'node:fs';
import Application, { APPLICATION_STATUSES } from '../models/Application.js';
import Job from '../models/Job.js';
import Resume from '../models/Resume.js';
import { fullMatch } from '../services/matcher.js';
import { primaryResumeFor } from './resumeController.js';
import { UPLOAD_DIR } from '../middleware/upload.js';
import HttpError from '../utils/httpError.js';

async function loadForViewer(req) {
  const app = await Application.findById(req.params.id)
    .populate('job')
    .populate('seeker', 'name email headline')
    .populate('resume');
  if (!app) throw new HttpError(404, 'Application not found');
  const isOwner = app.seeker._id.equals(req.user._id);
  const isRecruiter = app.job && app.job.recruiter.equals(req.user._id);
  if (!isOwner && !isRecruiter && req.user.role !== 'admin') throw new HttpError(403, 'Not allowed to view this application');
  return { app, isOwner, isRecruiter };
}

export async function apply(req, res) {
  const { jobId, resumeId, coverNote = '' } = req.body;
  const job = await Job.findById(jobId);
  if (!job) throw new HttpError(404, 'Job not found');
  if (job.status !== 'open') throw new HttpError(400, 'This job is no longer accepting applications');
  if (await Application.exists({ job: job._id, seeker: req.user._id })) throw new HttpError(409, 'You have already applied to this job');

  const resume = resumeId
    ? await Resume.findOne({ _id: resumeId, user: req.user._id }).select('+rawText')
    : await primaryResumeFor(req.user._id);
  if (!resume) throw new HttpError(400, 'Upload a resume before applying');

  const match = await fullMatch(resume, job);
  const { score, ...breakdown } = match;
  const application = await Application.create({
    job: job._id,
    seeker: req.user._id,
    resume: resume._id,
    coverNote,
    matchScore: score,
    matchBreakdown: breakdown,
  });
  res.status(201).json({ application });
}

export async function myApplications(req, res) {
  const applications = await Application.find({ seeker: req.user._id })
    .populate('job', 'title company location type status')
    .populate('resume', 'fileName')
    .sort({ createdAt: -1 });
  res.json({ applications });
}

export async function withdraw(req, res) {
  const app = await Application.findOne({ _id: req.params.id, seeker: req.user._id });
  if (!app) throw new HttpError(404, 'Application not found');
  if (app.status !== 'applied') throw new HttpError(400, 'Only pending applications can be withdrawn');
  await app.deleteOne();
  res.json({ message: 'Application withdrawn' });
}

/** Recruiter: applicants for one of their jobs, best match first. */
export async function jobApplicants(req, res) {
  const job = await Job.findById(req.params.jobId);
  if (!job) throw new HttpError(404, 'Job not found');
  if (!job.recruiter.equals(req.user._id) && req.user.role !== 'admin') throw new HttpError(403, 'Not your job post');

  const filter = { job: job._id };
  if (req.query.status) filter.status = req.query.status;
  const applications = await Application.find(filter)
    .populate('seeker', 'name email headline')
    .populate('resume', 'fileName analysis.skills analysis.experienceYears analysis.atsScore analysis.summary analyzedBy')
    .sort({ matchScore: -1, createdAt: 1 });
  res.json({ job, applications });
}

export async function getApplication(req, res) {
  const { app } = await loadForViewer(req);
  res.json({ application: app });
}

export async function updateStatus(req, res) {
  const { status } = req.body;
  if (!APPLICATION_STATUSES.includes(status)) throw new HttpError(400, `Status must be one of ${APPLICATION_STATUSES.join(', ')}`);
  const { app, isRecruiter } = await loadForViewer(req);
  if (!isRecruiter && req.user.role !== 'admin') throw new HttpError(403, 'Only the job owner can change the status');
  app.status = status;
  await app.save();
  res.json({ application: app });
}

/** Recruiter: re-run AI scoring (e.g. after Ollama comes online). */
export async function rescore(req, res) {
  const { app, isRecruiter } = await loadForViewer(req);
  if (!isRecruiter && req.user.role !== 'admin') throw new HttpError(403, 'Only the job owner can rescore');
  const resume = await Resume.findById(app.resume._id).select('+rawText');
  const { score, ...breakdown } = await fullMatch(resume, app.job);
  app.matchScore = score;
  app.matchBreakdown = breakdown;
  await app.save();
  res.json({ application: app });
}

export async function downloadResume(req, res) {
  const { app } = await loadForViewer(req);
  const stored = app.resume && (await Resume.findById(app.resume._id).select('+fileData'));
  if (stored?.fileData?.length) {
    res.attachment(stored.fileName);
    res.type(stored.mimeType || 'application/octet-stream');
    return res.send(stored.fileData);
  }
  // Uploads made before files were stored in MongoDB live on local disk.
  const file = app.resume?.filePath && path.join(UPLOAD_DIR, path.basename(app.resume.filePath));
  if (!file || !fs.existsSync(file)) throw new HttpError(404, 'Original resume file is not available');
  res.download(file, app.resume.fileName);
}
