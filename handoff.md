# Handoff — CLAGTEE 2026 (sitio web + CMS + libros del congreso)

Documento de traspaso para que un agente (Codex u otro) tome el proyecto sin
contexto previo. Escrito el **23 de octubre de 2026** sobre `main` @ `ee8e3db`.
Todo lo que dice este archivo fue leído en el código o ejecutado; lo que no se
pudo comprobar está marcado como tal.

---

## 1. Qué es y en qué momento está

**XVI CLAGTEE 2026**: Congreso Latinoamericano de Generación y Transporte de
Energía Eléctrica, organizado por la Escuela de Ingeniería Eléctrica de la
**PUCV** (Chile) con UNESP (Brasil) y UNMdP (Argentina). Coauspicio técnico de
IEEE Chile; las actas van a **IEEE Xplore**.

| Hito | Fecha |
|---|---|
| Pre-congreso (Workshop + Seminario de IA, Auditorio CEA PUCV) | 27 oct 2026 |
| Congreso, Santiago de Chile | 28–30 oct 2026 |
| Plazo versión final IEEE (camera-ready + copyright eCF) | **1 nov 2026** |

El repo tiene tres productos:

1. **Sitio público** (`www.clagtee2026.org`): información, inscripción con pago
   externo PUCV, patrocinios, pre-congreso, guía de versión final IEEE.
2. **CMS** (`/cms`, misma SPA): envío y revisión de papers, decisiones,
   entrega camera-ready, gestión de inscripciones y correos del staff.
3. **Skill `libro-actas-clagtee`** (Python + Typst): genera el *Book of
   Abstracts* y el *Conference Program* en PDF a partir de exports del CMS.

Estado: en producción y en uso intensivo. El trabajo reciente (PRs #19–#25,
21–22 oct) fue sobre el Libro de Resúmenes/Programa y un arreglo de
inscripción. No hay PRs abiertos. La rama de trabajo actual
(`claude/beautiful-davinci-5lfxkq`) es idéntica a `main`.

---

## 2. Reglas de oro (leer antes de tocar nada)

1. **Límite de 12 Serverless Functions (plan Hobby de Vercel) — estamos en
   12/12.** Cada archivo en `api/` que no empiece con `_` es una función. Para
   agregar un endpoint, **no crees un archivo nuevo**: despacha por `action`
   (body) o `scope` (query) dentro de un handler existente y pon la lógica en
   `api/_lib/`. Es el patrón de `api/registrations/index.js` y `api/gcs-sign.js`.
2. **`npm run dev` sin más apunta a PRODUCCIÓN.** `vite.config.ts` hace proxy de
   `/api` a `VITE_API_URL || 'https://clagtee2026.org'`. Un CMS local sin
   configurar lee y escribe datos reales. Ver §10.
3. **No hay base de datos de staging en el repo.** No hay evidencia de un
   proyecto Firestore separado para preview/dev (no lo pude verificar: las
   credenciales viven en Vercel). Asume que cualquier credencial que te den
   es la de producción.
4. **Seed peligroso:** `seedUsersIfNeeded()` (`api/_lib/firestore.js`) crea
   cuentas demo con contraseñas públicas (`chair@clagtee.org` / `chair2026`,
   etc.) **si la colección `users` está vacía**. En producción no aplica
   porque hay usuarios; nunca apuntes el código a un Firestore vacío expuesto.
5. **No envíes correos masivos ni cambies estados reales para probar.** Cada
   correo lleva BCC fijo a `clagtee2026@pucv.cl` y queda en `email_log`.
6. **No adivines IDs de modelos de IA.** `api/_lib/gemini-reviewer.js` usa
   `gpt-5.6-luna` (OpenAI) y una lista de Gemini (`gemini-3.6-flash`, …).
   Verifícalos contra la API del proveedor antes de cambiarlos.
7. **Datos IEEE exactos** (no "corregir"): ver §7.4. Un guion de más en el
   título de la publicación rompe el eCF (error 1003).
8. **Tres idiomas en paralelo.** El contenido público está en
   `data/translations/{es,pt,en}.ts` con la misma forma; un cambio de
   contenido va en los tres. `types.ts` obliga la forma (`tsc` avisa si falta
   una clave). La UI del CMS está solo en español, en el JSX.
