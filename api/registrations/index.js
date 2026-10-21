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
  normalizeTitle,
  MIN_TITLE_MATCH_LENGTH,
  findDuplicateRegistration,
  isRegistrationOwnedBy,
  stripUndefined,
  buildResumeUrl,
  cmsRoleForRegistration,
  PUCV_LINKS,
} from '../_lib/registration-config.js';
import { handleStaffNotify, handleEmailLog } from '../_lib/registration-notify.js';
import {
  NOTIFY_STATUSES,
  handleRecoverRequest,
  sendRecoveryEmail,
  sendStatusNotification,
} from '../_lib/participant-access.js';
import { sendRegistrationReceipt, sendComprobanteReceived, sendCouponConfirmation } from '../_lib/email.js';
import { handleSponsorshipInquiry } from '../_lib/sponsorship-inquiry.js';
import {
  handlePreCongressList,
  handlePreCongressNotifyStudents,
  handlePreCongressRegistration,
  handlePreCongressUpdate,
  handlePreCongressUpdateLookup,
} from '../_lib/pre-congress.js';

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

// Lleva el ID de paper escrito por la persona ("#INT-29", "Sens-8") al ID real del
// CMS, por ID normalizado o, si no existe, por título. Si lo corrige, conserva lo
// escrito en cmsPaperIdTyped. Devuelve paperMatch: si el título coincide con el paper.
const resolvePaper = async (db, clean) => {
  if (!clean.cmsPaperId) return null;
  try {
    const typed = clean.cmsPaperId;
    const normalized = normalizePaperId(typed);
    const snapshot = normalized ? await db.collection('papers').doc(normalized).get() : null;
    let paper = snapshot?.exists ? snapshot.data() : null;
    const title = normalizeTitle(clean.paperTitle);
    if (!paper && title.length >= MIN_TITLE_MATCH_LENGTH) {
      const papers = await db.collection('papers').get();
      paper = papers.docs.map((doc) => doc.data()).find((candidate) => normalizeTitle(candidate.title) === title) || null;
    }
    if (!paper) return false;
    if (paper.id !== typed) {
      clean.cmsPaperIdTyped = typed;
      clean.cmsPaperId = paper.id;
    }
    return title ? normalizeTitle(paper.title) === title : true;
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

      // Inscripciones al Pre-congreso: GET ?scope=pre-congress (staff/chair).
      if (getQueryParam(req, 'scope') === 'pre-congress') {
        await handlePreCongressList(req, res);
        return;
      }

      // Enlace del Pre-congreso para responder alumno EIE-PUCV / transporte (público).
      if (getQueryParam(req, 'scope') === 'pre-congress-update') {
        await handlePreCongressUpdateLookup(res, getQueryParam(req, 'id'), getQueryParam(req, 'token'));
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
          .map((record) => ({ ...stripToken(record), resumeUrl: buildResumeUrl(record.id, record.token, record.category) }))
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
      const regData = snapshot.data();
      if (!regData.couponCode && PUCV_LINKS[regData.category] && regData.paymentUrl !== PUCV_LINKS[regData.category]) {
        regData.paymentUrl = PUCV_LINKS[regData.category];
      }
      res.status(200).json({ registration: regData });
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

      // Pre-reserva o consulta de auspicios corporativos: { action: 'sponsorship-inquiry', ... } (público).
      if (str(body?.action) === 'sponsorship-inquiry') {
        await handleSponsorshipInquiry(getFirestore(), res, body);
        return;
      }

      // Inscripción al Pre-congreso: { action: 'pre-congress', ... } (público).
      if (str(body?.action) === 'pre-congress') {
        await handlePreCongressRegistration(getFirestore(), res, body);
        return;
      }

      // Respuesta alumno EIE-PUCV / transporte desde el enlace del correo (público).
      if (str(body?.action) === 'pre-congress-update') {
        await handlePreCongressUpdate(res, body);
        return;
      }

      // Correo a los estudiantes del Pre-congreso para que respondan (staff/chair).
      if (str(body?.action) === 'pre-congress-notify-students') {
        await handlePreCongressNotifyStudents(req, res, body);
        return;
      }

      // Inscripción manual realizada por el Staff (con comprobante):
      if (str(body?.action) === 'manual-registration') {
        const staffSession = await requireStaff(req, res);
        if (!staffSession) return;

        const category = str(body?.category);
        const firstName = str(body?.firstName);
        const lastName = str(body?.lastName);
        const email = str(body?.email).toLowerCase();
        const country = str(body?.country) || 'Chile';
        const affiliation = str(body?.affiliation) || '';

        if (!firstName || !lastName || !email || !category) {
          res.status(400).json({ error: 'Nombre, apellido, email y categoría son obligatorios.' });
          return;
        }

        const phase = (body?.phase === 'early-bird' || body?.phase === 'regular') ? body.phase : getPhase();
        const pricing = resolvePricing(category, phase);
        const parsedAmount = Number(body?.amountUsd);
        const amountUsd = !isNaN(parsedAmount) && parsedAmount >= 0 ? parsedAmount : (pricing?.amountUsd ?? 0);

        const db = getFirestore();
        const status = STAFF_STATUSES.includes(str(body?.status)) ? str(body?.status) : 'pago-validado';

        let paperMatch = null;
        if (body?.cmsPaperId) {
          paperMatch = await resolvePaper(db, {
            category,
            cmsPaperId: str(body?.cmsPaperId),
            paperTitle: str(body?.paperTitle) || '',
          });
        }

        const buildRecord = (number) => {
          const id = `REG-${String(number).padStart(4, '0')}`;
          const token = randomBytes(16).toString('hex');
          const now = new Date().toISOString();
          const record = {
            id,
            token,
            category,
            firstName,
            lastName,
            email,
            country,
            affiliation,
            dietary: str(body?.dietary) || undefined,
            phase,
            amountUsd,
            currency: 'USD',
            paymentUrl: pricing?.paymentUrl || null,
            status,
            comprobanteFileKey: str(body?.comprobanteFileKey) || undefined,
            comprobanteFileName: str(body?.comprobanteFileName) || undefined,
            comprobanteUrl: str(body?.comprobanteUrl) || undefined,
            transactionCode: str(body?.transactionCode) || undefined,
            studentProofFileKey: str(body?.studentProofFileKey) || undefined,
            studentProofFileName: str(body?.studentProofFileName) || undefined,
            studentProofUrl: str(body?.studentProofUrl) || undefined,
            cmsPaperId: str(body?.cmsPaperId) || undefined,
            paperTitle: str(body?.paperTitle) || undefined,
            presenterName: str(body?.presenterName) || `${firstName} ${lastName}`.trim(),
            cmsEmail: str(body?.cmsEmail) || email,
            coverage: str(body?.coverage) || (category === 'paper-adicional' ? 'adicional' : 'principal'),
            studentType: str(body?.studentType) || (category === 'estudiante' ? (body?.cmsPaperId ? 'autor' : 'asistente') : undefined),
            studentLevel: str(body?.studentLevel) || undefined,
            paperMatch: paperMatch ?? null,
            staffNote: str(body?.staffNote) || `Inscripción manual por ${staffSession.email}`,
            registeredByStaff: staffSession.email,
            reviewedBy: staffSession.email,
            createdAt: now,
            updatedAt: now,
          };
          return stripUndefined(record);
        };

        const result = await createRegistrationTransaction(db, { couponDef: null, couponKey: null, buildRecord });
        const record = result.record;

        let notified = false;
        if (Boolean(body?.notifyParticipant)) {
          try {
            notified = await sendStatusNotification(db, record, staffSession.email);
            if (notified) {
              await db.collection('registrations').doc(record.id).set(
                { statusNotifiedAt: new Date().toISOString(), statusNotified: record.status },
                { merge: true }
              );
            }
          } catch (e) {
            console.error('[manual-registration] notify failed:', e?.message);
          }
        }

        res.status(201).json({ registration: stripToken(record), notified });
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
        couponKey = normalizeCouponCode(couponDef.code);
      }

      const phase = getPhase();
      const pricing = resolvePricing(clean.category, phase);
      if (!pricing) {
        res.status(400).json({ error: 'Invalid category pricing' });
        return;
      }

      const db = getFirestore();
      // Antes del anti-duplicados, para comparar con el ID real del paper.
      const paperMatch = await resolvePaper(db, clean);

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
      const resumeUrl = buildResumeUrl(record.id, record.token, record.category);
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

      // Adjuntar o actualizar comprobante por el Staff:
      if (str(body?.action) === 'staff-attach-comprobante') {
        const staffSession = await requireStaff(req, res);
        if (!staffSession) return;

        const db = getFirestore();
        if (!id) {
          res.status(400).json({ error: 'id is required' });
          return;
        }
        const ref = db.collection('registrations').doc(id);
        const snapshot = await ref.get();
        if (!snapshot.exists) {
          res.status(404).json({ error: 'Registration not found' });
          return;
        }

        const comprobanteFileKey = str(body?.comprobanteFileKey);
        const comprobanteFileName = str(body?.comprobanteFileName);
        const comprobanteUrl = str(body?.comprobanteUrl);
        const transactionCode = str(body?.transactionCode);
        const assignedStatus = str(body?.newStatus) || 'pago-validado';
        const targetStatus = STAFF_STATUSES.includes(assignedStatus) ? assignedStatus : 'pago-validado';
        const staffNote = str(body?.staffNote);

        const currentData = snapshot.data();
        const updateData = {
          comprobanteFileKey: comprobanteFileKey || currentData.comprobanteFileKey || '',
          comprobanteFileName: comprobanteFileName || currentData.comprobanteFileName || '',
          comprobanteUrl: comprobanteUrl || currentData.comprobanteUrl || '',
          transactionCode: transactionCode || currentData.transactionCode || '',
          status: targetStatus,
          staffNote: staffNote || currentData.staffNote || `Comprobante adjuntado por Staff (${staffSession.email})`,
          reviewedBy: staffSession.email,
          updatedAt: new Date().toISOString(),
        };

        await ref.set(stripUndefined(updateData), { merge: true });

        let notified = false;
        if (Boolean(body?.notifyParticipant) && currentData.status !== targetStatus && NOTIFY_STATUSES.includes(targetStatus)) {
          try {
            notified = await sendStatusNotification(db, (await ref.get()).data(), staffSession.email);
            if (notified) {
              await ref.set({ statusNotifiedAt: new Date().toISOString(), statusNotified: targetStatus }, { merge: true });
            }
          } catch (error) {
            console.error('[staff-attach-comprobante] notify failed:', error?.message);
          }
        }

        const updated = await ref.get();
        res.status(200).json({ registration: stripToken(updated.data()), notified });
        return;
      }

      // Edición completa de registro por el Staff:
      if (str(body?.action) === 'staff-edit') {
        const staffSession = await requireStaff(req, res);
        if (!staffSession) return;

        const db = getFirestore();
        if (!id) {
          res.status(400).json({ error: 'id is required' });
          return;
        }
        const ref = db.collection('registrations').doc(id);
        const snapshot = await ref.get();
        if (!snapshot.exists) {
          res.status(404).json({ error: 'Registration not found' });
          return;
        }

        const currentData = snapshot.data();
        const updatedCategory = str(body?.category) || currentData.category;
        const updatedPhase = (body?.phase === 'early-bird' || body?.phase === 'regular')
          ? body.phase
          : (currentData.phase || 'early-bird');

        const parsedAmount = Number(body?.amountUsd);
        const updatedAmountUsd = !isNaN(parsedAmount) && parsedAmount >= 0 ? parsedAmount : (currentData.amountUsd ?? 0);

        const assignedStatus = str(body?.status);
        const updatedStatus = STAFF_STATUSES.includes(assignedStatus) ? assignedStatus : currentData.status;

        let paperMatch = currentData.paperMatch;
        const cmsPaperId = body?.cmsPaperId !== undefined ? str(body.cmsPaperId) : (currentData.cmsPaperId || '');
        const paperTitle = body?.paperTitle !== undefined ? str(body.paperTitle) : (currentData.paperTitle || '');

        if (cmsPaperId) {
          paperMatch = await resolvePaper(db, {
            category: updatedCategory,
            cmsPaperId,
            paperTitle,
          });
        } else if (body?.cmsPaperId === '') {
          paperMatch = null;
        }

        const updateData = {
          category: updatedCategory,
          phase: updatedPhase,
          amountUsd: updatedAmountUsd,
          firstName: str(body?.firstName) || currentData.firstName,
          lastName: str(body?.lastName) || currentData.lastName,
          email: str(body?.email) ? str(body.email).toLowerCase() : currentData.email,
          country: str(body?.country) || currentData.country,
          affiliation: str(body?.affiliation) || currentData.affiliation,
          dietary: body?.dietary !== undefined ? str(body.dietary) : (currentData.dietary || ''),
          cmsPaperId: cmsPaperId || '',
          paperTitle: paperTitle || '',
          presenterName: body?.presenterName !== undefined ? str(body.presenterName) : (currentData.presenterName || ''),
          cmsEmail: body?.cmsEmail !== undefined ? str(body.cmsEmail) : (currentData.cmsEmail || ''),
          coverage: body?.coverage !== undefined ? str(body.coverage) : (currentData.coverage || ''),
          studentType: body?.studentType !== undefined ? str(body.studentType) : (currentData.studentType || ''),
          studentLevel: body?.studentLevel !== undefined ? str(body.studentLevel) : (currentData.studentLevel || ''),
          transactionCode: body?.transactionCode !== undefined ? str(body.transactionCode) : (currentData.transactionCode || ''),
          status: updatedStatus,
          paperMatch: paperMatch ?? null,
          staffNote: body?.staffNote !== undefined ? str(body.staffNote) : (currentData.staffNote || ''),
          reviewedBy: staffSession.email,
          updatedAt: new Date().toISOString(),
        };

        if (body?.comprobanteFileKey) {
          updateData.comprobanteFileKey = str(body.comprobanteFileKey);
          updateData.comprobanteFileName = str(body?.comprobanteFileName) || '';
          updateData.comprobanteUrl = str(body?.comprobanteUrl) || '';
        }
        if (body?.studentProofFileKey) {
          updateData.studentProofFileKey = str(body.studentProofFileKey);
          updateData.studentProofFileName = str(body?.studentProofFileName) || '';
          updateData.studentProofUrl = str(body?.studentProofUrl) || '';
        }

        await ref.set(stripUndefined(updateData), { merge: true });

        let notified = false;
        if (Boolean(body?.notifyParticipant) && NOTIFY_STATUSES.includes(updatedStatus)) {
          try {
            const fullDoc = (await ref.get()).data();
            notified = await sendStatusNotification(db, fullDoc, staffSession.email);
            if (notified) {
              await ref.set({ statusNotifiedAt: new Date().toISOString(), statusNotified: updatedStatus }, { merge: true });
            }
          } catch (err) {
            console.error('[staff-edit] notification failed:', err?.message);
          }
        }

        const updated = await ref.get();
        res.status(200).json({ registration: stripToken(updated.data()), notified });
        return;
      }

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
