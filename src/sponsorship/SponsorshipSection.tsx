import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { RegistrationProvider, useRegistration } from '../registration/RegistrationContext';
import { RegistrationForm } from '../registration/RegistrationForm';
import { PreRegistroSummary } from '../registration/PreRegistroSummary';
import { CheckIcon, XIcon, ChevronRightIcon } from '../../components/icons';

type ActiveTab = 'overview' | 'stand' | 'inquiry';

// Componente para el flujo de inscripción directa de Stand
const StandRegistrationFlow: React.FC<{ onSwitchToInquiry: () => void }> = ({ onSwitchToInquiry }) => {
  const { content, language } = useLanguage();
  const s = content.sections.sponsorship;
  const { step } = useRegistration();

  return (
    <div className="space-y-6">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="bg-[#F4A261] text-[#0D2C54] text-xs font-black uppercase px-3 py-1 rounded-full tracking-wider">
            {s.standDetails.badge}
          </span>
          <h4 className="text-xl font-bold font-['Montserrat'] mt-2">{s.standDetails.title}</h4>
          <p className="text-gray-200 text-xs md:text-sm mt-1">{s.standDetails.desc}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xs uppercase text-gray-300 block font-medium">Inversión Stand</span>
          <span className="text-3xl font-black text-[#F4A261] font-['Montserrat']">{s.standDetails.price}</span>
        </div>
      </div>

      <div>
        {step === 'form' ? (
          <div className="space-y-4">
            <RegistrationForm forcedCategory="empresa-stand" hideCategorySelect={true} />
            <div className="text-center">
              <button
                type="button"
                onClick={onSwitchToInquiry}
                className="text-gray-300 hover:text-[#F4A261] text-xs underline transition-colors"
              >
                {language === 'es'
                  ? '¿Prefiere cotizar o consultar antes de inscribirse? Enviar formulario de pre-reserva'
                  : language === 'pt'
                  ? 'Prefere consultar antes de se inscrever? Enviar formulário de pré-reserva'
                  : 'Prefer to inquire or get a quote before registering? Submit pre-reservation form'}
              </button>
            </div>
          </div>
        ) : (
          <PreRegistroSummary />
        )}
      </div>
    </div>
  );
};

