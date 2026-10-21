// Inscripciones a la actividad Pre-congreso (Workshop + Seminario de IA, 27 de octubre).
//
// Viven en su propia colección (pre_congress_registrations), separadas de las
// inscripciones al congreso: son gratuitas y no tienen flujo de pago.
//   POST /api/registrations { action: 'pre-congress', ... }  -> inscripción pública
//   GET  /api/registrations?scope=pre-congress                -> listado (staff/chair)
//
// A los estudiantes se les pregunta si son alumnos de la EIE-PUCV y, si lo son,
// si requieren transporte. Los inscritos antes de que existiera la pregunta la
// responden con un enlace personal que les manda el staff:
//   POST /api/registrations { action: 'pre-congress-notify-students', ids }  -> correo (staff/chair)
//   GET  /api/registrations?scope=pre-congress-update&id&token              -> datos del enlace (público)
//   POST /api/registrations { action: 'pre-congress-update', id, token, ... } -> respuesta (público)
import { randomBytes } from 'node:crypto';
import { requireStaff } from './auth.js';
import { getFirestore } from './firestore.js';
import { emailShell, escapeHtml, sendMailWithFallback } from './email.js';
import { getSiteBaseUrl } from './registration-config.js';

const COLLECTION = 'pre_congress_registrations';
const COUNTER_DOC = 'pre_congress';
const MAX_LENGTH = 200;
const MAX_COMMENTS_LENGTH = 1000;
const MAX_NOTIFY_PER_CALL = 25;
const SEND_DELAY_MS = 250; // ~4 correos/s, bajo el límite de Resend

export const PRE_CONGRESS_PROFILES = ['estudiante', 'academico', 'industria', 'sector-publico', 'otro'];

const str = (value, max = MAX_LENGTH) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Sí/No del formulario: true, false o null si no vino o no es válido.
const yesNo = (value) => (value === true || value === 'si' ? true : value === false || value === 'no' ? false : null);

// Alumno EIE-PUCV y transporte, solo para estudiantes. Devuelve los campos a
// guardar o, si falta una respuesta, el nombre del campo con error.
const validateStudentInfo = (body) => {
  const eiePucvStudent = yesNo(body?.eiePucvStudent);
  if (eiePucvStudent === null) return { error: 'eiePucvStudent' };
  if (!eiePucvStudent) return { fields: { eiePucvStudent, needsTransport: null } };
  const needsTransport = yesNo(body?.needsTransport);
  if (needsTransport === null) return { error: 'needsTransport' };
  return { fields: { eiePucvStudent, needsTransport } };
};

const hasStudentInfo = (record) => typeof record.eiePucvStudent === 'boolean';

const stripUpdateToken = (record) => {
  const { updateToken, ...rest } = record;
  return rest;
};

const buildUpdateUrl = (record) =>
  `${getSiteBaseUrl()}/?precongreso=${encodeURIComponent(record.id)}&t=${encodeURIComponent(record.updateToken)}#pre-congreso-inscripcion`;

export const validatePreCongressInput = (body) => {
  const clean = {
    firstName: str(body?.firstName),
    lastName: str(body?.lastName),
    email: str(body?.email).toLowerCase(),
    institution: str(body?.institution),
    position: str(body?.position),
    country: str(body?.country),
    phone: str(body?.phone, 40),
    profile: str(body?.profile),
    comments: str(body?.comments, MAX_COMMENTS_LENGTH),
  };

  const errors = [];
  if (!clean.firstName) errors.push('firstName');
  if (!clean.lastName) errors.push('lastName');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) errors.push('email');
  if (!clean.institution) errors.push('institution');
  if (!clean.country) errors.push('country');
  if (!PRE_CONGRESS_PROFILES.includes(clean.profile)) errors.push('profile');
  if (clean.profile === 'estudiante') {
    const student = validateStudentInfo(body);
    if (student.error) errors.push(student.error);
    else Object.assign(clean, student.fields);
  }

  return { ok: errors.length === 0, errors, clean };
};

// Una inscripción por correo: el chequeo y el correlativo van en la misma transacción.
const createPreCongressRecord = (db, clean) =>
  db.runTransaction(async (transaction) => {
    const duplicates = await transaction.get(
      db.collection(COLLECTION).where('email', '==', clean.email).limit(1)
    );
    if (!duplicates.empty) return { duplicate: true };

    const counterRef = db.collection('counters').doc(COUNTER_DOC);
    const counterSnap = await transaction.get(counterRef);
    const number = (counterSnap.exists ? Number(counterSnap.data().value) || 0 : 0) + 1;
    const now = new Date().toISOString();
    const record = {
      id: `PRE-${String(number).padStart(4, '0')}`,
      ...clean,
      ...(hasStudentInfo(clean) ? { studentInfoUpdatedAt: now } : {}),
      createdAt: now,
      updatedAt: now,
    };

    transaction.set(counterRef, { value: number }, { merge: true });
    transaction.set(db.collection(COLLECTION).doc(record.id), record);
    return { record };
  });

