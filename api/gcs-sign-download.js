import dotenv from 'dotenv';
import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadEnvFiles = () => {
  const visited = new Set();
  const candidates = [];

  const addDir = (dir) => {
    if (visited.has(dir)) return;
    visited.add(dir);
    candidates.push(dir);
  };

  addDir(process.cwd());
  let current = __dirname;
  for (let i = 0; i < 6; i += 1) {
    addDir(current);
    current = path.dirname(current);
  }

  for (const dir of candidates) {
    const envPath = path.join(dir, '.env');
    const envLocalPath = path.join(dir, '.env.local');
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
    if (fs.existsSync(envLocalPath)) {
      dotenv.config({ path: envLocalPath, override: true });
    }
  }
};

loadEnvFiles();

const getEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
};

const getStorage = () => {
  const projectId = getEnv('GCS_PROJECT_ID');
  const clientEmail = getEnv('GCS_CLIENT_EMAIL');
  const privateKey = getEnv('GCS_PRIVATE_KEY').replace(/\\n/g, '\n');

  return new Storage({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });
};

export default async function handler(req, res) {
  if (!process.env.GCS_PRIVATE_KEY && process.env.GCS_PRIVATE_KEY_ENV) {
    process.env.GCS_PRIVATE_KEY = process.env.GCS_PRIVATE_KEY_ENV;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const fileKey = typeof req.query.object === 'string' ? req.query.object : '';
    if (!fileKey) {
      res.status(400).json({ error: 'object is required' });
      return;
    }

    const storage = getStorage();
    const bucketName = getEnv('GCS_BUCKET');

    const [url] = await storage.bucket(bucketName).file(fileKey).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 10 * 60 * 1000,
    });

    res.status(200).json({ url });
  } catch (error) {
    const message = error && error.message ? error.message : 'Failed to sign download URL';
    console.error('[gcs-sign-download]', message);
    res.status(500).json({
      error: 'Failed to sign download URL',
      details: process.env.NODE_ENV === 'production' ? undefined : message,
    });
  }
}