9. Antes de borrar archivos "huérfanos" (plugins WordPress, duplicados de
   imágenes), pregunta. Ver §11.

---

## 3. Stack

- **Frontend:** Vite 6 + React 19 + TypeScript 5.8, `framer-motion`.
  **Tailwind se carga por CDN** en `index.html` (`cdn.tailwindcss.com`), no hay
  `tailwind.config` ni PostCSS: las clases funcionan en runtime. Fuentes
  Montserrat (títulos) y Roboto (cuerpo). El `importmap` a esm.sh de
  `index.html` es un resto de Google AI Studio; Vite empaqueta todo igual.
- **Backend:** Vercel Serverless Functions en Node (ESM, JS plano) en `api/`.
- **Datos:** Google Firestore (`@google-cloud/firestore`) + Google Cloud
  Storage (URLs firmadas v4).
- **Correo:** Resend (principal) con fallback SMTP vía Nodemailer
  (`EMAIL_FALLBACK_SETUP.md`).
- **IA (revisión asistida):** OpenAI si hay `OPENAI_API_KEY`, si no Gemini.
- **Navegador:** `pdf-lib` y `pdfjs-dist` (validador IEEE y eCF), `xlsx`
  (SheetJS, carga diferida) para exports, `fflate` para ZIP.
- **Libros:** Python ≥ 3.11 + `typst` (paquete pip), `openpyxl`, `pypdf`.
- **Deploy:** Vercel, proyecto `clagtee-2026-conference-website-2`
  (`vercel.json`: framework vite, salida `dist`, rewrite SPA a `index.html`
  salvo `/api/*`). Dominios: `www.clagtee2026.org`, `clagtee2026.org`,
  `clagtee2026.vercel.app` (este último es el registrado ante IEEE, ver §7.4).

No hay tests automatizados, ni linter, ni CI propio en el repo.

---

## 4. Mapa del repositorio

```
App.tsx                  Sitio público + contenedor del CMS (vista por pathname)
index.tsx / index.html   Entrada; LanguageProvider envuelve App
types.ts                 Tipos del contenido público e inscripciones
contexts/LanguageContext.tsx   es | pt | en (localStorage 'clagtee-lang', default es)
data/
  translations/{es,pt,en}.ts   TODO el contenido público (1257 líneas c/u, misma forma)
  content.ts                   designSystem (colores: #0D2C54, #2A9D8F, #F4A261)
  registration.ts              Espejo en cliente de precios/categorías (la autoridad es el servidor)
components/              Secciones del sitio (Navbar, Hero, Speakers, Sponsors,
                         IeeeFinalVersionSection, IeeePdfValidatorWidget, …)
src/
  cms/                   Todo el CMS (ver §6)
  registration/          Flujo público de inscripción (contexto, formulario, resumen, reanudar)
  sponsorship/           Patrocinios corporativos + stand
  precongress/           Formulario y pósters del pre-congreso
  utils/                 ieeePdfValidator.ts, pdfText.ts (pdf.js), language.ts
api/                     12 funciones Vercel (ver §5)
  _lib/                  Lógica compartida (no son funciones)
scripts/                 Utilidades operativas (Node/Python/bash), ver §9
public/                  Assets servidos: speakers/, sponsors/, pre-congreso/,
                         bookcovers/, Templates/ (plantillas .potx/.pptx), logos
.claude/skills/libro-actas-clagtee/   Skill del Book of Abstracts y Program (§8)
emails/                  HTML del call for papers (envío externo)
Logos 2026/              Logos oficiales de marca (fuente, no se sirven)
AGENTS.md                Buenas prácticas de Vercel (bloque gestionado por Vercel)
README.md                Setup y env vars (parcialmente desactualizado, §11)
EMAIL_FALLBACK_SETUP.md  Cómo configurar SMTP de respaldo
Inscripción.md           Especificación original del flujo de inscripción y pagos
```

---

## 5. API (`api/`)

### 5.1 Autenticación

- `api/_lib/auth.js`: token propio `<payload base64url>.<HMAC-SHA256>` con
  `SESSION_SECRET`, sin estado, **TTL 7 días**. Payload `{id, email, role, exp}`.
  Sin `SESSION_SECRET` todo endpoint autenticado falla cerrado (500).
