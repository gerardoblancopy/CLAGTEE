import { Resend } from 'resend';
import nodemailer from 'nodemailer';

let resendClient = null;

const getResend = () => {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('Missing env: RESEND_API_KEY');
    resendClient = new Resend(key);
  }
  return resendClient;
};

let smtpTransporter = null;

const getSmtpTransporter = () => {
  if (smtpTransporter) return smtpTransporter;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : undefined;

  if (!user || !pass) {
    return null;
  }

  smtpTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  return smtpTransporter;
};

const CMS_URL = 'https://www.clagTEE2026.org/cms'.toLowerCase();
// Use verified domain for production emails
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'clagtee2026@clagtee.org';
// Replies from recipients go here, matching the contact address in the email footer
const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || 'gerardo.blanco@pucv.cl';
// Archive copy for chair-initiated emails; set to empty to disable
const BCC_EMAIL = process.env.BCC_EMAIL || 'gerardo.blanco@pucv.cl';

/**
 * Envia correos intentando primero via Resend. Si Resend retorna error (cuota diaria excedida,
 * 429 rate limit persistente o caida de servicio) y SMTP esta configurado, conmuta
 * automaticamente a SMTP via Nodemailer.
 */
export const sendMailWithFallback = async ({
  to,
  subject,
  html,
  text,
  replyTo = REPLY_TO_EMAIL,
  bcc,
  label = 'email',
}) => {
  const cleanAddress = (addr) => String(addr || '').trim().replace(/\s+/g, '');
  const toList = (Array.isArray(to) ? to : [to]).map(cleanAddress).filter(Boolean);
  const bccList = (bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : []).map(cleanAddress).filter(Boolean);

  let resendError = null;

  // 1. Intentar primero con Resend si hay RESEND_API_KEY configurada
  if (process.env.RESEND_API_KEY) {
    let attempt = 0;
    while (attempt < 2) {
      attempt++;
      try {
        const resend = getResend();
        const { data, error } = await resend.emails.send({
          from: `CLAGTEE 2026 <${SENDER_EMAIL}>`,
          replyTo,
          to: toList,
          ...(bccList.length > 0 ? { bcc: bccList } : {}),
          subject,
          html,
          ...(text ? { text } : {}),
        });

        if (error) {
          if (error.statusCode === 429 && attempt < 2) {
            console.warn(`[email] Resend rate limit (429) en ${label}, reintentando en 1.2s...`);
            await new Promise((resolve) => setTimeout(resolve, 1200));
            continue;
          }
          resendError = error;
          break;
        }

        console.log(`[email:resend] ${label} enviado a ${toList.join(', ')}:`, data?.id);
        return { id: data?.id, provider: 'resend' };
      } catch (err) {
        resendError = err;
        break;
      }
    }
  }

  // 2. Fallback: Intentar con SMTP (Nodemailer)
  const transporter = getSmtpTransporter();
  if (transporter) {
    try {
      const reason = resendError
        ? `Resend fallo (${resendError.message || JSON.stringify(resendError)})`
        : 'RESEND_API_KEY no configurada';
      console.warn(`[email:fallback] Activando fallback SMTP para ${label} hacia ${toList.join(', ')}. Motivo: ${reason}`);

      const smtpSender =
        process.env.SMTP_FROM ||
        (process.env.SMTP_USER ? `CLAGTEE 2026 <${process.env.SMTP_USER}>` : `CLAGTEE 2026 <${SENDER_EMAIL}>`);

      const info = await transporter.sendMail({
        from: smtpSender,
        to: toList.join(', '),
        replyTo,
        ...(bccList.length > 0 ? { bcc: bccList.join(', ') } : {}),
        subject,
        html,
        ...(text ? { text } : {}),
      });

      console.log(`[email:smtp] Envio exitoso via SMTP para ${label} a ${toList.join(', ')}:`, info.messageId);
      return { id: info.messageId, provider: 'smtp' };
    } catch (smtpErr) {
      console.error(`[email:smtp] Error en envio via SMTP para ${label}:`, smtpErr);
      const compositeError = new Error(
        `Fallo el envio por todos los proveedores. Resend: ${resendError?.message || 'N/A'}. SMTP: ${smtpErr?.message || 'N/A'}`
      );
      compositeError.resendError = resendError;
      compositeError.smtpError = smtpErr;
      throw compositeError;
    }
  }

  // 3. Si no hay SMTP configurado y Resend fallo, arrojar el error de Resend
  if (resendError) {
    console.error(`[email] Error enviando ${label} con Resend y sin fallback SMTP configurado:`, resendError);
    throw resendError;
  }

  throw new Error('No hay proveedor de correo configurado (falta RESEND_API_KEY o credenciales SMTP).');
};

