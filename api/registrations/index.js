import { randomBytes } from 'node:crypto';
import { getFirestore, userDocId } from '../_lib/firestore.js';
import {
  getPhase,
  resolvePricing,
  validateRegistrationInput,
  getCouponDefinition,
  normalizeCouponCode,
  stripUndefined,
} from '../_lib/registration-config.js';
import { sendRegistrationReceipt, sendComprobanteReceived, sendCouponConfirmation } from '../_lib/email.js';

const str = (value) => (typeof value === 'string' ? value.trim() : '');

// Estados que aún permiten (re)cargar comprobante (PATCH del participante).
const EDITABLE_STATUSES = ['pre-registro-creado', 'comprobante-recibido', 'observado'];

// Estados que el staff puede asignar manualmente.
const STAFF_STATUSES = [
  'pre-registro-creado',
  'comprobante-recibido',
  'observado',
  'pago-validado',
  'confirmada',
  'cancelada',
];

// Autorización ligera de staff: verifica que el usuario exista en `users` con rol staff o chair.
// Nota: no es autenticación fuerte (no hay sesión/JWT en el sistema); endurecer con
// Firestore Rules o tokens de sesión más adelante.
const isStaff = async (db, email, role) => {
  if (!email || (role !== 'staff' && role !== 'chair')) return false;
  const snap = await db.collection('users').doc(userDocId(email, role)).get();
  if (!snap.exists) return false;
  const docRole = snap.data().role;
  return docRole === 'staff' || docRole === 'chair';
};

const stripToken = (record) => {
  const { token, ...rest } = record;
  return rest;
};

const parseBody = (req) => {
  if (!req.body) return null;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return null;
    }
  }
  return req.body;
};

const getQueryParam = (req, key) => {
  if (req.query && typeof req.query[key] === 'string') {
    return req.query[key];
  }
  if (!req.url) return null;
  const url = new URL(req.url, 'http://localhost');
  return url.searchParams.get(key);
};

// Crea el registro dentro de una única transacción: consume el correlativo de
// inscripciones y, si hay cupón, su cupo (counters/coupon_<CODE>) de forma atómica.
// Si el cupón ya se agotó, la transacción no escribe nada y retorna { exhausted: true }.
const createRegistrationTransaction = async (db, { couponDef, couponKey, buildRecord }) =>
  db.runTransaction(async (transaction) => {
    const counterRef = db.collection('counters').doc('registrations');
    const counterSnap = await transaction.get(counterRef);
    const currentNumber = counterSnap.exists ? Number(counterSnap.data().value) || 0 : 0;

    let couponRef = null;
    if (couponDef) {
      couponRef = db.collection('counters').doc(`coupon_${couponKey}`);
      const couponSnap = await transaction.get(couponRef);
      const used = couponSnap.exists ? Number(couponSnap.data().used) || 0 : 0;
      if (used >= couponDef.maxUses) {
        return { exhausted: true };
      }
      transaction.set(couponRef, { used: used + 1, code: couponDef.code }, { merge: true });
    }

    const number = currentNumber + 1;
    const record = buildRecord(number);
    transaction.set(counterRef, { value: number }, { merge: true });
    transaction.set(db.collection('registrations').doc(record.id), record);
    return { record };
  });

const buildResumeUrl = (id, token) => {
  const base = (process.env.SITE_BASE_URL || 'https://www.clagtee2026.org').replace(/\/$/, '');
  return `${base}/?reg=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}#inscripcion`;
};

