import React from 'react';
import { Language } from '../types';

interface LanguageSelectorProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  variant?: 'desktop' | 'mobile';
}

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'es', label: 'ES' },
  { code: 'pt', label: 'PT' },
  { code: 'en', label: 'EN' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  language,
  onLanguageChange,
  variant = 'desktop',
}) => {
  if (variant === 'mobile') {
    return (
      <div className="flex items-center gap-2">
        {LANGUAGES.map(({ code, label }) => (
          <button
            key={code}
            onClick={() => onLanguageChange(code)}
            className={`
              px-4 py-2 rounded-full font-['Montserrat'] font-bold text-sm tracking-wide transition-all duration-200
              ${language === code
                ? 'bg-[#F4A261] text-[#0D2C54]'
                : 'bg-gray-100 text-[#0D2C54] hover:bg-gray-200'
              }
            `}
            aria-label={label}
            aria-current={language === code ? 'true' : undefined}
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center bg-white/10 rounded-full p-0.5">
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => onLanguageChange(code)}
          className={`
            px-2.5 py-1 rounded-full font-['Montserrat'] font-bold text-[10px] xl:text-[11px] tracking-wide transition-all duration-200
            ${language === code
              ? 'bg-[#F4A261] text-[#0D2C54]'
              : 'text-white/80 hover:text-white hover:bg-white/10'
            }
          `}
          aria-label={label}
          aria-current={language === code ? 'true' : undefined}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
