import { getFirestore, sanitizeUser, seedUsersIfNeeded } from '../_lib/firestore.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    await seedUsersIfNeeded();
    const role = typeof req.query.role === 'string' ? req.query.role : '';
    const db = getFirestore();
    let query = db.collection('users');
    if (role) {
      query = query.where('role', '==', role);
    }
    const snapshot = await query.get();
    const users = snapshot.docs.map((doc) => sanitizeUser(doc.data()));
    res.status(200).json({ users });
  } catch (error) {
    const message = error && error.message ? error.message : 'Failed to fetch users';
    console.error('[auth-users]', message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}
