import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Firestore } from '@google-cloud/firestore';

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

const resolveEnv = (names) => {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return '';
};

const getEnv = (names) => {
  const value = resolveEnv(Array.isArray(names) ? names : [names]);
  if (!value) {
    const label = Array.isArray(names) ? names[0] : names;
    throw new Error(`Missing env: ${label}`);
  }
  return value;
};

let cachedFirestore = null;

export const getFirestore = () => {
  if (cachedFirestore) return cachedFirestore;

  const projectId = getEnv(['GCP_PROJECT_ID', 'GCS_PROJECT_ID']);
  const clientEmail = getEnv(['GCP_CLIENT_EMAIL', 'GCS_CLIENT_EMAIL']);
  const rawPrivateKey = resolveEnv([
    'GCP_PRIVATE_KEY',
    'GCS_PRIVATE_KEY',
    'GCS_PRIVATE_KEY_ENV',
  ]);
  if (!rawPrivateKey) {
    throw new Error('Missing env: GCP_PRIVATE_KEY');
  }

  const privateKey = rawPrivateKey.replace(/\\n/g, '\n');

  cachedFirestore = new Firestore({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });

  return cachedFirestore;
};

export const userDocId = (email, role) => `${email.toLowerCase()}__${role}`;

export const sanitizeUser = (doc) => {
  const { passwordHash, ...rest } = doc;
  return rest;
};

export const seedUsersIfNeeded = async () => {
  const db = getFirestore();
  const snapshot = await db.collection('users').limit(1).get();
  if (!snapshot.empty) return;

  const { hash } = await import('bcryptjs');
  const seeds = [
    {
      id: 'u-chair',
      name: 'Comite CLAGTEE',
      email: 'chair@clagtee.org',
      role: 'chair',
      affiliation: 'CLAGTEE',
      password: 'chair2026',
    },
    {
      id: 'u-reviewer-1',
      name: 'Revisor Demo',
      email: 'reviewer@clagtee.org',
      role: 'reviewer',
      affiliation: 'Instituto de Energia',
      password: 'reviewer2026',
    },
    {
      id: 'u-reviewer-2',
      name: 'Revisora Senior',
      email: 'reviewer2@clagtee.org',
      role: 'reviewer',
      affiliation: 'Centro de Investigacion',
      password: 'reviewer2026',
    },
    {
      id: 'u-author',
      name: 'Autora Demo',
      email: 'author@clagtee.org',
      role: 'author',
      affiliation: 'Universidad Demo',
      password: 'author2026',
    },
  ];

  const batch = db.batch();
  const now = new Date().toISOString();

  for (const user of seeds) {
    const passwordHash = await hash(user.password, 10);
    const ref = db.collection('users').doc(userDocId(user.email, user.role));
    batch.set(ref, {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      affiliation: user.affiliation,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });
  }

  await batch.commit();
};

export const normalizePaper = (doc) => {
  const data = typeof doc.data === 'function' ? doc.data() : doc;
  return {
    id: data.id || doc.id || '',
    title: data.title || '',
    abstract: data.abstract || '',
    keywords: Array.isArray(data.keywords) ? data.keywords : [],
    authors: Array.isArray(data.authors) ? data.authors : [],
    track: data.track || '',
    trackCode: data.trackCode || '',
    paperNumber: data.paperNumber || null,
    status: data.status || 'pending',
    submitterId: data.submitterId || '',
    submittedAt: data.submittedAt || '',
    updatedAt: data.updatedAt || data.submittedAt || '',
    fileName: data.fileName || '',
    fileUrl: data.fileUrl || '',
    fileKey: data.fileKey || '',
    assignedReviewerIds: Array.isArray(data.assignedReviewerIds)
      ? data.assignedReviewerIds
      : [],
    reviews: Array.isArray(data.reviews) ? data.reviews : [],
  };
};

export const seedPapersIfNeeded = async () => {
  await seedUsersIfNeeded();
  const db = getFirestore();
  const snapshot = await db.collection('papers').limit(1).get();
  if (!snapshot.empty) return;

  const now = new Date().toISOString();
  const trackCode = 'INT';
  const paperNumber = 1;
  const seeds = [
    {
      id: `${trackCode}-${paperNumber}`,
      title: 'Control adaptativo en microrredes aisladas',
      abstract:
        'Se presenta una estrategia de control adaptativo para mejorar la estabilidad en microrredes aisladas bajo variaciones de carga.',
      keywords: ['microrredes', 'control', 'estabilidad'],
      authors: [
        { name: 'Autora Demo', email: 'author@clagtee.org', affiliation: 'Universidad Demo' },
      ],
      track: 'Integracion de Energias Renovables, DER y Almacenamiento',
      trackCode,
      paperNumber,
      status: 'under-review',
      submitterId: 'u-author',
      submittedAt: now,
      updatedAt: now,
      fileName: 'paper-demo.pdf',
      fileUrl: '',
      fileKey: '',
      assignedReviewerIds: ['u-reviewer-1'],
      reviews: [],
    },
  ];

  const batch = db.batch();
  for (const paper of seeds) {
    const ref = db.collection('papers').doc(paper.id);
    batch.set(ref, paper);
  }
  const counterRef = db.collection('counters').doc(`papers_${trackCode}`);
  batch.set(counterRef, { value: paperNumber }, { merge: true });
  await batch.commit();
};
