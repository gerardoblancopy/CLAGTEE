// Crea (o actualiza) un usuario con rol "staff" para acceder al panel de Inscripciones.
// Uso (desde la raíz del repo, con .env / .env.local presentes):
//   node scripts/create-staff-user.mjs <email> "<nombre>" <password> [afiliacion]
//
// Ej: node scripts/create-staff-user.mjs ana@clagtee.org "Ana Pérez" claveSegura123 PUCV

import { hash } from 'bcryptjs';
import { getFirestore, userDocId } from '../api/_lib/firestore.js';

const [, , email, name, password, affiliation = 'CLAGTEE'] = process.argv;

if (!email || !name || !password) {
  console.error('Uso: node scripts/create-staff-user.mjs <email> "<nombre>" <password> [afiliacion]');
  process.exit(1);
}

if (password.length < 6) {
  console.error('La contraseña debe tener al menos 6 caracteres.');
  process.exit(1);
}

const role = 'staff';

const main = async () => {
  const db = getFirestore();
  const ref = db.collection('users').doc(userDocId(email, role));
  const existing = await ref.get();
  const now = new Date().toISOString();
  const passwordHash = await hash(password, 10);

  await ref.set(
    {
      id: existing.exists ? existing.data().id : `u-staff-${Date.now()}`,
      name,
      email,
      role,
      affiliation,
      passwordHash,
      createdAt: existing.exists ? existing.data().createdAt || now : now,
      updatedAt: now,
    },
    { merge: true }
  );

  console.log(`${existing.exists ? 'Actualizado' : 'Creado'} usuario staff: ${email}`);
  console.log('Inicia sesión en /cms con rol "Staff".');
  process.exit(0);
};

main().catch((error) => {
  console.error('Error:', error?.message || error);
  process.exit(1);
});
