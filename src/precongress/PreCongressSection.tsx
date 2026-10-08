import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { SpeakerCarousel } from '../../components/SpeakerCarousel';
import { CalendarIcon, MapPinIcon } from '../../components/icons';
import { PreCongressProfile } from '../../types';

type FieldKey = 'firstName' | 'lastName' | 'email' | 'institution' | 'position' | 'country' | 'phone' | 'profile' | 'comments';

const REQUIRED: FieldKey[] = ['firstName', 'lastName', 'email', 'institution', 'country', 'profile'];

const emptyForm: Record<FieldKey, string> = {
  firstName: '',
  lastName: '',
  email: '',
  institution: '',
  position: '',
  country: '',
  phone: '',
  profile: '',
  comments: '',
};

// Formulario de inscripción al Pre-congreso (Workshop + Seminario de IA).
const PreCongressForm: React.FC = () => {
  const { content } = useLanguage();
  const f = content.sections.preCongress.form;

  const [form, setForm] = useState(emptyForm);
  const [missing, setMissing] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationId, setRegistrationId] = useState<string | null>(null);

  const set = (key: FieldKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMissing((prev) => prev.filter((field) => field !== key));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const invalid = REQUIRED.filter((key) => !form[key].trim());
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) invalid.push('email');
    setMissing(invalid);
    if (invalid.length > 0) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pre-congress', ...form }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        registration?: { id: string };
        code?: string;
        fields?: string[];
      };
      if (response.status === 409 && payload.code === 'duplicate') {
        setError(f.duplicateError);
        return;
      }
      if (response.status === 400 && payload.fields?.length) {
        setMissing(payload.fields);
        return;
      }
      if (!response.ok || !payload.registration) throw new Error('pre-congress-failed');
      setRegistrationId(payload.registration.id);
    } catch {
      setError(f.genericError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm(emptyForm);
    setMissing([]);
    setError(null);
    setRegistrationId(null);
  };

  if (registrationId) {
    return (
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12 text-center space-y-6">
        <div className="w-16 h-16 bg-[#2A9D8F]/10 text-[#2A9D8F] rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
          ✓
        </div>
        <div className="space-y-2 max-w-lg mx-auto">
          <h4 className="text-2xl font-extrabold text-[#0D2C54] font-['Montserrat']">{f.successTitle}</h4>
          <p className="text-sm font-bold text-[#2A9D8F]">{registrationId}</p>
          <p className="text-gray-600 text-sm md:text-base leading-relaxed">{f.successMessage}</p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="bg-[#0D2C54] hover:bg-[#1A4B8A] text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
        >
          {f.registerAnother}
        </button>
      </div>
    );
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none transition-all text-sm';
  const labelClass = 'block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2';
  const fieldClass = (key: FieldKey) =>
    `${inputClass} ${missing.includes(key) ? 'border-red-400 bg-red-50/40' : ''}`;
  const label = (key: FieldKey, text: string) => (
    <label htmlFor={`pre-congress-${key}`} className={labelClass}>
      {text}{' '}
      {REQUIRED.includes(key) ? (
        <span className="text-red-500">*</span>
      ) : (
        <span className="normal-case font-medium text-gray-400">({f.optional})</span>
      )}
    </label>
  );
  const input = (key: FieldKey, text: string, type = 'text', placeholder?: string) => (
    <div>
      {label(key, text)}
      <input
        id={`pre-congress-${key}`}
        type={type}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        className={fieldClass(key)}
      />
    </div>
  );

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-10 text-left space-y-6">
      <div className="border-b border-gray-100 pb-5">
        <span className="bg-[#F4A261] text-[#0D2C54] text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider">
          {f.badge}
        </span>
        <h4 className="text-2xl font-extrabold text-[#0D2C54] font-['Montserrat'] mt-2">{f.title}</h4>
        <p className="text-gray-500 text-sm mt-1">{f.description}</p>
        <div className="flex flex-wrap gap-2 mt-4 text-xs font-semibold text-[#0D2C54]">
          <span className="inline-flex items-center bg-[#2A9D8F]/10 border border-[#2A9D8F]/30 text-[#1F7A6F] rounded-lg px-3 py-1.5 font-bold">
            {f.freeNote}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-gray-100 rounded-lg px-3 py-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-[#2A9D8F]" />
            {f.eventDate}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-gray-100 rounded-lg px-3 py-1.5">
            <MapPinIcon className="w-3.5 h-3.5 text-[#2A9D8F]" />
            {f.eventVenue}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {input('firstName', f.firstName)}
          {input('lastName', f.lastName)}
          {input('email', f.email, 'email')}
          {input('phone', f.phone, 'tel')}
          {input('institution', f.institution, 'text', f.institutionPlaceholder)}
          {input('position', f.position)}
          {input('country', f.country)}
          <div>
            {label('profile', f.profile)}
            <select
              id="pre-congress-profile"
              value={form.profile}
              onChange={(e) => set('profile', e.target.value as PreCongressProfile)}
              className={fieldClass('profile')}
            >
              <option value="" disabled>
                —
              </option>
              {f.profileOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            {label('comments', f.comments)}
            <textarea
              id="pre-congress-comments"
              rows={3}
              value={form.comments}
              onChange={(e) => set('comments', e.target.value)}
              placeholder={f.commentsPlaceholder}
              className={inputClass}
            />
          </div>
        </div>

        {missing.length > 0 && <p className="text-xs text-red-500 font-semibold">{f.requiredNote}</p>}
        {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto bg-[#F4A261] hover:bg-[#E76F51] text-[#0D2C54] hover:text-white px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md disabled:opacity-50"
        >
          {isSubmitting ? f.submitting : f.submit}
        </button>
      </form>
    </div>
  );
};

export const PreCongressSection: React.FC<{
  viewFullText: string;
  openNewTabText: string;
}> = ({ viewFullText, openNewTabText }) => {
  const { content } = useLanguage();
  const s = content.sections.preCongress;

  return (
    <div className="space-y-12">
      <SpeakerCarousel
        speakers={s.posters}
        subtitle={s.subtitle}
        viewFullText={viewFullText}
        openNewTabText={openNewTabText}
      />
      <div id="pre-congreso-inscripcion" className="max-w-3xl mx-auto scroll-mt-24">
        <PreCongressForm />
      </div>
    </div>
  );
};