- El cliente lo guarda en `localStorage['clagtee_session']` y lo manda como
  `Authorization: Bearer` (`src/cms/api.ts → apiFetch`). Un 401 dispara el
  evento `clagtee:session-expired` y AuthContext cierra la sesión.
- Guards: `requireAuth`, `requireRoles`, y `requireStaff` / `requireChair`, que
  **revalidan el rol contra Firestore** en cada llamada (un chair degradado
  pierde acceso al instante).
- Roles: `author`, `reviewer`, `chair`, `staff`, `attendee`, `company`.
  `attendee`/`company` se crean solos desde inscripciones sin paper.
- Usuarios: doc id `users/<email>__<role>`. **Un mismo correo puede tener una
  cuenta por rol.** El login prueba primero el rol pedido y luego todas las
  cuentas del correo; si la contraseña calza con otra cuenta y se pidió
  `author` o `attendee`, aprovisiona esa ficha con el mismo hash.
- Ticket eCF: firma aparte (prefijo `ecf-ticket:`), 5 minutos, no sirve como
  sesión.

### 5.2 Endpoints

| Función | Método / despacho | Quién |
|---|---|---|
| `auth/login.js` | POST `{email,password,role}` → `{user, token}` | público |
| `auth/register.js` | POST, roles `author`/`reviewer` | público |
| `auth/invite-reviewer.js` | POST crea revisor con clave temporal y envía invitación; `action:'resend'` regenera y reenvía (solo cambia la clave si el correo salió) | chair |
| `auth/users.js` | PATCH reset de clave por correo (público) · PUT cambio de clave propia · POST correo libre a usuarios (staff) · GET lista `?role=` (staff) · DELETE usuario (chair; no borra chairs) | mixto |
| `gcs-sign.js` | POST firma subida `{fileName, contentType, prefix}` · GET `?object=&filename=&redirect=1` firma descarga · POST `action:'sign-downloads'` lote para ZIP (staff) | ver §5.4 |
| `papers/index.js` | GET lista según rol · POST crea · PUT edita (solo `pending` sin revisores) o `action:'revision'` (camera-ready) · POST `action:'ecf-ticket'`/`'ecf-redeem'` | autenticado |
| `papers/assign-reviewer.js` | POST asigna (+correo), `action:'unassign'`, `action:'notify'` (resumen al revisor) | chair |
| `papers/decision.js` | POST `{status}` y/o `markNotified`/`unmarkNotified` | staff/chair |
| `papers/submit-review.js` | POST revisión (siempre atribuida a la sesión) · `action:'ai-review'` (`maxDuration: 60`) | reviewer (IA: reviewer asignado o staff) |
| `papers/withdraw.js` | POST → `withdrawn` | submitter o chair |
| `papers/delete.js` | POST borra el doc | chair |
| `registrations/index.js` | Ver tabla siguiente | mixto |

`registrations/index.js` concentra todo lo de inscripciones para no gastar
funciones:

| Despacho | Quién | Qué |
|---|---|---|
| GET `?id=&token=` | público (token) | Retomar una inscripción |
| GET `?scope=staff` | staff | Listado completo (sin tokens) |
| GET `?scope=mine` | sesión | Inscripciones del usuario (por correo o por sus papers) con `resumeUrl` |
| GET `?scope=email-log` | staff | Último correo por destinatario |
| GET `?scope=pre-congress` | staff | Inscritos al pre-congreso |
| GET `?scope=pre-congress-update&id&token` | público | Datos del enlace personal del pre-congreso |
| POST (sin action) | público | Crear inscripción (anti-duplicados, cupón, correlativo) |
| POST `action:'recover'` | público | Reenvía enlace de retomar + acceso CMS (cooldown 15 min) |
| POST `action:'notify'` | staff | Correos del staff con marcadores `{nombre}{paper}{registro}{enlace}` (máx. 25 por llamada) |
| POST `action:'manual-registration'` | staff | Inscripción manual con comprobante |
| POST `action:'sponsorship-inquiry'` | público | Pre-reserva de patrocinio |
| POST `action:'pre-congress'` / `'pre-congress-update'` | público | Pre-congreso |
| POST `action:'pre-congress-notify-students'` | staff | Pide a estudiantes responder EIE-PUCV/transporte |
| PATCH `{newStatus}` | staff | Cambio de estado; avisa al participante si pasa a `observado`, `pago-validado` o `confirmada` |
| PATCH `action:'staff-edit'` / `'staff-attach-comprobante'` | staff | Edición completa / adjuntar comprobante |
| PATCH `action:'cancel'` | participante (token) | Anular antes de enviar comprobante |
| PATCH (con token) | participante | Adjuntar comprobante → `comprobante-recibido` |

