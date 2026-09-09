// Sesiones firmadas para el CMS.
//
// El cliente guarda el token que devuelven /api/auth/login y /api/auth/register
// y lo envia en cada peticion como `Authorization: Bearer <token>`.
// El token es `<payload base64url>.<HMAC-SHA256 base64url>`: no requiere estado
// en el servidor y no se puede falsificar sin SESSION_SECRET.
//
// Antes de esto la identidad venia en el body (submitterId, staffEmail), es
// decir, la elegia quien llamaba: cualquiera podia borrar papers, forjar
// revisiones o listar inscripciones.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getFirestore, userDocId } from './firestore.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const STAFF_ROLES = ['chair', 'staff'];

const getSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    // Falla cerrado: sin secreto no se emite ni se acepta ninguna sesion.
    throw new Error('Missing env: SESSION_SECRET');
  }
  return secret;
};

const signPayload = (payloadB64) =>
  createHmac('sha256', getSecret()).update(payloadB64).digest('base64url');

export const signSession = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${payloadB64}.${signPayload(payloadB64)}`;
};

export const verifyToken = (token) => {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature) return null;

  const expected = Buffer.from(signPayload(payloadB64), 'utf8');
  const received = Buffer.from(signature, 'utf8');
  if (expected.length !== received.length) return null;
  if (!timingSafeEqual(expected, received)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch (error) {
    return null;
  }

  if (!payload || !payload.id || !payload.role || !payload.exp) return null;
  if (Date.now() > Number(payload.exp)) return null;

  return payload;
};

export const getSession = (req) => {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(String(header).trim());
  if (!match) return null;
  return verifyToken(match[1]);
};

export const requireAuth = (req, res) => {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return session;
};

export const requireRoles = (req, res, roles) => {
  const session = requireAuth(req, res);
  if (!session) return null;
  if (!roles.includes(session.role)) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return session;
};

// Para operaciones privilegiadas revalidamos contra Firestore: asi un chair o
// staff eliminado o degradado pierde el acceso sin esperar a que expire el token.
const requireVerifiedRoles = async (req, res, roles) => {
  const session = requireRoles(req, res, roles);
  if (!session) return null;

  const db = getFirestore();
  const snapshot = await db.collection('users').doc(userDocId(session.email, session.role)).get();
  if (!snapshot.exists || !roles.includes(snapshot.data().role) || snapshot.data().id !== session.id) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }

  return session;
};

export const requireStaff = (req, res) => requireVerifiedRoles(req, res, STAFF_ROLES);

export const requireChair = (req, res) => requireVerifiedRoles(req, res, ['chair']);

export const isStaffRole = (role) => STAFF_ROLES.includes(role);
