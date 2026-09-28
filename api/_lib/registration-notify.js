// Correos del staff a autores y participantes desde el dashboard de inscripciones.
//
// Vive en _lib (no es una función aparte) porque el plan de Vercel limita el
// proyecto a 12 funciones; lo despacha api/registrations/index.js.
// Cada envío queda registrado en la colección `email_log` (nunca se borra).
import { getFirestore } from './firestore.js';
import { requireStaff } from './auth.js';
import { sendCustomEmail } from './email.js';
import { buildResumeUrl, getSiteBaseUrl, normalizePaperId } from './registration-config.js';

const MAX_RECIPIENTS_PER_CALL = 25;
const SEND_DELAY_MS = 250; // ~4 correos/s, bajo el límite de Resend
const MAX_SUBJECT_LENGTH = 200;
const MAX_BODY_LENGTH = 10000;

const PLACEHOLDER_PATTERN = /\{(nombre|paper|registro|enlace)\}/g;

const str = (value) => (typeof value === 'string' ? value.trim() : '');
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fillSubject = (text, values) => text.replace(PLACEHOLDER_PATTERN, (_, key) => values[key] || '');

// Omite las líneas cuyo marcador quedaría vacío (p. ej. {paper} para un
// participante sin trabajo) en vez de dejar "Trabajo: " suelto.
export const fillBody = (text, values) =>
  text
    .split('\n')
    .filter((line) => !Object.keys(values).some((key) => !values[key] && line.includes(`{${key}}`)))
    .join('\n')
    .replace(PLACEHOLDER_PATTERN, (_, key) => values[key] || '');

// {enlace}: enlace personal para retomar si tiene inscripción; si no, el formulario.
const resolveValues = async (db, recipient, paperIds, paperCache) => {
  let registro = '';
  let enlace = `${getSiteBaseUrl()}/?cat=autor#inscripcion`;

  const registrationId = str(recipient.registrationId);
  if (registrationId) {
    const snapshot = await db.collection('registrations').doc(registrationId).get();
    if (snapshot.exists) {
      const registration = snapshot.data();
      registro = registration.id;
      enlace = buildResumeUrl(registration.id, registration.token, registration.category);
    }
  }

  const papers = [];
  for (const paperId of paperIds) {
    if (!paperCache.has(paperId)) {
      const snapshot = await db.collection('papers').doc(paperId).get();
      paperCache.set(paperId, snapshot.exists ? `${paperId} – ${snapshot.data().title || ''}` : paperId);
    }
    papers.push(paperCache.get(paperId));
  }

  return { nombre: str(recipient.name), paper: papers.join('; '), registro, enlace };
};

/**
 * POST { action: 'notify', subject, body, segment, archive, recipients: [{ email, name, registrationId?, paperIds? }] }
 * Envía un correo personalizado por destinatario. El cliente manda lotes pequeños
 * para no exceder el tiempo máximo de la función.
 */
export const handleStaffNotify = async (req, res, body) => {
  const session = await requireStaff(req, res);
  if (!session) return;

  const subject = str(body.subject);
  const text = str(body.body);
  const segment = str(body.segment);
  const recipients = Array.isArray(body.recipients) ? body.recipients : [];

  if (!subject || !text || subject.length > MAX_SUBJECT_LENGTH || text.length > MAX_BODY_LENGTH) {
    res.status(400).json({ error: 'Invalid subject or body' });
    return;
  }
  if (recipients.length === 0 || recipients.length > MAX_RECIPIENTS_PER_CALL) {
    res.status(400).json({ error: `Send between 1 and ${MAX_RECIPIENTS_PER_CALL} recipients per call` });
    return;
  }

  const db = getFirestore();
  const paperCache = new Map();
  const results = [];

  for (let i = 0; i < recipients.length; i += 1) {
    const recipient = recipients[i] || {};
    const email = str(recipient.email).toLowerCase();
    if (!isEmail(email)) {
      results.push({ email, ok: false, error: 'invalid-email' });
      continue;
    }
    if (i > 0) await delay(SEND_DELAY_MS);

    const paperIds = (Array.isArray(recipient.paperIds) ? recipient.paperIds : [])
      .map(normalizePaperId)
      .filter(Boolean);
    let finalSubject = subject;
    let error = '';
    try {
      const values = await resolveValues(db, recipient, paperIds, paperCache);
      finalSubject = fillSubject(subject, values);
      await sendCustomEmail({
        to: email,
        name: values.nombre,
        subject: finalSubject,
        body: fillBody(text, values),
        // Una sola copia de archivo por envío masivo (el cliente la pide en el primer lote).
        archiveCopy: Boolean(body.archive) && i === 0,
      });
    } catch (sendError) {
      error = sendError?.message || 'send-failed';
      console.error(`[registrations-notify] send to ${email} failed:`, error);
    }

    results.push({ email, ok: !error, ...(error ? { error } : {}) });

    try {
      await db.collection('email_log').add({
        at: new Date().toISOString(),
        sentBy: session.email,
        segment,
        email,
        name: str(recipient.name),
        registrationId: str(recipient.registrationId) || null,
        paperIds,
        subject: finalSubject,
        template: text,
        ok: !error,
        error: error || null,
      });
    } catch (logError) {
      console.error('[registrations-notify] email_log write failed:', logError?.message);
    }
  }

  res.status(200).json({ results });
};

/** GET ?scope=email-log -> { lastByEmail: { [email]: { at, subject } } } con el último envío exitoso. */
export const handleEmailLog = async (req, res) => {
  if (!(await requireStaff(req, res))) return;

  const snapshot = await getFirestore().collection('email_log').get();
  const lastByEmail = {};
  snapshot.docs.forEach((doc) => {
    const entry = doc.data();
    if (!entry.ok || !entry.email) return;
    const previous = lastByEmail[entry.email];
    if (!previous || entry.at > previous.at) {
      lastByEmail[entry.email] = { at: entry.at, subject: entry.subject };
    }
  });

  res.status(200).json({ lastByEmail });
};
