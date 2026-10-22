import { Router } from 'express';
import { body } from 'express-validator';
import { protect, requireRole } from '../middleware/auth.js';
import { uploadResume } from '../middleware/upload.js';
import { validate } from '../middleware/error.js';
import { getHealth } from '../services/ollamaClient.js';
import * as auth from '../controllers/authController.js';
import * as resumes from '../controllers/resumeController.js';
import * as jobs from '../controllers/jobController.js';
import * as apps from '../controllers/applicationController.js';
import * as admin from '../controllers/adminController.js';

const router = Router();
const seeker = [protect, requireRole('seeker')];
const recruiter = [protect, requireRole('recruiter', 'admin')];
const adminOnly = [protect, requireRole('admin')];

// ---- Auth ----
router.post(
  '/auth/register',
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('A valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate,
  auth.register
);
router.post(
  '/auth/login',
  body('email').isEmail().withMessage('A valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
  auth.login
);
router.get('/auth/me', protect, auth.me);
router.patch('/auth/me', protect, auth.updateProfile);

// ---- AI status ----
router.get('/ai/health', async (req, res) => res.json(await getHealth({ force: req.query.force === '1' })));

// ---- Resumes (seeker) ----
router.post('/resumes', ...seeker, uploadResume, resumes.uploadResume);
router.get('/resumes', ...seeker, resumes.myResumes);
router.get('/resumes/:id', ...seeker, resumes.getResume);
router.post('/resumes/:id/reanalyze', ...seeker, resumes.reanalyze);
router.patch('/resumes/:id/primary', ...seeker, resumes.setPrimary);
router.delete('/resumes/:id', ...seeker, resumes.deleteResume);

// ---- Jobs ----
const jobValidators = [
  body('title').trim().notEmpty().withMessage('Job title is required'),
  body('description').trim().isLength({ min: 30 }).withMessage('Description should be at least 30 characters'),
  body('minExperience').optional().isFloat({ min: 0, max: 40 }).withMessage('Experience must be 0-40 years'),
  validate,
];
router.get('/jobs', protect, jobs.listJobs);
router.get('/jobs/matches', ...seeker, jobs.jobMatches);
router.get('/jobs/mine', ...recruiter, jobs.myJobs);
router.get('/jobs/:id', protect, jobs.getJob);
router.get('/jobs/:id/fit', ...seeker, jobs.jobFit);
router.get('/jobs/:id/candidates', ...recruiter, jobs.suggestedCandidates);
router.post('/jobs', ...recruiter, ...jobValidators, jobs.createJob);
router.put('/jobs/:id', ...recruiter, jobs.updateJob);
router.delete('/jobs/:id', ...recruiter, jobs.deleteJob);

// ---- Applications ----
router.post('/applications', ...seeker, body('jobId').isMongoId().withMessage('jobId is required'), validate, apps.apply);
router.get('/applications/mine', ...seeker, apps.myApplications);
router.get('/applications/job/:jobId', ...recruiter, apps.jobApplicants);
router.get('/applications/:id', protect, apps.getApplication);
router.get('/applications/:id/resume-file', protect, apps.downloadResume);
router.patch('/applications/:id/status', ...recruiter, apps.updateStatus);
router.post('/applications/:id/rescore', ...recruiter, apps.rescore);
router.delete('/applications/:id', ...seeker, apps.withdraw);

// ---- Admin ----
router.get('/admin/stats', ...adminOnly, admin.stats);
router.get('/admin/users', ...adminOnly, admin.listUsers);
router.patch('/admin/users/:id', ...adminOnly, admin.updateUser);
router.delete('/admin/users/:id', ...adminOnly, admin.deleteUser);
router.get('/admin/jobs', ...adminOnly, admin.listJobs);
router.patch('/admin/jobs/:id', ...adminOnly, admin.updateJobStatus);
router.delete('/admin/jobs/:id', ...adminOnly, admin.deleteJob);

export default router;
