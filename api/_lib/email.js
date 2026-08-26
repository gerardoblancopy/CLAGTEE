import { Resend } from 'resend';

const getEnv = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
};

let resendClient = null;

const getResend = () => {
  if (!resendClient) {
    resendClient = new Resend(getEnv('RESEND_API_KEY'));
  }
  return resendClient;
};

const CMS_URL = 'https://www.clagtee2026.org/cms';
// Use verified domain for production emails
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'clagtee2026@clagtee.org';
// Replies from recipients go here, matching the contact address in the email footer
const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || 'gerardo.blanco@pucv.cl';
// Archive copy for chair-initiated emails; set to empty to disable
const BCC_EMAIL = process.env.BCC_EMAIL || 'gerardo.blanco@pucv.cl';

export const sendReviewerInvitation = async ({ to, name, tempPassword }) => {
  const resend = getResend();

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

  const { data, error } = await resend.emails.send({
    from: `CLAGTEE 2026 <${SENDER_EMAIL}>`,
    replyTo: REPLY_TO_EMAIL,
    to: [to],
    subject: 'Invitación como Revisor - CLAGTEE 2026',
    html,
  });

  if (error) {
    console.error('[email] Failed to send reviewer invitation:', error);
    throw error;
  }

  console.log('[email] Reviewer invitation sent:', data?.id);
  return data;
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const sendCustomEmail = async ({ to, name, subject, body, archiveCopy = false }) => {
  const resend = getResend();

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

  const { data, error } = await resend.emails.send({
    from: `CLAGTEE 2026 <${SENDER_EMAIL}>`,
    replyTo: REPLY_TO_EMAIL,
    to: [to],
    ...(archiveCopy && BCC_EMAIL ? { bcc: [BCC_EMAIL] } : {}),
    subject,
    html,
  });

  if (error) {
    console.error('[email] Failed to send custom email:', error);
    throw error;
  }

  console.log('[email] Custom email sent:', data?.id);
  return data;
};

export const sendPasswordReset = async ({ to, name, tempPassword }) => {
  const resend = getResend();

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

  const { data, error } = await resend.emails.send({
    from: `CLAGTEE 2026 <${SENDER_EMAIL}>`,
    replyTo: REPLY_TO_EMAIL,
    to: [to],
    subject: 'Recuperación de contraseña - CLAGTEE 2026',
    html,
  });

  if (error) {
    console.error('[email] Failed to send password reset:', error);
    throw error;
  }

  console.log('[email] Password reset sent:', data?.id);
  return data;
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
  const resend = getResend();
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

  const { data, error } = await resend.emails.send({
    from: `CLAGTEE 2026 <${SENDER_EMAIL}>`,
    replyTo: REPLY_TO_EMAIL,
    to: [to],
    subject: `Pre-registro recibido (${id}) - CLAGTEE 2026`,
    html: emailShell('Pre-registro recibido - CLAGTEE 2026', inner),
  });

  if (error) {
    console.error('[email] Failed to send registration receipt:', error);
    throw error;
  }

  console.log('[email] Registration receipt sent:', data?.id);
  return data;
};

export const sendCouponConfirmation = async ({ to, name, id, category, couponCode, resumeUrl }) => {
  const resend = getResend();
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

  const { data, error } = await resend.emails.send({
    from: `CLAGTEE 2026 <${SENDER_EMAIL}>`,
    replyTo: REPLY_TO_EMAIL,
    to: [to],
    subject: `Inscripción confirmada (${id}) - CLAGTEE 2026`,
    html: emailShell('Inscripción confirmada - CLAGTEE 2026', inner),
  });

  if (error) {
    console.error('[email] Failed to send coupon confirmation:', error);
    throw error;
  }

  console.log('[email] Coupon confirmation sent:', data?.id);
  return data;
};

export const sendComprobanteReceived = async ({ to, name, id }) => {
  const resend = getResend();

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

  const { data, error } = await resend.emails.send({
    from: `CLAGTEE 2026 <${SENDER_EMAIL}>`,
    replyTo: REPLY_TO_EMAIL,
    to: [to],
    subject: `Comprobante recibido (${id}) - CLAGTEE 2026`,
    html: emailShell('Comprobante recibido - CLAGTEE 2026', inner),
  });

  if (error) {
    console.error('[email] Failed to send comprobante received:', error);
    throw error;
  }

  console.log('[email] Comprobante received sent:', data?.id);
  return data;
};
