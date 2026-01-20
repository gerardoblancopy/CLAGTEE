import { getFirestore, normalizePaper } from '../_lib/firestore.js';

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

const allowedStatuses = new Set(['pending', 'under-review', 'accepted', 'rejected', 'withdrawn']);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = parseBody(req);
    const { paperId, status } = body || {};
    if (!paperId || !status) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    if (!allowedStatuses.has(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const db = getFirestore();
    const ref = db.collection('papers').doc(String(paperId));
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      res.status(404).json({ error: 'Paper not found' });
      return;
    }

    const updatedAt = new Date().toISOString();
    await ref.set({ status, updatedAt }, { merge: true });

    const updatedSnapshot = await ref.get();
    res.status(200).json({ paper: normalizePaper(updatedSnapshot) });
  } catch (error) {
    const message = error && error.message ? error.message : 'Failed to update decision';
    console.error('[papers-decision]', message);
    res.status(500).json({ error: 'Failed to update decision' });
  }
}