### 5.3 Firestore

| Colección | Contenido |
|---|---|
| `users` | Cuentas (`email__role`), `passwordHash` bcrypt, `invitationSentAt/Error`, `assignmentNotifiedAt/Error` |
| `papers` | Papers (ver `normalizePaper` en `api/_lib/firestore.js` para todos los campos) |
| `registrations` | Inscripciones `REG-0001…`, con `token` secreto de retomar |
| `pre_congress_registrations` | Pre-congreso (gratuito, sin pago) |
| `sponsorship_inquiries` | Consultas de patrocinio |
| `email_log` | Bitácora de correos del staff y automáticos (no se borra) |
| `counters` | `registrations`, `papers_<CODE>`, `coupon_<CODE>`, `pre_congress` (transacciones) |

### 5.4 Cloud Storage

Prefijos: `submissions/` (PDFs de papers, camera-ready, copyright, certificado
de formato), `comprobantes/`, `student-proofs/`, `Templates/`.

- Subida sin cuenta solo a `comprobantes/` y `student-proofs/` (el flujo de
  inscripción es anónimo). `submissions/` exige sesión.
- Descarga: `Templates/` pública; `comprobantes/` y `student-proofs/` solo
  staff; `submissions/` para staff, submitter, coautor (por email) o revisor
  asignado. Cualquier otro prefijo: 403.
- El cliente pide la URL firmada con el token (`requestDownloadUrl`,
  `src/cms/DownloadLink.tsx`) y recién después navega, para no exponer el
  token.

---

## 6. CMS (`src/cms/`)

`App.tsx` muestra el CMS si el pathname empieza con `/cms`; `/ecf` es la
página puente del eCF. La pestaña inicial depende del rol.

| Pestaña (`CMSLayout.tsx`) | Roles | Componente |
|---|---|---|
| Mis Trabajos | author, attendee | `AuthorDashboard` (propios y como coautor) + `RevisionUpload` (camera-ready) |
| Nuevo Envío | author | `SubmissionForm` |
| Revisiones | reviewer | `ReviewerDashboard` (incluye revisión asistida por IA) |
| Administración | chair | `ChairDashboard`: pestañas papers / revisores / autores; asignación, invitaciones, decisiones, correos (`PaperEmailModal`), export Excel |
| Inscripciones | staff, chair | `StaffDashboard`: filtros por estado y categoría, cambio de estado, `ManualRegistrationModal`, `EditRegistrationModal`, `AttachComprobanteModal`, `StaffMailer` (segmentos en `registrationSegments.ts`), `AcceptedPapersList`, export Excel, ZIP de comprobantes |
| Pre-congreso | staff, chair | `PreCongressDashboard` (cruce informativo con inscripciones al congreso) |
| Mi Inscripción | attendee, company | `ParticipantDashboard` + `MyRegistrationCard` |

Estado global: `AuthContext.tsx` (sesión, usuarios, invitaciones, claves) y
`CMSDataContext.tsx` (papers, revisiones, decisiones, IA, camera-ready). El
servidor decide qué papers devuelve según la sesión.

Exports: `exportPapersExcel.ts` genera `clagtee2026_papers_<filtro>_AAAAMMDD_HHMM.xlsx`
con hojas por estado, **"Revisores (N)"** (alimenta el Comité de Programa del
libro) y métricas. `exportRegistrationsExcel.ts` lo mismo para inscripciones.

---

## 7. Flujos de negocio

### 7.1 Papers

1. El autor envía (título, abstract, keywords, autores con email/afiliación,
   track, PDF a GCS). Estado `pending`.
