import { hash } from 'bcryptjs';
import { getFirestore, seedUsersIfNeeded, userDocId } from '../_lib/firestore.js';
import { sendReviewerInvitation } from '../_lib/email.js';
import { requireChair } from '../_lib/auth.js';

const generateTempPassword = () => `rev-${Math.random().toString(36).slice(2, 8)}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    await seedUsersIfNeeded();
    if (!(await requireChair(req, res))) return;

    const { name, email, affiliation, action } = req.body || {};
    const isResend = action === 'resend';

    if (!email || (!isResend && !name)) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const role = 'reviewer';
    const db = getFirestore();
    const ref = db.collection('users').doc(userDocId(email, role));
    const existing = await ref.get();

    if (isResend) {
      if (!existing.exists) {
        res.status(404).json({ error: 'Reviewer not found' });
        return;
      }
      const current = existing.data() || {};
      const newPassword = generateTempPassword();
      const newHash = await hash(newPassword, 10);

      let resentAt = null;
      let resendError = null;
      try {
        await sendReviewerInvitation({
          to: current.email,
          name: current.name,
          tempPassword: newPassword,
        });
        resentAt = new Date().toISOString();
      } catch (emailError) {
        resendError = emailError && emailError.message ? emailError.message : 'Error desconocido';
        console.error('[invite-reviewer] Resend failed:', resendError);
      }

      // Only replace the stored password once the email carrying it went out,
      // otherwise a failed resend would lock out a reviewer who had credentials.
      const updates = { invitationSentAt: resentAt, invitationError: resendError };
      if (resentAt) updates.passwordHash = newHash;
      await ref.set(updates, { merge: true });

      if (!resentAt) {
        res.status(502).json({ error: 'No se pudo enviar la invitacion', emailError: resendError });
        return;
      }

      res.status(200).json({
        email: current.email,
        tempPassword: newPassword,
        emailSent: true,
        emailError: null,
      });
      return;
    }

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

