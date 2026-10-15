import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { IeeeFinalVersionContent } from '../types';

interface IeeeFinalVersionSectionProps {
  content: IeeeFinalVersionContent;
  onNavigateCMS?: () => void;
  onDownloadTemplate?: (href: string) => void;
  downloadingTemplate?: string | null;
}

export const IeeeFinalVersionSection: React.FC<IeeeFinalVersionSectionProps> = ({
  content,
  onNavigateCMS,
  onDownloadTemplate,
  downloadingTemplate,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedConfId, setCopiedConfId] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(content.step2.copyrightNotice.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopyConfId = async () => {
    try {
      await navigator.clipboard.writeText(content.step3.conferenceId);
      setCopiedConfId(true);
      setTimeout(() => setCopiedConfId(false), 2500);
    } catch {
      // Fallback
    }
  };

  const scrollToRegistration = () => {
    const el = document.getElementById('inscripcion');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="version-final-ieee" className="w-full py-16 md:py-24 bg-gradient-to-b from-white via-slate-50 to-gray-100 scroll-mt-20">
      {/* Anchor for backward compatibility with #envio */}
      <span id="envio" className="scroll-mt-24 block -mt-24 pt-24 invisible" />

      <div className="container mx-auto px-4 sm:px-6 md:px-8 max-w-5xl">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00629B]/10 text-[#00629B] text-xs md:text-sm font-bold uppercase tracking-wider mb-4 border border-[#00629B]/20">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            {content.presentation.badge}
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#0D2C54] tracking-tight mb-4 font-['Outfit',sans-serif]">
            {content.title}
          </h2>
          {content.subtitle && (
            <p className="text-base md:text-lg text-gray-600 max-w-3xl mx-auto font-['Roboto'] leading-relaxed">
              {content.subtitle}
            </p>
          )}
        </div>

        {/* Presentation & Alerts */}
        <div className="space-y-6 mb-12">
          {/* Main intro & IEEE notice */}
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
            <div className="space-y-3 text-gray-700 font-['Roboto'] text-base md:text-lg leading-relaxed mb-6">
              {content.presentation.intro.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            {/* IEEE Technical Co-Sponsorship Callout */}
            <div className="border-l-4 border-[#00629B] bg-[#F0F7FC] rounded-r-xl p-5 mb-5 flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#00629B]/15 text-[#00629B] flex items-center justify-center font-bold text-sm">
                IEEE
              </div>
              <p className="text-sm md:text-base text-slate-800 leading-relaxed font-['Roboto']">
                {content.presentation.ieeeNotice}
              </p>
            </div>

            {/* Deadline Warning Badge */}
            <div className="border border-amber-300 bg-amber-50 rounded-xl p-4 md:p-5 flex items-start gap-3 text-amber-900">
              <svg className="w-6 h-6 flex-shrink-0 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="font-medium text-sm md:text-base leading-relaxed">
                {content.presentation.deadlineNotice}
              </div>
            </div>
          </div>

          {/* Quick Steps Roadmap / Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {content.presentation.stepsOverview.map((stepText, idx) => {
              const stepNumber = idx + 1;
              return (
                <a
                  key={idx}
                  href={`#ieee-paso-${stepNumber}`}
                  className="flex items-start gap-3 p-4 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-all hover:border-[#2A9D8F] hover:shadow-sm group text-left"
                >
                  <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#0D2C54] group-hover:bg-[#2A9D8F] text-white flex items-center justify-center font-bold text-xs transition-colors">
                    {stepNumber}
                  </span>
                  <span className="text-xs md:text-sm font-semibold text-slate-700 group-hover:text-[#0D2C54] transition-colors leading-snug">
                    {stepText.replace(/^Paso \d+: /i, '').replace(/^Step \d+: /i, '').replace(/^Passo \d+: /i, '')}
                  </span>
                </a>
              );
            })}
          </div>

          {content.presentationTemplate && (
            <a
              href="#plantillas-presentacion"
              className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 rounded-xl border border-amber-300 hover:border-[#D9381E] hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#D9381E] text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 block">
                    {content.presentationTemplate.sectionTitle}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-[#D9381E] transition-colors">
                    {content.presentationTemplate.title} (Descargar .POTX)
                  </span>
                </div>
              </div>
              <span className="text-amber-900 font-bold text-xs uppercase tracking-wider hidden sm:flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Ver plantilla &rarr;
              </span>
            </a>
          )}
        </div>

        {/* 6 Steps Details */}
        <div className="space-y-10">

          {/* STEP 1 */}
          <div id="ieee-paso-1" className="scroll-mt-24 bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-lg bg-[#0D2C54] text-white font-bold text-xs uppercase tracking-wider">
                {content.step1.number}
              </span>
              <h3 className="text-xl md:text-2xl font-bold text-[#0D2C54]">
                {content.step1.title}
              </h3>
            </div>
            <div className="space-y-3 text-gray-700 font-['Roboto'] text-base leading-relaxed mb-6">
              {content.step1.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onNavigateCMS}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2A9D8F] hover:bg-[#21867a] text-white font-bold text-sm transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Acceder a Consola de Autor (CMS)
              </button>
            </div>
          </div>

          {/* STEP 2 */}
          <div id="ieee-paso-2" className="scroll-mt-24 bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-lg bg-[#0D2C54] text-white font-bold text-xs uppercase tracking-wider">
                {content.step2.number}
              </span>
              <h3 className="text-xl md:text-2xl font-bold text-[#0D2C54]">
                {content.step2.title}
              </h3>
            </div>
            <p className="text-base text-gray-700 font-['Roboto'] leading-relaxed mb-4">
              {content.step2.intro}
            </p>

            {/* Templates box */}
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-5 mb-8">
              <p className="text-sm md:text-base text-slate-700 font-['Roboto'] mb-4">
                {content.step2.templatePrompt}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={content.step2.templateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#00629B] hover:bg-[#004e7c] text-white font-semibold text-sm transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {content.step2.templateLinkText}
                </a>

                {onDownloadTemplate && (
                  <>
                    <button
                      onClick={() => onDownloadTemplate('Templates/CLAGTEE2026_IEEE_WORD_conference_template_a4.docx')}
                      disabled={downloadingTemplate === 'Templates/CLAGTEE2026_IEEE_WORD_conference_template_a4.docx'}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-300 hover:border-[#0D2C54] text-slate-700 font-medium text-sm transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Word Template (.DOCX)
                    </button>
                    <button
                      onClick={() => onDownloadTemplate('Templates/CLAGTEE2026_IEEE-LATEX_conference_template_a4.zip')}
                      disabled={downloadingTemplate === 'Templates/CLAGTEE2026_IEEE-LATEX_conference_template_a4.zip'}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-300 hover:border-[#0D2C54] text-slate-700 font-medium text-sm transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      LaTeX Template (.ZIP)
                    </button>
                  </>
                )}

                <a
                  href="/CLAGTEE2026_Plantilla_v2.potx"
                  download="CLAGTEE2026_Plantilla_v2.potx"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-amber-300 hover:border-[#D9381E] text-amber-900 font-semibold text-sm transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4 text-[#D9381E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Plantilla Presentación (.POTX)
                </a>
              </div>
            </div>

            {/* Formatting checklist grid */}
            <h4 className="text-base font-bold text-[#0D2C54] uppercase tracking-wider mb-3">
              Normas de Estilo y Formato Obligatorias
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
              {content.step2.formattingRules.map((rule, idx) => (
                <div key={idx} className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <svg className="w-5 h-5 text-[#2A9D8F] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs md:text-sm text-slate-700 font-['Roboto'] leading-relaxed">
                    {rule}
                  </span>
                </div>
              ))}
            </div>

            {/* Copyright code box */}
            <div className="border border-indigo-200 bg-indigo-50/50 rounded-xl p-5 mb-8">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h4 className="text-sm md:text-base font-bold text-[#0D2C54] flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#00629B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {content.step2.copyrightNotice.title}
                </h4>
                <button
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
                >
                  {copiedCode ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-emerald-700">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copiar código LaTeX
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs md:text-sm text-slate-700 mb-3 font-['Roboto'] leading-relaxed">
                {content.step2.copyrightNotice.description}
              </p>
              <pre className="p-3.5 bg-slate-900 text-emerald-400 rounded-lg text-xs md:text-sm font-mono overflow-x-auto leading-relaxed border border-slate-800">
                <code>{content.step2.copyrightNotice.code}</code>
              </pre>
              <p className="text-xs text-slate-600 mt-2 font-['Roboto'] italic">
                {content.step2.copyrightNotice.placementNote}
              </p>
            </div>

            {/* Language rules card */}
            <div className="border border-sky-200 bg-sky-50/60 rounded-xl p-5">
              <h4 className="text-sm md:text-base font-bold text-[#0D2C54] mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                {content.step2.languageRules.title}
              </h4>
              <p className="text-xs md:text-sm text-slate-800 mb-3 font-['Roboto'] leading-relaxed font-medium">
                {content.step2.languageRules.body}
              </p>
              <ul className="space-y-1.5 pl-2 text-xs md:text-sm text-slate-700 font-['Roboto']">
                {content.step2.languageRules.details.map((detail, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-sky-600 font-bold">•</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* STEP 3 */}
          <div id="ieee-paso-3" className="scroll-mt-24 bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-lg bg-[#00629B] text-white font-bold text-xs uppercase tracking-wider">
                {content.step3.number}
              </span>
              <h3 className="text-xl md:text-2xl font-bold text-[#0D2C54]">
                {content.step3.title}
              </h3>
            </div>
            <p className="text-base text-gray-700 font-['Roboto'] leading-relaxed mb-6">
              {content.step3.description}
            </p>

            {/* Conference ID badge banner */}
            <div className="bg-gradient-to-r from-[#00629B] to-[#0D2C54] rounded-2xl p-6 text-white mb-8 shadow-md">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-sky-200 mb-1">
                    IEEE PDF eXpress — Conference ID
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl md:text-4xl font-extrabold tracking-wider font-mono">
                      {content.step3.conferenceId}
                    </span>
                    <button
                      onClick={handleCopyConfId}
                      className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      {copiedConfId ? (
                        <>
                          <svg className="w-3.5 h-3.5 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Copiar ID</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <a
                  href={content.step3.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto text-center px-5 py-3 rounded-xl bg-white text-[#00629B] hover:bg-sky-50 font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <span>Abrir Portal PDF eXpress</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Two paths: Has account vs Create account */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Existing user */}
              <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-[#0D2C54] text-base mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {content.step3.hasAccountTitle}
                  </h4>
                  <p className="text-xs md:text-sm text-slate-700 font-['Roboto'] leading-relaxed">
                    {content.step3.hasAccountText}
                  </p>
                </div>
              </div>

              {/* New user */}
              <div className="border border-slate-200 rounded-xl p-5 bg-slate-50">
                <h4 className="font-bold text-[#0D2C54] text-base mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  {content.step3.createAccountTitle}
                </h4>
                <ol className="space-y-1.5 pl-4 list-decimal text-xs md:text-sm text-slate-700 font-['Roboto']">
                  {content.step3.createAccountSteps.map((step, idx) => (
                    <li key={idx} className="leading-snug">{step}</li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Dashboard procedure */}
            <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-5">
              <h4 className="font-bold text-[#0D2C54] text-base mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                {content.step3.dashboardTitle}
              </h4>
              <ul className="space-y-2 text-xs md:text-sm text-slate-700 font-['Roboto']">
                {content.step3.dashboardSteps.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-bold text-emerald-700">{idx + 1}.</span>
                    <span className="leading-relaxed">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* STEP 4 */}
          <div id="ieee-paso-4" className="scroll-mt-24 bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-lg bg-[#0D2C54] text-white font-bold text-xs uppercase tracking-wider">
                {content.step4.number}
              </span>
              <h3 className="text-xl md:text-2xl font-bold text-[#0D2C54]">
                {content.step4.title}
              </h3>
            </div>
            <p className="text-base text-gray-700 font-['Roboto'] leading-relaxed mb-6">
              {content.step4.description}
            </p>

            <div className="border border-slate-200 bg-slate-50 rounded-xl p-5 mb-6">
              <ol className="space-y-3 text-xs md:text-sm text-slate-700 font-['Roboto']">
                {content.step4.instructions.map((inst, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#0D2C54] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{inst}</span>
                  </li>
                ))}
              </ol>
            </div>

            <button
              onClick={onNavigateCMS}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00629B] hover:bg-[#004e7c] text-white font-bold text-sm transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {content.step4.cmsCtaText}
            </button>
          </div>

          {/* STEP 5 */}
          <div id="ieee-paso-5" className="scroll-mt-24 bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-lg bg-[#2A9D8F] text-white font-bold text-xs uppercase tracking-wider">
                {content.step5.number}
              </span>
              <h3 className="text-xl md:text-2xl font-bold text-[#0D2C54]">
                {content.step5.title}
              </h3>
            </div>

            <h4 className="text-sm md:text-base font-bold text-[#0D2C54] mb-3">
              {content.step5.checklistTitle}
            </h4>
            <div className="space-y-2 mb-6">
              {content.step5.checklist.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="w-5 h-5 rounded border-2 border-emerald-500 bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-xs md:text-sm text-slate-700 font-['Roboto'] leading-relaxed">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-base text-gray-700 font-['Roboto'] leading-relaxed mb-6">
              {content.step5.cmsInstructions}
            </p>

            {/* Warning regarding attendance */}
            <div className="border border-red-200 bg-red-50/70 rounded-xl p-4 md:p-5 mb-6 flex items-start gap-3 text-red-900">
              <svg className="w-6 h-6 flex-shrink-0 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="font-semibold text-xs md:text-sm leading-relaxed">
                {content.step5.presentationWarning}
              </div>
            </div>

            <button
              onClick={onNavigateCMS}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2A9D8F] hover:bg-[#21867a] text-white font-extrabold text-sm md:text-base transition-colors shadow-md"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {content.step5.cmsButtonText}
            </button>
          </div>

          {/* STEP 6 */}
          <div id="ieee-paso-6" className="scroll-mt-24 bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-lg bg-[#0D2C54] text-white font-bold text-xs uppercase tracking-wider">
                {content.step6.number}
              </span>
              <h3 className="text-xl md:text-2xl font-bold text-[#0D2C54]">
                {content.step6.title}
              </h3>
            </div>
            <p className="text-base text-gray-700 font-['Roboto'] leading-relaxed mb-4">
              {content.step6.description}
            </p>
            <p className="text-sm md:text-base text-gray-600 font-['Roboto'] leading-relaxed mb-6">
              {content.step6.registrationNotice}{' '}
              <a
                href={`mailto:${content.step6.supportEmail}`}
                className="font-semibold text-[#00629B] hover:underline"
              >
                {content.step6.supportEmail}
              </a>
            </p>

            <button
              onClick={scrollToRegistration}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0D2C54] hover:bg-[#1a3d6b] text-white font-extrabold text-sm md:text-base transition-colors shadow-md"
            >
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {content.step6.registerButtonText}
            </button>
          </div>

          {/* APARTADO DE PLANTILLAS PARA LA PRESENTACION */}
          {content.presentationTemplate && (
            <div
              id="plantillas-presentacion"
              className="scroll-mt-24 bg-gradient-to-br from-white via-[#FFFBF5] to-[#FFF5EB] rounded-2xl p-6 md:p-8 shadow-sm border-2 border-amber-300 relative overflow-hidden"
            >
              {/* Decorative background watermark */}
              <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-[0.04] pointer-events-none select-none">
                <svg className="w-80 h-80 text-[#D9381E]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 3h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2zm0 2v10h16V5H4zm3 14h10v2H7v-2z" />
                </svg>
              </div>

              <div className="relative z-10">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="px-3 py-1 rounded-lg bg-[#D9381E] text-white font-bold text-xs uppercase tracking-wider shadow-sm">
                    {content.presentationTemplate.badge}
                  </span>
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    {content.presentationTemplate.sectionTitle}
                  </span>
                </div>

                <h3 className="text-2xl md:text-3xl font-extrabold text-[#0D2C54] mb-3">
                  {content.presentationTemplate.title}
                </h3>

                <p className="text-base text-gray-700 font-['Roboto'] leading-relaxed mb-6 max-w-3xl">
                  {content.presentationTemplate.description}
                </p>

                {/* Guidelines grid */}
                <h4 className="text-sm md:text-base font-bold text-[#0D2C54] uppercase tracking-wider mb-3">
                  {content.presentationTemplate.guidelinesTitle}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                  {content.presentationTemplate.guidelines.map((guide, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-white/85 backdrop-blur-sm border border-amber-200 shadow-sm"
                    >
                      <h5 className="font-bold text-[#0D2C54] text-sm mb-1 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#D9381E] shrink-0" />
                        {guide.title}
                      </h5>
                      <p className="text-xs md:text-sm text-slate-600 font-['Roboto'] leading-relaxed">
                        {guide.description}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Big Download Box */}
                <div className="bg-white rounded-2xl p-6 border-2 border-amber-300 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#D9381E]/10 border border-[#D9381E]/20 flex items-center justify-center shrink-0">
                      <svg className="w-8 h-8 text-[#D9381E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="font-bold text-[#0D2C54] text-base md:text-lg">
                        {content.presentationTemplate.downloadTitle}
                      </h5>
                      <p className="text-xs md:text-sm text-gray-500 font-['Roboto']">
                        {content.presentationTemplate.downloadSubtitle}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-amber-950 font-medium">
                        <span className="font-mono bg-amber-100 px-2 py-0.5 rounded font-bold">
                          {content.presentationTemplate.fileName}
                        </span>
                        <span>•</span>
                        <span>{content.presentationTemplate.fileSize}</span>
                        <span>•</span>
                        <span>Microsoft PowerPoint (.POTX)</span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={`/${content.presentationTemplate.fileName}`}
                    download={content.presentationTemplate.fileName}
                    className="inline-flex items-center justify-center gap-3 w-full md:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#D9381E] to-[#E76F51] hover:from-[#c22e16] hover:to-[#d65f42] text-white font-extrabold text-sm md:text-base transition-all shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] shrink-0"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>{content.presentationTemplate.downloadButtonText}</span>
                  </a>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
};
