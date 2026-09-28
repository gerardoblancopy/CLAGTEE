// Autoridad de precios, links de pago PUCV, fase (early-bird/regular) y
// validación de campos por categoría. Compartido por los endpoints de /api/registrations.
//
// Pendientes de la pauta (configurables vía env, sin bloquear):
// - EARLY_BIRD_DEADLINE: fecha ISO de corte early-bird -> regular.
// - REGISTRATION_DEFAULT_PHASE: 'early-bird' | 'regular' cuando no hay deadline.
// - Links definitivos de 'paper-adicional' y 'cena-adicional' (hoy reutilizan autor/general).

const PUCV_BASE = 'https://vaf.ucv.cl:8446/PortalEventos/evento.jsp';

const PUCV_LINKS = {
  autor: `${PUCV_BASE}?id=1898`,
  general: `${PUCV_BASE}?id=1899`,
  estudiante: `${PUCV_BASE}?id=1900`,
  'paper-adicional': `${PUCV_BASE}?id=1908`,
  'cena-adicional': `${PUCV_BASE}?id=1909`,
  'empresa-stand': `${PUCV_BASE}?id=2215`,
};

// category -> { 'early-bird': USD, regular: USD, link }
const PRICING = {
  autor: { 'early-bird': 300, regular: 350, link: PUCV_LINKS.autor },
  general: { 'early-bird': 250, regular: 300, link: PUCV_LINKS.general },
  estudiante: { 'early-bird': 150, regular: 180, link: PUCV_LINKS.estudiante },
  'paper-adicional': { 'early-bird': 75, regular: 100, link: PUCV_LINKS['paper-adicional'] },
  'cena-adicional': { 'early-bird': 40, regular: 60, link: PUCV_LINKS['cena-adicional'] },
  'empresa-stand': { 'early-bird': 800, regular: 800, link: PUCV_LINKS['empresa-stand'] },
};

export const REGISTRATION_CATEGORIES = Object.keys(PRICING);

export const getSiteBaseUrl = () =>
  (process.env.SITE_BASE_URL || 'https://www.clagtee2026.org').replace(/\/$/, '');

// Rol del CMS para inscripciones sin paper. Las que tienen paper (autor, paper
// adicional, estudiante autor) usan la cuenta de autor, así que no tienen rol propio.
export const cmsRoleForRegistration = (record) => {
  if (record.category === 'empresa-stand') return 'company';
  if (record.category === 'general' || record.category === 'cena-adicional') return 'attendee';
  if (record.category === 'estudiante' && record.studentType !== 'autor') return 'attendee';
  return null;
};

export const buildResumeUrl = (id, token, category) => {
  const hash = category === 'empresa-stand' ? '#patrocinio' : '#inscripcion';
  return `${getSiteBaseUrl()}/?reg=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}${hash}`;
};

// Cupones de descuento. `appliesTo` restringe la categoría; `maxUses` limita el total de
// canjes (contabilizado en Firestore counters/coupon_<CODE> vía transacción atómica).
const COUPONS = {
  PROFEPUCV: { code: 'ProfePUCV', maxUses: 10, appliesTo: ['autor'] },
};

export const normalizeCouponCode = (value) => str(value).toUpperCase();

export const getCouponDefinition = (code) => COUPONS[normalizeCouponCode(code)] || null;

const STUDENT_LEVELS = ['pregrado', 'magister', 'doctorado'];
const STUDENT_TYPES = ['autor', 'asistente'];
const COVERAGES = ['principal', 'adicional'];

export const getPhase = (now = new Date()) => {
  const deadline = process.env.EARLY_BIRD_DEADLINE;
  if (!deadline) {
    return process.env.REGISTRATION_DEFAULT_PHASE === 'regular' ? 'regular' : 'early-bird';
  }
  return new Date(now) <= new Date(deadline) ? 'early-bird' : 'regular';
};