2. **ID del paper:** `<CODE>-<n>`, donde `CODE` son las 3 primeras letras del
   título del track en español, sin tildes (`buildTrackCode`), con correlativo
   `counters/papers_<CODE>`. **El prefijo no identifica el track:** `PLA` lo
   comparten los tracks 1 (Planificación), 9 y 10 (Plantas…) y `CUE` los 12 y
   13 (Cuestiones…). Usa el campo `track`, nunca el prefijo.
3. Editar solo mientras esté `pending` y sin revisores.
4. El chair asigna revisores (`pending → under-review`, correo automático).
5. El revisor envía `score`, `confidence`, `recommendation`, `comments`.
6. Staff/chair decide `accepted` / `rejected` y marca la decisión como
   notificada (`decisionNotifiedAt`).
7. Estados posibles: `pending`, `under-review`, `accepted`, `rejected`,
   `withdrawn`. `PLA-58` es un paper de prueba que quedó aceptado (excluido
   del libro).

### 7.2 Camera-ready (versión final IEEE)

Para papers `accepted`, `PUT /api/papers` con `action:'revision'` guarda por
separado o juntos:

- **Título y abstract en inglés** (`titleEn`, `abstractEn`): obligatorios;
  IEEE publica en inglés aunque el paper esté en español/portugués.
- Manuscrito revisado (`revisedFile*`).
- Copyright IEEE firmado (`copyrightFile*`).
- Certificado de formato (`formatCertFile*`) y `formatValidationStatus`: el
  CMS valida el PDF en el navegador (`src/utils/ieeePdfValidator.ts`: tamaño
  Letter/A4, fuentes embebidas, aviso de copyright, título y abstract
  coinciden) y genera el certificado al subir. Reemplazó a PDF eXpress.

Guía pública paso a paso: `components/IeeeFinalVersionSection.tsx` (anclas
`#ieee-paso-N`) con el contenido en las traducciones.

### 7.3 Inscripciones

Especificación original en `Inscripción.md`; autoridad de precios y reglas en
`api/_lib/registration-config.js`.

- Categorías y precios USD (early-bird / regular): `autor` 300/350,
  `general` 250/300, `estudiante` 150/180, `paper-adicional` 75/100,
  `cena-adicional` 40/60, `empresa-stand` 800/800.
- Fase: `EARLY_BIRD_DEADLINE` (ISO) o `REGISTRATION_DEFAULT_PHASE`. El sitio
  anuncia que early-bird rigió hasta el 9 oct 2026.
- **Pago externo** en el Portal de Eventos PUCV
  (`https://vaf.ucv.cl:8446/PortalEventos/evento.jsp?id=…`, ids en
  `PUCV_LINKS`). El puerto 8446 lo bloquean algunos firewalls corporativos;
  el sitio lo advierte.
- Flujo: formulario → pre-registro `REG-NNNN` con token → paga en PUCV → vuelve
  con `/?reg=<id>&token=<token>#inscripcion` → sube comprobante
  (obligatorio; el código de transacción es opcional) → staff valida.
- Estados: `pre-registro-creado`, `comprobante-recibido`, `observado`,
  `pago-validado`, `confirmada`, `cancelada`.
- Anti-duplicados: una inscripción activa por persona en `autor`, `general`,
  `estudiante` (compara correo y nombre sin tildes). PR #19 permitió que
  varios autores de un mismo paper se inscriban. Si alguien repite, se le
  reenvía el enlace de retomar (409).
- El ID de paper escrito se normaliza (`"#INT-29 "` → `INT-29`) o se busca por
  título (≥ 20 caracteres); lo escrito queda en `cmsPaperIdTyped`.
- **Cupones** (`COUPONS`): 100 % de descuento, la inscripción nace
  `confirmada`; cupo atómico en `counters/coupon_<CODE>`. `ProfePUCV`,
  `ProfeEIE`, `EstudianteEIE` (10 c/u) y `EIE-EST-01…10` (1 c/u).
- Inscripciones sin paper reciben cuenta de CMS (`attendee` / `company`) con
  clave temporal cuando se recupera o se confirma (`participant-access.js`).

### 7.4 Copyright IEEE (eCF) — datos que no se tocan

En `src/cms/ieeeEcf.ts`:

- Título de publicación (exacto, sin guion en "Latin American"):
  `2026 XVI Latin American Congress on Electricity Generation and Transmission (CLAGTEE)`
