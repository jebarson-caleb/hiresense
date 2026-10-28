import mongoose from 'mongoose';
import env from './env.js';

export async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

let connecting;

/** Connect once and reuse across serverless invocations; a failed attempt is retried next call. */
export async function ensureDB() {
  if (mongoose.connection.readyState === 1) return;
  connecting ??= connectDB().catch((err) => {
    connecting = undefined;
    throw err;
  });
  await connecting;
}