export const resolvePricing = (category, phase) => {
  const entry = PRICING[category];
  if (!entry) return null;
  const amountUsd = entry[phase] ?? entry.regular;
  return { amountUsd, currency: 'USD', paymentUrl: entry.link };
};

const str = (value) => (typeof value === 'string' ? value.trim() : '');
const isEmail = (value) => /.+@.+\..+/.test(str(value));
const needsPaper = (category, studentType) =>
  category === 'autor' ||
  category === 'paper-adicional' ||
  (category === 'estudiante' && studentType === 'autor');

export const stripUndefined = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
};

// Categorías que inscriben a una persona al congreso: solo una activa por correo.
// Stand y cena adicional no se deduplican (una empresa o un acompañante pueden repetir).
const PERSON_CATEGORIES = ['autor', 'general', 'estudiante'];

const lower = (value) => str(value).toLowerCase();

// "#INT-29 " -> "INT-29": solo letras, dígitos y guiones.
export const normalizePaperId = (value) => str(value).toUpperCase().replace(/[^A-Z0-9-]/g, '');

// Título comparable: sin tildes, mayúsculas ni puntuación.
// Solo se usa para emparejar títulos de al menos MIN_TITLE_MATCH_LENGTH caracteres,
// así un título corto o genérico no enlaza el paper equivocado.
export const MIN_TITLE_MATCH_LENGTH = 20;

