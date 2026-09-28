import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

// Aviso para quien ya inició su inscripción: retomarla desde el CMS o pedir por
// correo el enlace y el acceso al CMS, en vez de llenar el formulario de nuevo.
export const ResumeBanner: React.FC = () => {
  const { content } = useLanguage();
  const r = content.sections.registration;
  const t = r.resumeBanner;
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleRecover = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidEmail) return;
    setState('sending');
    try {
      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recover', email: email.trim() }),
      });
      setState(response.ok ? 'sent' : 'error');
    } catch {
      setState('error');
    }
  };

  return (
    <div className="bg-[#F4A261]/10 border-2 border-[#F4A261] rounded-2xl p-5 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <p className="text-lg font-bold text-[#0D2C54]">{t.title}</p>
          <p className="text-sm text-gray-600 leading-relaxed">{t.desc}</p>
        </div>
        <a
          href="/cms"
          className="shrink-0 text-center bg-[#0D2C54] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#1A4B8A] transition-all shadow-lg"
        >
          {t.action}
        </a>
      </div>

      {state === 'sent' ? (
        <p className="text-sm font-semibold text-[#0D2C54] bg-white/70 rounded-xl px-4 py-3">{t.recoverSent}</p>
      ) : (
        <form onSubmit={handleRecover} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            className="flex-grow px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-[#2A9D8F] outline-none transition-all"
            placeholder={t.recoverLabel}
            aria-label={t.recoverLabel}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            type="submit"
            disabled={!isValidEmail || state === 'sending'}
            className="shrink-0 bg-[#2A9D8F] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#238C7E] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {state === 'sending' ? t.recoverSending : t.recoverButton}
          </button>
        </form>
      )}
      {state === 'error' && <p className="text-sm text-red-500 font-semibold">{r.messages.errorGeneric}</p>}
    </div>
  );
};
