// Verifica que los endpoints del CMS rechacen peticiones sin sesion.
//
// Uso:
//   node scripts/verify-api-auth.mjs [base-url]
//   node scripts/verify-api-auth.mjs https://clagtee-xxxx.vercel.app
//
// Todas las mutaciones apuntan a ids inexistentes: si la autorizacion fallara,
// el peor caso es un 404, nunca un borrado real.
//
// En un deployment de preview con Vercel Authentication, el SSO responde antes
// que la API y falsea el resultado. Para atravesarlo, pasa la cookie de bypass:
//   VERIFY_COOKIE="_vercel_jwt=..." node scripts/verify-api-auth.mjs <url>

const baseUrl = (process.argv[2] || 'https://www.clagtee2026.org').replace(/\/$/, '');
const bypassCookie = process.env.VERIFY_COOKIE || '';
const FAKE_PAPER_ID = 'TEST-AUTH-CHECK-DOES-NOT-EXIST';

const json = (body) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// expected: lista de codigos aceptables para una peticion SIN token.
const checks = [
  { name: 'GET /api/papers', path: '/api/papers', init: {}, expected: [401] },
  { name: 'GET /api/auth/users', path: '/api/auth/users', init: {}, expected: [401] },
  {
    name: 'GET /api/gcs-sign (submission pdf)',
    path: '/api/gcs-sign?object=submissions/whatever.pdf',
    init: {},
    expected: [401],
  },
  {
    name: 'GET /api/gcs-sign (comprobante)',
    path: '/api/gcs-sign?object=comprobantes/whatever.pdf',
    init: {},
    expected: [401],
  },
  {
    name: 'GET /api/registrations?scope=staff',
    path: '/api/registrations?scope=staff',
    init: {},
    expected: [401],
  },
  {
    name: 'POST /api/papers (crear)',
    path: '/api/papers',
    init: json({ input: { title: 'auth check' } }),
    expected: [401],
  },
  {
    name: 'PUT /api/papers (editar)',
    path: '/api/papers',
    init: { ...json({ paperId: FAKE_PAPER_ID, input: { title: 'auth check' } }), method: 'PUT' },
    expected: [401],
  },
  {
    name: 'POST /api/papers/decision',
    path: '/api/papers/decision',
    init: json({ paperId: FAKE_PAPER_ID, status: 'accepted' }),
    expected: [401],
  },
  {
    name: 'POST /api/papers/delete',
    path: '/api/papers/delete',
    init: json({ paperId: FAKE_PAPER_ID }),
    expected: [401],
  },
  {
    name: 'POST /api/papers/withdraw',
    path: '/api/papers/withdraw',
    init: json({ paperId: FAKE_PAPER_ID }),
    expected: [401],
  },
  {
    name: 'POST /api/papers/assign-reviewer',
    path: '/api/papers/assign-reviewer',
    init: json({ paperId: FAKE_PAPER_ID, reviewerId: 'u-nobody' }),
    expected: [401],
  },
  {
    name: 'POST /api/papers/submit-review',
    path: '/api/papers/submit-review',
    init: json({ paperId: FAKE_PAPER_ID, review: { reviewerId: 'u-nobody', score: 5 } }),
    expected: [401],
  },
  {
    name: 'POST /api/auth/users (envio de correo)',
    path: '/api/auth/users',
    init: json({ to: 'nobody@example.com', subject: 'auth check', body: 'auth check' }),
    expected: [401],
  },
  {
    name: 'DELETE /api/auth/users',
    path: '/api/auth/users',
    init: { ...json({ userId: 'u-nobody', role: 'reviewer' }), method: 'DELETE' },
    expected: [401],
  },
  {
    name: 'POST /api/auth/invite-reviewer',
    path: '/api/auth/invite-reviewer',
    init: json({ name: 'Auth Check', email: 'nobody@example.com' }),
    expected: [401],
  },
  {
    name: 'PATCH /api/registrations (staff status)',
    path: '/api/registrations',
    init: { ...json({ id: 'REG-0000', newStatus: 'confirmada' }), method: 'PATCH' },
    expected: [401],
  },
  // Rutas que deben seguir abiertas al publico.
  {
    name: 'POST /api/auth/login (credenciales invalidas)',
    path: '/api/auth/login',
    init: json({ email: 'nobody@example.com', password: 'nope', role: 'author' }),
    expected: [401, 404],
    public: true,
  },
  {
    name: 'POST /api/gcs-sign (comprobante de inscripcion)',
    path: '/api/gcs-sign',
    init: json({ fileName: 'auth-check.pdf', prefix: 'comprobantes', contentType: 'application/pdf' }),
    expected: [200],
    public: true,
  },
];

const run = async () => {
  console.log(`Verificando ${baseUrl}\n`);
  let failed = 0;

  for (const check of checks) {
    let status;
    try {
      const init = { ...check.init };
      if (bypassCookie) {
        init.headers = { ...(init.headers || {}), Cookie: bypassCookie };
      }
      const response = await fetch(`${baseUrl}${check.path}`, init);
      status = response.status;
    } catch (error) {
      status = `error: ${error.message}`;
    }

    const ok = check.expected.includes(status);
    if (!ok) failed += 1;
    const label = check.public ? 'publico' : 'protegido';
    console.log(
      `${ok ? 'OK  ' : 'FAIL'} [${label}] ${check.name} -> ${status} (esperado ${check.expected.join('/')})`
    );
  }

  console.log(`\n${checks.length - failed}/${checks.length} comprobaciones correctas.`);
  if (failed > 0) {
    process.exitCode = 1;
  }
};

await run();
