// Acceso al CMS para inscripciones sin paper (asistentes y empresas) y correos
// automáticos de la inscripción.
//
// La cuenta del CMS se crea sola, con contraseña provisional, la primera vez que
// hace falta: cuando la persona pide recuperar una inscripción inconclusa o
// cuando el staff cambia el estado (p. ej. al confirmarla). La contraseña solo
// viaja al correo de la inscripción. Cada envío queda en `email_log`.
import { randomBytes } from 'node:crypto';
import { hash } from 'bcryptjs';
import { userDocId } from './firestore.js';
import { buildResumeUrl, cmsRoleForRegistration } from './registration-config.js';
import { CMS_URL, emailShell, escapeHtml, sendMailWithFallback } from './email.js';

const ROLE_LABELS = { attendee: 'Asistente', company: 'Empresa' };

// Estados en que la persona aún debe actuar (pagar o corregir).
export const RECOVERABLE_STATUSES = ['pre-registro-creado', 'observado'];

// Cambios de estado del staff que avisan automáticamente al participante.
export const NOTIFY_STATUSES = ['observado', 'pago-validado', 'confirmada'];

const RESEND_COOLDOWN_MS = 15 * 60 * 1000;

const lower = (value) => String(value || '').trim().toLowerCase();
const fullName = (registration) => `${registration.firstName || ''} ${registration.lastName || ''}`.trim();

export const generateTempPassword = () => randomBytes(9).toString('base64url');

/**
 * Crea (una sola vez) la cuenta del CMS de una inscripción sin paper.
 * @returns {Promise<{ role, email, tempPassword: string|null } | null>} null si la
 *   inscripción tiene paper (usa la cuenta de autor); tempPassword solo si se creó ahora.
 */
export const ensureParticipantAccount = async (db, registration) => {
  const role = cmsRoleForRegistration(registration);
  if (!role) return null;

  const email = lower(registration.email);
  const tempPassword = generateTempPassword();
  const now = new Date().toISOString();
  const user = {
    id: `u-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`,
    name: fullName(registration),
    email,
    role,
    affiliation: registration.companyName || registration.affiliation || '',
    registrationId: registration.id,
    passwordHash: await hash(tempPassword, 10),
    createdAt: now,
    updatedAt: now,
  };

  try {
    // create() falla si ya existe: nunca se pisa una cuenta (ni su contraseña).
    await db.collection('users').doc(userDocId(email, role)).create(user);
  } catch (error) {
    if (error?.code === 6) return { role, email, tempPassword: null };
    throw error;
  }
  await db.collection('registrations').doc(registration.id).set({ cmsUserId: user.id }, { merge: true });
  return { role, email, tempPassword };
};

const paragraph = (html) => `<p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#425466;">${html}</p>`;

const button = (href, label) => `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0 20px;">
      <tr><td align="center">
        <a href="${href}" style="background-color:#0D2C54; color:#ffffff; text-decoration:none; font-weight:700; padding:12px 26px; border-radius:8px; display:inline-block;">${label}</a>
      </td></tr>
    </table>`;

const cmsLink = `<a href="${CMS_URL}" style="color:#2A9D8F; font-weight:700;">${CMS_URL}</a>`;

