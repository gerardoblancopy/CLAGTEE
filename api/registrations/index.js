import { randomBytes } from 'node:crypto';
import { getFirestore } from '../_lib/firestore.js';
import { requireAuth, requireStaff } from '../_lib/auth.js';
import {
  getPhase,
  resolvePricing,
  validateRegistrationInput,
  getCouponDefinition,
  normalizeCouponCode,
  normalizePaperId,
  findDuplicateRegistration,
  isRegistrationOwnedBy,
  stripUndefined,
  buildResumeUrl,
  cmsRoleForRegistration,
} from '../_lib/registration-config.js';
import { handleStaffNotify, handleEmailLog } from '../_lib/registration-notify.js';
import {
  NOTIFY_STATUSES,
  handleRecoverRequest,
  sendRecoveryEmail,
  sendStatusNotification,
} from '../_lib/participant-access.js';
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


// Cuando alguien intenta inscribirse de nuevo con una inscripción pendiente, se le
// reenvía el enlace para retomarla junto con su acceso al CMS. Solo al correo ya
// registrado (máximo cada 15 min, ver sendRecoveryEmail).
const resendResumeLink = async (db, record, requesterEmail) => {
  if (str(record.email).toLowerCase() !== str(requesterEmail).toLowerCase()) return false;
  try {
    return await sendRecoveryEmail(db, record);
  } catch (error) {
    console.error('[registrations] recovery email failed:', error?.message);
    return false;
  }
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
      // Listado para staff/chair: GET ?scope=staff (autorizado por token de sesion)
      if (getQueryParam(req, 'scope') === 'staff') {
        if (!(await requireStaff(req, res))) return;

        const db = getFirestore();
        const snapshot = await db.collection('registrations').get();
        const registrations = snapshot.docs
          .map((doc) => stripToken(doc.data()))
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        res.status(200).json({ registrations });
        return;
      }

      // Último correo enviado por destinatario: GET ?scope=email-log (staff/chair).
      if (getQueryParam(req, 'scope') === 'email-log') {
        await handleEmailLog(req, res);
        return;
      }

      // Inscripciones del usuario del CMS: GET ?scope=mine (perfil del autor).
      // Se devuelve el enlace para retomar en vez del token.
      if (getQueryParam(req, 'scope') === 'mine') {
        const session = requireAuth(req, res);
        if (!session) return;

        const db = getFirestore();
        const [registrationsSnap, papersSnap] = await Promise.all([
          db.collection('registrations').get(),
          db.collection('papers').where('submitterId', '==', session.id).get(),
        ]);
        const paperIds = new Set(papersSnap.docs.map((doc) => normalizePaperId(doc.data().id || doc.id)));
        const registrations = registrationsSnap.docs
          .map((doc) => doc.data())
          .filter((record) => isRegistrationOwnedBy(record, { email: session.email, paperIds }))
          .map((record) => ({ ...stripToken(record), resumeUrl: buildResumeUrl(record.id, record.token) }))
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

      // Recuperar inscripción inconclusa por correo: { action: 'recover', email } (público).
      if (str(body?.action) === 'recover') {
        await handleRecoverRequest(getFirestore(), res, body);
        return;
      }

      // Correos masivos/individuales del staff: { action: 'notify', ... } (autorizado por token).
      if (str(body?.action) === 'notify') {
        await handleStaffNotify(req, res, body);
        return;
      }

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

      // Evita duplicados: misma persona o mismo paper con una inscripción activa.
      // La colección es pequeña, así que se compara en memoria (sin distinguir mayúsculas).
      const existingSnap = await db.collection('registrations').get();
      const duplicate = findDuplicateRegistration(existingSnap.docs.map((doc) => doc.data()), clean);
      if (duplicate) {
        const linkResent = await resendResumeLink(db, duplicate.record, clean.email);
        res.status(409).json({
          error: 'Duplicate registration',
          code: duplicate.code,
          existingId: duplicate.record.id,
          linkResent,
        });
        return;
      }

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
            cmsRole: cmsRoleForRegistration(record),
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

      // Cambio de estado por staff/chair: { id, newStatus, staffNote? } (autorizado por token)
      const newStatus = str(body?.newStatus);
      if (newStatus) {
        const staffSession = await requireStaff(req, res);
        if (!staffSession) return;

        const db = getFirestore();
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
        const previousStatus = snapshot.data().status;
        await ref.set(
          {
            status: newStatus,
            staffNote: str(body?.staffNote) || snapshot.data().staffNote || '',
            reviewedBy: staffSession.email,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        // Aviso automático al participante (y acceso al CMS si no tiene paper).
        // Un fallo del correo no revierte el cambio de estado.
        let notified = false;
        if (previousStatus !== newStatus && NOTIFY_STATUSES.includes(newStatus)) {
          try {
            notified = await sendStatusNotification(db, (await ref.get()).data(), staffSession.email);
            if (notified) {
              await ref.set({ statusNotifiedAt: new Date().toISOString(), statusNotified: newStatus }, { merge: true });
            }
          } catch (error) {
            console.error('[registrations] status notification failed:', error?.message);
          }
        }

        const updated = await ref.get();
        res.status(200).json({ registration: stripToken(updated.data()), notified });
        return;
      }

      // Adjuntar comprobante / código de transacción -> 'comprobante-recibido' (participante, por token).
      const token = str(body?.token);
      if (!id || !token) {
        res.status(400).json({ error: 'id and token are required' });
        return;
      }

      // Anulación por el participante ("Comenzar de nuevo"): solo mientras no
      // haya enviado comprobante, para que pueda re-inscribirse sin chocar con el anti-duplicados.
      if (str(body?.action) === 'cancel') {
        const db = getFirestore();
        const ref = db.collection('registrations').doc(id);
        const snapshot = await ref.get();
        if (!snapshot.exists || snapshot.data().token !== token) {
          res.status(404).json({ error: 'Registration not found' });
          return;
        }
        if (snapshot.data().status !== 'pre-registro-creado') {
          res.status(409).json({ error: 'Registration cannot be cancelled in current status' });
          return;
        }
        await ref.set(
          { status: 'cancelada', cancelledBy: 'participant', updatedAt: new Date().toISOString() },
          { merge: true }
        );
        res.status(200).json({ ok: true });
        return;
      }

      const comprobanteFileKey = str(body?.comprobanteFileKey);
      const comprobanteUrl = str(body?.comprobanteUrl);
      const comprobanteFileName = str(body?.comprobanteFileName);
      const transactionCode = str(body?.transactionCode);
      // El archivo (PDF o imagen) es obligatorio: sin él no hay "comprobante recibido".
      // El código de transacción es solo información adicional.
      if (!comprobanteFileKey) {
        res.status(400).json({ error: 'comprobante file required' });
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
