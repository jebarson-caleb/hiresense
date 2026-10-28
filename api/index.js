// Vercel serverless entry: every /api/* request is rewritten here (see vercel.json).
import app from '../server/src/app.js';
import { ensureDB } from '../server/src/config/db.js';

export default async function handler(req, res) {
  try {
    await ensureDB();
  } catch (err) {
    console.error(`[db] ${err.message}`);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ message: 'Database unavailable. Check MONGO_URI and Atlas network access.' }));
  }
  return app(req, res);
}
