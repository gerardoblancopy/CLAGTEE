// Cross-reference every reviewer in the CMS against the invitation emails
// Resend actually dispatched, and report who has no matching send.
//
// Usage:
//   RESEND_API_KEY=re_xxx node scripts/audit-reviewer-invitations.mjs
//   RESEND_API_KEY=re_xxx node scripts/audit-reviewer-invitations.mjs https://www.clagtee2026.org
import { Resend } from 'resend';

const SITE = process.argv[2] || 'https://www.clagtee2026.org';
const INVITATION_SUBJECT = 'Invitación como Revisor - CLAGTEE 2026';

if (!process.env.RESEND_API_KEY) {
  console.error('Falta RESEND_API_KEY en el entorno.');
  process.exit(1);
}

const response = await fetch(`${SITE}/api/auth/users?role=reviewer`);
if (!response.ok) {
  console.error(`No se pudo leer los revisores: HTTP ${response.status}`);
  process.exit(1);
}
const { users: reviewers = [] } = await response.json();
console.log(`Revisores en el CMS: ${reviewers.length}\n`);

// Page through every email Resend has for this account.
const resend = new Resend(process.env.RESEND_API_KEY);
const sent = new Map(); // recipient -> most recent matching email
let after;
let pages = 0;

while (pages < 100) {
  const { data, error } = await resend.emails.list(after ? { limit: 100, after } : { limit: 100 });
  if (error) {
    console.error('Error listando correos en Resend:', error.message);
    process.exit(1);
  }
  const batch = data?.data || [];
  for (const email of batch) {
    if (email.subject !== INVITATION_SUBJECT) continue;
    for (const recipient of email.to || []) {
      const key = recipient.toLowerCase();
      const previous = sent.get(key);
      if (!previous || email.created_at > previous.created_at) sent.set(key, email);
    }
  }
  pages += 1;
  if (!data?.has_more || batch.length === 0) break;
  after = batch[batch.length - 1].id;
}

console.log(`Invitaciones encontradas en Resend: ${sent.size} (revisadas ${pages} paginas)\n`);

const missing = [];
const problems = [];
const ok = [];

for (const reviewer of reviewers) {
  const record = sent.get((reviewer.email || '').toLowerCase());
  if (!record) {
    missing.push(reviewer);
  } else if (['bounced', 'failed', 'complained', 'canceled'].includes(record.last_event)) {
    problems.push({ reviewer, record });
  } else {
    ok.push({ reviewer, record });
  }
}

const line = (email, extra) => `  ${email.padEnd(38)} ${extra}`;

console.log(`ENTREGADAS / EN CAMINO (${ok.length})`);
for (const { reviewer, record } of ok) console.log(line(reviewer.email, `${record.last_event}  ${record.created_at}`));

console.log(`\nCON PROBLEMA (${problems.length})`);
for (const { reviewer, record } of problems) console.log(line(reviewer.email, `${record.last_event}  ${record.created_at}  id=${record.id}`));

console.log(`\nSIN INVITACION EN RESEND (${missing.length})`);
for (const reviewer of missing) console.log(line(reviewer.email, `creado ${reviewer.createdAt}`));

if (missing.length || problems.length) {
  console.log('\nEstos revisores probablemente nunca recibieron credenciales.');
  console.log('Reenvia desde el panel de chair o con el flujo de recuperacion de contrasena.');
}