// Bloque con el acceso al CMS según el caso (cuenta nueva, existente o autor).
const accessBlock = (access) => {
  if (!access) {
    return paragraph(`Si tiene cuenta de autor en el CMS, también puede ver su inscripción desde su perfil: ${cmsLink}`);
  }
  const role = ROLE_LABELS[access.role];
  if (!access.tempPassword) {
    return paragraph(
      `Ya tiene una cuenta en el CMS (${cmsLink}): usuario <strong>${escapeHtml(access.email)}</strong>, tipo de cuenta <strong>${role}</strong>. ` +
        'Ingrese con su contraseña; si la olvidó, use «¿Olvidaste tu contraseña?» eligiendo ese tipo de cuenta.'
    );
  }
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0 20px; background-color:#f7f9fc; border:1px solid #e1e7f0; border-radius:10px;">
      <tr><td style="padding:18px 20px; font-size:14px; line-height:1.7; color:#425466;">
        <p style="margin:0 0 8px; font-weight:700; color:#0D2C54;">Su acceso al CMS</p>
        Sitio: ${cmsLink}<br>
        Tipo de cuenta: <strong>${role}</strong><br>
        Usuario: <strong>${escapeHtml(access.email)}</strong><br>
        Contraseña provisional: <strong style="font-family:monospace; font-size:15px;">${escapeHtml(access.tempPassword)}</strong>
        <p style="margin:10px 0 0; font-size:13px; color:#667085;">Le recomendamos cambiarla al ingresar (menú «Cambiar contraseña»).</p>
      </td></tr>
    </table>`;
};

const STATUS_MESSAGES = {
  observado: {
    subject: (id) => `Su inscripción (${id}) tiene observaciones - CLAGTEE 2026`,
    title: 'Su inscripción tiene observaciones',
    body: (registration) =>
      paragraph('Revisamos su inscripción y encontramos observaciones que debe corregir:') +
      paragraph(`<strong>${escapeHtml(registration.staffNote || 'Revise los datos y el comprobante informados.')}</strong>`) +
      paragraph('Puede corregirla y volver a adjuntar el comprobante desde este enlace:') +
      button(buildResumeUrl(registration.id, registration.token), 'Revisar mi inscripción'),
  },
  'pago-validado': {
    subject: (id) => `Pago validado (${id}) - CLAGTEE 2026`,
    title: 'Pago validado',
    body: () =>
      paragraph('Validamos el pago de su inscripción. Le avisaremos por correo cuando quede confirmada.'),
  },
  confirmada: {
    subject: (id) => `Inscripción confirmada (${id}) - CLAGTEE 2026`,
    title: 'Inscripción confirmada',
    body: () =>
      paragraph('Su inscripción al <strong>CLAGTEE 2026</strong> está confirmada.') +
      paragraph('Le esperamos del 28 al 30 de octubre de 2026 en Santiago de Chile.'),
  },
};

const logEmail = async (db, entry) => {
  try {
    await db.collection('email_log').add({ at: new Date().toISOString(), ...entry });
  } catch (error) {
    console.error('[participant-access] email_log write failed:', error?.message);
  }
};

const deliver = async (db, { registration, subject, title, inner, segment, sentBy }) => {
  const html = emailShell(
    `${title} - CLAGTEE 2026`,
    `<h1 style="margin:0 0 12px; font-size:22px; line-height:1.3; color:#0D2C54;">${title}</h1>` +
      paragraph(`Estimado/a <strong>${escapeHtml(fullName(registration))}</strong>,`) +
      paragraph(`N° de inscripción: <strong style="color:#0D2C54;">${escapeHtml(registration.id)}</strong>`) +
      inner
  );
  let error = '';
  try {
    await sendMailWithFallback({ to: registration.email, subject, html, label: `${segment} ${registration.id}` });
  } catch (sendError) {
    error = sendError?.message || 'send-failed';
    console.error(`[participant-access] ${segment} ${registration.id} failed:`, error);
  }
  await logEmail(db, {
    sentBy,
    segment,
    email: lower(registration.email),
    name: fullName(registration),
    registrationId: registration.id,
    subject,
    ok: !error,
    error: error || null,
  });
  return !error;
};

/**
 * Envía el enlace para retomar + acceso al CMS de una inscripción inconclusa.
 * Máximo una vez cada 15 min por inscripción (la solicitud es pública).
 * @returns {Promise<boolean>} true si se envió ahora o hace poco.
 */
export const sendRecoveryEmail = async (db, registration) => {
  if (!RECOVERABLE_STATUSES.includes(registration.status)) return false;
  const lastSentAt = Date.parse(registration.linkResentAt || '') || 0;
  if (Date.now() - lastSentAt < RESEND_COOLDOWN_MS) return true;

  await db.collection('registrations').doc(registration.id).set(
    { linkResentAt: new Date().toISOString() },
    { merge: true }
  );
  const access = await ensureParticipantAccount(db, registration);
  return deliver(db, {
    registration,
    subject: `Retome su inscripción (${registration.id}) - CLAGTEE 2026`,
    title: 'Retome su inscripción',
    inner:
      paragraph('Puede pagar y adjuntar su comprobante desde este enlace:') +
      button(buildResumeUrl(registration.id, registration.token), 'Completar mi inscripción') +
      accessBlock(access),
    segment: 'recovery',
    sentBy: 'sistema',
  });
};

/** Correo automático al cambiar el estado desde el CMS (solo NOTIFY_STATUSES). */
export const sendStatusNotification = async (db, registration, sentBy) => {
  const message = STATUS_MESSAGES[registration.status];
  if (!message) return false;
  const access = await ensureParticipantAccount(db, registration);
  return deliver(db, {
    registration,
    subject: message.subject(registration.id),
    title: message.title,
    inner: message.body(registration) + accessBlock(access),
    segment: `status:${registration.status}`,
    sentBy,
  });
};

/**
 * POST { action: 'recover', email } (público). Responde igual exista o no la
 * inscripción, para no revelar qué correos están inscritos.
 */
export const handleRecoverRequest = async (db, res, body) => {
  const email = lower(body?.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Invalid email' });
    return;
  }
  const snapshot = await db.collection('registrations').get();
  const pending = snapshot.docs
    .map((doc) => doc.data())
    .filter((registration) => lower(registration.email) === email && RECOVERABLE_STATUSES.includes(registration.status));
  for (const registration of pending) {
    await sendRecoveryEmail(db, registration);
  }
  res.status(200).json({ ok: true });
};
