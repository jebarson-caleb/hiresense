import Job from '../models/Job.js';
import Application from '../models/Application.js';
import Resume from '../models/Resume.js';
import { rankJobs, fullMatch } from '../services/matcher.js';
import { normalizeSkillList } from '../services/skills.js';
import { primaryResumeFor } from './resumeController.js';
import HttpError from '../utils/httpError.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildFilter({ q, location, type, skills }) {
  const filter = { status: 'open' };
  if (q) {
    const re = new RegExp(escapeRegex(q.trim()), 'i');
    filter.$or = [{ title: re }, { company: re }, { description: re }, { requiredSkills: re }];
  }
  if (location) filter.location = new RegExp(escapeRegex(location.trim()), 'i');
  if (type) filter.type = type;
  if (skills) {
    const list = normalizeSkillList(String(skills).split(','));
    if (list.length) filter.requiredSkills = { $in: list.map((s) => new RegExp(`^${escapeRegex(s)}$`, 'i')) };
  }
  return filter;
}

function pickJobFields(body) {
  const fields = ['title', 'company', 'location', 'type', 'description', 'minExperience', 'salaryRange', 'status'];
  const data = Object.fromEntries(fields.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));
  if (body.requiredSkills !== undefined) {
    const list = Array.isArray(body.requiredSkills) ? body.requiredSkills : String(body.requiredSkills).split(',');
    data.requiredSkills = normalizeSkillList(list, 25);
  }
  return data;
}

async function findOwnJob(req) {
  const job = await Job.findById(req.params.id);
  if (!job) throw new HttpError(404, 'Job not found');
  if (req.user.role !== 'admin' && !job.recruiter.equals(req.user._id)) throw new HttpError(403, 'You can only manage your own job posts');
  return job;
}

export async function listJobs(req, res) {
  const jobs = await Job.find(buildFilter(req.query)).sort({ createdAt: -1 }).limit(100);
  res.json({ jobs });
}

export async function getJob(req, res) {
  const job = await Job.findById(req.params.id).populate('recruiter', 'name company');
  if (!job) throw new HttpError(404, 'Job not found');
  let application = null;
  if (req.user?.role === 'seeker') {
    application = await Application.findOne({ job: job._id, seeker: req.user._id });
  }
  res.json({ job, application });
}

/** Seeker: all open jobs ranked against their primary resume (fast score). */
export async function jobMatches(req, res) {
  const resume = await primaryResumeFor(req.user._id);
  if (!resume) return res.json({ resume: null, matches: [] });

  const jobs = await Job.find(buildFilter(req.query)).lean();
  const applied = new Set((await Application.find({ seeker: req.user._id }).select('job')).map((a) => String(a.job)));
  const matches = rankJobs(resume, jobs).map(({ job, match }) => ({ job, match, applied: applied.has(String(job._id)) }));

  const { rawText, ...resumeOut } = resume.toObject();
  res.json({ resume: resumeOut, matches });
}

/** Seeker: detailed AI fit for one job (LLM call, cached in memory). */
export async function jobFit(req, res) {
  const job = await Job.findById(req.params.id);
  if (!job) throw new HttpError(404, 'Job not found');
  const resume = await primaryResumeFor(req.user._id);
  if (!resume) throw new HttpError(400, 'Upload a resume first to check your fit');
  const match = await fullMatch(resume, job);
  res.json({ match, resumeId: resume._id });
}

export async function createJob(req, res) {
  const data = pickJobFields(req.body);
  const job = await Job.create({ ...data, company: data.company || req.user.company, recruiter: req.user._id });
  res.status(201).json({ job });
}

export async function updateJob(req, res) {
  const job = await findOwnJob(req);
  Object.assign(job, pickJobFields(req.body));
  await job.save();
  res.json({ job });
}

export async function deleteJob(req, res) {
  const job = await findOwnJob(req);
  await Application.deleteMany({ job: job._id });
  await job.deleteOne();
  res.json({ message: 'Job deleted' });
}

/** Recruiter: own jobs with applicant counts and average match score. */
export async function myJobs(req, res) {
  const jobs = await Job.find({ recruiter: req.user._id }).sort({ createdAt: -1 }).lean();
  const stats = await Application.aggregate([
    { $match: { job: { $in: jobs.map((j) => j._id) } } },
    {
      $group: {
        _id: '$job',
        applicants: { $sum: 1 },
        avgScore: { $avg: '$matchScore' },
        shortlisted: { $sum: { $cond: [{ $eq: ['$status', 'shortlisted'] }, 1, 0] } },
      },
    },
  ]);
  const byJob = new Map(stats.map((s) => [String(s._id), s]));
  res.json({
    jobs: jobs.map((j) => {
      const s = byJob.get(String(j._id));
      return { ...j, applicants: s?.applicants || 0, avgScore: s ? Math.round(s.avgScore) : null, shortlisted: s?.shortlisted || 0 };
    }),
  });
}

/** Recruiter: rank every seeker with a resume against this job, even if they have not applied (talent search). */
export async function suggestedCandidates(req, res) {
  const job = await findOwnJob(req);
  const resumes = await Resume.find({ isPrimary: true }).select('+rawText').populate('user', 'name email headline isActive role');
  const results = resumes
    .filter((r) => r.user?.isActive && r.user.role === 'seeker')
    .map((r) => {
      const ranked = rankJobs(r, [job.toObject()])[0];
      return { candidate: r.user, resume: { _id: r._id, analysis: r.analysis, fileName: r.fileName }, match: ranked.match };
    })
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, 20);
  res.json({ candidates: results });
}
