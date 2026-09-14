import { getFirestore, normalizePaper } from '../_lib/firestore.js';
import { requireAuth, isStaffRole } from '../_lib/auth.js';
import { fetchPaperPdfBuffer, generateAIReview } from '../_lib/gemini-reviewer.js';

export const config = {
  maxDuration: 60,
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
    const session = requireAuth(req, res);
    if (!session) return;

    const body = parseBody(req);
    const { action, paperId, review, status } = body || {};

    if (!paperId) {
      res.status(400).json({ error: 'Missing paperId' });
      return;
    }

    const db = getFirestore();
    const ref = db.collection('papers').doc(String(paperId));

    // ACCIÓN: Generar revisión automática asistida por IA (Skill CLAGTEE Reviewer)
    if (action === 'ai-review') {
      const isReviewer = session.role === 'reviewer';
      const isStaffOrChair = isStaffRole(session.role);

      if (!isReviewer && !isStaffOrChair) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const snapshot = await ref.get();
      if (!snapshot.exists) {
        res.status(404).json({ error: 'Paper not found' });
        return;
      }

      const paperData = normalizePaper(snapshot);
      const assignedIds = Array.isArray(paperData.assignedReviewerIds) ? paperData.assignedReviewerIds : [];

      if (isReviewer && !assignedIds.includes(session.id)) {
        res.status(403).json({ error: 'Reviewer not assigned to this paper' });
        return;
      }

      // Descargar PDF de GCS si fileKey existe
      let pdfBuffer = null;
      if (paperData.fileKey) {
        pdfBuffer = await fetchPaperPdfBuffer(paperData.fileKey);
      }

      const aiReview = await generateAIReview({ paper: paperData, pdfBuffer });
      res.status(200).json({ success: true, review: aiReview });
      return;
    }

    if (session.role !== 'reviewer') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (!review) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // La revision se atribuye siempre a la sesion, nunca al reviewerId del body.
    const reviewerId = session.id;
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
      const assignedIds = Array.isArray(data.assignedReviewerIds) ? data.assignedReviewerIds : [];
      if (!assignedIds.includes(reviewerId)) {
        throw new Error('NOT_ASSIGNED');
      }

      const reviews = Array.isArray(data.reviews) ? [...data.reviews] : [];
      const existingIndex = reviews.findIndex((entry) => entry.reviewerId === reviewerId);
      const existing = existingIndex >= 0 ? reviews[existingIndex] : null;
      const nextReview = {
        id: existing?.id || `r-${reviewerId}-${Date.now().toString(36)}`,
        reviewerId,
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

      const assigned = new Set(assignedIds);

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
    if (error && error.message === 'NOT_ASSIGNED') {
      res.status(403).json({ error: 'Reviewer not assigned to this paper' });
      return;
    }
    const message = error && error.message ? error.message : 'Failed to submit review';
    console.error('[papers-submit-review]', message);
    res.status(500).json({ error: 'Failed to submit review' });
  }
}
