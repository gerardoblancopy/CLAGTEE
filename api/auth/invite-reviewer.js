import { hash } from 'bcryptjs';
import { getFirestore, seedUsersIfNeeded, userDocId } from '../_lib/firestore.js';
import { sendReviewerInvitation } from '../_lib/email.js';

const generateTempPassword = () => `rev-${Math.random().toString(36).slice(2, 8)}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    await seedUsersIfNeeded();
    const { name, email, affiliation } = req.body || {};

    if (!name || !email) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const role = 'reviewer';
    const db = getFirestore();
    const ref = db.collection('users').doc(userDocId(email, role));
    const existing = await ref.get();

    if (existing.exists) {
      res.status(409).json({ error: 'Email already registered for reviewer' });
      return;
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hash(tempPassword, 10);
    const now = new Date().toISOString();
    const user = {
      id: `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      role,
      affiliation: affiliation ? String(affiliation).trim() : '',
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    await ref.set(user);

    // Send invitation email (non-blocking for response) and record the outcome,
    // so a reviewer that never got credentials is visible in the chair panel.
    let invitationSentAt = null;
    let invitationError = null;
    try {
      await sendReviewerInvitation({
        to: user.email,
        name: user.name,
        tempPassword,
      });
      invitationSentAt = new Date().toISOString();
    } catch (emailError) {
      invitationError = emailError && emailError.message ? emailError.message : 'Error desconocido';
      console.error('[invite-reviewer] Email failed (user still created):', invitationError);
    }

    // Deliberately not touching updatedAt: it only tracks password activity,
    // which is the signal that a reviewer actually used their credentials.
    await ref.set({ invitationSentAt, invitationError }, { merge: true });

    res.status(201).json({
      email: user.email,
      tempPassword,
      emailSent: Boolean(invitationSentAt),
      emailError: invitationError,
    });
  } catch (error) {
    const message = error && error.message ? error.message : 'Failed to invite reviewer';
    console.error('[auth-invite-reviewer]', message);
    res.status(500).json({ error: 'Failed to invite reviewer' });
  }
}

