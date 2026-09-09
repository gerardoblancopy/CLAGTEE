import dotenv from 'dotenv';
import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getFirestore } from './_lib/firestore.js';
import { getSession, isStaffRole, requireAuth, requireStaff } from './_lib/auth.js';

// Endpoint unificado de firmas GCS:
//   POST  -> sube (firma write).  body: { fileName, contentType, prefix }
//   GET   -> descarga (firma read). query: ?object=<fileKey>
// (Antes eran gcs-sign-upload.js y gcs-sign-download.js; fusionados para
//  respetar el límite de 12 Serverless Functions del plan Hobby.)

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

// Prefijos que puede subir quien no tiene cuenta: el flujo de inscripcion
// adjunta comprobantes de pago y credenciales de estudiante sin registrarse.
const PUBLIC_UPLOAD_PREFIXES = ['comprobantes', 'student-proofs'];

const signUpload = async (req, res) => {
  const body = parseBody(req);
  if (!body?.fileName) {
    res.status(400).json({ error: 'fileName is required' });
    return;
  }

  const storage = getStorage();
  const bucketName = getEnv('GCS_BUCKET');
  const safeName = sanitizeFileName(body.fileName || 'paper.pdf') || 'paper.pdf';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const allowedPrefixes = ['submissions', 'comprobantes', 'student-proofs'];
  const requestedPrefix = sanitizeFileName(body.prefix || 'submissions');
  const prefix = allowedPrefixes.includes(requestedPrefix) ? requestedPrefix : 'submissions';

  if (!PUBLIC_UPLOAD_PREFIXES.includes(prefix) && !requireAuth(req, res)) {
    return;
  }
  const fileKey = `${prefix}/${timestamp}-${safeName}`;
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
};

// Content-Disposition seguro: quita CR/LF y comillas (evita inyección de cabeceras)
// y añade filename* (RFC 5987) para nombres con acentos.
const buildAttachmentDisposition = (fileName) => {
  const safe = fileName.replace(/[\r\n"\\]/g, '').trim();
  if (!safe) return '';
  const ascii = safe.replace(/[^\x20-\x7e]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
};

// Las plantillas del sitio publico se descargan sin cuenta; todo lo demas
// (articulos, comprobantes de pago) exige sesion y una relacion con el archivo.
const PUBLIC_DOWNLOAD_PREFIX = 'Templates/';
const STAFF_ONLY_DOWNLOAD_PREFIXES = ['comprobantes/', 'student-proofs/'];

const findPaperByFileKey = async (db, fileKey) => {
  for (const field of ['fileKey', 'revisedFileKey']) {
    const snapshot = await db.collection('papers').where(field, '==', fileKey).limit(1).get();
    if (!snapshot.empty) return snapshot.docs[0].data();
  }
  return null;
};

// Devuelve true si la peticion puede leer fileKey. Responde 401/403 si no.
const authorizeDownload = async (req, res, fileKey) => {
  if (fileKey.startsWith(PUBLIC_DOWNLOAD_PREFIX)) return true;

  if (STAFF_ONLY_DOWNLOAD_PREFIXES.some((prefix) => fileKey.startsWith(prefix))) {
    return Boolean(await requireStaff(req, res));
  }

  if (!fileKey.startsWith('submissions/')) {
    if (!getSession(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return false;
    }
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }

  const session = requireAuth(req, res);
  if (!session) return false;
  if (isStaffRole(session.role)) return true;

  const paper = await findPaperByFileKey(getFirestore(), fileKey);
  if (!paper) {
    res.status(404).json({ error: 'File not found' });
    return false;
  }

  const isSubmitter = paper.submitterId === session.id;
  const assigned = Array.isArray(paper.assignedReviewerIds) ? paper.assignedReviewerIds : [];
  const isAssignedReviewer = session.role === 'reviewer' && assigned.includes(session.id);
  if (!isSubmitter && !isAssignedReviewer) {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }

  return true;
};

const signDownload = async (req, res) => {
  const fileKey = typeof req.query.object === 'string' ? req.query.object : '';
  if (!fileKey) {
    res.status(400).json({ error: 'object is required' });
    return;
  }

  if (!(await authorizeDownload(req, res, fileKey))) return;

  const storage = getStorage();
  const bucketName = getEnv('GCS_BUCKET');

  const options = {
    version: 'v4',
    action: 'read',
    expires: Date.now() + 10 * 60 * 1000,
  };

  const fileName = typeof req.query.filename === 'string' ? req.query.filename : '';
  const disposition = fileName ? buildAttachmentDisposition(fileName) : '';
  if (disposition) {
    options.responseDisposition = disposition;
  }

  const [url] = await storage.bucket(bucketName).file(fileKey).getSignedUrl(options);

  // redirect=1 permite enlazar con un <a> normal, sin fetch asíncrono previo.
  // Con el patrón anterior (await fetch -> window.open) el bloqueador de
  // pop-ups cancelaba la apertura y la descarga fallaba en silencio.
  if (req.query.redirect === '1') {
    res.setHeader('Location', url);
    res.status(302).end();
    return;
  }

  res.status(200).json({ url });
};

export default async function handler(req, res) {
  if (!process.env.GCS_PRIVATE_KEY && process.env.GCS_PRIVATE_KEY_ENV) {
    process.env.GCS_PRIVATE_KEY = process.env.GCS_PRIVATE_KEY_ENV;
  }

  try {
    if (req.method === 'POST') {
      await signUpload(req, res);
      return;
    }
    if (req.method === 'GET') {
      await signDownload(req, res);
      return;
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const message = error && error.message ? error.message : 'Failed to sign URL';
    console.error('[gcs-sign]', message);
    res.status(500).json({
      error: 'Failed to sign URL',
      details: process.env.NODE_ENV === 'production' ? undefined : message,
    });
  }
}
