// Detección aproximada de idioma (inglés / español / portugués) por palabras
// funcionales. IEEE exige título y abstract en inglés aunque el artículo esté
// en español o portugués; esto solo sirve para avisar, no para decidir.

export type TextLanguage = 'en' | 'es' | 'pt' | 'unknown';

const EN_WORDS = new Set([
  'the', 'of', 'and', 'to', 'in', 'for', 'with', 'on', 'is', 'are', 'this', 'that', 'by', 'from',
  'an', 'using', 'based', 'which', 'its', 'these', 'we', 'our', 'be', 'at', 'into', 'between',
  'through', 'was', 'were', 'has', 'have', 'it', 'or', 'not', 'can', 'than', 'their', 'results',
  'proposed', 'paper', 'study', 'analysis', 'approach', 'method', 'power', 'system', 'systems',
]);

const ES_WORDS = new Set([
  'el', 'la', 'los', 'las', 'del', 'y', 'en', 'con', 'una', 'al', 'es', 'su', 'sus', 'mediante',
  'este', 'esta', 'estos', 'estas', 'también', 'análisis', 'resultados', 'redes', 'sistemas',
  'eléctrica', 'eléctricas', 'generación', 'utilizando', 'presenta', 'propuesta', 'trabajo',
]);

const PT_WORDS = new Set([
  'o', 'os', 'do', 'da', 'dos', 'das', 'e', 'em', 'na', 'nas', 'nos', 'com', 'uma', 'um', 'ao',
  'à', 'pelo', 'pela', 'são', 'não', 'é', 'através', 'também', 'análise', 'resultados', 'redes',
  'sistemas', 'elétrica', 'elétricas', 'geração', 'utilizando', 'apresenta', 'proposta', 'trabalho',
]);

// Comunes a español y portugués (no ayudan a distinguir entre ellos)
const ROMANCE_WORDS = new Set(['de', 'que', 'para', 'por', 'se', 'como', 'sobre', 'entre']);

const ACCENTED = /[áéíóúâêôãõçñàü]/;

export function detectLanguage(text: string): TextLanguage {
  const words = String(text || '')
    .normalize('NFC')
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter(Boolean);

  let en = 0;
  let es = 0;
  let pt = 0;
  let romance = 0;
  for (const word of words) {
    const isEs = ES_WORDS.has(word);
    const isPt = PT_WORDS.has(word);
    if (EN_WORDS.has(word) && !isEs && !isPt) en += 1;
    if (isEs) es += 1;
    if (isPt) pt += 1;
    if (ROMANCE_WORDS.has(word) || (ACCENTED.test(word) && !isEs && !isPt)) romance += 1;
  }

  const other = Math.max(es, pt) + romance;
  if (en + other < 2) return 'unknown';
  if (other >= 2 && other > en) return pt > es ? 'pt' : 'es';
  return 'en';
}

export const looksNonEnglish = (text: string): boolean => {
  const language = detectLanguage(text);
  return language === 'es' || language === 'pt';
};

export const LANGUAGE_NAMES: Record<TextLanguage, string> = {
  en: 'inglés',
  es: 'español',
  pt: 'portugués',
  unknown: 'idioma no identificado',
};
