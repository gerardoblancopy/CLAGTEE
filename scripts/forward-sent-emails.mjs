// Fetch already-sent emails from Resend by id and forward archive copies.
//
// Usage:
//   RESEND_API_KEY=re_xxx node scripts/forward-sent-emails.mjs <destino> <id> [id...]
//   RESEND_API_KEY=re_xxx node scripts/forward-sent-emails.mjs <destino> <id...> --send
//
// Without --send it only lists what would be forwarded (dry run).
import { Resend } from 'resend';

const [, , destination, ...rest] = process.argv;
const send = rest.includes('--send');
const ids = rest.filter((arg) => arg !== '--send');

if (!process.env.RESEND_API_KEY) {
  console.error('Falta RESEND_API_KEY en el entorno.');
  process.exit(1);
}
if (!destination || ids.length === 0) {
  console.error('Uso: node scripts/forward-sent-emails.mjs <destino> <id> [id...] [--send]');
  process.exit(1);
}

const resend = new Resend(process.env.RESEND_API_KEY);
const senderEmail = process.env.SENDER_EMAIL || 'clagtee2026@clagtee.org';

const banner = (email) => `
<div style="max-width:600px;margin:0 auto 16px;padding:12px 16px;background:#fff4e5;border:1px solid #f4a261;border-radius:8px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;color:#7a4a12;">
  <strong>Copia de archivo</strong> — este mensaje ya fue enviado por el sistema CLAGTEE 2026.<br>
  Destinatario original: <strong>${email.to.join(', ')}</strong><br>
  Enviado: ${email.created_at} · Estado: ${email.last_event} · ID: ${email.id}
</div>`;

for (const id of ids) {
  const { data, error } = await resend.emails.get(id);
  if (error || !data) {
    console.log(`[skip] ${id}: ${error ? error.message : 'sin datos'}`);
    continue;
  }
  console.log(`[found] ${id} | ${data.to.join(',')} | ${data.last_event} | ${data.created_at} | ${data.subject}`);

  if (!send) continue;

  const html = data.html
    ? data.html.replace(/(<body[^>]*>)/i, `$1${banner(data)}`)
    : `${banner(data)}<pre>${data.text || '(sin contenido)'}</pre>`;

  const copy = await resend.emails.send({
    from: `CLAGTEE 2026 <${senderEmail}>`,
    to: [destination],
    subject: `[Copia] ${data.subject}`,
    html,
  });
  console.log(copy.error ? `  [FAIL] ${copy.error.message}` : `  [sent] ${copy.data.id}`);
}
