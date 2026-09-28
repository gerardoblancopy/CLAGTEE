import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  CONFERENCE_REGISTRATION_CATEGORIES,
  REGISTRATION_PRICING,
  formatUsd,
} from '../../data/registration';
import { RegistrationProvider, useRegistration } from './RegistrationContext';
import { RegistrationForm } from './RegistrationForm';
import { PreRegistroSummary } from './PreRegistroSummary';

const FeeTable: React.FC = () => {
  const { content } = useLanguage();
  const r = content.sections.registration;
  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-[#0D2C54] text-white">
            <th className="px-4 py-3 font-semibold">{r.categoryColumn}</th>
            <th className="px-4 py-3 font-semibold text-center">{r.earlyBirdLabel}</th>
            <th className="px-4 py-3 font-semibold text-center">{r.regularLabel}</th>
            <th className="px-4 py-3 font-semibold">{r.includesColumn}</th>
          </tr>
        </thead>
        <tbody>
          {CONFERENCE_REGISTRATION_CATEGORIES.map((c) => (
            <tr key={c} className="border-b border-gray-100 last:border-0 align-top hover:bg-gray-50/60 transition-colors">
              <td className="px-4 py-3 font-bold text-[#0D2C54]">{r.categories[c].name}</td>
              <td className="px-4 py-3 text-center">{formatUsd(REGISTRATION_PRICING[c].earlyBird)}</td>
              <td className="px-4 py-3 text-center">{formatUsd(REGISTRATION_PRICING[c].regular)}</td>
              <td className="px-4 py-3 text-gray-600">
                {r.categories[c].includes}
                {r.categories[c].note && (
                  <span className="block text-[#E76F51] font-semibold mt-1">{r.categories[c].note}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const RegistrationFlow: React.FC = () => {
  const { content, language } = useLanguage();
  const r = content.sections.registration;
  const { step, loadByToken } = useRegistration();
  const resumed = useRef(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resumed.current) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('reg');
    const token = params.get('token');
    if (id && token) {
      resumed.current = true;
      void loadByToken(id, token);
    }
  }, [loadByToken]);

  return (
    <div className="space-y-12">
      <p className="text-center text-base md:text-lg leading-relaxed text-gray-300 font-['Roboto'] max-w-3xl mx-auto">
        {r.intro}
      </p>

      {/* Enlace destacado hacia la nueva división de Patrocinio y Stands */}
      <div className="bg-gradient-to-r from-white/10 via-[#2A9D8F]/20 to-white/10 border border-white/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-5 text-left shadow-lg">
        <div className="space-y-1">
          <span className="inline-block bg-[#F4A261] text-[#0D2C54] text-[11px] font-black uppercase px-3 py-1 rounded-full tracking-wider">
            {language === 'es' ? 'Empresas & Organizaciones' : language === 'pt' ? 'Empresas & Organizações' : 'Companies & Organizations'}
          </span>
          <h4 className="text-lg font-bold text-white font-['Montserrat']">
            {language === 'es'
              ? '¿Desea participar con un Stand o como Auspiciador Corporativo?'
              : language === 'pt'
              ? 'Deseja participar com um Estande ou como Patrocinador Corporativo?'
              : 'Looking to participate with an Exhibition Stand or Corporate Sponsorship?'}
          </h4>
          <p className="text-gray-300 text-xs md:text-sm max-w-2xl leading-relaxed">
            {language === 'es'
              ? 'Conozca las modalidades de patrocinio corporativo (Oro, Plata, Bronce) y el formulario oficial de reserva para Stand de empresas en la nueva sección de patrocinio.'
              : language === 'pt'
              ? 'Conheça as modalidades de patrocínio corporativo (Ouro, Prata, Bronze) e o formulário oficial de reserva de estande na nova seção de patrocínio.'
              : 'Explore our corporate sponsorship tiers (Gold, Silver, Bronze) and the official company stand reservation form in our new sponsorship section.'}
          </p>
        </div>
        <a
          href="#patrocinio"
          className="shrink-0 bg-[#F4A261] hover:bg-[#E76F51] text-[#0D2C54] hover:text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md transform hover:scale-[1.02] whitespace-nowrap"
        >
          {language === 'es' ? 'Ver Patrocinio y Stands →' : language === 'pt' ? 'Ver Patrocínio e Estandes →' : 'View Sponsorship & Stands →'}
        </a>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white text-center mb-4">{r.feesTitle}</h3>
        <FeeTable />
        <p className="text-center text-sm text-gray-400 mt-3">{r.phaseNote}</p>
      </div>

      <div ref={formRef}>
        {step === 'form' ? (
          <RegistrationForm allowedCategories={CONFERENCE_REGISTRATION_CATEGORIES} />
        ) : (
          <PreRegistroSummary />
        )}
      </div>
    </div>
  );
};

export const RegistrationSection: React.FC = () => (
  <RegistrationProvider>
    <RegistrationFlow />
  </RegistrationProvider>
);
