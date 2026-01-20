import { compare } from 'bcryptjs';
import { getFirestore, sanitizeUser, seedUsersIfNeeded, userDocId } from '../_lib/firestore.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    await seedUsersIfNeeded();
    const { email, password, role } = req.body || {};

    if (!email || !password || !role) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const db = getFirestore();
    const ref = db.collection('users').doc(userDocId(email, role));
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      res.status(404).json({ error: 'User not found for role' });
      return;
    }

    const data = snapshot.data();
    const ok = await compare(password, data.passwordHash || '');
    if (!ok) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    res.status(200).json({ user: sanitizeUser(data) });
  } catch (error) {
    const message = error && error.message ? error.message : 'Failed to login';
    console.error('[auth-login]', message);
    res.status(500).json({ error: 'Failed to login' });
  }
}
