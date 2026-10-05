import { compare } from 'bcryptjs';
import { getFirestore, sanitizeUser, seedUsersIfNeeded, userDocId } from '../_lib/firestore.js';
import { signSession } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    await seedUsersIfNeeded();
    const { email, password, role } = req.body || {};

    if (!email || !password) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const db = getFirestore();

    // 1. Si se especificó rol, intentar primero con ese rol exacto
    if (role) {
      const ref = db.collection('users').doc(userDocId(cleanEmail, role));
      const snapshot = await ref.get();
      if (snapshot.exists) {
        const data = snapshot.data();
        const ok = await compare(password, data.passwordHash || '');
        if (ok) {
          const user = sanitizeUser(data);
          res.status(200).json({ user, token: signSession(user) });
          return;
        }
      }
    }

    // 2. Autodetección / fallback: buscar todas las cuentas asociadas a este email
    const emailUsersSnap = await db
      .collection('users')
      .where('email', '==', cleanEmail)
      .get();

    if (!emailUsersSnap.empty) {
      for (const doc of emailUsersSnap.docs) {
        const data = doc.data();
        if (data.passwordHash && (await compare(password, data.passwordHash))) {
          // Si el usuario solicitó entrar con rol 'author' o 'attendee' y aún no tiene esa ficha,
          // aprovisionarla con la misma contraseña y datos para que funcione transparentemente
          if (role && role !== data.role && (role === 'author' || role === 'attendee')) {
            const requestedDocRef = db.collection('users').doc(userDocId(cleanEmail, role));
            const reqSnap = await requestedDocRef.get();
            if (!reqSnap.exists) {
              const now = new Date().toISOString();
              const newRoleUser = {
                id: `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
                name: data.name || cleanEmail,
                email: cleanEmail,
                role,
                affiliation: data.affiliation || '',
                passwordHash: data.passwordHash,
                createdAt: now,
                updatedAt: now,
              };
              await requestedDocRef.set(newRoleUser);
              const sanitized = sanitizeUser(newRoleUser);
              res.status(200).json({ user: sanitized, token: signSession(sanitized) });
              return;
            }
          }

          const user = sanitizeUser(data);
          res.status(200).json({ user, token: signSession(user) });
          return;
        }
      }
      // Se encontró el usuario pero la contraseña no coincidió con ninguna de sus cuentas
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    res.status(404).json({ error: 'User not found' });
  } catch (error) {
    const message = error && error.message ? error.message : 'Failed to login';
    console.error('[auth-login]', message);
    res.status(500).json({ error: 'Failed to login' });
  }
}
