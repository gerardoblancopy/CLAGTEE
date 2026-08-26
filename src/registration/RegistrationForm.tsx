import React, { useMemo, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  PaperCoverage,
  RegistrationCategory,
  RegistrationInput,
  StudentLevel,
  StudentType,
} from '../../types';
import { REGISTRATION_CATEGORY_ORDER, REGISTRATION_PRICING, formatUsd, getClientPhase } from '../../data/registration';
import { useRegistration } from './RegistrationContext';

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none transition-all';
const labelClass = 'block text-sm font-bold text-gray-700 mb-2';

const emptyForm = (category: RegistrationCategory): RegistrationInput => ({
  category,
  firstName: '',
  lastName: '',
  email: '',
  country: '',
  affiliation: '',
  dietary: '',
  couponCode: '',
});

const needsPaper = (category: RegistrationCategory, studentType?: StudentType) =>
  category === 'autor' ||
  category === 'paper-adicional' ||
  (category === 'estudiante' && studentType === 'autor');

export const RegistrationForm: React.FC = () => {
  const { content } = useLanguage();
  const r = content.sections.registration;
  const { createRegistration, uploadFile, isSubmitting, error } = useRegistration();

  const [form, setForm] = useState<RegistrationInput>(() => emptyForm('autor'));
  const [proofName, setProofName] = useState('');
  const [proofLoading, setProofLoading] = useState(false);
  const [proofError, setProofError] = useState(false);
  const [showRequired, setShowRequired] = useState(false);

  const phase = useMemo(getClientPhase, []);
  const set = <K extends keyof RegistrationInput>(key: K, value: RegistrationInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const category = form.category;
  const showPaper = needsPaper(category, form.studentType);

  const handleCategory = (next: RegistrationCategory) => {
    // Reset category-specific fields to avoid stale data leaking across types.
    setForm({ ...emptyForm(next), firstName: form.firstName, lastName: form.lastName, email: form.email, country: form.country, affiliation: form.affiliation, dietary: form.dietary });
    setProofName('');
    setProofError(false);
  };

  const handleProof = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setProofName(file.name);
    setProofLoading(true);
    setProofError(false);
    try {
      const result = await uploadFile(file, 'student-proofs');
      set('studentProofFileKey', result.fileKey);
      set('studentProofUrl', result.fileUrl);
      set('studentProofFileName', result.fileName);
    } catch {
      setProofError(true);
      set('studentProofFileKey', '');
    } finally {
      setProofLoading(false);
    }
  };

  const missing = useMemo(() => {
    const m: string[] = [];
    if (!form.firstName.trim()) m.push('firstName');
    if (!form.lastName.trim()) m.push('lastName');
    if (!/.+@.+\..+/.test(form.email)) m.push('email');
    if (!form.country.trim()) m.push('country');
    if (category !== 'cena-adicional' && !form.affiliation.trim()) m.push('affiliation');
    if (showPaper) {
      if (!form.cmsPaperId?.trim()) m.push('cmsPaperId');
      if (!form.paperTitle?.trim()) m.push('paperTitle');
      if (!form.presenterName?.trim()) m.push('presenterName');
      if (!/.+@.+\..+/.test(form.cmsEmail || '')) m.push('cmsEmail');
    }
    if (category === 'paper-adicional' && !form.mainRegistrationId?.trim() && !/.+@.+\..+/.test(form.mainAuthorEmail || '')) {
      m.push('mainRegistrationOrEmail');
    }
    if (category === 'estudiante') {
      if (form.studentType !== 'autor' && form.studentType !== 'asistente') m.push('studentType');
      if (!form.program?.trim()) m.push('program');
      if (!form.level) m.push('level');
      if (!form.studentProofFileKey) m.push('studentProof');
    }
    if (category === 'cena-adicional') {
      if (!form.mainParticipantName?.trim()) m.push('mainParticipantName');
      if (!/.+@.+\..+/.test(form.mainParticipantEmail || '')) m.push('mainParticipantEmail');
    }
    return m;
  }, [form, category, showPaper]);

  const couponErrorMessage =
    error === 'coupon-invalid'
      ? r.messages.couponInvalid
      : error === 'coupon-not-applicable'
        ? r.messages.couponNotApplicable
        : error === 'coupon-exhausted'
          ? r.messages.couponExhausted
          : null;

  const handleSubmit = async () => {
    if (missing.length > 0) {
      setShowRequired(true);
      return;
    }
    setShowRequired(false);
    await createRegistration(form);
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-10 text-left space-y-8">
      {/* Tipo de inscripción */}
      <div>
        <label className={labelClass}>{r.form.selectLabel}</label>
        <select className={inputClass} value={category} onChange={(e) => handleCategory(e.target.value as RegistrationCategory)}>
          {REGISTRATION_CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {r.categories[c].name} — {formatUsd(REGISTRATION_PRICING[c][phase === 'early-bird' ? 'earlyBird' : 'regular'])}
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-500 mt-2">{r.categories[category].includes}</p>
        {r.categories[category].note && (
          <p className="text-sm text-[#E76F51] font-semibold mt-1">{r.categories[category].note}</p>
        )}
      </div>

      {/* Cupón de descuento */}
      {category === 'autor' && (
        <div>
          <label className={labelClass}>
            {r.form.couponLabel} <span className="text-gray-400 font-normal">({r.form.optional})</span>
          </label>
          <input
            className={inputClass}
            value={form.couponCode || ''}
            onChange={(e) => set('couponCode', e.target.value)}
            placeholder={r.form.couponPlaceholder}
          />
          <p className="text-xs text-gray-400 mt-1">{r.form.couponHint}</p>
          {couponErrorMessage && <p className="text-sm text-red-500 font-semibold mt-1">{couponErrorMessage}</p>}
        </div>
      )}

      {/* Datos personales */}
      <div className="space-y-4">
        <h4 className="text-lg font-bold text-[#0D2C54]">{r.form.sectionPersonal}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{r.form.firstName}</label>
            <input className={inputClass} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>{r.form.lastName}</label>
            <input className={inputClass} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>{r.form.email}</label>
            <input type="email" className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>{r.form.country}</label>
            <input className={inputClass} value={form.country} onChange={(e) => set('country', e.target.value)} />
          </div>
          {category !== 'cena-adicional' && (
            <div className="md:col-span-2">
              <label className={labelClass}>{r.form.affiliation}</label>
              <input className={inputClass} value={form.affiliation} onChange={(e) => set('affiliation', e.target.value)} />
            </div>
          )}
          <div className="md:col-span-2">
            <label className={labelClass}>
              {r.form.dietary} <span className="text-gray-400 font-normal">({r.form.optional})</span>
            </label>
            <input className={inputClass} value={form.dietary || ''} onChange={(e) => set('dietary', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Datos del paper */}
      {showPaper && (
        <div className="space-y-4">
          <h4 className="text-lg font-bold text-[#0D2C54]">{r.form.sectionPaper}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{r.form.cmsPaperId}</label>
              <input className={inputClass} value={form.cmsPaperId || ''} onChange={(e) => set('cmsPaperId', e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">{r.form.cmsPaperIdHint}</p>
            </div>
            <div>
              <label className={labelClass}>{r.form.paperTitle}</label>
              <input className={inputClass} value={form.paperTitle || ''} onChange={(e) => set('paperTitle', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>{r.form.presenterName}</label>
              <input className={inputClass} value={form.presenterName || ''} onChange={(e) => set('presenterName', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>{r.form.cmsEmail}</label>
              <input type="email" className={inputClass} value={form.cmsEmail || ''} onChange={(e) => set('cmsEmail', e.target.value)} />
            </div>
            {category !== 'paper-adicional' && (
              <div className="md:col-span-2">
                <label className={labelClass}>{r.form.coverage}</label>
                <select className={inputClass} value={form.coverage || 'principal'} onChange={(e) => set('coverage', e.target.value as PaperCoverage)}>
                  <option value="principal">{r.form.coveragePrincipal}</option>
                  <option value="adicional">{r.form.coverageAdicional}</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Paper adicional: asociación */}
      {category === 'paper-adicional' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{r.form.mainRegistrationId}</label>
              <input className={inputClass} value={form.mainRegistrationId || ''} onChange={(e) => set('mainRegistrationId', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>{r.form.mainAuthorEmail}</label>
              <input type="email" className={inputClass} value={form.mainAuthorEmail || ''} onChange={(e) => set('mainAuthorEmail', e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-gray-400">{r.form.mainEitherHint}</p>
        </div>
      )}

      {/* Estudiante */}
      {category === 'estudiante' && (
        <div className="space-y-4">
          <h4 className="text-lg font-bold text-[#0D2C54]">{r.form.sectionStudent}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{r.form.studentType}</label>
              <select className={inputClass} value={form.studentType || ''} onChange={(e) => set('studentType', e.target.value as StudentType)}>
                <option value="">—</option>
                <option value="autor">{r.form.studentTypeAutor}</option>
                <option value="asistente">{r.form.studentTypeAsistente}</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>{r.form.level}</label>
              <select className={inputClass} value={form.level || ''} onChange={(e) => set('level', e.target.value as StudentLevel)}>
                <option value="">—</option>
                <option value="pregrado">{r.form.levelPregrado}</option>
                <option value="magister">{r.form.levelMagister}</option>
                <option value="doctorado">{r.form.levelDoctorado}</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>{r.form.program}</label>
              <input className={inputClass} value={form.program || ''} onChange={(e) => set('program', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>{r.form.studentProof}</label>
              <label className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center block cursor-pointer hover:border-[#2A9D8F]/40 transition-colors">
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleProof} />
                <span className="text-sm font-semibold text-[#0D2C54]">
                  {proofName ? proofName : r.comprobante.fileLabel}
                </span>
                <span className="block text-xs text-gray-400 mt-1">
                  {proofLoading ? r.messages.loading : r.comprobante.fileAccepted}
                </span>
                {proofError && <span className="block text-xs text-red-500 mt-1">{r.messages.errorGeneric}</span>}
              </label>
            </div>
          </div>
          <p className="text-sm text-[#E76F51] font-semibold">{r.warnings.studentNoDinner}</p>
        </div>
      )}

      {/* Cena de gala adicional */}
      {category === 'cena-adicional' && (
        <div className="space-y-4">
          <h4 className="text-lg font-bold text-[#0D2C54]">{r.form.sectionDinner}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{r.form.mainParticipantName}</label>
              <input className={inputClass} value={form.mainParticipantName || ''} onChange={(e) => set('mainParticipantName', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>{r.form.mainParticipantEmail}</label>
              <input type="email" className={inputClass} value={form.mainParticipantEmail || ''} onChange={(e) => set('mainParticipantEmail', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>
                {r.form.mainRegistrationId} <span className="text-gray-400 font-normal">({r.form.optional})</span>
              </label>
              <input className={inputClass} value={form.mainRegistrationId || ''} onChange={(e) => set('mainRegistrationId', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>
                {r.form.ticketUserName} <span className="text-gray-400 font-normal">({r.form.optional})</span>
              </label>
              <input className={inputClass} value={form.ticketUserName || ''} onChange={(e) => set('ticketUserName', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>
                {r.form.ticketDietary} <span className="text-gray-400 font-normal">({r.form.optional})</span>
              </label>
              <input className={inputClass} value={form.ticketDietary || ''} onChange={(e) => set('ticketDietary', e.target.value)} />
            </div>
          </div>
          <p className="text-sm text-[#E76F51] font-semibold">{r.warnings.dinnerNotRegistration}</p>
        </div>
      )}

      <div className="bg-[#F8FAFC] border border-gray-100 rounded-xl p-4 text-sm text-gray-500">
        {r.warnings.manualValidation}
      </div>

      {showRequired && missing.length > 0 && (
        <p className="text-sm text-red-500 font-semibold">{r.messages.requiredFields}</p>
      )}
      {error === 'create-failed' && (
        <p className="text-sm text-red-500 font-semibold">{r.messages.errorGeneric}</p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || proofLoading}
          className="bg-[#0D2C54] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#1A4B8A] transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? r.messages.creating : r.buttons.next}
        </button>
      </div>
    </div>
  );
};
