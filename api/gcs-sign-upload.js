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

const sanitizeFileName = (fileName) =>
  fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

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

const parseBody = (req) => {
  if (!req.body) return null;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return null;
    }
  }
  return req.body;
};

export default async function handler(req, res) {
  if (!process.env.GCS_PRIVATE_KEY && process.env.GCS_PRIVATE_KEY_ENV) {
    process.env.GCS_PRIVATE_KEY = process.env.GCS_PRIVATE_KEY_ENV;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = parseBody(req);
    if (!body?.fileName) {
      res.status(400).json({ error: 'fileName is required' });
      return;
    }

    const storage = getStorage();
    const bucketName = getEnv('GCS_BUCKET');
    const safeName = sanitizeFileName(body.fileName || 'paper.pdf') || 'paper.pdf';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileKey = `submissions/${timestamp}-${safeName}`;
    const contentType = body.contentType || 'application/pdf';

    const [uploadUrl] = await storage.bucket(bucketName).file(fileKey).getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      contentType,
    });

    const publicBaseUrl = process.env.GCS_PUBLIC_BASE_URL;
    const publicUrl = publicBaseUrl ? `${publicBaseUrl.replace(/\/$/, '')}/${fileKey}` : '';

    res.status(200).json({ uploadUrl, fileKey, publicUrl });
  } catch (error) {
    const message = error && error.message ? error.message : 'Failed to sign upload URL';
    console.error('[gcs-sign-upload]', message);
    res.status(500).json({
      error: 'Failed to sign upload URL',
      details: process.env.NODE_ENV === 'production' ? undefined : message,
    });
  }
}
