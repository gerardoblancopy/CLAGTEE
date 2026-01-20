import { hash } from 'bcryptjs';
import { getFirestore, sanitizeUser, seedUsersIfNeeded, userDocId } from '../_lib/firestore.js';

const allowedRoles = new Set(['author', 'reviewer']);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    await seedUsersIfNeeded();
    const { name, email, password, role, affiliation } = req.body || {};

    if (!name || !email || !password || !role) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    if (!allowedRoles.has(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    const db = getFirestore();
    const docId = userDocId(email, role);
    const ref = db.collection('users').doc(docId);
    const existing = await ref.get();

    if (existing.exists) {
      res.status(409).json({ error: 'Email already registered for this role' });
      return;
    }

    const passwordHash = await hash(password, 10);
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

    res.status(201).json({ user: sanitizeUser(user) });
  } catch (error) {
    const message = error && error.message ? error.message : 'Failed to register user';
    console.error('[auth-register]', message);
    res.status(500).json({ error: 'Failed to register user' });
  }
}