const sendPreCongressConfirmation = (record) => {
  const name = `${record.firstName} ${record.lastName}`.trim();
  const inner = `
    <h1 style="margin:0 0 12px; font-size:22px; line-height:1.3; color:#0D2C54;">Inscripción al Pre-congreso confirmada</h1>
    <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#425466;">
      Estimado/a <strong>${escapeHtml(name)}</strong>,
    </p>
    <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#425466;">
      Hemos registrado su inscripción a la actividad Pre-congreso de CLAGTEE 2026:
      <strong>Workshop + Seminario: Inteligencia Artificial aplicada a Sistemas Eléctricos</strong>.
    </p>
    <div style="background:#f8fafc; border-left:4px solid #F4A261; padding:12px 16px; margin:0 0 16px;">
      <p style="margin:0 0 6px; font-size:14px; color:#425466;">N° de inscripción: <strong style="color:#0D2C54;">${escapeHtml(record.id)}</strong></p>
      <p style="margin:0 0 6px; font-size:14px; color:#425466;">Fecha: <strong>martes 27 de octubre de 2026, 15:00 a 18:00 hrs.</strong></p>
      <p style="margin:0; font-size:14px; color:#425466;">Lugar: <strong>Auditorio CEA PUCV, Antonio Bellet 314, Providencia, Santiago</strong></p>
    </div>
    <p style="margin:0; font-size:15px; line-height:1.6; color:#425466;">
      Al finalizar el seminario se realizará el Cóctel de Bienvenida de CLAGTEE 2026.
    </p>`;

  return sendMailWithFallback({
    to: record.email,
    subject: `Inscripción Pre-congreso confirmada (${record.id}) - CLAGTEE 2026`,
    html: emailShell('Inscripción Pre-congreso - CLAGTEE 2026', inner),
    text:
      `Estimado/a ${name},\n\nHemos registrado su inscripción (${record.id}) al Pre-congreso de CLAGTEE 2026: ` +
      'Workshop + Seminario: Inteligencia Artificial aplicada a Sistemas Eléctricos.\n' +
      'Fecha: martes 27 de octubre de 2026, 15:00 a 18:00 hrs.\nLugar: Auditorio CEA PUCV, Antonio Bellet 314, Providencia, Santiago.\n\n' +
      'Comité Organizador CLAGTEE 2026 - clagtee2026@pucv.cl',
    label: 'Inscripción Pre-congreso',
  });
};

export const handlePreCongressRegistration = async (db, res, body) => {
  const { ok, errors, clean } = validatePreCongressInput(body);
  if (!ok) {
    res.status(400).json({ error: 'Invalid pre-congress registration', fields: errors });
    return;
  }

  const result = await createPreCongressRecord(db, clean);
  if (result.duplicate) {
    res.status(409).json({ error: 'Email already registered', code: 'duplicate' });
    return;
  }

  // Un fallo del correo no invalida la inscripción.
  try {
    await sendPreCongressConfirmation(result.record);
  } catch (error) {
    console.error('[pre-congress] confirmation email failed:', error?.message);
  }

  res.status(201).json({ registration: { id: result.record.id } });
};

export const handlePreCongressList = async (req, res) => {
  if (!(await requireStaff(req, res))) return;
  const snapshot = await getFirestore().collection(COLLECTION).get();
  const registrations = snapshot.docs
    .map((doc) => stripUpdateToken(doc.data()))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  res.status(200).json({ registrations });
};

const sendStudentInfoRequest = (record) => {
  const name = `${record.firstName} ${record.lastName}`.trim();
  const url = buildUpdateUrl(record);
  const inner = `
    <h1 style="margin:0 0 12px; font-size:22px; line-height:1.3; color:#0D2C54;">Actualice su inscripción al Pre-congreso</h1>
    <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#425466;">
      Estimado/a <strong>${escapeHtml(name)}</strong>,
    </p>
    <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#425466;">
      Usted está inscrito/a (<strong>${escapeHtml(record.id)}</strong>) en el Pre-congreso de CLAGTEE 2026, el
      <strong>martes 27 de octubre, de 15:00 a 18:00 hrs., en el Auditorio CEA PUCV (Antonio Bellet 314, Providencia, Santiago)</strong>.
    </p>
    <p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:#425466;">
      Para coordinar el traslado necesitamos saber si usted es alumno/a de la Escuela de Ingeniería Eléctrica
      PUCV (EIE-PUCV) y, en ese caso, si requerirá transporte al evento. Responder toma menos de un minuto:
    </p>
    <p style="margin:0 0 20px; text-align:center;">
      <a href="${escapeHtml(url)}" style="display:inline-block; background:#F4A261; color:#0D2C54; font-weight:bold; font-size:15px; padding:12px 24px; border-radius:8px; text-decoration:none;">Actualizar mi inscripción</a>
    </p>
    <p style="margin:0; font-size:13px; line-height:1.6; color:#667085;">
      Si el botón no funciona, copie este enlace en su navegador:<br>
      <a href="${escapeHtml(url)}" style="color:#0D2C54; word-break:break-all;">${escapeHtml(url)}</a>
    </p>`;

  return sendMailWithFallback({
    to: record.email,
    subject: `Pre-congreso CLAGTEE 2026: indique si requiere transporte (${record.id})`,
    html: emailShell('Pre-congreso - CLAGTEE 2026', inner),
    text:
      `Estimado/a ${name},\n\nUsted está inscrito/a (${record.id}) en el Pre-congreso de CLAGTEE 2026, ` +
      'el martes 27 de octubre, de 15:00 a 18:00 hrs., en el Auditorio CEA PUCV (Antonio Bellet 314, Providencia, Santiago).\n\n' +
      'Para coordinar el traslado necesitamos saber si usted es alumno/a de la Escuela de Ingeniería Eléctrica PUCV (EIE-PUCV) ' +
      `y, en ese caso, si requerirá transporte al evento. Responda aquí:\n${url}\n\n` +
      'Comité Organizador CLAGTEE 2026 - clagtee2026@pucv.cl',
    label: 'Pre-congreso: alumno EIE-PUCV y transporte',
  });
};

