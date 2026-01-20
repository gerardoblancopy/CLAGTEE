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

const coerceNumber = (value) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const allowedStatuses = new Set(['pending', 'under-review', 'accepted', 'rejected', 'withdrawn']);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = parseBody(req);
    const { paperId, review, status } = body || {};
    if (!paperId || !review?.reviewerId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    if (status && !allowedStatuses.has(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const db = getFirestore();
    const ref = db.collection('papers').doc(String(paperId));
    const now = new Date().toISOString();

    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) {
        throw new Error('NOT_FOUND');
      }

      const data = snapshot.data() || {};
      const reviews = Array.isArray(data.reviews) ? [...data.reviews] : [];
      const existingIndex = reviews.findIndex(
        (entry) => entry.reviewerId === review.reviewerId
      );
      const existing = existingIndex >= 0 ? reviews[existingIndex] : null;
      const nextReview = {
        id: existing?.id || `r-${review.reviewerId}-${Date.now().toString(36)}`,
        reviewerId: review.reviewerId,
        score: coerceNumber(review.score),
        confidence: coerceNumber(review.confidence),
        recommendation: review.recommendation,
        comments: review.comments ? String(review.comments).trim() : '',
        submittedAt: now,
      };

      if (existingIndex >= 0) {
        reviews[existingIndex] = { ...existing, ...nextReview };
      } else {
        reviews.push(nextReview);
      }

      const assigned = new Set(
        Array.isArray(data.assignedReviewerIds) ? data.assignedReviewerIds : []
      );
      assigned.add(review.reviewerId);

      const nextStatus = status
        ? status
        : data.status === 'pending'
        ? 'under-review'
        : data.status || 'pending';

      transaction.update(ref, {
        reviews,
        assignedReviewerIds: Array.from(assigned),
        status: nextStatus,
        updatedAt: now,
      });
    });

    const updatedSnapshot = await ref.get();
    res.status(200).json({ paper: normalizePaper(updatedSnapshot) });
  } catch (error) {
    if (error && error.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Paper not found' });
      return;
    }
    const message = error && error.message ? error.message : 'Failed to submit review';
    console.error('[papers-submit-review]', message);
    res.status(500).json({ error: 'Failed to submit review' });
  }
}
