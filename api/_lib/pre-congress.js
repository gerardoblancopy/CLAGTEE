// Inscripciones a la actividad Pre-congreso (Workshop + Seminario de IA, 27 de octubre).
//
// Viven en su propia colección (pre_congress_registrations), separadas de las
// inscripciones al congreso: son gratuitas y no tienen flujo de pago.
//   POST /api/registrations { action: 'pre-congress', ... }  -> inscripción pública
//   GET  /api/registrations?scope=pre-congress                -> listado (staff/chair)
import { requireStaff } from './auth.js';
import { getFirestore } from './firestore.js';
import { emailShell, escapeHtml, sendMailWithFallback } from './email.js';

const COLLECTION = 'pre_congress_registrations';
const COUNTER_DOC = 'pre_congress';
const MAX_LENGTH = 200;
const MAX_COMMENTS_LENGTH = 1000;

export const PRE_CONGRESS_PROFILES = ['estudiante', 'academico', 'industria', 'sector-publico', 'otro'];

const str = (value, max = MAX_LENGTH) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

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
      <p style="margin:0; font-size:14px; color:#425466;">Lugar: <strong>Mr. Hotel Providencia, Santiago de Chile</strong></p>
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
      'Fecha: martes 27 de octubre de 2026, 15:00 a 18:00 hrs.\nLugar: Mr. Hotel Providencia, Santiago de Chile.\n\n' +
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
    .map((doc) => doc.data())
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  res.status(200).json({ registrations });
};
