import { getFirestore, normalizePaper, seedPapersIfNeeded } from '../_lib/firestore.js';

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

const getQueryParam = (req, key) => {
  if (req.query && typeof req.query[key] === 'string') {
    return req.query[key];
  }
  if (!req.url) return null;
  const url = new URL(req.url, 'http://localhost');
  return url.searchParams.get(key);
};

const parseKeywords = (keywords) => {
  if (Array.isArray(keywords)) return keywords.filter(Boolean);
  if (typeof keywords !== 'string') return [];
  return keywords
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const buildTrackCode = (track) => {
  if (!track) return 'GEN';
  const normalized = track
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '');
  if (!normalized) return 'GEN';
  return normalized.slice(0, 3).toUpperCase();
};

const getNextPaperNumber = async (db, trackCode) => {
  const counterRef = db.collection('counters').doc(`papers_${trackCode}`);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(counterRef);
    const current = snapshot.exists ? Number(snapshot.data().value) || 0 : 0;
    const next = current + 1;
    transaction.set(counterRef, { value: next }, { merge: true });
    return next;
  });
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await seedPapersIfNeeded();
      const submitterId = getQueryParam(req, 'submitterId');
      const reviewerId = getQueryParam(req, 'reviewerId');

      const db = getFirestore();
      let query = db.collection('papers');
      if (submitterId) {
        query = query.where('submitterId', '==', submitterId);
      } else if (reviewerId) {
        query = query.where('assignedReviewerIds', 'array-contains', reviewerId);
      }

      const snapshot = await query.get();
      const papers = snapshot.docs
        .map((doc) => normalizePaper(doc))
        .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));

      res.status(200).json({ papers });
    } catch (error) {
      const message = error && error.message ? error.message : 'Failed to fetch papers';
      console.error('[papers-index]', message);
      res.status(500).json({ error: 'Failed to fetch papers' });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const body = parseBody(req);
      const input = body?.input;
      const submitter = body?.submitter;
      if (!input || !submitter?.id) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const db = getFirestore();
      const now = new Date().toISOString();
      const trackCode = buildTrackCode(input.track || '');
      const paperNumber = await getNextPaperNumber(db, trackCode);
      const paperId = `${trackCode}-${paperNumber}`;
      const ref = db.collection('papers').doc(paperId);

      const paper = {
        id: ref.id,
        title: String(input.title || '').trim(),
        abstract: String(input.abstract || '').trim(),
        keywords: parseKeywords(input.keywords),
        authors: Array.isArray(input.authors) ? input.authors : [],
        track: String(input.track || '').trim(),
        trackCode,
        paperNumber,
        status: 'pending',
        submitterId: submitter.id,
        submittedAt: now,
        updatedAt: now,
        fileName: input.fileName ? String(input.fileName).trim() : '',
        fileUrl: input.fileUrl ? String(input.fileUrl).trim() : '',
        fileKey: input.fileKey ? String(input.fileKey).trim() : '',
        assignedReviewerIds: [],
        reviews: [],
      };

      await ref.set(paper);

      res.status(201).json({ paper });
    } catch (error) {
      const message = error && error.message ? error.message : 'Failed to create paper';
      console.error('[papers-create]', message);
      res.status(500).json({ error: 'Failed to create paper' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
