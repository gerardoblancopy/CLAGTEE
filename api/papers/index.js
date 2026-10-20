import { getFirestore, normalizePaper, seedPapersIfNeeded } from '../_lib/firestore.js';
import { isStaffRole, requireAuth, signEcfTicket, verifyEcfTicket } from '../_lib/auth.js';

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
      const session = requireAuth(req, res);
      if (!session) return;

      const db = getFirestore();
      const userEmail = String(session.email || '').trim().toLowerCase();
      let papers = [];

      if (isStaffRole(session.role)) {
        const snapshot = await db.collection('papers').get();
        papers = snapshot.docs.map((doc) => normalizePaper(doc));
      } else if (session.role === 'reviewer') {
        const snapshot = await db
          .collection('papers')
          .where('assignedReviewerIds', 'array-contains', session.id)
          .get();
        papers = snapshot.docs.map((doc) => normalizePaper(doc));
      } else if (session.role === 'author' || session.role === 'attendee') {
        const snapshot = await db.collection('papers').get();
        papers = snapshot.docs
          .map((doc) => normalizePaper(doc))
          .filter((paper) => {
            if (session.role === 'author' && paper.submitterId && paper.submitterId === session.id) {
              return true;
            }
            if (userEmail && Array.isArray(paper.authors)) {
              return paper.authors.some(
                (a) => a && typeof a.email === 'string' && a.email.trim().toLowerCase() === userEmail
              );
            }
            return false;
          });
      } else {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      papers.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
      res.status(200).json({ papers });
    } catch (error) {
      const message = error && error.message ? error.message : 'Failed to fetch papers';
      console.error('[papers-index]', message);
      res.status(500).json({ error: 'Failed to fetch papers' });
    }
    return;
  }

  if (req.method === 'PUT') {
    try {
      const session = requireAuth(req, res);
      if (!session) return;

      const body = parseBody(req);
      const { paperId, input, action } = body || {};
      if (!paperId || !input) {
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

      const current = snapshot.data();

      const isSubmitter = current.submitterId === session.id;
      const userEmail = String(session.email || '').trim().toLowerCase();
      const isAuthor = Array.isArray(current.authors) && current.authors.some(
        (a) => a && typeof a.email === 'string' && a.email.trim().toLowerCase() === userEmail
      );
      if (!isSubmitter && !isAuthor && session.role !== 'chair' && session.role !== 'staff') {
        res.status(403).json({ error: 'Not allowed to edit this paper' });
        return;
      }

      // Version revisada (camera-ready): solo para papers ya aceptados.
      // Permite cargar manuscrito revisado, formulario de copyright IEEE (eCF)
      // y certificado de formato IEEE, juntos o de forma independiente.
      if (action === 'revision') {
        if (current.status !== 'accepted') {
          res.status(409).json({ error: 'Paper is not accepted' });
          return;
        }

        const now = new Date().toISOString();
        const updates = {
          updatedAt: now,
        };

        if (typeof input.revisionNote === 'string') {
          updates.revisionNote = input.revisionNote.trim();
        }

        if (typeof input.fileKey === 'string' && input.fileKey.trim()) {
          updates.revisedFileName = String(input.fileName || '').trim();
          updates.revisedFileUrl = String(input.fileUrl || '').trim();
          updates.revisedFileKey = input.fileKey.trim();
          updates.revisedAt = now;
        }

        if (typeof input.copyrightFileKey === 'string' && input.copyrightFileKey.trim()) {
          updates.copyrightFileName = String(input.copyrightFileName || '').trim();
          updates.copyrightFileUrl = String(input.copyrightFileUrl || '').trim();
          updates.copyrightFileKey = input.copyrightFileKey.trim();
          updates.copyrightAt = now;
        }

        if (typeof input.formatCertFileKey === 'string' && input.formatCertFileKey.trim()) {
          updates.formatCertFileName = String(input.formatCertFileName || '').trim();
          updates.formatCertFileUrl = String(input.formatCertFileUrl || '').trim();
          updates.formatCertFileKey = input.formatCertFileKey.trim();
          updates.formatCertAt = now;
        }

        if (typeof input.formatValidationStatus === 'string' && input.formatValidationStatus.trim()) {
          updates.formatValidationStatus = input.formatValidationStatus.trim();
        }

        await ref.set(updates, { merge: true });

        const revisedSnapshot = await ref.get();
        res.status(200).json({ paper: normalizePaper(revisedSnapshot) });
        return;
      }

      const reviewerIds = Array.isArray(current.assignedReviewerIds)
        ? current.assignedReviewerIds
        : [];
      if (reviewerIds.length > 0) {
        res.status(409).json({ error: 'Paper already assigned to reviewers' });
        return;
      }
      if (current.status && current.status !== 'pending') {
        res.status(409).json({ error: 'Paper cannot be edited in current status' });
        return;
      }

      const updates = {
        title: String(input.title || '').trim(),
        abstract: String(input.abstract || '').trim(),
        keywords: parseKeywords(input.keywords),
        authors: Array.isArray(input.authors) ? input.authors : [],
        track: String(input.track || current.track || '').trim(),
        updatedAt: new Date().toISOString(),
      };

      if (typeof input.fileName === 'string' && input.fileName.trim()) {
        updates.fileName = input.fileName.trim();
      }
      if (typeof input.fileUrl === 'string') {
        updates.fileUrl = input.fileUrl.trim();
      }
      if (typeof input.fileKey === 'string' && input.fileKey.trim()) {
        updates.fileKey = input.fileKey.trim();
      }

      await ref.set(updates, { merge: true });

      const updatedSnapshot = await ref.get();
      res.status(200).json({ paper: normalizePaper(updatedSnapshot) });
    } catch (error) {
      const message = error && error.message ? error.message : 'Failed to update paper';
      console.error('[papers-update]', message);
      res.status(500).json({ error: 'Failed to update paper' });
    }
    return;
  }

  if (req.method === 'POST') {
    const body = parseBody(req);

    // Copyright IEEE (eCF): el autor pide un pase para abrir el eCF desde el
    // dominio registrado ante IEEE, y esa página lo canjea por los datos del paper.
    if (body?.action === 'ecf-ticket' || body?.action === 'ecf-redeem') {
      try {
        let session = null;
        let paperId;
        let signerEmail;
        if (body.action === 'ecf-ticket') {
          session = requireAuth(req, res);
          if (!session) return;
          paperId = String(body.paperId || '');
          signerEmail = String(session.email || '');
        } else {
          const ticket = verifyEcfTicket(body.ticket);
          if (!ticket) {
            res.status(401).json({ error: 'El enlace para firmar venció. Vuelve al CMS y pulsa "Firmar en IEEE" de nuevo.' });
            return;
          }
          paperId = String(ticket.paperId);
          signerEmail = String(ticket.signerEmail || '');
        }

        const snapshot = paperId ? await getFirestore().collection('papers').doc(paperId).get() : null;
        if (!snapshot || !snapshot.exists) {
          res.status(404).json({ error: 'Paper not found' });
          return;
        }
        const current = snapshot.data();
        if (current.status !== 'accepted') {
          res.status(409).json({ error: 'Paper is not accepted' });
          return;
        }

        if (session) {
          const userEmail = signerEmail.trim().toLowerCase();
          const isAuthor =
            current.submitterId === session.id ||
            (Array.isArray(current.authors) &&
              current.authors.some((a) => a && typeof a.email === 'string' && a.email.trim().toLowerCase() === userEmail));
          if (!isAuthor && !isStaffRole(session.role)) {
            res.status(403).json({ error: 'Not allowed for this paper' });
            return;
          }
          res.status(200).json({ ticket: signEcfTicket({ paperId, signerEmail }) });
          return;
        }

        res.status(200).json({
          paper: {
            id: paperId,
            title: String(current.title || ''),
            authors: (Array.isArray(current.authors) ? current.authors : []).map((a) => ({
              name: String(a?.name || ''),
              email: String(a?.email || ''),
            })),
          },
          signerEmail,
        });
      } catch (error) {
        const message = error && error.message ? error.message : 'Failed to process eCF request';
        console.error('[papers-ecf]', message);
        res.status(500).json({ error: 'Failed to process eCF request' });
      }
      return;
    }

    try {
      const session = requireAuth(req, res);
      if (!session) return;
      if (session.role === 'attendee' || session.role === 'company') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const input = body?.input;
      if (!input) {
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
        submitterId: session.id,
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
