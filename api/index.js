// Vercel serverless entry: every /api/* request is rewritten here (see vercel.json).
import app from '../server/src/app.js';
import { ensureDB } from '../server/src/config/db.js';

export default async function handler(req, res) {
  await ensureDB();
  return app(req, res);
}