export const sendReviewerInvitation = async ({ to, name, tempPassword }) => {

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Invitación a Revisor/a - CLAGTEE 2026</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6fb; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color:#1f2a44;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f6fb; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:100%; max-width:600px; background-color:#ffffff; border:1px solid #e6e9ef; border-radius:12px; overflow:hidden;">
          <tr>
            <td style="background-color:#0D2C54; padding:24px 32px;">
              <img src="https://www.clagtee2026.org/CLAGTEE_2026_blanco.png" alt="CLAGTEE 2026" width="150" style="display:block; border:0; outline:none; text-decoration:none;">
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 12px; font-size:22px; line-height:1.3; color:#0D2C54;">Invitación a Revisor/a</h1>
              <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#425466;">
                Estimado/a <strong>${name}</strong>,
              </p>
              <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#425466;">
                Nos complace invitarle a participar como revisor/a en la conferencia <strong>CLAGTEE 2026</strong>.
                Su experiencia será clave para asegurar la calidad académica del evento.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0; background-color:#f7f9fc; border:1px solid #e1e7f0; border-radius:10px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 8px; font-size:14px; color:#0D2C54; font-weight:600;">Credenciales de acceso</p>
                    <p style="margin:0 0 8px; font-size:14px; color:#425466;">
                      Email:
                      <span style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; background-color:#eef2ff; padding:3px 6px; border-radius:4px; display:inline-block;">
                        ${to}
                      </span>
                    </p>
                    <p style="margin:0; font-size:14px; color:#425466;">
                      Contraseña temporal:
                      <span style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; background-color:#eef2ff; padding:3px 6px; border-radius:4px; display:inline-block;">
                        ${tempPassword}
                      </span>
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 18px; font-size:15px; line-height:1.6; color:#425466;">
                Puede ingresar al sistema desde el siguiente enlace:
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${CMS_URL}" style="background-color:#F4A261; color:#0D2C54; text-decoration:none; font-weight:700; padding:12px 26px; border-radius:8px; display:inline-block; letter-spacing:0.2px;">
                      Acceder al CMS
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0 0; font-size:13px; line-height:1.6; color:#667085;">
                Si tiene alguna duda o necesita asistencia, por favor escriba a
                <a href="mailto:clagtee2026@pucv.cl" style="color:#0D2C54; text-decoration:underline;">clagtee2026@pucv.cl</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f1f4f9; padding:16px 32px; text-align:center; font-size:12px; color:#667085;">
              Comité Organizador CLAGTEE 2026
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return sendMailWithFallback({
    to,
    subject: 'Invitación como Revisor - CLAGTEE 2026',
    html,
    bcc: BCC_EMAIL || undefined,
    label: 'Invitación a revisor/a',
  });
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const sendCustomEmail = async ({ to, name, subject, body, archiveCopy = false }) => {

  const safeBody = escapeHtml(body).replace(/\n/g, '<br>');
  const greetingName = name ? escapeHtml(name) : '';

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6fb; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color:#1f2a44;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f6fb; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:100%; max-width:600px; background-color:#ffffff; border:1px solid #e6e9ef; border-radius:12px; overflow:hidden;">
          <tr>
            <td style="background-color:#0D2C54; padding:24px 32px;">
              <img src="https://www.clagtee2026.org/CLAGTEE_2026_blanco.png" alt="CLAGTEE 2026" width="150" style="display:block; border:0; outline:none; text-decoration:none;">
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px; font-size:20px; line-height:1.3; color:#0D2C54;">${escapeHtml(subject)}</h1>
              ${greetingName ? `<p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#425466;">Estimado/a <strong>${greetingName}</strong>,</p>` : ''}
              <div style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#425466;">${safeBody}</div>
              <p style="margin:24px 0 0; font-size:13px; line-height:1.6; color:#667085;">
                Si tiene alguna duda, escriba a
                <a href="mailto:clagtee2026@pucv.cl" style="color:#0D2C54; text-decoration:underline;">clagtee2026@pucv.cl</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f1f4f9; padding:16px 32px; text-align:center; font-size:12px; color:#667085;">
              Comité Organizador CLAGTEE 2026
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return sendMailWithFallback({
    to,
    subject,
    html,
    bcc: archiveCopy && BCC_EMAIL ? BCC_EMAIL : undefined,
    label: `Correo personalizado a ${to}`,
  });
};

export const sendPasswordReset = async ({ to, name, tempPassword }) => {

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Recuperación de contraseña - CLAGTEE 2026</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6fb; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color:#1f2a44;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f6fb; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:100%; max-width:600px; background-color:#ffffff; border:1px solid #e6e9ef; border-radius:12px; overflow:hidden;">
          <tr>
            <td style="background-color:#0D2C54; padding:24px 32px;">
              <img src="https://www.clagtee2026.org/CLAGTEE_2026_blanco.png" alt="CLAGTEE 2026" width="150" style="display:block; border:0; outline:none; text-decoration:none;">
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 12px; font-size:22px; line-height:1.3; color:#0D2C54;">Recuperación de contraseña</h1>
              <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#425466;">
                Estimado/a <strong>${name || 'usuario/a'}</strong>,
              </p>
              <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#425466;">
                Hemos recibido una solicitud para restablecer su contraseña en el sistema de <strong>CLAGTEE 2026</strong>.
                Si no solicitó este cambio, puede ignorar este correo.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0; background-color:#f7f9fc; border:1px solid #e1e7f0; border-radius:10px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 8px; font-size:14px; color:#0D2C54; font-weight:600;">Nueva contraseña temporal</p>
                    <p style="margin:0 0 8px; font-size:14px; color:#425466;">
                      Email:
                      <span style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background-color:#eef2ff; padding:3px 6px; border-radius:4px; display:inline-block;">
                        ${to}
                      </span>
                    </p>
                    <p style="margin:0; font-size:14px; color:#425466;">
                      Contraseña temporal:
                      <span style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background-color:#eef2ff; padding:3px 6px; border-radius:4px; display:inline-block;">
                        ${tempPassword}
                      </span>
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 18px; font-size:15px; line-height:1.6; color:#425466;">
                Por seguridad, le recomendamos cambiar esta contraseña al ingresar al sistema (Sidebar → Cambiar contraseña).
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${CMS_URL}" style="background-color:#F4A261; color:#0D2C54; text-decoration:none; font-weight:700; padding:12px 26px; border-radius:8px; display:inline-block;">
                      Acceder al CMS
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0 0; font-size:13px; line-height:1.6; color:#667085;">
                Si tiene alguna duda, escriba a
                <a href="mailto:clagtee2026@pucv.cl" style="color:#0D2C54; text-decoration:underline;">clagtee2026@pucv.cl</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f1f4f9; padding:16px 32px; text-align:center; font-size:12px; color:#667085;">
              Comité Organizador CLAGTEE 2026
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return sendMailWithFallback({
    to,
    subject: 'Recuperación de contraseña - CLAGTEE 2026',
    html,
    label: 'Recuperación de contraseña',
  });
};

const REGISTRATION_CATEGORY_LABELS = {
  autor: 'Autor',
  general: 'Participante general',
  estudiante: 'Estudiante',
  'paper-adicional': 'Paper adicional',
  'cena-adicional': 'Cena de gala adicional',
};

const emailShell = (title, innerHtml) =>
  `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6fb; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color:#1f2a44;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f6fb; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:100%; max-width:600px; background-color:#ffffff; border:1px solid #e6e9ef; border-radius:12px; overflow:hidden;">
          <tr>
            <td style="background-color:#0D2C54; padding:24px 32px;">
              <img src="https://www.clagtee2026.org/CLAGTEE_2026_blanco.png" alt="CLAGTEE 2026" width="150" style="display:block; border:0; outline:none; text-decoration:none;">
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${innerHtml}
              <p style="margin:24px 0 0; font-size:13px; line-height:1.6; color:#667085;">
                Si tiene alguna duda, escriba a
                <a href="mailto:clagtee2026@pucv.cl" style="color:#0D2C54; text-decoration:underline;">clagtee2026@pucv.cl</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f1f4f9; padding:16px 32px; text-align:center; font-size:12px; color:#667085;">
              Comité Organizador CLAGTEE 2026
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

export const sendRegistrationReceipt = async ({
  to,
  name,
  id,
  category,
  amountUsd,
  currency = 'USD',
  paymentUrl,
  resumeUrl,
}) => {
  const categoryLabel = REGISTRATION_CATEGORY_LABELS[category] || category || '';

  const inner = `
    <h1 style="margin:0 0 12px; font-size:22px; line-height:1.3; color:#0D2C54;">Pre-registro recibido</h1>
    <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#425466;">
      Estimado/a <strong>${escapeHtml(name || '')}</strong>,
    </p>
    <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#425466;">
      Hemos recibido su pre-registro al <strong>CLAGTEE 2026</strong>. Este correo confirma la recepción del
      formulario, <strong>no</strong> la confirmación final de su inscripción, que queda sujeta a la validación
      manual del pago por parte del equipo organizador.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0; background-color:#f7f9fc; border:1px solid #e1e7f0; border-radius:10px;">
      <tr><td style="padding:18px 20px;">
        <p style="margin:0 0 8px; font-size:14px; color:#425466;">N° de pre-registro: <strong style="color:#0D2C54;">${escapeHtml(id)}</strong></p>
        <p style="margin:0 0 8px; font-size:14px; color:#425466;">Categoría: <strong>${escapeHtml(categoryLabel)}</strong></p>
        <p style="margin:0; font-size:14px; color:#425466;">Monto a pagar: <strong>${currency} ${amountUsd}</strong></p>
      </td></tr>
    </table>
    <p style="margin:0 0 18px; font-size:15px; line-height:1.6; color:#425466;">
      <strong>Paso 1.</strong> Realice el pago en la plataforma PUCV correspondiente a su categoría:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr><td align="center">
        <a href="${paymentUrl}" style="background-color:#F4A261; color:#0D2C54; text-decoration:none; font-weight:700; padding:12px 26px; border-radius:8px; display:inline-block;">
          Pagar en plataforma PUCV
        </a>
      </td></tr>
    </table>
    <p style="margin:20px 0 18px; font-size:15px; line-height:1.6; color:#425466;">
      <strong>Paso 2.</strong> Tras pagar, vuelva a su pre-registro para adjuntar el comprobante o ingresar el
      número de transacción:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr><td align="center">
        <a href="${resumeUrl}" style="background-color:#0D2C54; color:#ffffff; text-decoration:none; font-weight:700; padding:12px 26px; border-radius:8px; display:inline-block;">
          Completar mi pre-registro
        </a>
      </td></tr>
    </table>`;

  return sendMailWithFallback({
    to,
    subject: `Pre-registro recibido (${id}) - CLAGTEE 2026`,
    html: emailShell('Pre-registro recibido - CLAGTEE 2026', inner),
    label: 'Recibo de pre-registro',
  });
};

export const sendCouponConfirmation = async ({ to, name, id, category, couponCode, resumeUrl }) => {
  const categoryLabel = REGISTRATION_CATEGORY_LABELS[category] || category || '';

  const inner = `
    <h1 style="margin:0 0 12px; font-size:22px; line-height:1.3; color:#0D2C54;">Inscripción confirmada</h1>
    <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#425466;">
      Estimado/a <strong>${escapeHtml(name || '')}</strong>,
    </p>
    <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#425466;">
      Su inscripción al <strong>CLAGTEE 2026</strong> quedó confirmada mediante el cupón de cortesía
      <strong>${escapeHtml(couponCode)}</strong>. No requiere realizar ningún pago.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0; background-color:#f7f9fc; border:1px solid #e1e7f0; border-radius:10px;">
      <tr><td style="padding:18px 20px;">
        <p style="margin:0 0 8px; font-size:14px; color:#425466;">N° de inscripción: <strong style="color:#0D2C54;">${escapeHtml(id)}</strong></p>
        <p style="margin:0; font-size:14px; color:#425466;">Categoría: <strong>${escapeHtml(categoryLabel)}</strong></p>
      </td></tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr><td align="center">
        <a href="${resumeUrl}" style="background-color:#0D2C54; color:#ffffff; text-decoration:none; font-weight:700; padding:12px 26px; border-radius:8px; display:inline-block;">
          Ver mi inscripción
        </a>
      </td></tr>
    </table>`;

  return sendMailWithFallback({
    to,
    subject: `Inscripción confirmada (${id}) - CLAGTEE 2026`,
    html: emailShell('Inscripción confirmada - CLAGTEE 2026', inner),
    label: 'Confirmación de cupón',
  });
};

export const sendComprobanteReceived = async ({ to, name, id }) => {

  const inner = `
    <h1 style="margin:0 0 12px; font-size:22px; line-height:1.3; color:#0D2C54;">Comprobante recibido</h1>
    <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#425466;">
      Estimado/a <strong>${escapeHtml(name || '')}</strong>,
    </p>
    <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#425466;">
      Hemos recibido el comprobante de pago asociado a su pre-registro
      <strong style="color:#0D2C54;">${escapeHtml(id)}</strong>. El equipo organizador validará la
      información manualmente y le enviaremos la confirmación final por correo.
    </p>
    <p style="margin:0; font-size:15px; line-height:1.6; color:#425466;">
      Su inscripción queda <strong>sujeta a validación</strong>. Si detectamos alguna inconsistencia en el
      pago, monto o datos, nos pondremos en contacto con usted.
    </p>`;

  return sendMailWithFallback({
    to,
    subject: `Comprobante recibido (${id}) - CLAGTEE 2026`,
    html: emailShell('Comprobante recibido - CLAGTEE 2026', inner),
    label: 'Comprobante recibido',
  });
};

// Envoltura comun para los correos dirigidos a revisores.
const renderReviewerShell = ({ title, inner }) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6fb; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color:#1f2a44;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f6fb; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:100%; max-width:600px; background-color:#ffffff; border:1px solid #e6e9ef; border-radius:12px; overflow:hidden;">
          <tr>
            <td style="background-color:#0D2C54; padding:24px 32px;">
              <img src="https://www.clagtee2026.org/CLAGTEE_2026_blanco.png" alt="CLAGTEE 2026" width="150" style="display:block; border:0; outline:none; text-decoration:none;">
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px; font-size:20px; line-height:1.3; color:#0D2C54;">${escapeHtml(title)}</h1>
              ${inner}
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px;">
                <tr>
                  <td align="center">
                    <a href="${CMS_URL}" style="background-color:#F4A261; color:#0D2C54; text-decoration:none; font-weight:700; padding:12px 26px; border-radius:8px; display:inline-block; letter-spacing:0.2px;">
                      Acceder al CMS
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0; font-size:13px; line-height:1.6; color:#667085;">
                Si tiene alguna duda o no puede revisar alguno de estos trabajos, por favor escriba a
                <a href="mailto:clagtee2026@pucv.cl" style="color:#0D2C54; text-decoration:underline;">clagtee2026@pucv.cl</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f1f4f9; padding:16px 32px; text-align:center; font-size:12px; color:#667085;">
              Comité Organizador CLAGTEE 2026
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

const sendReviewerEmail = async ({ to, subject, html, label }) => {
  return sendMailWithFallback({
    to,
    subject,
    html,
    bcc: BCC_EMAIL || undefined,
    label,
  });
};

// Aviso automatico al asignar un trabajo: solo informa ese trabajo.
export const sendReviewerAssignment = async ({ to, name, paper }) => {
  const title = 'Nuevo trabajo asignado para revisión';
  const subject = `Nuevo trabajo asignado para revisión (${paper.id}) - CLAGTEE 2026`;

  const inner = `
              ${name ? `<p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#425466;">Estimado/a <strong>${escapeHtml(name)}</strong>,</p>` : ''}
              <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#425466;">
                Se le ha asignado el siguiente trabajo para su revisión en <strong>CLAGTEE 2026</strong>.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0; background-color:#f7f9fc; border:1px solid #e1e7f0; border-radius:10px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 6px; font-size:12px; font-weight:700; color:#0D2C54; text-transform:uppercase; letter-spacing:0.4px;">${escapeHtml(paper.id)}</p>
                    <p style="margin:0 0 6px; font-size:15px; line-height:1.5; color:#1f2a44; font-weight:600;">${escapeHtml(paper.title)}</p>
                    ${paper.track ? `<p style="margin:0; font-size:13px; color:#8a94a6;">${escapeHtml(paper.track)}</p>` : ''}
                  </td>
                </tr>
              </table>
              <p style="margin:0; font-size:15px; line-height:1.6; color:#425466;">
                Puede descargar el manuscrito y cargar su evaluación ingresando al sistema con sus credenciales:
              </p>`;

  return sendReviewerEmail({
    to,
    subject,
    html: renderReviewerShell({ title, inner }),
    label: 'Reviewer assignment',
  });
};

const RECOMMENDATION_LABELS = {
  accept: 'Aceptar',
  'minor-revision': 'Revisión menor',
  'major-revision': 'Revisión mayor',
  reject: 'Rechazar',
};

// Resumen manual enviado por el chair: todos los trabajos asignados, cuales ya
// fueron revisados y las estadisticas de las evaluaciones del revisor.
export const sendReviewerAssignmentSummary = async ({ to, name, papers = [], stats }) => {
  const title = 'Resumen de sus trabajos asignados';
  const subject = `Resumen de trabajos asignados (${papers.length}) - CLAGTEE 2026`;

  const statCell = (label, value, color) => `
                  <td style="padding:12px 10px; text-align:center; border-right:1px solid #e1e7f0;">
                    <p style="margin:0; font-size:20px; font-weight:700; color:${color};">${escapeHtml(String(value))}</p>
                    <p style="margin:2px 0 0; font-size:11px; color:#8a94a6; text-transform:uppercase; letter-spacing:0.4px;">${escapeHtml(label)}</p>
                  </td>`;

  const recommendationSummary = Object.entries(stats.recommendations || {})
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `${RECOMMENDATION_LABELS[key] || key}: ${count}`)
    .join(' · ');

  const rows = papers
    .map((paper) => {
      const badge = paper.reviewed
        ? `<span style="display:inline-block; padding:3px 8px; border-radius:6px; background-color:#e6f6f1; color:#1f7a68; font-size:11px; font-weight:700;">Revisado</span>`
        : `<span style="display:inline-block; padding:3px 8px; border-radius:6px; background-color:#fdf1e3; color:#a2620f; font-size:11px; font-weight:700;">Pendiente</span>`;
      const detail =
        paper.reviewed && paper.recommendation
          ? `<br><span style="font-size:11px; color:#8a94a6;">${escapeHtml(
              RECOMMENDATION_LABELS[paper.recommendation] || paper.recommendation
            )}${paper.score ? ` · ${escapeHtml(String(paper.score))}/5` : ''}</span>`
          : '';
      return `
                <tr>
                  <td style="padding:10px 12px; border-bottom:1px solid #e6e9ef; font-size:13px; color:#0D2C54; font-weight:700; white-space:nowrap; vertical-align:top;">
                    ${escapeHtml(paper.id)}
                  </td>
                  <td style="padding:10px 12px; border-bottom:1px solid #e6e9ef; font-size:13px; color:#425466;">
                    ${escapeHtml(paper.title)}
                    ${paper.track ? `<br><span style="font-size:12px; color:#8a94a6;">${escapeHtml(paper.track)}</span>` : ''}
                  </td>
                  <td style="padding:10px 12px; border-bottom:1px solid #e6e9ef; text-align:right; vertical-align:top; white-space:nowrap;">
                    ${badge}${detail}
                  </td>
                </tr>`;
    })
    .join('');

  const inner = `
              ${name ? `<p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#425466;">Estimado/a <strong>${escapeHtml(name)}</strong>,</p>` : ''}
              <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#425466;">
                Le compartimos el estado de los trabajos que tiene asignados para revisión en
                <strong>CLAGTEE 2026</strong>.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0; border:1px solid #e1e7f0; border-radius:10px; border-collapse:collapse; overflow:hidden;">
                <tr>
                  ${statCell('Asignados', stats.total, '#0D2C54')}
                  ${statCell('Revisados', stats.reviewed, '#2A9D8F')}
                  ${statCell('Pendientes', stats.pending, '#E76F51')}
                  <td style="padding:12px 10px; text-align:center;">
                    <p style="margin:0; font-size:20px; font-weight:700; color:#0D2C54;">${
                      stats.averageScore === null ? '—' : escapeHtml(String(stats.averageScore))
                    }</p>
                    <p style="margin:2px 0 0; font-size:11px; color:#8a94a6; text-transform:uppercase; letter-spacing:0.4px;">Puntaje medio</p>
                  </td>
                </tr>
              </table>
              ${
                recommendationSummary
                  ? `<p style="margin:0 0 16px; font-size:13px; color:#667085;">Recomendaciones emitidas: ${escapeHtml(recommendationSummary)}.</p>`
                  : ''
              }

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px; border:1px solid #e1e7f0; border-radius:10px; border-collapse:collapse; overflow:hidden;">
                <tr>
                  <td style="padding:10px 12px; background-color:#f7f9fc; font-size:12px; font-weight:700; color:#0D2C54; text-transform:uppercase; letter-spacing:0.4px;">ID</td>
                  <td style="padding:10px 12px; background-color:#f7f9fc; font-size:12px; font-weight:700; color:#0D2C54; text-transform:uppercase; letter-spacing:0.4px;">Título / Eje temático</td>
                  <td style="padding:10px 12px; background-color:#f7f9fc; font-size:12px; font-weight:700; color:#0D2C54; text-transform:uppercase; letter-spacing:0.4px; text-align:right;">Estado</td>
                </tr>${rows}
              </table>

              <p style="margin:0; font-size:15px; line-height:1.6; color:#425466;">
                ${
                  stats.pending > 0
                    ? `Le agradecemos completar las <strong>${stats.pending}</strong> evaluación(es) pendiente(s) ingresando al sistema:`
                    : 'Agradecemos su dedicación: ya completó todas las evaluaciones asignadas.'
                }
              </p>`;

  return sendReviewerEmail({
    to,
    subject,
    html: renderReviewerShell({ title, inner }),
    label: 'Reviewer assignment summary',
  });
};
