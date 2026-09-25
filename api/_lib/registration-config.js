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
};

// category -> { 'early-bird': USD, regular: USD, link }
const PRICING = {
  autor: { 'early-bird': 300, regular: 350, link: PUCV_LINKS.autor },
  general: { 'early-bird': 250, regular: 300, link: PUCV_LINKS.general },
  estudiante: { 'early-bird': 150, regular: 180, link: PUCV_LINKS.estudiante },
  'paper-adicional': { 'early-bird': 75, regular: 100, link: PUCV_LINKS['paper-adicional'] },
  'cena-adicional': { 'early-bird': 40, regular: 60, link: PUCV_LINKS['cena-adicional'] },
};

export const REGISTRATION_CATEGORIES = Object.keys(PRICING);

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
  if (category !== 'cena-adicional' && !affiliation) errors.push('affiliation');

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
