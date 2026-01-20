import { getFirestore } from '../_lib/firestore.js';

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
    const { paperId } = body || {};
    if (!paperId) {
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

    await ref.delete();
    res.status(200).json({ ok: true });
  } catch (error) {
    const message = error && error.message ? error.message : 'Failed to delete paper';
    console.error('[papers-delete]', message);
    res.status(500).json({ error: 'Failed to delete paper' });
  }
}
