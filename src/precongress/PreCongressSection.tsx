import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { SpeakerCarousel } from '../../components/SpeakerCarousel';
import { CalendarIcon, MapPinIcon } from '../../components/icons';
import { PreCongressProfile } from '../../types';

type FieldKey = 'firstName' | 'lastName' | 'email' | 'institution' | 'position' | 'country' | 'phone' | 'profile' | 'comments';

const REQUIRED: FieldKey[] = ['firstName', 'lastName', 'email', 'institution', 'country', 'profile'];

type YesNo = '' | 'si' | 'no';
type StudentKey = 'eiePucvStudent' | 'needsTransport';
type StudentAnswers = Record<StudentKey, YesNo>;

const emptyStudent: StudentAnswers = { eiePucvStudent: '', needsTransport: '' };

// Preguntas que faltan: transporte solo si es alumno EIE-PUCV.
const missingStudent = (answers: StudentAnswers): StudentKey[] => {
  if (!answers.eiePucvStudent) return ['eiePucvStudent'];
  if (answers.eiePucvStudent === 'si' && !answers.needsTransport) return ['needsTransport'];
  return [];
};

const toAnswer = (value: boolean | null | undefined): YesNo => (value === true ? 'si' : value === false ? 'no' : '');

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2';

// Par de botones Sí / No que se comporta como un grupo de radio.
const YesNoField: React.FC<{
  id: string;
  label: string;
  value: YesNo;
  onChange: (value: YesNo) => void;
  invalid: boolean;
}> = ({ id, label, value, onChange, invalid }) => {
  const { content } = useLanguage();
  const f = content.sections.preCongress.form;
  return (
    <fieldset id={id}>
      <legend className="block text-sm font-bold text-gray-700 mb-2">
        {label} <span className="text-red-500">*</span>
      </legend>
      <div className="flex gap-2">
        {(['si', 'no'] as const).map((option) => (
          <label
            key={option}
            className={`flex-1 sm:flex-none sm:min-w-[96px] text-center cursor-pointer px-4 py-2.5 rounded-xl border text-sm font-bold transition-colors ${
              value === option
                ? 'bg-[#2A9D8F] border-[#2A9D8F] text-white'
                : invalid
                ? 'border-red-400 bg-red-50/40 text-gray-600'
                : 'border-gray-200 text-gray-600 hover:bg-slate-50'
            }`}
          >
            <input
              type="radio"
              name={id}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            {option === 'si' ? f.yes : f.no}
          </label>
        ))}
      </div>
    </fieldset>
  );
};

const StudentQuestions: React.FC<{
  answers: StudentAnswers;
  onChange: (key: StudentKey, value: YesNo) => void;
  missing: string[];
}> = ({ answers, onChange, missing }) => {
  const { content } = useLanguage();
  const f = content.sections.preCongress.form;
  return (
    <div className="md:col-span-2 bg-slate-50 border border-gray-100 rounded-2xl p-4 space-y-4">
      <YesNoField
        id="pre-congress-eiePucvStudent"
        label={f.eiePucvStudent}
        value={answers.eiePucvStudent}
        onChange={(value) => onChange('eiePucvStudent', value)}
        invalid={missing.includes('eiePucvStudent')}
      />
      {answers.eiePucvStudent === 'si' && (
        <YesNoField
          id="pre-congress-needsTransport"
          label={f.needsTransport}
          value={answers.needsTransport}
          onChange={(value) => onChange('needsTransport', value)}
          invalid={missing.includes('needsTransport')}
        />
      )}
    </div>
  );
};

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
  const [student, setStudent] = useState(emptyStudent);
  const [missing, setMissing] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationId, setRegistrationId] = useState<string | null>(null);

  const set = (key: FieldKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMissing((prev) => prev.filter((field) => field !== key));
  };

  const setAnswer = (key: StudentKey, value: YesNo) => {
    setStudent((prev) => ({ ...prev, [key]: value }));
    setMissing((prev) => prev.filter((field) => field !== key));
  };

  const isStudent = form.profile === 'estudiante';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const invalid: string[] = REQUIRED.filter((key) => !form[key].trim());
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) invalid.push('email');
    if (isStudent) invalid.push(...missingStudent(student));
    setMissing(invalid);
    if (invalid.length > 0) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pre-congress', ...form, ...(isStudent ? student : {}) }),
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
    setStudent(emptyStudent);
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
          {isStudent && <StudentQuestions answers={student} onChange={setAnswer} missing={missing} />}
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

type UpdateLink = { id: string; token: string };

const readUpdateLink = (): UpdateLink | null => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('precongreso');
  const token = params.get('t');
  return id && token ? { id, token } : null;
};

