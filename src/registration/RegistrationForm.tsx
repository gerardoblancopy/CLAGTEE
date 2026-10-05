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
import { ResumeBanner } from './ResumeBanner';

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
  companyName: '',
  contactPhone: '',
  billingTaxId: '',
  standRepresentative2Name: '',
  standRepresentative2Email: '',
  dinnerAttendeeName: '',
  standNotes: '',
});

const needsPaper = (category: RegistrationCategory, studentType?: StudentType) =>
  category === 'autor' ||
  category === 'paper-adicional' ||
  (category === 'estudiante' && studentType === 'autor');

interface RegistrationFormProps {
  forcedCategory?: RegistrationCategory;
  allowedCategories?: RegistrationCategory[];
  hideCategorySelect?: boolean;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  forcedCategory,
  allowedCategories,
  hideCategorySelect,
}) => {
  const { content } = useLanguage();
  const r = content.sections.registration;
  const { createRegistration, uploadFile, isSubmitting, error, conflict } = useRegistration();

  const categoriesList = allowedCategories || (forcedCategory ? [forcedCategory] : REGISTRATION_CATEGORY_ORDER);
  const initialCat = forcedCategory || (allowedCategories ? allowedCategories[0] : 'autor');

  const [form, setForm] = useState<RegistrationInput>(() => emptyForm(initialCat));
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
    setForm({
      ...emptyForm(next),
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      country: form.country,
      affiliation: form.affiliation,
      dietary: form.dietary,
      companyName: form.companyName,
      contactPhone: form.contactPhone,
      billingTaxId: form.billingTaxId,
    });
    setProofName('');
    setProofError(false);
  };

  React.useEffect(() => {
    if (forcedCategory && forcedCategory !== category) {
      handleCategory(forcedCategory);
    }
  }, [forcedCategory]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('cat') as RegistrationCategory;
    if (cat && categoriesList.includes(cat) && cat !== category) {
      handleCategory(cat);
    }
  }, []);

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
    if (category !== 'cena-adicional' && category !== 'empresa-stand' && !form.affiliation.trim()) m.push('affiliation');
    if (category === 'empresa-stand') {
      if (!form.companyName?.trim() && !form.affiliation?.trim()) m.push('companyName');
      if (!form.contactPhone?.trim()) m.push('contactPhone');
    }
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

  const existingId = conflict?.existingId || '';
  const duplicateMessage =
    error === 'duplicate-registration'
      ? `${r.messages.duplicateRegistration.replace('{id}', existingId)}${
          conflict?.linkResent ? ` ${r.messages.duplicateLinkResent}` : ''
        }`
      : error === 'duplicate-paper'
        ? r.messages.duplicatePaper.replace('{id}', existingId)
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
      <ResumeBanner />

      {/* Tipo de inscripción */}
      {!hideCategorySelect && (
        <div>
          <label className={labelClass}>{r.form.selectLabel}</label>
          <select className={inputClass} value={category} onChange={(e) => handleCategory(e.target.value as RegistrationCategory)}>
            {categoriesList.map((c) => (
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
      )}

      {/* Cupón de descuento */}
      {['autor', 'estudiante'].includes(category) && (
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

      {/* Datos personales / Datos de la empresa */}
      {category === 'empresa-stand' ? (
        <div className="space-y-6">
          {/* Card explicativa destacada del stand */}
          <div className="bg-[#0D2C54]/5 border-2 border-[#2A9D8F]/30 rounded-2xl p-5 md:p-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="bg-[#2A9D8F] text-white text-xs uppercase font-extrabold px-3 py-1 rounded-full tracking-wider">
                {r.categories['empresa-stand'].name}
              </span>
              <span className="text-[#0D2C54] font-extrabold text-xl">USD 800</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed font-medium">
              {r.categories['empresa-stand'].note}
            </p>
            <div className="bg-white rounded-xl p-4 border border-gray-100 text-xs text-gray-600 space-y-2">
              <div className="flex items-start gap-2 font-semibold text-[#0D2C54]">
                <svg className="w-4 h-4 text-[#2A9D8F] shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>{r.form.standDetailsSpace}</span>
              </div>
              <div className="flex items-start gap-2 font-semibold text-[#0D2C54]">
                <svg className="w-4 h-4 text-[#2A9D8F] shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>{r.form.standDetailsIncludes}</span>
              </div>
            </div>
          </div>

          {/* Datos de la Empresa */}
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-[#0D2C54]">{r.form.sectionCompany}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelClass}>{r.form.companyName}</label>
                <input
                  className={inputClass}
                  value={form.companyName || form.affiliation || ''}
                  onChange={(e) => {
                    set('companyName', e.target.value);
                    set('affiliation', e.target.value);
                  }}
                  placeholder="Nombre de la empresa o razón social"
                />
              </div>
              <div>
                <label className={labelClass}>{r.form.contactPhone}</label>
                <input
                  className={inputClass}
                  value={form.contactPhone || ''}
                  onChange={(e) => set('contactPhone', e.target.value)}
                  placeholder="+56 9 1234 5678"
                />
              </div>
              <div>
                <label className={labelClass}>
                  {r.form.billingTaxId} <span className="text-gray-400 font-normal">({r.form.optional})</span>
                </label>
                <input
                  className={inputClass}
                  value={form.billingTaxId || ''}
                  onChange={(e) => set('billingTaxId', e.target.value)}
                  placeholder="RUT / Tax ID / NIF"
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>{r.form.country}</label>
                <input className={inputClass} value={form.country} onChange={(e) => set('country', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Representante 1 */}
          <div className="space-y-4 border-t border-gray-100 pt-6">
            <h4 className="text-lg font-bold text-[#0D2C54]">{r.form.representative1Title}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{r.form.firstName}</label>
                <input className={inputClass} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>{r.form.lastName}</label>
                <input className={inputClass} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>{r.form.email}</label>
                <input type="email" className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Representante 2 */}
          <div className="space-y-4 border-t border-gray-100 pt-6">
            <h4 className="text-lg font-bold text-[#0D2C54]">
              {r.form.representative2Title}{' '}
              <span className="text-gray-400 font-normal text-sm">({r.form.optional})</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{r.form.representative2Name}</label>
                <input
                  className={inputClass}
                  value={form.standRepresentative2Name || ''}
                  onChange={(e) => set('standRepresentative2Name', e.target.value)}
                  placeholder="Nombre y apellido"
                />
              </div>
              <div>
                <label className={labelClass}>{r.form.representative2Email}</label>
                <input
                  type="email"
                  className={inputClass}
                  value={form.standRepresentative2Email || ''}
                  onChange={(e) => set('standRepresentative2Email', e.target.value)}
                  placeholder="correo@empresa.com"
                />
              </div>
            </div>
          </div>

          {/* Cena de gala y requerimientos */}
          <div className="space-y-4 border-t border-gray-100 pt-6">
            <h4 className="text-lg font-bold text-[#0D2C54]">{r.form.sectionStandDinner}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelClass}>
                  {r.form.dinnerAttendeeName} <span className="text-gray-400 font-normal">({r.form.optional})</span>
                </label>
                <input
                  className={inputClass}
                  value={form.dinnerAttendeeName || ''}
                  onChange={(e) => set('dinnerAttendeeName', e.target.value)}
                  placeholder="Nombre de la persona que asistirá (ej. Representante 1)"
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>
                  {r.form.dietary} <span className="text-gray-400 font-normal">({r.form.optional})</span>
                </label>
                <input className={inputClass} value={form.dietary || ''} onChange={(e) => set('dietary', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>
                  {r.form.standNotes} <span className="text-gray-400 font-normal">({r.form.optional})</span>
                </label>
                <textarea
                  className={`${inputClass} resize-y min-h-[80px]`}
                  value={form.standNotes || ''}
                  onChange={(e) => set('standNotes', e.target.value)}
                  placeholder="Ej. Requerimientos de conexión eléctrica, dimensiones especiales de paneles o pendones, etc."
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
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
      )}

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
      {error && !couponErrorMessage && (
        <p className="text-sm text-red-500 font-semibold">
          {duplicateMessage || r.messages.errorGeneric}
          {error === 'duplicate-registration' && (
            <>
              {' '}
              <a href="/cms" className="text-[#2A9D8F] hover:underline">
                {r.summary.profileLink}
              </a>
            </>
          )}
        </p>
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