- Conference Record Number `70524` (PDF eXpress `70524X`).
- ISBN de las actas IEEE: `979-8-3195-1521-6` (también en el aviso de copyright).
- **`IEEE_ECF_SIGN_BUTTON = false`**: IEEE no registró un dominio nuestro como
  sitio de envío, así que los autores firman con el enlace que les llega por
  correo desde el eCopyright Upload Tool de IEEE y solo suben el PDF firmado
  al CMS. El CMS rechaza copyrights generados por la web anterior.
- Si algún día IEEE registra `clagtee2026.vercel.app`, poner `true`: el botón
  pide un ticket a la API y abre `/ecf` (`EcfRelay.tsx`) en ese dominio, que
  envía el formulario con el Referer correcto (error 1001 si no).

### 7.5 Pre-congreso, patrocinios, correos

- Pre-congreso: colección propia, gratis, una inscripción por correo. A
  estudiantes se les pregunta si son alumnos EIE-PUCV y si necesitan
  transporte; los inscritos antes de la pregunta responden con un enlace
  personal (`api/_lib/pre-congress.js`).
- Patrocinios: niveles oro/plata/bronce y stand (`src/sponsorship/`), consultas
  en `sponsorship_inquiries`. Patrocinadores actuales: Hendrix/Marmon,
  Colegio de Ingenieros, DESIMAT (`public/sponsors/`).
- Correo (`api/_lib/email.js`): `sendMailWithFallback` intenta Resend (reintenta
  un 429) y si falla usa SMTP. Remitente `SENDER_EMAIL` (default
  `clagtee2026@clagtee.org`), reply-to y **BCC siempre a
  `clagtee2026@pucv.cl`**. Plantillas HTML inline en ese mismo archivo. El plan
  gratis de Resend permite 100 correos/día.

---

## 8. Skill `libro-actas-clagtee` (Book of Abstracts + Conference Program)

Instrucciones completas en `.claude/skills/libro-actas-clagtee/SKILL.md`
(Codex no lo carga solo: léelo y sigue sus comandos, son scripts normales).

- `config/clagtee2026.toml`: todo el contenido editorial (portada, ISBN,
  prefacio, comités, Comité de Programa, correcciones de nombres y títulos,
  tracks es/en/pt, programa).
- `plantilla/{comun,libro,programa}.typ`: plantillas Typst que replican el
  libro 2019 (150 × 220 mm; medidas en `referencia/formato-libro-2019.md`).
- `scripts/generar_libro.py` (entrada: Excel del CMS "todos-completo", JSON de
  `/api/papers` o CSV) y `scripts/generar_programa.py` (entrada:
  `CLAGTEE2026_Programa_vN.xlsx` de la organización, **no está en el repo**).
- Salida en `scratch/libro-actas/` (ignorada por git). Typst solo lee bajo la
  raíz del repo, así que la salida debe quedar dentro.
- Fuentes comerciales del 2019 (Nirmala UI, Minion Pro, Modernica) no se
  versionan; sin ellas usa Open Sans / Crimson Text / Montserrat con factor de
  escala. Si el usuario las sube, van a `assets/fonts-locales/`.

Prueba rápida (verificada hoy, compila en segundos):

```bash
pip install typst openpyxl pypdf
python3 .claude/skills/libro-actas-clagtee/scripts/generar_libro.py \
  --papers .claude/skills/libro-actas-clagtee/ejemplos/papers-ejemplo.json \
  --salida scratch/libro-actas/ejemplo --pliegos
```

Estado del libro real: 154 páginas; Comité de Programa con 29 miembros
(revisores con evaluaciones enviadas + `[comite_programa].incluir`).
**Pendientes en el .toml** (se imprimen en rojo): `[publicacion].editores`
y `[publicacion].isbn` (confirmar con el comité si se usa el ISBN IEEE u otro).
El prefacio es un borrador adaptado del 2019, por confirmar.

---

## 9. Scripts (`scripts/`)

