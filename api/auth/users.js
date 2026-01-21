import { getFirestore, sanitizeUser, seedUsersIfNeeded, userDocId } from '../_lib/firestore.js';

export default async function handler(req, res) {
  try {
    await seedUsersIfNeeded();
    const db = getFirestore();

    // GET: List users (optionally filtered by role)
    if (req.method === 'GET') {
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

    // DELETE: Delete a reviewer by userId or email
    if (req.method === 'DELETE') {
      const { userId, email } = req.body || {};

      if (!userId && !email) {
        res.status(400).json({ error: 'Missing userId or email' });
        return;
      }

      const role = 'reviewer';

      // If we have the email, we can build the doc ID directly
      if (email) {
        const ref = db.collection('users').doc(userDocId(email, role));
        const doc = await ref.get();
        if (!doc.exists) {
          res.status(404).json({ error: 'Reviewer not found' });
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
        .where('role', '==', role)
        .limit(1)
        .get();

      if (snapshot.empty) {
        res.status(404).json({ error: 'Reviewer not found' });
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

