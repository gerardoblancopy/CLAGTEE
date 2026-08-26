import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  REGISTRATION_CATEGORY_ORDER,
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
          {REGISTRATION_CATEGORY_ORDER.map((c) => (
            <tr key={c} className="border-b border-gray-100 last:border-0 align-top">
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
  const { content } = useLanguage();
  const r = content.sections.registration;
  const { step, loadByToken } = useRegistration();
  const resumed = useRef(false);

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
    <div className="space-y-10">
      <p className="text-center text-base md:text-lg leading-relaxed text-gray-300 font-['Roboto'] max-w-3xl mx-auto">
        {r.intro}
      </p>

      <div>
        <h3 className="text-xl font-bold text-white text-center mb-4">{r.feesTitle}</h3>
        <FeeTable />
        <p className="text-center text-sm text-gray-400 mt-3">{r.phaseNote}</p>
      </div>

      {step === 'form' ? <RegistrationForm /> : <PreRegistroSummary />}
    </div>
  );
};

export const RegistrationSection: React.FC = () => (
  <RegistrationProvider>
    <RegistrationFlow />
  </RegistrationProvider>
);
