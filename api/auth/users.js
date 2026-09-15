import { compare, hash } from 'bcryptjs';
import { getFirestore, sanitizeUser, seedUsersIfNeeded, userDocId } from '../_lib/firestore.js';
import { sendCustomEmail, sendPasswordReset } from '../_lib/email.js';
import { requireAuth, requireChair, requireStaff } from '../_lib/auth.js';

const generateTempPassword = () => `tmp-${Math.random().toString(36).slice(2, 10)}`;

export default async function handler(req, res) {
  try {
    await seedUsersIfNeeded();
    const db = getFirestore();

    // PATCH: Request password reset (no auth required, sends temp password by email)
    if (req.method === 'PATCH') {
      const { email, role } = req.body || {};

      if (!email || !role) {
        res.status(400).json({ error: 'Missing email or role' });
        return;
      }

      const ref = db.collection('users').doc(userDocId(email, role));
      const snapshot = await ref.get();

      // Always respond with success to avoid leaking whether the email exists
      if (!snapshot.exists) {
        res.status(200).json({ success: true });
        return;
      }

      const data = snapshot.data();
      const tempPassword = generateTempPassword();
      const newHash = await hash(tempPassword, 10);

      await ref.update({
        passwordHash: newHash,
        updatedAt: new Date().toISOString(),
      });

      try {
        await sendPasswordReset({
          to: data.email,
          name: data.name,
          tempPassword,
        });
      } catch (emailError) {
        console.error('[reset-password] Email failed:', emailError.message);
        res.status(500).json({ error: 'Failed to send recovery email' });
        return;
      }

      res.status(200).json({ success: true });
      return;
    }

    // PUT: Change password (requires current password)
    if (req.method === 'PUT') {
      const session = requireAuth(req, res);
      if (!session) return;

      const { email, role, currentPassword, newPassword } = req.body || {};

      if (!email || !role || !currentPassword || !newPassword) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Solo la propia cuenta de la sesion, nunca la de otro usuario.
      if (String(email).toLowerCase() !== String(session.email).toLowerCase() || role !== session.role) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      if (String(newPassword).length < 6) {
        res.status(400).json({ error: 'New password must be at least 6 characters' });
        return;
      }

      const ref = db.collection('users').doc(userDocId(email, role));
      const snapshot = await ref.get();
      if (!snapshot.exists) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const data = snapshot.data();
      const ok = await compare(currentPassword, data.passwordHash || '');
      if (!ok) {
        res.status(401).json({ error: 'Current password is incorrect' });
        return;
      }

      const newHash = await hash(newPassword, 10);
      await ref.update({
        passwordHash: newHash,
        updatedAt: new Date().toISOString(),
      });

      res.status(200).json({ success: true });
      return;
    }

    // POST: Send a custom email to one or more users
    if (req.method === 'POST') {
      // Sin esto cualquiera podia enviar correo desde el dominio de la conferencia.
      if (!(await requireStaff(req, res))) return;

      const { to, name, subject, body } = req.body || {};

      if (!to || !subject || !body) {
        res.status(400).json({ error: 'Missing required fields: to, subject, body' });
        return;
      }

      const recipients = Array.isArray(to) ? to : [to];
      const trimmedSubject = String(subject).trim();
      const trimmedBody = String(body).trim();

      if (!trimmedSubject || !trimmedBody) {
        res.status(400).json({ error: 'Subject and body cannot be empty' });
        return;
      }

      const succeededRecipients = [];
      const failedRecipients = [];

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        if (i > 0) {
          // Delay de 200ms para asegurar máximo 5 req/s (límite de Resend es 10 req/s)
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        try {
          await sendCustomEmail({
            to: recipient,
            name: name || '',
            subject: trimmedSubject,
            body: trimmedBody,
            // One archive copy per send action, not one per recipient
            archiveCopy: i === 0,
          });
          succeededRecipients.push(recipient);
        } catch (sendErr) {
          const errMsg = sendErr && sendErr.message ? sendErr.message : 'Error desconocido';
          console.error(`[auth-users] Error sending email to ${recipient}:`, errMsg);
          failedRecipients.push({ email: recipient, error: errMsg });
        }
      }

      if (failedRecipients.length > 0 && succeededRecipients.length === 0) {
        res.status(500).json({
          error: 'Failed to send email',
          details: failedRecipients[0].error,
          failedRecipients,
        });
        return;
      }

      res.status(200).json({
        success: true,
        sent: succeededRecipients.length,
        failed: failedRecipients.length,
        sentRecipients: succeededRecipients,
        failedRecipients,
      });
      return;
    }

    // GET: List users (optionally filtered by role)
    if (req.method === 'GET') {
      if (!(await requireStaff(req, res))) return;

      const role = typeof req.query.role === 'string' ? req.query.role : '';
      let query = db.collection('users');
      if (role) {
        query = query.where('role', '==', role);
      }
      const snapshot = await query.get();
      const users = snapshot.docs.map((doc) => sanitizeUser(doc.data()));
      res.status(200).json({ users });
      return;
    }

    // DELETE: Delete a user by userId or email (with role)
    if (req.method === 'DELETE') {
      if (!(await requireChair(req, res))) return;

      const { userId, email, role } = req.body || {};

      if (!userId && !email) {
        res.status(400).json({ error: 'Missing userId or email' });
        return;
      }

      const targetRole = role || 'reviewer';

      if (targetRole === 'chair') {
        res.status(403).json({ error: 'Cannot delete chair accounts' });
        return;
      }

      // If we have the email, we can build the doc ID directly
      if (email) {
        const ref = db.collection('users').doc(userDocId(email, targetRole));
        const doc = await ref.get();
        if (!doc.exists) {
          res.status(404).json({ error: 'User not found' });
          return;
        }
        await ref.delete();
        res.status(200).json({ success: true });
        return;
      }

      // Otherwise search by userId
      const snapshot = await db
        .collection('users')
        .where('id', '==', userId)
        .where('role', '==', targetRole)
        .limit(1)
        .get();

      if (snapshot.empty) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      await snapshot.docs[0].ref.delete();
      res.status(200).json({ success: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const message = error && error.message ? error.message : 'Operation failed';
    console.error('[auth-users]', message);
    res.status(500).json({ error: message });
  }
}

