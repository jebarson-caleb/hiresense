import path from 'node:path';
import multer from 'multer';
import HttpError from '../utils/httpError.js';

// Older local uploads were written here; new uploads are stored in MongoDB so the API also runs serverless.
export const UPLOAD_DIR = path.resolve('uploads');

const ALLOWED = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
};

const storage = multer.memoryStorage();

export const uploadResume = multer({
  storage,
  // 4 MB keeps the multipart request under Vercel's 4.5 MB request body limit.
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED[ext]) return cb(new HttpError(400, 'Only PDF, DOCX or TXT resumes are allowed'));
    cb(null, true);
  },
}).single('resume');
