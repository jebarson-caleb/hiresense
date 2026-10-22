import User from '../models/User.js';
import Job from '../models/Job.js';
import Resume from '../models/Resume.js';
import Application from '../models/Application.js';
import HttpError from '../utils/httpError.js';
import { getHealth } from '../services/ollamaClient.js';

const toCounts = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.count]));

export async function stats(_req, res) {
  const since = new Date(Date.now() - 13 * 24 * 3600 * 1000);
  since.setHours(0, 0, 0, 0);

  const [usersByRole, jobsByStatus, appsByStatus, resumesBy, avgScore, avgAts, topSkills, demandSkills, signups, ai] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    Job.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Application.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Resume.aggregate([{ $group: { _id: '$analyzedBy', count: { $sum: 1 } } }]),
    Application.aggregate([{ $group: { _id: null, avg: { $avg: '$matchScore' } } }]),
    Resume.aggregate([{ $group: { _id: null, avg: { $avg: '$analysis.atsScore' } } }]),
    Resume.aggregate([
      { $match: { isPrimary: true } },
      { $unwind: '$analysis.skills' },
      { $group: { _id: '$analysis.skills', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 10 },
    ]),
    Job.aggregate([
      { $match: { status: 'open' } },
      { $unwind: '$requiredSkills' },
      { $group: { _id: '$requiredSkills', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 10 },
    ]),
    User.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    getHealth(),
  ]);

  const days = [];
  const signupMap = toCounts(signups);
  for (let i = 0; i < 14; i++) {
    const d = new Date(since.getTime() + i * 24 * 3600 * 1000).toISOString().slice(0, 10);
    days.push({ date: d, count: signupMap[d] || 0 });
  }

  res.json({
    users: toCounts(usersByRole),
    jobs: toCounts(jobsByStatus),
    applications: toCounts(appsByStatus),
    resumes: toCounts(resumesBy),
    avgMatchScore: Math.round(avgScore[0]?.avg || 0),
    avgAtsScore: Math.round(avgAts[0]?.avg || 0),
    topSkills: topSkills.map((s) => ({ skill: s._id, count: s.count })),
    demandSkills: demandSkills.map((s) => ({ skill: s._id, count: s.count })),
    signups: days,
    ai,
  });
}

export async function listUsers(req, res) {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.q) {
    const re = new RegExp(req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: re }, { email: re }, { company: re }];
  }
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(500);
  res.json({ users });
}

export async function updateUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'User not found');
  if (user._id.equals(req.user._id)) throw new HttpError(400, 'You cannot modify your own admin account here');
  if (req.body.isActive !== undefined) user.isActive = Boolean(req.body.isActive);
  if (req.body.role !== undefined) {
    if (!['seeker', 'recruiter', 'admin'].includes(req.body.role)) throw new HttpError(400, 'Invalid role');
    user.role = req.body.role;
  }
  await user.save();
  res.json({ user });
}

export async function deleteUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'User not found');
  if (user._id.equals(req.user._id)) throw new HttpError(400, 'You cannot delete your own account');

  const jobs = await Job.find({ recruiter: user._id }).select('_id');
  await Promise.all([
    Application.deleteMany({ $or: [{ seeker: user._id }, { job: { $in: jobs.map((j) => j._id) } }] }),
    Job.deleteMany({ recruiter: user._id }),
    Resume.deleteMany({ user: user._id }),
  ]);
  await user.deleteOne();
  res.json({ message: 'User and related data deleted' });
}

export async function listJobs(_req, res) {
  const jobs = await Job.find().populate('recruiter', 'name email').sort({ createdAt: -1 }).lean();
  const counts = toCounts(await Application.aggregate([{ $group: { _id: '$job', count: { $sum: 1 } } }]));
  res.json({ jobs: jobs.map((j) => ({ ...j, applicants: counts[j._id] || 0 })) });
}

export async function updateJobStatus(req, res) {
  const job = await Job.findById(req.params.id);
  if (!job) throw new HttpError(404, 'Job not found');
  if (!['open', 'closed'].includes(req.body.status)) throw new HttpError(400, 'Status must be open or closed');
  job.status = req.body.status;
  await job.save();
  res.json({ job });
}

export async function deleteJob(req, res) {
  const job = await Job.findById(req.params.id);
  if (!job) throw new HttpError(404, 'Job not found');
  await Application.deleteMany({ job: job._id });
  await job.deleteOne();
  res.json({ message: 'Job deleted' });
}
