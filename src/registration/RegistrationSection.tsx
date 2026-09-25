import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  REGISTRATION_CATEGORY_ORDER,
  REGISTRATION_PRICING,
  formatUsd,
} from '../../data/registration';
import { RegistrationCategory } from '../../types';
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
          {REGISTRATION_CATEGORY_ORDER.map((c) => (
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

const CompanyStandBanner: React.FC<{ onSelectStand: () => void }> = ({ onSelectStand }) => {
  const { content } = useLanguage();
  const banner = content.sections.registration.companyBanner;
  if (!banner) return null;

  return (
    <div className="bg-gradient-to-br from-[#0D2C54] via-[#1A4B8A] to-[#2A9D8F] rounded-3xl p-6 md:p-10 shadow-2xl border border-white/20 text-white relative overflow-hidden">
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-[#F4A261]/15 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 text-left">
        <div className="space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-[#F4A261] text-[#0D2C54] text-xs font-black uppercase px-3.5 py-1.5 rounded-full tracking-wider shadow">
            <span>{banner.badge}</span>
          </div>

          <h3 className="text-2xl md:text-3xl font-extrabold font-['Montserrat'] tracking-tight text-white">
            {banner.title}
          </h3>

          <p className="text-gray-200 text-sm md:text-base leading-relaxed">
            {banner.desc}
          </p>

          <div className="space-y-2 pt-2">
            <h4 className="text-xs uppercase tracking-wider text-[#F4A261] font-bold">
              {banner.includesTitle}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs md:text-sm text-gray-100">
              {banner.includesList.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-[#2A9D8F] bg-white rounded-full p-0.5 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-4 bg-white/10 backdrop-blur-md border border-white/15 p-6 rounded-2xl shrink-0 w-full lg:w-auto">
          <div className="text-center lg:text-right">
            <span className="text-xs uppercase text-gray-300 block font-medium">Inversión Stand</span>
            <span className="text-3xl md:text-4xl font-black text-[#F4A261] font-['Montserrat']">
              {banner.price}
            </span>
          </div>
          <button
            type="button"
            onClick={onSelectStand}
            className="w-full sm:w-auto bg-[#F4A261] hover:bg-[#E76F51] text-[#0D2C54] hover:text-white px-6 py-3.5 rounded-xl font-bold transition-all shadow-lg text-sm uppercase tracking-wider transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {banner.action}
          </button>
        </div>
      </div>
    </div>
  );
};

const RegistrationFlow: React.FC = () => {
  const { content } = useLanguage();
  const r = content.sections.registration;
  const { step, loadByToken } = useRegistration();
  const resumed = useRef(false);
  const [selectedCategory, setSelectedCategory] = useState<RegistrationCategory | undefined>(undefined);
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

  const handleSelectStand = () => {
    setSelectedCategory('empresa-stand');
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <div className="space-y-12">
      <p className="text-center text-base md:text-lg leading-relaxed text-gray-300 font-['Roboto'] max-w-3xl mx-auto">
        {r.intro}
      </p>

      {/* Banner destacado para empresas */}
      <CompanyStandBanner onSelectStand={handleSelectStand} />

      <div>
        <h3 className="text-xl font-bold text-white text-center mb-4">{r.feesTitle}</h3>
        <FeeTable />
        <p className="text-center text-sm text-gray-400 mt-3">{r.phaseNote}</p>
      </div>

      <div ref={formRef}>
        {step === 'form' ? (
          <RegistrationForm forcedCategory={selectedCategory} />
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
