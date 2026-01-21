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
              <img src="https://res.cloudinary.com/dnh5bxvvy/image/upload/v1753825283/image_efe0xn.png" alt="CLAGTEE 2026" width="150" style="display:block; border:0; outline:none; text-decoration:none;">
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
                <a href="mailto:info@clagtee2026.org" style="color:#0D2C54; text-decoration:underline;">clagtee2026@clagtee.org</a>.
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