// Formulario de Pre-Reserva / Aceptación de Auspicios Corporativos (según Pág. 2 del PDF)
const SponsorshipInquiryForm: React.FC<{ initialTier?: string; onSwitchToStand: () => void }> = ({
  initialTier = 'oro',
  onSwitchToStand,
}) => {
  const { content } = useLanguage();
  const formStrings = content.sections.sponsorship.preReservation;

  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tier, setTier] = useState(initialTier);
  const [message, setMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing: string[] = [];
    if (!companyName.trim()) missing.push('companyName');
    if (!contactName.trim()) missing.push('contactName');
    if (!/.+@.+\..+/.test(email)) missing.push('email');
    if (!phone.trim()) missing.push('phone');

    if (missing.length > 0) {
      setMissingFields(missing);
      return;
    }
    setMissingFields([]);
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sponsorship-inquiry',
          companyName,
          contactName,
          email,
          phone,
          tier,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error('inquiry-failed');
      }

      setSubmitted(true);
    } catch {
      setError(formStrings.errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setCompanyName('');
    setContactName('');
    setEmail('');
    setPhone('');
    setMessage('');
    setError(null);
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12 text-center space-y-6">
        <div className="w-16 h-16 bg-[#2A9D8F]/10 text-[#2A9D8F] rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
          ✓
        </div>
        <div className="space-y-2 max-w-lg mx-auto">
          <h4 className="text-2xl font-extrabold text-[#0D2C54] font-['Montserrat']">
            {formStrings.successTitle}
          </h4>
          <p className="text-gray-600 text-sm md:text-base leading-relaxed">
            {formStrings.successMessage}
          </p>
        </div>
        <div className="pt-4 flex flex-wrap justify-center gap-4">
          <button
            type="button"
            onClick={handleReset}
            className="bg-[#0D2C54] hover:bg-[#1A4B8A] text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
          >
            {formStrings.sendAnother}
          </button>
        </div>
      </div>
    );
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none transition-all text-sm';
  const labelClass = 'block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2';

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-10 text-left space-y-6">
      <div className="border-b border-gray-100 pb-5">
        <span className="bg-[#F4A261] text-[#0D2C54] text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider">
          {formStrings.badge}
        </span>
        <h4 className="text-2xl font-extrabold text-[#0D2C54] font-['Montserrat'] mt-2">
          {formStrings.formTitle}
        </h4>
        <p className="text-gray-500 text-sm mt-1">{formStrings.formDesc}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className={labelClass}>
              {formStrings.companyLabel} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={formStrings.companyPlaceholder}
              className={`${inputClass} ${missingFields.includes('companyName') ? 'border-red-400 bg-red-50/40' : ''}`}
            />
          </div>

          <div>
            <label className={labelClass}>
              {formStrings.contactNameLabel} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder={formStrings.contactNamePlaceholder}
              className={`${inputClass} ${missingFields.includes('contactName') ? 'border-red-400 bg-red-50/40' : ''}`}
            />
          </div>

          <div>
            <label className={labelClass}>
              {formStrings.tierLabel} <span className="text-red-500">*</span>
            </label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className={inputClass}
            >
              {formStrings.tierOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              {formStrings.emailLabel} <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={formStrings.emailPlaceholder}
              className={`${inputClass} ${missingFields.includes('email') ? 'border-red-400 bg-red-50/40' : ''}`}
            />
          </div>

          <div>
            <label className={labelClass}>
              {formStrings.phoneLabel} <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={formStrings.phonePlaceholder}
              className={`${inputClass} ${missingFields.includes('phone') ? 'border-red-400 bg-red-50/40' : ''}`}
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>{formStrings.notesLabel}</label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={formStrings.notesPlaceholder}
              className={inputClass}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}
        {missingFields.length > 0 && (
          <p className="text-xs text-red-500 font-semibold">
            Por favor complete los campos marcados con asterisco (*).
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-[#F4A261] hover:bg-[#E76F51] text-[#0D2C54] hover:text-white px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md disabled:opacity-50"
          >
            {isSubmitting ? formStrings.submittingButton : formStrings.submitButton}
          </button>

          <button
            type="button"
            onClick={onSwitchToStand}
            className="text-xs text-[#2A9D8F] font-bold hover:underline"
          >
            ¿Desea registrar directamente el Stand de USD 800? Ir al formulario de Stand →
          </button>
        </div>
      </form>
    </div>
  );
};

export const SponsorshipSection: React.FC = () => {
  const { content, language } = useLanguage();
  const s = content.sections.sponsorship;

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedInquiryTier, setSelectedInquiryTier] = useState<string>('oro');
  const sectionRef = useRef<HTMLDivElement>(null);

  const handleSelectTierForInquiry = (tierId: string) => {
    setSelectedInquiryTier(tierId);
    setActiveTab('inquiry');
    setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleSelectStand = () => {
    setActiveTab('stand');
    setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const tierColors: Record<string, { border: string; bg: string; badge: string; text: string }> = {
    oro: {
      border: 'border-[#F59E0B]/50 hover:border-[#F59E0B]',
      bg: 'bg-gradient-to-b from-[#1c1917] via-[#0D2C54] to-[#0D2C54]',
      badge: 'bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black font-extrabold',
      text: 'text-[#F59E0B]',
    },
    plata: {
      border: 'border-gray-400/50 hover:border-gray-300',
      bg: 'bg-gradient-to-b from-[#1e293b] via-[#0D2C54] to-[#0D2C54]',
      badge: 'bg-gradient-to-r from-gray-200 to-gray-400 text-gray-900 font-extrabold',
      text: 'text-gray-200',
    },
    bronce: {
      border: 'border-[#CD7F32]/50 hover:border-[#CD7F32]',
      bg: 'bg-gradient-to-b from-[#291711] via-[#0D2C54] to-[#0D2C54]',
      badge: 'bg-gradient-to-r from-[#CD7F32] to-[#A0522D] text-white font-extrabold',
      text: 'text-[#F4A261]',
    },
  };

  return (
    <div ref={sectionRef} className="space-y-12">
      {/* Intro */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <p className="text-base md:text-lg leading-relaxed text-gray-200 font-['Roboto']">
          {s.intro}
        </p>
        <span className="inline-block text-xs font-semibold text-[#F4A261] bg-[#F4A261]/10 border border-[#F4A261]/30 px-3.5 py-1 rounded-full">
          {s.vatNote}
        </span>
      </div>

      {/* Selector de pestañas */}
      <div className="flex flex-wrap justify-center gap-2 p-1.5 bg-white/10 backdrop-blur-md rounded-2xl max-w-xl mx-auto border border-white/15">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
            activeTab === 'overview'
              ? 'bg-[#F4A261] text-[#0D2C54] shadow-md'
              : 'text-gray-300 hover:text-white hover:bg-white/5'
          }`}
        >
          {s.tabs.sponsorships}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('stand')}
          className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
            activeTab === 'stand'
              ? 'bg-[#F4A261] text-[#0D2C54] shadow-md'
              : 'text-gray-300 hover:text-white hover:bg-white/5'
          }`}
        >
          {s.tabs.standForm}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('inquiry')}
          className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
            activeTab === 'inquiry'
              ? 'bg-[#F4A261] text-[#0D2C54] shadow-md'
              : 'text-gray-300 hover:text-white hover:bg-white/5'
          }`}
        >
          {s.tabs.inquiryForm}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-16"
          >
            {/* Tarjetas de Modalidades ORO, PLATA, BRONCE */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
              {s.tiers.map((tier) => {
                const color = tierColors[tier.id] || tierColors.bronce;
                return (
                  <div
                    key={tier.id}
                    className={`rounded-3xl p-6 lg:p-8 flex flex-col justify-between border-2 transition-all duration-300 shadow-2xl relative overflow-hidden ${color.border} ${color.bg}`}
                  >
                    {tier.id === 'oro' && (
                      <div className="absolute top-0 right-0 bg-[#F59E0B] text-black text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-xl shadow">
                        Exclusivo
                      </div>
                    )}

                    <div className="space-y-4 text-left">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs uppercase px-3 py-1 rounded-full ${color.badge}`}>
                          {tier.badge || tier.name}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">{tier.slots}</span>
                      </div>

                      <div>
                        <h3 className={`text-3xl font-black font-['Montserrat'] ${color.text}`}>
                          {tier.name}
                        </h3>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-2xl lg:text-3xl font-extrabold text-white">
                            {tier.price}
                          </span>
                          <span className="text-xs text-gray-400">{tier.priceNote}</span>
                        </div>
                      </div>

                      <p className="text-gray-300 text-xs md:text-sm leading-relaxed min-h-[72px]">
                        {tier.description}
                      </p>

                      <div className="pt-3 border-t border-white/10 space-y-2 text-xs md:text-sm text-gray-200">
                        <div className="flex items-center gap-2">
                          <CheckIcon className="w-4 h-4 text-[#2A9D8F] shrink-0" />
                          <span>{tier.complimentaryRegistrations}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckIcon className="w-4 h-4 text-[#2A9D8F] shrink-0" />
                          <span>Espacio Stand: {tier.exhibitionSpace}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckIcon className="w-4 h-4 text-[#2A9D8F] shrink-0" />
                          <span>Publicidad: {tier.programAdvertising}</span>
                        </div>
                        {tier.technicalLecture && (
                          <div className="flex items-center gap-2">
                            <CheckIcon className="w-4 h-4 text-[#2A9D8F] shrink-0" />
                            <span>Conferencia técnica incluida</span>
                          </div>
                        )}
                        {tier.dinnerBanner && (
                          <div className="flex items-center gap-2">
                            <CheckIcon className="w-4 h-4 text-[#2A9D8F] shrink-0" />
                            <span>Banner en Cena de Gala</span>
                          </div>
                        )}
                        {tier.dinnerSpeech && (
                          <div className="flex items-center gap-2">
                            <CheckIcon className="w-4 h-4 text-[#2A9D8F] shrink-0" />
                            <span>Discurso en Cena de Gala</span>
                          </div>
                        )}
                        {tier.merchandisingLogo && (
                          <div className="flex items-center gap-2">
                            <CheckIcon className="w-4 h-4 text-[#2A9D8F] shrink-0" />
                            <span>Logo en Merchandising</span>
                          </div>
                        )}
                        {tier.pressMention && (
                          <div className="flex items-center gap-2">
                            <CheckIcon className="w-4 h-4 text-[#2A9D8F] shrink-0" />
                            <span>Mención en Prensa</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => handleSelectTierForInquiry(tier.id)}
                        className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 ${
                          tier.id === 'oro'
                            ? 'bg-[#F59E0B] hover:bg-[#D97706] text-black font-extrabold'
                            : 'bg-white/15 hover:bg-white text-white hover:text-[#0D2C54]'
                        }`}
                      >
                        <span>Solicitar Auspicio {tier.name}</span>
                        <ChevronRightIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Banner Destacado del STAND */}
            <div className="bg-gradient-to-r from-[#1A4B8A] via-[#0D2C54] to-[#2A9D8F] rounded-3xl p-6 md:p-10 shadow-2xl border border-white/20 text-white flex flex-col lg:flex-row items-center justify-between gap-8 text-left relative overflow-hidden">
              <div className="space-y-4 max-w-2xl">
                <div className="inline-flex items-center gap-2 bg-[#F4A261] text-[#0D2C54] text-xs font-black uppercase px-3.5 py-1.5 rounded-full tracking-wider shadow">
                  <span>{s.standDetails.badge}</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-extrabold font-['Montserrat'] tracking-tight text-white">
                  {s.standDetails.title}
                </h3>
                <p className="text-gray-200 text-sm md:text-base leading-relaxed">
                  {s.standDetails.desc}
                </p>
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs uppercase tracking-wider text-[#F4A261] font-bold">
                    {s.standDetails.includesTitle}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs md:text-sm text-gray-100">
                    {s.standDetails.includesList.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <svg
                          className="w-4 h-4 text-[#2A9D8F] bg-white rounded-full p-0.5 shrink-0 mt-0.5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
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
                    {s.standDetails.price}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSelectStand}
                  className="w-full sm:w-auto bg-[#F4A261] hover:bg-[#E76F51] text-[#0D2C54] hover:text-white px-7 py-3.5 rounded-xl font-bold transition-all shadow-lg text-xs md:text-sm uppercase tracking-wider transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {s.standDetails.action}
                </button>
              </div>
            </div>

            {/* Matriz Comparativa Completa (Página 1 del PDF) */}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-white text-center font-['Montserrat']">
                {s.tableTitle}
              </h3>
              <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-[#0D2C54] text-white">
                      <th className="px-5 py-4 font-semibold w-1/4">{s.tableHeaders.feature}</th>
                      <th className="px-5 py-4 font-bold text-center bg-[#F59E0B]/20 text-[#F59E0B] w-1/4">
                        {s.tableHeaders.oro}
                      </th>
                      <th className="px-5 py-4 font-bold text-center bg-gray-600/20 text-gray-200 w-1/4">
                        {s.tableHeaders.plata}
                      </th>
                      <th className="px-5 py-4 font-bold text-center bg-[#CD7F32]/20 text-[#F4A261] w-1/4">
                        {s.tableHeaders.bronce}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.tableRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-gray-100 last:border-0 align-middle hover:bg-gray-50/70 transition-colors"
                      >
                        <td className="px-5 py-3.5 font-bold text-[#0D2C54] text-xs md:text-sm">
                          {row.label}
                        </td>
                        <td className="px-5 py-3.5 text-center text-gray-700 text-xs md:text-sm font-medium">
                          {row.isBoolean ? (
                            row.oro === 'true' ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 bg-green-100 text-green-700 rounded-full font-bold">
                                ✓
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-7 h-7 bg-red-100 text-red-500 rounded-full font-bold">
                                ✗
                              </span>
                            )
                          ) : (
                            row.oro
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center text-gray-700 text-xs md:text-sm font-medium">
                          {row.isBoolean ? (
                            row.plata === 'true' ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 bg-green-100 text-green-700 rounded-full font-bold">
                                ✓
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-7 h-7 bg-red-100 text-red-500 rounded-full font-bold">
                                ✗
                              </span>
                            )
                          ) : (
                            row.plata
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center text-gray-700 text-xs md:text-sm font-medium">
                          {row.isBoolean ? (
                            row.bronce === 'true' ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 bg-green-100 text-green-700 rounded-full font-bold">
                                ✓
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-7 h-7 bg-red-100 text-red-500 rounded-full font-bold">
                                ✗
                              </span>
                            )
                          ) : (
                            row.bronce
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-center text-xs text-gray-400">{s.vatNote}</p>
            </div>

            {/* Términos de Acuerdo y Cancelación (Página 2 del PDF) */}
            <div className="space-y-6">
              <h3 className="text-xl md:text-2xl font-bold text-white text-center font-['Montserrat']">
                {s.termsTitle}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                {s.terms.map((term) => (
                  <div
                    key={term.number}
                    className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-6 text-white space-y-2 hover:border-[#F4A261]/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-[#F4A261] text-[#0D2C54] font-black text-sm flex items-center justify-center shrink-0">
                        {term.number}
                      </span>
                      <h4 className="text-base font-bold text-[#F4A261] font-['Montserrat']">
                        {term.title}
                      </h4>
                    </div>
                    <p className="text-gray-200 text-xs md:text-sm leading-relaxed pl-11">
                      {term.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Llamado a Formulario de Pre-Reserva y Canales de Contacto */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <div className="bg-gradient-to-br from-[#0D2C54] to-[#1A4B8A] rounded-3xl p-6 md:p-8 border border-white/20 text-white flex flex-col justify-between text-left space-y-4 shadow-xl">
                <div className="space-y-2">
                  <span className="bg-[#F4A261] text-[#0D2C54] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                    {s.preReservation.badge}
                  </span>
                  <h4 className="text-xl font-bold font-['Montserrat']">{s.preReservation.title}</h4>
                  <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                    {s.preReservation.desc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('inquiry')}
                  className="bg-[#F4A261] hover:bg-[#E76F51] text-[#0D2C54] hover:text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md self-start"
                >
                  {s.preReservation.action} &rarr;
                </button>
              </div>

              <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 text-left space-y-4 shadow-xl">
                <h4 className="text-lg font-bold text-[#0D2C54] font-['Montserrat']">
                  {s.contact.title}
                </h4>
                <p className="text-gray-600 text-xs md:text-sm">{s.contact.intro}</p>
                <div className="space-y-2 text-xs md:text-sm text-gray-800">
                  <p className="flex items-center gap-2">
                    <span className="font-bold text-[#0D2C54]">{s.contact.webLabel}:</span>
                    <a
                      href={`https://${s.contact.webValue}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#2A9D8F] font-semibold hover:underline"
                    >
                      {s.contact.webValue}
                    </a>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="font-bold text-[#0D2C54]">{s.contact.emailLabel}:</span>
                    <a
                      href={`mailto:${s.contact.emailValue}`}
                      className="text-[#2A9D8F] font-semibold hover:underline"
                    >
                      {s.contact.emailValue}
                    </a>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="font-bold text-[#0D2C54]">{s.contact.phoneLabel}:</span>
                    <a
                      href={`tel:${s.contact.phoneValue.replace(/\s+/g, '')}`}
                      className="text-gray-700 hover:text-[#0D2C54]"
                    >
                      {s.contact.phoneValue}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'stand' && (
          <motion.div
            key="stand"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            <RegistrationProvider>
              <StandRegistrationFlow onSwitchToInquiry={() => setActiveTab('inquiry')} />
            </RegistrationProvider>
          </motion.div>
        )}

        {activeTab === 'inquiry' && (
          <motion.div
            key="inquiry"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            <SponsorshipInquiryForm
              initialTier={selectedInquiryTier}
              onSwitchToStand={() => setActiveTab('stand')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