| Script | Uso | Estado |
|---|---|---|
| `create-staff-user.mjs <email> "<nombre>" <clave> [afil]` | Crea/actualiza staff en Firestore (lee `.env.local`) | OK |
| `create-chairs.mjs` | Crea los 3 chairs; claves por env `CHAIR_{MDP,PUCV,UNESP}_PASSWORD` | OK |
| `verify-api-auth.mjs [url]` | Comprueba que los endpoints rechacen llamadas sin sesión (ids inexistentes, no destructivo). En previews protegidos: `VERIFY_COOKIE` | OK, úsalo tras cambios de auth |
| `forward-sent-emails.mjs <destino> <id…> [--send]` | Reenvía copias de correos ya enviados por Resend (dry-run sin `--send`) | OK |
| `notify-pending-registrations.py` | Envío puntual de oct 2026 con destinatarios fijos | Histórico, no reejecutar |
| `download-papers.sh` | Baja todos los PDFs | **Roto**: llama `GET /api/papers` sin token (ahora 401) |
| `audit-reviewer-invitations.mjs` | Cruza revisores vs envíos de Resend | **Roto**: llama `GET /api/auth/users` sin token (ahora 401) |

Los dos rotos quedaron así cuando se agregó autenticación por token; para
usarlos hay que pasarles un `Authorization: Bearer` de staff.

---

## 10. Desarrollo local y verificación

```bash
npm ci                 # Node 22 probado
npx tsc --noEmit       # hoy: 0 errores (incluye App, components, data, src, types; excluye api/)
npm run build          # hoy: OK; avisa chunks > 500 kB (conocido, no es error)
```

Para correr con API local (y no contra producción):

1. `.env.local` con las variables de §10.1 (pedir al usuario; `vercel env pull`
   si tiene acceso al proyecto).
2. `vercel dev --listen 3002` (funciones).
3. En `.env.local`, `VITE_API_URL=http://localhost:3002`, y luego `npm run dev`
   (Vite en `:3000`). Sin `VITE_API_URL`, el proxy va a `https://clagtee2026.org`.
4. Aun así, las credenciales GCP probablemente sean las de producción (§2, regla 3).

No hay suite de tests. La verificación habitual es `tsc` + `build` + probar en
un deployment de preview de Vercel + `node scripts/verify-api-auth.mjs <preview-url>`
cuando se toca autorización.

### 10.1 Variables de entorno (Vercel)

