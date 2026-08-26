import { Language, TranslationBundle } from '../../types';
import { contentES, uiES } from './es';
import { contentPT, uiPT } from './pt';
import { contentEN, uiEN } from './en';

export const translations: Record<Language, TranslationBundle> = {
  es: { content: contentES, ui: uiES },
  pt: { content: contentPT, ui: uiPT },
  en: { content: contentEN, ui: uiEN },
};
