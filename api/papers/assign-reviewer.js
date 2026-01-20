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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = parseBody(req);
    const { paperId, reviewerId } = body || {};
    if (!paperId || !reviewerId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const db = getFirestore();
    const ref = db.collection('papers').doc(String(paperId));
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      res.status(404).json({ error: 'Paper not found' });
      return;
    }

    const data = snapshot.data() || {};
    const assigned = new Set(
      Array.isArray(data.assignedReviewerIds) ? data.assignedReviewerIds : []
    );
    assigned.add(reviewerId);

    const status = data.status === 'pending' ? 'under-review' : data.status || 'pending';
    const updatedAt = new Date().toISOString();

    await ref.set(
      {
        assignedReviewerIds: Array.from(assigned),
        status,
        updatedAt,
      },
      { merge: true }
    );

    const updatedSnapshot = await ref.get();
    res.status(200).json({ paper: normalizePaper(updatedSnapshot) });
  } catch (error) {
    const message = error && error.message ? error.message : 'Failed to assign reviewer';
    console.error('[papers-assign-reviewer]', message);
    res.status(500).json({ error: 'Failed to assign reviewer' });
  }
}
