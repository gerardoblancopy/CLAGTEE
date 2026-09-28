import { RegistrationCategory, RegistrationPhase } from '../types';

// Espejo de cliente para mostrar la tabla de tarifas y estimar el monto.
// La autoridad de precios/links sigue siendo el servidor (api/_lib/registration-config.js).

export const REGISTRATION_CATEGORY_ORDER: RegistrationCategory[] = [
  'autor',
  'general',
  'estudiante',
  'empresa-stand',
  'paper-adicional',
  'cena-adicional',
];

export interface CategoryPricing {
  earlyBird: number;
  regular: number;
}

export const REGISTRATION_PRICING: Record<RegistrationCategory, CategoryPricing> = {
  autor: { earlyBird: 300, regular: 350 },
  general: { earlyBird: 250, regular: 300 },
  estudiante: { earlyBird: 150, regular: 180 },
  'empresa-stand': { earlyBird: 800, regular: 800 },
  'paper-adicional': { earlyBird: 75, regular: 100 },
  'cena-adicional': { earlyBird: 40, regular: 60 },
};

// Rol del CMS para inscripciones sin paper (espejo de cmsRoleForRegistration en el servidor).
export type ParticipantRole = 'attendee' | 'company';

export const cmsRoleForRegistration = (record: {
  category: RegistrationCategory;
  studentType?: string;
}): ParticipantRole | null => {
  if (record.category === 'empresa-stand') return 'company';
  if (record.category === 'general' || record.category === 'cena-adicional') return 'attendee';
  if (record.category === 'estudiante' && record.studentType !== 'autor') return 'attendee';
  return null;
};

// Categorías que SIEMPRE requieren datos de paper. Para 'estudiante' depende de studentType === 'autor'.
export const ALWAYS_PAPER_CATEGORIES: RegistrationCategory[] = ['autor', 'paper-adicional'];

export const getClientPhase = (): RegistrationPhase => {
  const deadline = (import.meta as { env?: Record<string, string> }).env?.VITE_EARLY_BIRD_DEADLINE;
  if (!deadline) return 'early-bird';
  return new Date() <= new Date(deadline) ? 'early-bird' : 'regular';
};

export const formatUsd = (amount: number): string => `USD ${amount}`;
