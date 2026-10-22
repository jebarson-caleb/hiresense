import env from './config/env.js';
import app from './app.js';
import { connectDB } from './config/db.js';
import { getHealth } from './services/ollamaClient.js';

try {
  await connectDB();
} catch (err) {
  console.error(`Could not connect to MongoDB at ${env.mongoUri}: ${err.message}`);
  console.error('Start it with "docker compose up -d" from the project root, or set MONGO_URI in server/.env');
  process.exit(1);
}

app.listen(env.port, async () => {
  console.log(`API listening on http://localhost:${env.port}/api`);
  const ai = await getHealth({ force: true });
  console.log(`[ai] ${ai.message}`);
});