// Enlace personal del correo: los inscritos antes de que existiera la pregunta
// indican si son alumnos EIE-PUCV y si requieren transporte.
const PreCongressUpdateForm: React.FC<{ link: UpdateLink; onClose: () => void }> = ({ link, onClose }) => {
  const { content } = useLanguage();
  const f = content.sections.preCongress.form;
  const u = f.update;
  const containerRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<'loading' | 'ready' | 'invalid' | 'saved'>('loading');
  const [name, setName] = useState('');
  const [answers, setAnswers] = useState(emptyStudent);
  const [missing, setMissing] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const query = new URLSearchParams({ scope: 'pre-congress-update', id: link.id, token: link.token });
        const response = await fetch(`/api/registrations?${query.toString()}`);
        if (!response.ok) throw new Error('invalid-link');
        const { registration } = (await response.json()) as {
          registration: { id: string; firstName: string; eiePucvStudent: boolean | null; needsTransport: boolean | null };
        };
        if (cancelled) return;
        setName(registration.firstName);
        setAnswers({
          eiePucvStudent: toAnswer(registration.eiePucvStudent),
          needsTransport: toAnswer(registration.needsTransport),
        });
        setState('ready');
      } catch {
        if (!cancelled) setState('invalid');
      } finally {
        if (!cancelled) containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [link]);

  const setAnswer = (key: StudentKey, value: YesNo) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setMissing((prev) => prev.filter((field) => field !== key));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const invalid = missingStudent(answers);
    setMissing(invalid);
    if (invalid.length > 0) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pre-congress-update', id: link.id, token: link.token, ...answers }),
      });
      if (response.status === 404) {
        setState('invalid');
        return;
      }
      if (!response.ok) throw new Error('pre-congress-update-failed');
      setState('saved');
    } catch {
      setError(f.genericError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const backButton = (
    <button
      type="button"
      onClick={onClose}
      className="text-xs font-bold uppercase tracking-wider text-[#0D2C54] underline underline-offset-4 hover:text-[#2A9D8F]"
    >
      {u.backToForm}
    </button>
  );

  return (
    <div ref={containerRef} className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-10 text-left space-y-6 scroll-mt-24">
      <div className="border-b border-gray-100 pb-5">
        <span className="bg-[#F4A261] text-[#0D2C54] text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider">
          {u.badge}
        </span>
        <h4 className="text-2xl font-extrabold text-[#0D2C54] font-['Montserrat'] mt-2">{u.title}</h4>
        {state === 'ready' && (
          <p className="text-gray-500 text-sm mt-1">
            {name ? `${name} · ` : ''}
            <strong className="text-[#2A9D8F]">{link.id}</strong>
          </p>
        )}
      </div>

      {state === 'loading' && <p className="text-sm text-gray-400">…</p>}

      {state === 'invalid' && (
        <div className="space-y-4">
          <p className="text-sm text-red-500 font-semibold">{u.invalidLink}</p>
          {backButton}
        </div>
      )}

      {state === 'saved' && (
        <div className="text-center space-y-4 py-4">
          <div className="w-16 h-16 bg-[#2A9D8F]/10 text-[#2A9D8F] rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
            ✓
          </div>
          <h4 className="text-xl font-extrabold text-[#0D2C54] font-['Montserrat']">{u.successTitle}</h4>
          <p className="text-gray-600 text-sm">{u.successMessage}</p>
          {backButton}
        </div>
      )}

      {state === 'ready' && (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <p className="text-gray-600 text-sm leading-relaxed">{u.description}</p>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <StudentQuestions answers={answers} onChange={setAnswer} missing={missing} />
          </div>
          {missing.length > 0 && <p className="text-xs text-red-500 font-semibold">{f.requiredNote}</p>}
          {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-[#F4A261] hover:bg-[#E76F51] text-[#0D2C54] hover:text-white px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md disabled:opacity-50"
          >
            {isSubmitting ? f.submitting : u.submit}
          </button>
        </form>
      )}
    </div>
  );
};

export const PreCongressSection: React.FC<{
  viewFullText: string;
  openNewTabText: string;
}> = ({ viewFullText, openNewTabText }) => {
  const { content } = useLanguage();
  const s = content.sections.preCongress;
  const [updateLink, setUpdateLink] = useState<UpdateLink | null>(readUpdateLink);

  // Al cerrar el enlace personal se limpia la URL para no reabrirlo al recargar.
  const closeUpdate = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('precongreso');
    url.searchParams.delete('t');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    setUpdateLink(null);
  };

  return (
    <div className="space-y-12">
      <SpeakerCarousel
        speakers={s.posters}
        subtitle={s.subtitle}
        viewFullText={viewFullText}
        openNewTabText={openNewTabText}
      />
      <div id="pre-congreso-inscripcion" className="max-w-3xl mx-auto scroll-mt-24">
        {updateLink ? <PreCongressUpdateForm link={updateLink} onClose={closeUpdate} /> : <PreCongressForm />}
      </div>
    </div>
  );
};
