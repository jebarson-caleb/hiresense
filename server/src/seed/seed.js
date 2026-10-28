// Resets the database with demo users, jobs, resumes and applications.
// Usage: npm run seed            (rule-based analysis, fast)
//        npm run seed -- --ai    (analyse seeded resumes with the configured AI provider)
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Resume from '../models/Resume.js';
import Application from '../models/Application.js';
import { analyzeWithRules } from '../services/fallback.js';
import { analyzeResume } from '../services/resumeAnalyzer.js';
import { fastMatch } from '../services/matcher.js';
import { normalizeSkillList } from '../services/skills.js';
import sampleResumes from './sampleResumes.js';
import jobSeeds from './jobs.js';

const useAI = process.argv.includes('--ai');
const PASSWORD = 'password123';

const users = [
  { key: 'admin', name: 'Portal Admin', email: 'admin@demo.com', role: 'admin' },
  { key: 'techcorp', name: 'Kavya Nair', email: 'recruiter@demo.com', role: 'recruiter', company: 'TechCorp Solutions' },
  { key: 'datawise', name: 'Vikram Rao', email: 'hr@datawise.com', role: 'recruiter', company: 'DataWise Analytics' },
  { key: 'arun', name: 'Arun Kumar', email: 'seeker@demo.com', role: 'seeker', headline: 'Full Stack Developer' },
  { key: 'priya', name: 'Priya Sharma', email: 'priya@demo.com', role: 'seeker', headline: 'Data Scientist' },
  { key: 'rahul', name: 'Rahul Verma', email: 'rahul@demo.com', role: 'seeker', headline: 'CS Graduate' },
  { key: 'meera', name: 'Meera Iyer', email: 'meera@demo.com', role: 'seeker', headline: 'Senior DevOps Engineer' },
  { key: 'sneha', name: 'Sneha Reddy', email: 'sneha@demo.com', role: 'seeker', headline: 'UI/UX Designer' },
  { key: 'newbie', name: 'Demo Fresher', email: 'fresher@demo.com', role: 'seeker', headline: 'Looking for my first job' },
];

// seeker key -> [job title, status]
const applications = {
  arun: [['MERN Stack Developer', 'shortlisted'], ['Full Stack Developer (Next.js)', 'applied'], ['Frontend Developer (React)', 'applied']],
  priya: [['Data Scientist', 'shortlisted'], ['NLP / LLM Engineer', 'applied'], ['Data Analyst', 'applied']],
  rahul: [['Software Engineer Intern', 'applied'], ['Graduate Software Engineer', 'shortlisted'], ['MERN Stack Developer', 'rejected']],
  meera: [['DevOps Engineer', 'hired'], ['Backend Engineer - Node.js', 'applied']],
  sneha: [['UI/UX Designer', 'shortlisted'], ['Frontend Developer (React)', 'applied']],
};

const daysAgo = (n) => new Date(Date.now() - n * 24 * 3600 * 1000);

await connectDB();
console.log('Clearing collections...');
await Promise.all([User.deleteMany({}), Job.deleteMany({}), Resume.deleteMany({}), Application.deleteMany({})]);

const userByKey = {};
for (const [i, u] of users.entries()) {
  const { key, ...data } = u;
  const created = await User.create({ ...data, password: PASSWORD });
  // Spread sign-ups over the last two weeks so the admin chart has a shape.
  await User.collection.updateOne({ _id: created._id }, { $set: { createdAt: daysAgo(13 - i) } });
  userByKey[key] = created;
}
console.log(`Users: ${users.length}`);

const jobByTitle = {};
for (const [i, j] of jobSeeds.entries()) {
  const { by, ...data } = j;
  const recruiter = userByKey[by];
  const job = await Job.create({
    ...data,
    requiredSkills: normalizeSkillList(data.requiredSkills),
    company: recruiter.company,
    recruiter: recruiter._id,
    status: i === jobSeeds.length - 1 ? 'closed' : 'open',
  });
  jobByTitle[job.title] = job;
}
console.log(`Jobs: ${jobSeeds.length}`);

const resumeByKey = {};
for (const s of sampleResumes) {
  let analysis = analyzeWithRules(s.text);
  let analyzedBy = 'fallback';
  let model = '';
  if (useAI) {
    process.stdout.write(`Analysing ${s.fileName} with AI... `);
    ({ analysis, analyzedBy, model } = await analyzeResume(s.text));
    console.log(analyzedBy);
  }
  resumeByKey[s.key] = await Resume.create({
    user: userByKey[s.key]._id,
    fileName: s.fileName,
    filePath: '',
    mimeType: 'application/pdf',
    rawText: s.text,
    analysis,
    analyzedBy,
    model,
    isPrimary: true,
  });
}
console.log(`Resumes: ${sampleResumes.length}`);

let appCount = 0;
for (const [key, list] of Object.entries(applications)) {
  for (const [title, status] of list) {
    const job = jobByTitle[title];
    const resume = resumeByKey[key];
    const { score, ...breakdown } = fastMatch(resume, job.toObject());
    await Application.create({
      job: job._id,
      seeker: userByKey[key]._id,
      resume: resume._id,
      matchScore: score,
      matchBreakdown: breakdown,
      status,
    });
    appCount++;
  }
}
console.log(`Applications: ${appCount}`);

console.log(`
Demo accounts (password: ${PASSWORD})
  admin      admin@demo.com
  recruiter  recruiter@demo.com   (TechCorp Solutions)
  recruiter  hr@datawise.com      (DataWise Analytics)
  seeker     seeker@demo.com      (has a resume)
  seeker     fresher@demo.com     (no resume - try the upload flow)
`);
await disconnectDB();
