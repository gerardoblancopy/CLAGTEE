import { getFirestore, normalizePaper } from '../_lib/firestore.js';
import { sendReviewerAssignment, sendReviewerAssignmentSummary } from '../_lib/email.js';

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

const findReviewer = async (db, reviewerId) => {
  const snapshot = await db
    .collection('users')
    .where('id', '==', reviewerId)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  return { ref: snapshot.docs[0].ref, data: snapshot.docs[0].data() || {} };
};

const listAssignedPapers = async (db, reviewerId) => {
  const snapshot = await db
    .collection('papers')
    .where('assignedReviewerIds', 'array-contains', reviewerId)
    .get();
  return snapshot.docs
    .map((doc) => normalizePaper(doc))
    .sort((a, b) => a.id.localeCompare(b.id));
};

// Estado por trabajo y estadisticas de las evaluaciones ya emitidas.
const buildSummary = (papers, reviewerId) => {
  const rows = papers.map((paper) => {
    const review = paper.reviews.find((entry) => entry.reviewerId === reviewerId) || null;
    return {
      id: paper.id,
      title: paper.title,
      track: paper.track,
      reviewed: Boolean(review),
      score: review ? review.score : null,
      recommendation: review ? review.recommendation : null,
    };
  });

  const reviewed = rows.filter((row) => row.reviewed);
  const scores = reviewed
    .map((row) => Number(row.score))
    .filter((score) => Number.isFinite(score));
  const recommendations = reviewed.reduce((acc, row) => {
    if (!row.recommendation) return acc;
    acc[row.recommendation] = (acc[row.recommendation] || 0) + 1;
    return acc;
  }, {});

  return {
    rows,
    stats: {
      total: rows.length,
      reviewed: reviewed.length,
      pending: rows.length - reviewed.length,
      averageScore: scores.length
        ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
        : null,
      recommendations,
    },
  };
};

const recordNotification = async (ref, error) => {
  await ref.set(
    {
      assignmentNotifiedAt: error ? null : new Date().toISOString(),
      assignmentNotifyError: error || null,
    },
    { merge: true }
  );
};

// Aviso automatico: informa unicamente el trabajo recien asignado.
// Nunca hace fallar la asignacion; el resultado se devuelve al chair y queda
// registrado en el usuario para verlo en el panel.
const notifyNewAssignment = async (db, reviewerId, paper) => {
  const reviewer = await findReviewer(db, reviewerId);
  if (!reviewer || !reviewer.data.email) {
    return { emailSent: false, emailError: 'Revisor sin correo registrado' };
  }

  try {
    await sendReviewerAssignment({
      to: reviewer.data.email,
      name: reviewer.data.name || '',
      paper: { id: paper.id, title: paper.title, track: paper.track },
    });
    await recordNotification(reviewer.ref, null);
    return { emailSent: true, emailError: null };
  } catch (emailError) {
    const message = emailError && emailError.message ? emailError.message : 'Error desconocido';
    console.error('[papers-assign-reviewer] Email failed:', message);
    await recordNotification(reviewer.ref, message);
    return { emailSent: false, emailError: message };
  }
};

// Envio manual desde el panel del chair: agrupa todos los trabajos asignados,
// marca cuales ya estan revisados e incluye estadisticas de sus evaluaciones.
const notifyAssignmentSummary = async (db, reviewerId) => {
  const reviewer = await findReviewer(db, reviewerId);
  if (!reviewer || !reviewer.data.email) {
    return { emailSent: false, emailError: 'Revisor sin correo registrado', papersCount: 0 };
  }

  const assigned = await listAssignedPapers(db, reviewerId);
  if (assigned.length === 0) {
    return { emailSent: false, emailError: 'El revisor no tiene trabajos asignados', papersCount: 0 };
  }

  const { rows, stats } = buildSummary(assigned, reviewerId);

  try {
    await sendReviewerAssignmentSummary({
      to: reviewer.data.email,
      name: reviewer.data.name || '',
      papers: rows,
      stats,
    });
    await recordNotification(reviewer.ref, null);
    return { emailSent: true, emailError: null, papersCount: rows.length };
  } catch (emailError) {
    const message = emailError && emailError.message ? emailError.message : 'Error desconocido';
    console.error('[papers-assign-reviewer] Summary email failed:', message);
    await recordNotification(reviewer.ref, message);
    return { emailSent: false, emailError: message, papersCount: rows.length };
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = parseBody(req);
    const { paperId, reviewerId, action } = body || {};
    const notifyOnly = action === 'notify';
    const unassign = action === 'unassign';

    if (!reviewerId || (!notifyOnly && !paperId)) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const db = getFirestore();

    if (notifyOnly) {
      const result = await notifyAssignmentSummary(db, reviewerId);
      res.status(result.emailSent ? 200 : 502).json(result);
      return;
    }

    const ref = db.collection('papers').doc(String(paperId));
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      res.status(404).json({ error: 'Paper not found' });
      return;
    }

    const data = snapshot.data() || {};
    const current = Array.isArray(data.assignedReviewerIds) ? data.assignedReviewerIds : [];

    let assigned;
    let status;
    if (unassign) {
      assigned = current.filter((id) => id !== reviewerId);
      status =
        assigned.length === 0 && data.status === 'under-review'
          ? 'pending'
          : data.status || 'pending';
    } else {
      const next = new Set(current);
      next.add(reviewerId);
      assigned = Array.from(next);
      status = data.status === 'pending' ? 'under-review' : data.status || 'pending';
    }

    const updatedAt = new Date().toISOString();

    await ref.set(
      {
        assignedReviewerIds: assigned,
        status,
        updatedAt,
      },
      { merge: true }
    );

    const updatedSnapshot = await ref.get();
    const paper = normalizePaper(updatedSnapshot);

    // Solo se avisa al asignar; quitar un trabajo no genera correo.
    const notification = unassign
      ? { emailSent: false, emailError: null }
      : await notifyNewAssignment(db, reviewerId, paper);

    res.status(200).json({
      paper,
      emailSent: notification.emailSent,
      emailError: notification.emailError,
    });
  } catch (error) {
    const message = error && error.message ? error.message : 'Failed to update reviewer assignment';
    console.error('[papers-assign-reviewer]', message);
    res.status(500).json({ error: 'Failed to update reviewer assignment' });
  }
}