export const normalizeTitle = (value) =>
  str(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Busca una inscripción activa (no cancelada) que choque con la nueva: la misma
 * persona en una categoría principal, o el mismo paper ya cubierto por otra inscripción.
 * @returns {{ code: 'duplicate-registration'|'duplicate-paper', record: object } | null}
 */
export const findDuplicateRegistration = (records, clean) => {
  const active = records.filter((record) => record.status !== 'cancelada');

  if (PERSON_CATEGORIES.includes(clean.category)) {
    const email = lower(clean.email);
    const match = active.find(
      (record) => PERSON_CATEGORIES.includes(record.category) && lower(record.email) === email
    );
    if (match) return { code: 'duplicate-registration', record: match };
  }

  const paperId = normalizePaperId(clean.cmsPaperId);
  if (paperId) {
    const match = active.find((record) => normalizePaperId(record.cmsPaperId) === paperId);
    if (match) return { code: 'duplicate-paper', record: match };
  }

  return null;
};

/**
 * Una inscripción pertenece a una cuenta del CMS si usa su correo (participante o
 * correo CMS declarado) o si declara un paper enviado por esa cuenta.
 */
export const isRegistrationOwnedBy = (record, { email, paperIds }) => {
  const accountEmail = lower(email);
  if (accountEmail && (lower(record.email) === accountEmail || lower(record.cmsEmail) === accountEmail)) {
    return true;
  }
  const paperId = normalizePaperId(record.cmsPaperId);
  return Boolean(paperId) && paperIds.has(paperId);
};

/**
 * Valida el input según la categoría y devuelve un objeto limpio listo para persistir.
 * @returns {{ ok: boolean, errors: string[], clean: object|null }}
 */
export const validateRegistrationInput = (input) => {
  const errors = [];
  const category = str(input?.category);
  if (!REGISTRATION_CATEGORIES.includes(category)) {
    return { ok: false, errors: ['category'], clean: null };
  }

  const studentType = str(input.studentType);

  // Campos comunes
  const firstName = str(input.firstName);
  const lastName = str(input.lastName);
  const email = str(input.email);
  const country = str(input.country);
  const affiliation = str(input.affiliation);

  if (!firstName) errors.push('firstName');
  if (!lastName) errors.push('lastName');
  if (!isEmail(email)) errors.push('email');
  if (!country) errors.push('country');
  if (category !== 'cena-adicional' && category !== 'empresa-stand' && !affiliation) errors.push('affiliation');

  const clean = {
    category,
    firstName,
    lastName,
    email,
    country,
    affiliation,
    dietary: str(input.dietary) || undefined,
    couponCode: str(input.couponCode) || undefined,
  };

  // Empresa (Stand - Exhibición)
  if (category === 'empresa-stand') {
    const companyName = str(input.companyName) || affiliation;
    const contactPhone = str(input.contactPhone);
    const billingTaxId = str(input.billingTaxId);
    const standRepresentative2Name = str(input.standRepresentative2Name);
    const standRepresentative2Email = str(input.standRepresentative2Email);
    const dinnerAttendeeName = str(input.dinnerAttendeeName);
    const standNotes = str(input.standNotes);

    if (!companyName) errors.push('companyName');
    if (!contactPhone) errors.push('contactPhone');

    Object.assign(clean, {
      companyName,
      affiliation: companyName,
      contactPhone,
      billingTaxId: billingTaxId || undefined,
      standRepresentative2Name: standRepresentative2Name || undefined,
      standRepresentative2Email: standRepresentative2Email || undefined,
      dinnerAttendeeName: dinnerAttendeeName || undefined,
      standNotes: standNotes || undefined,
    });
  }

  // Autor / estudiante-autor / paper adicional -> datos del paper
  if (needsPaper(category, studentType)) {
    const cmsPaperId = str(input.cmsPaperId);
    const paperTitle = str(input.paperTitle);
    const presenterName = str(input.presenterName);
    const cmsEmail = str(input.cmsEmail);
    if (!cmsPaperId) errors.push('cmsPaperId');
    if (!paperTitle) errors.push('paperTitle');
    if (!presenterName) errors.push('presenterName');
    if (!isEmail(cmsEmail)) errors.push('cmsEmail');

    const coverage = COVERAGES.includes(str(input.coverage))
      ? str(input.coverage)
      : category === 'paper-adicional'
        ? 'adicional'
        : 'principal';

    Object.assign(clean, { cmsPaperId, paperTitle, presenterName, cmsEmail, coverage });
  }

  // Paper adicional -> asociación con inscripción principal
  if (category === 'paper-adicional') {
    const mainRegistrationId = str(input.mainRegistrationId);
    const mainAuthorEmail = str(input.mainAuthorEmail);
    if (!mainRegistrationId && !isEmail(mainAuthorEmail)) {
      errors.push('mainRegistrationOrEmail');
    }
    Object.assign(clean, {
      mainRegistrationId: mainRegistrationId || undefined,
      mainAuthorEmail: mainAuthorEmail || undefined,
    });
  }

  // Estudiante -> datos y comprobante de estudiante
  if (category === 'estudiante') {
    const program = str(input.program);
    const level = str(input.level);
    const studentProofFileKey = str(input.studentProofFileKey);
    if (!STUDENT_TYPES.includes(studentType)) errors.push('studentType');
    if (!program) errors.push('program');
    if (!STUDENT_LEVELS.includes(level)) errors.push('level');
    if (!studentProofFileKey) errors.push('studentProof');
    Object.assign(clean, {
      studentType,
      program,
      level,
      studentProofFileKey,
      studentProofUrl: str(input.studentProofUrl) || undefined,
      studentProofFileName: str(input.studentProofFileName) || undefined,
    });
  }

  // Cena de gala adicional -> participante principal asociado
  if (category === 'cena-adicional') {
    const mainParticipantName = str(input.mainParticipantName);
    const mainParticipantEmail = str(input.mainParticipantEmail);
    if (!mainParticipantName) errors.push('mainParticipantName');
    if (!isEmail(mainParticipantEmail)) errors.push('mainParticipantEmail');
    Object.assign(clean, {
      mainParticipantName,
      mainParticipantEmail,
      mainRegistrationId: str(input.mainRegistrationId) || undefined,
      ticketUserName: str(input.ticketUserName) || undefined,
      ticketDietary: str(input.ticketDietary) || undefined,
    });
  }

  return { ok: errors.length === 0, errors, clean: errors.length === 0 ? stripUndefined(clean) : null };
};
