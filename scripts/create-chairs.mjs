import { hash } from 'bcryptjs';
import { getFirestore, userDocId } from '../api/_lib/firestore.js';

const CHAIRS = [
  {
    id: 'u-chair-mdp',
    name: 'Juan Jose Roberts',
    email: 'jjroberts@fi.mdp.edu.ar',
    affiliation: 'Universidad Nacional de Mar del Plata',
    password: process.env.CHAIR_MDP_PASSWORD,
  },
  {
    id: 'u-chair-pucv',
    name: 'Jorge Mendoza',
    email: 'jorge.mendoza@pucv.cl',
    affiliation: 'Pontificia Universidad Catolica de Valparaiso',
    password: process.env.CHAIR_PUCV_PASSWORD,
  },
  {
    id: 'u-chair-unesp',
    name: 'Celso Tuna',
    email: 'celso.tuna@unesp.br',
    affiliation: 'Universidade Estadual Paulista (UNESP)',
    password: process.env.CHAIR_UNESP_PASSWORD,
  },
];

const run = async () => {
  const missing = CHAIRS.filter((c) => !c.password).map((c) => c.email);
  if (missing.length > 0) {
    console.error('Missing passwords for:', missing.join(', '));
    console.error('Set CHAIR_MDP_PASSWORD, CHAIR_PUCV_PASSWORD, CHAIR_UNESP_PASSWORD');
    process.exit(1);
  }

  const db = getFirestore();
  const now = new Date().toISOString();

  for (const chair of CHAIRS) {
    const ref = db.collection('users').doc(userDocId(chair.email, 'chair'));
    const existing = await ref.get();
    if (existing.exists) {
      console.log(`SKIP ${chair.email} (already exists)`);
      continue;
    }
    const passwordHash = await hash(chair.password, 10);
    await ref.set({
      id: chair.id,
      name: chair.name,
      email: chair.email,
      role: 'chair',
      affiliation: chair.affiliation,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`CREATED ${chair.email}`);
  }

  console.log('Done.');
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