/**
 * POST { action: 'pre-congress-notify-students', ids: ['PRE-0001', ...] } (staff/chair)
 * Manda a cada inscripción su enlace para responder si es alumno EIE-PUCV y si
 * requiere transporte. Omite a quien ya respondió. El cliente manda lotes de
 * hasta 25 para no exceder el tiempo máximo de la función.
 */
export const handlePreCongressNotifyStudents = async (req, res, body) => {
  const session = await requireStaff(req, res);
  if (!session) return;

  const ids = Array.isArray(body?.ids) ? [...new Set(body.ids.map((id) => str(id)).filter(Boolean))] : [];
  if (ids.length === 0 || ids.length > MAX_NOTIFY_PER_CALL) {
    res.status(400).json({ error: `Send between 1 and ${MAX_NOTIFY_PER_CALL} ids per call` });
    return;
  }

  const db = getFirestore();
  const results = [];
  let sent = 0;

  for (const id of ids) {
    const ref = db.collection(COLLECTION).doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      results.push({ id, ok: false, error: 'not-found' });
      continue;
    }
    const record = snapshot.data();
    if (hasStudentInfo(record)) {
      results.push({ id, ok: false, error: 'already-answered' });
      continue;
    }

    if (sent > 0) await delay(SEND_DELAY_MS);
    sent += 1;

    let error = '';
    try {
      if (!record.updateToken) {
        record.updateToken = randomBytes(24).toString('hex');
        await ref.update({ updateToken: record.updateToken });
      }
      await sendStudentInfoRequest(record);
      await ref.update({ studentInfoNotifiedAt: new Date().toISOString() });
    } catch (sendError) {
      error = sendError?.message || 'send-failed';
      console.error(`[pre-congress] student info request to ${record.email} failed:`, error);
    }

    results.push({ id, ok: !error, ...(error ? { error } : {}) });

    try {
      await db.collection('email_log').add({
        at: new Date().toISOString(),
        sentBy: session.email,
        segment: 'pre-congreso-transporte',
        email: record.email,
        name: `${record.firstName} ${record.lastName}`.trim(),
        registrationId: id,
        paperIds: [],
        subject: `Pre-congreso CLAGTEE 2026: indique si requiere transporte (${id})`,
        template: 'pre-congress-student-info',
        ok: !error,
        error: error || null,
      });
    } catch (logError) {
      console.error('[pre-congress] email_log write failed:', logError?.message);
    }
  }

  res.status(200).json({ results });
};

const findByUpdateToken = async (id, token) => {
  if (!id || !token) return null;
  const ref = getFirestore().collection(COLLECTION).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists || !snapshot.data().updateToken || snapshot.data().updateToken !== token) return null;
  return { ref, record: snapshot.data() };
};

const publicStudentInfo = (record) => ({
  id: record.id,
  firstName: record.firstName,
  lastName: record.lastName,
  eiePucvStudent: hasStudentInfo(record) ? record.eiePucvStudent : null,
  needsTransport: typeof record.needsTransport === 'boolean' ? record.needsTransport : null,
});

/** GET ?scope=pre-congress-update&id=PRE-0001&token=... (público, con el enlace del correo). */
export const handlePreCongressUpdateLookup = async (res, id, token) => {
  const found = await findByUpdateToken(str(id), str(token));
  if (!found) {
    res.status(404).json({ error: 'Registration not found' });
    return;
  }
  res.status(200).json({ registration: publicStudentInfo(found.record) });
};

/** POST { action: 'pre-congress-update', id, token, eiePucvStudent, needsTransport } (público). */
export const handlePreCongressUpdate = async (res, body) => {
  const found = await findByUpdateToken(str(body?.id), str(body?.token));
  if (!found) {
    res.status(404).json({ error: 'Registration not found' });
    return;
  }
  const student = validateStudentInfo(body);
  if (student.error) {
    res.status(400).json({ error: 'Invalid answer', fields: [student.error] });
    return;
  }

  const now = new Date().toISOString();
  const updated = { ...found.record, ...student.fields, studentInfoUpdatedAt: now, updatedAt: now };
  await found.ref.update({ ...student.fields, studentInfoUpdatedAt: now, updatedAt: now });
  res.status(200).json({ registration: publicStudentInfo(updated) });
};