| Variable | Uso |
|---|---|
| `GCS_PROJECT_ID`, `GCS_CLIENT_EMAIL`, `GCS_PRIVATE_KEY`, `GCS_BUCKET` | Firestore + Storage (Firestore acepta también `GCP_*`; la clave puede venir en `GCS_PRIVATE_KEY_ENV`; `\n` escapados se convierten) |
| `GCS_PUBLIC_BASE_URL` | Opcional, URL pública de archivos |
| `SESSION_SECRET` | **Obligatoria.** Cambiarla invalida todas las sesiones |
| `RESEND_API_KEY`, `SENDER_EMAIL` | Correo principal |
| `REPLY_TO_EMAIL`, `BCC_EMAIL` | Opcionales (default `clagtee2026@pucv.cl`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Fallback SMTP |
| `SITE_BASE_URL` | Base de los enlaces de retomar (default `https://www.clagtee2026.org`) |
| `EARLY_BIRD_DEADLINE`, `REGISTRATION_DEFAULT_PHASE` | Fase de precios |
| `OPENAI_API_KEY`, `GEMINI_API_KEY` | Revisión asistida por IA |
| `VITE_API_URL` | Solo dev: destino del proxy `/api` |

Nunca subas secretos al repo ni los pongas en variables `VITE_*`/`NEXT_PUBLIC_*`
(se empaquetan en el cliente). `src/cms/pass.md` está en `.gitignore` a propósito.

---

## 11. Deuda técnica, trampas y riesgos conocidos

- **README desactualizado:** menciona `VITE_CMS_URL`, pero el código no la usa;
  `CMS_URL` está fijo en `api/_lib/email.js` (`https://www.clagtee2026.org/cms`).
- **Reset de clave sin autenticación** (`PATCH /api/auth/users`): cualquiera que
  conozca un correo puede rotar la clave de esa cuenta (la nueva llega solo al
  dueño, pero lo deja fuera hasta que lea el correo).
- **Enumeración de cuentas:** el login responde 404 si el correo no existe y
  401 si la clave es incorrecta.
- `GET /api/papers` para autores lee **toda** la colección y filtra en memoria
  (y la creación de inscripciones también lee todas las inscripciones). Bien
  para el volumen actual (cientos), no escala.
- `trackCode` ambiguo (§7.1).
- **Lógica duplicada cliente/servidor que hay que cambiar en ambos lados:**
  precios y categorías (`api/_lib/registration-config.js` ↔
  `data/registration.ts`), criterio de emparejar paper por ID/título
  (`registration-config.js` ↔ `src/cms/registrationSegments.ts`), y los
  textos de los 13 tracks (`data/translations/*.ts` ↔ `[[tracks]]` del .toml
  del libro, que los usa para reconocer el track del CMS).
- Archivos grandes en un solo componente: `ChairDashboard.tsx` (1632 líneas),
  `RevisionUpload.tsx`, `EditRegistrationModal.tsx`, `AcceptedPapersList.tsx`.
- Bundle principal ~1,4 MB (446 kB gzip); `xlsx` y `pdf.js` ya se cargan diferidos.
- Restos sin uso aparente (no borrar sin preguntar): plugin WordPress
  (`clagtee-wp-plugin.php`, `clagtee-conference/`, `clagtee-plugin*.zip`, de
  una etapa en que el sitio se incrustaba en WordPress), `metadata.json` (AI
  Studio), portadas duplicadas en `src/*_portada_book.*` (las que se sirven
  son `public/bookcovers/`), plantilla `.potx` duplicada en la raíz,
  `public/` y `public/Templates/`.
- `.gitignore` ignora `*.pdf` y `*.docx` en todo el repo (para agregar uno:
  `git add -f`) y `.vercelignore` ignora `*.pdf`, así que **ningún PDF de
  `public/` se despliega**.
- `.claude/*` está ignorado salvo `.claude/skills/`.

---

## 12. Convenciones de trabajo

- **Idioma:** comentarios de código, textos del CMS, correos y documentación
  interna en **español**. Mensajes de commit y títulos de PR en **inglés**,
  estilo Conventional Commits con scope:
  `feat(registration): …`, `fix(ecf): …`, `chore(libro-actas): …`. El cuerpo
  explica el porqué y el efecto visible (ver `git log`).
- Comentarios: densidad media, explican el porqué (decisiones, límites de
  IEEE/Vercel), no el qué.
- Backend: handlers con `parseBody`, respuestas `{ error }` en inglés para
  códigos de error y en español cuando el mensaje llega al usuario; logs
  `console.error('[nombre-endpoint]', message)`; nunca devolver `passwordHash`
  ni `token` de inscripción (`sanitizeUser`, `stripToken`).
- Identidad siempre desde la sesión, nunca desde el body (así se cerró el
  agujero original donde `submitterId`/`staffEmail` venían del cliente).
- Flujo git: rama `claude/<nombre>` (o la que indique el usuario) → PR a
  `main` → squash merge (el historial reciente de `main` es un commit por PR, con el
  número al final del título). Lo habitual en Vercel es que `main` vaya a
  producción y cada rama a preview (no lo verifiqué desde aquí).
- Repo: `gerardoblancopy/CLAGTEE` en GitHub. Dueño: Gerardo Blanco.

---

## 13. Próximos pasos probables

1. **Libro de Resúmenes / Programa:** completar ISBN y editores, confirmar
   prefacio, regenerar con el export final del CMS y la última planilla del
   programa (pedir ambos archivos al usuario; no inventar datos).
2. **Camera-ready (hasta el 1 nov):** soporte a autores en `RevisionUpload` y
   el validador; seguimiento de quién falta (títulos/abstracts en inglés,
   copyright firmado, certificado de formato) desde el export de papers.
3. **Post-congreso:** reunir camera-ready y copyrights para el envío a IEEE
   Xplore; solo papers presentados por al menos un autor van a IEEE (la guía
   lo exige).
4. Si se tocan los scripts operativos: arreglar `download-papers.sh` y
   `audit-reviewer-invitations.mjs` para que manden token de staff.

Si dudas de algo de este documento, el código manda: los puntos de entrada
son `App.tsx`, `src/cms/CMSDataContext.tsx`, `api/_lib/auth.js`,
`api/papers/index.js`, `api/registrations/index.js` y
`api/_lib/registration-config.js`.
