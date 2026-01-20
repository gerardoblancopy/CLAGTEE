import { hash } from 'bcryptjs';
import { getFirestore, seedUsersIfNeeded, userDocId } from '../_lib/firestore.js';

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

    res.status(201).json({ email: user.email, tempPassword });
  } catch (error) {
    const message = error && error.message ? error.message : 'Failed to invite reviewer';
    console.error('[auth-invite-reviewer]', message);
    res.status(500).json({ error: 'Failed to invite reviewer' });
  }
}