// Cross-check opcional: marca si el CMS Paper ID existe y el título coincide,
// para que el equipo lo deje 'observado' manualmente si hay discrepancia.
const checkPaperMatch = async (db, clean) => {
  if (!clean.cmsPaperId) return null;
  try {
    const snapshot = await db.collection('papers').doc(String(clean.cmsPaperId)).get();
    if (!snapshot.exists) return false;
    const title = String(snapshot.data().title || '').trim().toLowerCase();
    const given = String(clean.paperTitle || '').trim().toLowerCase();
    return given ? title === given : true;
  } catch (error) {
    console.error('[registrations] paper cross-check failed:', error?.message);
    return null;
  }
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Listado para staff/chair: GET ?scope=staff&staffEmail=&staffRole=
      if (getQueryParam(req, 'scope') === 'staff') {
        const staffEmail = getQueryParam(req, 'staffEmail');
        const staffRole = getQueryParam(req, 'staffRole');
        const db = getFirestore();
        if (!(await isStaff(db, staffEmail, staffRole))) {
          res.status(403).json({ error: 'Not authorized' });
          return;
        }
        const snapshot = await db.collection('registrations').get();
        const registrations = snapshot.docs
          .map((doc) => stripToken(doc.data()))
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        res.status(200).json({ registrations });
        return;
      }

      const id = getQueryParam(req, 'id');
      const token = getQueryParam(req, 'token');
      if (!id || !token) {
        res.status(400).json({ error: 'id and token are required' });
        return;
      }
      const db = getFirestore();
      const snapshot = await db.collection('registrations').doc(String(id)).get();
      if (!snapshot.exists || snapshot.data().token !== token) {
        res.status(404).json({ error: 'Registration not found' });
        return;
      }
      res.status(200).json({ registration: snapshot.data() });
    } catch (error) {
      console.error('[registrations-get]', error?.message);
      res.status(500).json({ error: 'Failed to fetch registration' });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const body = parseBody(req);
      const { ok, errors, clean } = validateRegistrationInput(body || {});
      if (!ok) {
        res.status(400).json({ error: 'Invalid registration input', fields: errors });
        return;
      }

      let couponDef = null;
      let couponKey = null;
      if (clean.couponCode) {
        couponDef = getCouponDefinition(clean.couponCode);
        if (!couponDef) {
          res.status(400).json({ error: 'Invalid coupon code', fields: ['couponCode'], code: 'coupon-invalid' });
          return;
        }
        if (!couponDef.appliesTo.includes(clean.category)) {
          res.status(400).json({
            error: 'Coupon not applicable to this registration category',
            fields: ['couponCode'],
            code: 'coupon-not-applicable',
          });
          return;
        }
        couponKey = normalizeCouponCode(clean.couponCode);
      }

      const phase = getPhase();
      const pricing = resolvePricing(clean.category, phase);
      if (!pricing) {
        res.status(400).json({ error: 'Invalid category pricing' });
        return;
      }

      const db = getFirestore();
      const paperMatch = await checkPaperMatch(db, clean);
      const applyCoupon = Boolean(couponDef);

      const buildRecord = (number) => {
        const id = `REG-${String(number).padStart(4, '0')}`;
        const token = randomBytes(16).toString('hex');
        const now = new Date().toISOString();
        const record = {
          id,
          token,
          ...clean,
          phase,
          amountUsd: applyCoupon ? 0 : pricing.amountUsd,
          currency: pricing.currency,
          paymentUrl: applyCoupon ? null : pricing.paymentUrl,
          status: applyCoupon ? 'confirmada' : 'pre-registro-creado',
          paperMatch: paperMatch ?? null,
          createdAt: now,
          updatedAt: now,
        };
        if (applyCoupon && couponDef) {
          record.couponCode = couponDef.code;
        }
        return stripUndefined(record);
      };

      const result = await createRegistrationTransaction(db, { couponDef, couponKey, buildRecord });
      if (result.exhausted) {
        res.status(409).json({ error: 'Coupon usage limit reached', fields: ['couponCode'], code: 'coupon-exhausted' });
        return;
      }

      const record = result.record;
      const resumeUrl = buildResumeUrl(record.id, record.token);
      try {
        if (applyCoupon) {
          await sendCouponConfirmation({
            to: clean.email,
            name: `${clean.firstName} ${clean.lastName}`.trim(),
            id: record.id,
            category: clean.category,
            couponCode: record.couponCode,
            resumeUrl,
          });
        } else {
          await sendRegistrationReceipt({
            to: clean.email,
            name: `${clean.firstName} ${clean.lastName}`.trim(),
            id: record.id,
            category: clean.category,
            amountUsd: pricing.amountUsd,
            currency: pricing.currency,
            paymentUrl: pricing.paymentUrl,
            resumeUrl,
          });
        }
      } catch (emailError) {
        console.error('[registrations] receipt email failed:', emailError?.message);
      }

      res.status(201).json({ registration: record, resumeUrl });
    } catch (error) {
      console.error('[registrations-create]', error?.message);
      res.status(500).json({ error: 'Failed to create registration' });
    }
    return;
  }

  if (req.method === 'PATCH') {
    try {
      const body = parseBody(req);
      const id = str(body?.id);

      // Cambio de estado por staff/chair: { id, newStatus, staffEmail, staffRole, staffNote? }
      const newStatus = str(body?.newStatus);
      if (newStatus) {
        const db = getFirestore();
        if (!(await isStaff(db, str(body?.staffEmail), str(body?.staffRole)))) {
          res.status(403).json({ error: 'Not authorized' });
          return;
        }
        if (!id || !STAFF_STATUSES.includes(newStatus)) {
          res.status(400).json({ error: 'Invalid id or status' });
          return;
        }
        const ref = db.collection('registrations').doc(id);
        const snapshot = await ref.get();
        if (!snapshot.exists) {
          res.status(404).json({ error: 'Registration not found' });
          return;
        }
        await ref.set(
          {
            status: newStatus,
            staffNote: str(body?.staffNote) || snapshot.data().staffNote || '',
            reviewedBy: str(body?.staffEmail),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        const updated = await ref.get();
        res.status(200).json({ registration: stripToken(updated.data()) });
        return;
      }

      // Adjuntar comprobante / código de transacción -> 'comprobante-recibido' (participante, por token).
      const token = str(body?.token);
      if (!id || !token) {
        res.status(400).json({ error: 'id and token are required' });
        return;
      }

      const comprobanteFileKey = str(body?.comprobanteFileKey);
      const comprobanteUrl = str(body?.comprobanteUrl);
      const comprobanteFileName = str(body?.comprobanteFileName);
      const transactionCode = str(body?.transactionCode);
      if (!comprobanteFileKey && !transactionCode) {
        res.status(400).json({ error: 'comprobante or transactionCode required' });
        return;
      }

      const db = getFirestore();
      const ref = db.collection('registrations').doc(id);
      const snapshot = await ref.get();
      if (!snapshot.exists || snapshot.data().token !== token) {
        res.status(404).json({ error: 'Registration not found' });
        return;
      }

      const current = snapshot.data();
      if (!EDITABLE_STATUSES.includes(current.status)) {
        res.status(409).json({ error: 'Registration cannot be modified in current status' });
        return;
      }

      const now = new Date().toISOString();
      const updates = {
        comprobanteFileKey: comprobanteFileKey || current.comprobanteFileKey || '',
        comprobanteUrl: comprobanteUrl || current.comprobanteUrl || '',
        comprobanteFileName: comprobanteFileName || current.comprobanteFileName || '',
        transactionCode: transactionCode || current.transactionCode || '',
        status: 'comprobante-recibido',
        comprobanteAt: now,
        updatedAt: now,
      };

      await ref.set(updates, { merge: true });

      try {
        await sendComprobanteReceived({
          to: current.email,
          name: `${current.firstName || ''} ${current.lastName || ''}`.trim(),
          id,
        });
      } catch (emailError) {
        console.error('[registrations] comprobante email failed:', emailError?.message);
      }

      const updated = await ref.get();
      res.status(200).json({ registration: updated.data() });
    } catch (error) {
      console.error('[registrations-comprobante]', error?.message);
      res.status(500).json({ error: 'Failed to update registration' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
