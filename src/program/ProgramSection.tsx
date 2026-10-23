import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { CalendarIcon, MapPinIcon } from '../../components/icons';
import { ProgramBlock, ProgramContent, ProgramData, ProgramDay, ProgramEvent, ProgramPaper, ProgramSession } from '../../types';

// El programa (≈60 KB) se carga aparte para no engordar el bundle inicial.
const loadProgram = () => import('../../data/programa2026.json').then((m) => m.default as unknown as ProgramData);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const normalize = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// "Plenary 1 – Expert Panel" -> "Plenaria 1 – Panel de expertos" (frases más largas primero).
const translate = (text: string, phrases: Record<string, string>) =>
  Object.keys(phrases)
    .sort((a, b) => b.length - a.length)
    .reduce((acc, key) => acc.split(key).join(phrases[key]), text);

// "Wednesday, October 28" -> "Miércoles 28 de octubre".
const dayLabel = (name: string, p: ProgramContent) => {
  const m = name.match(/^(\w+),\s*(\w+)\s+(\d+)$/);
  if (!m) return name;
  return p.dayFormat
    .replace('{weekday}', p.weekdays[m[1]] || m[1])
    .replace('{day}', m[3])
    .replace('{month}', p.months[m[2]] || m[2]);
};

const range = (a: string, b: string) => (b ? `${a}–${b}` : a);

// El día de hoy (hora de Chile), si cae dentro del congreso; si no, el primero.
const initialDay = (data: ProgramData) => {
  const year = data.cabecera.fechas.match(/\d{4}/)?.[0];
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Santiago', year: 'numeric', month: 'long', day: 'numeric' })
    .formatToParts(new Date());
  const get = (type: string) => parts.find((x) => x.type === type)?.value || '';
  const today = data.dias.find((d) => {
    const m = d.nombre.match(/,\s*(\w+)\s+(\d+)$/);
    return m && get('year') === year && get('month') === m[1] && get('day') === m[2] && MONTHS.includes(m[1]);
  });
  return (today || data.dias[0])?.id || '';
};

const Authors: React.FC<{ paper: ProgramPaper; presenterLabel: string }> = ({ paper, presenterLabel }) => (
  <p className="text-xs text-gray-500 leading-snug mt-0.5">
    {(paper.autores || []).map((a, i) => (
      <React.Fragment key={i}>
        {i > 0 && ', '}
        {a.presenta ? <span className="underline decoration-[#2A9D8F] decoration-2 underline-offset-2 text-gray-700">{a.nombre}</span> : a.nombre}
      </React.Fragment>
    ))}
    {(paper.presentadores_extra || []).length > 0 && (
      <span className="block">
        {presenterLabel}:{' '}
        <span className="underline decoration-[#2A9D8F] decoration-2 underline-offset-2 text-gray-700">
          {paper.presentadores_extra!.join(' / ')}
        </span>
      </span>
    )}
  </p>
);

const PaperRow: React.FC<{ paper: ProgramPaper; p: ProgramContent }> = ({ paper, p }) => (
  <li className="flex gap-3 py-2.5 border-t border-gray-100 first:border-t-0">
    <span className="w-11 shrink-0 text-xs font-bold text-[#2A9D8F] pt-0.5">{paper.inicio}</span>
    <div className="min-w-0">
      <p className="text-sm font-semibold text-[#0D2C54] leading-snug" lang={paper.idioma}>
        <span className="text-[#2A9D8F]">{paper.codigo}</span> · {paper.titulo}
      </p>
      <Authors paper={paper} presenterLabel={p.presenter} />
    </div>
  </li>
);

const SessionCard: React.FC<{ session: ProgramSession; day: ProgramDay; p: ProgramContent; trackTitle: (n: number, fallback: string) => string }> = ({
  session,
  day,
  p,
  trackTitle,
}) => {
  const principal = day.salas.find((s) => s.letra === session.sala)?.principal;
  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      <header className="bg-[#0D2C54] text-white px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-lg font-extrabold font-['Montserrat']">{session.id}</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#F4A261] text-right">
            {p.room} {session.sala}
            {principal ? ` · ${p.principalRoom}` : ''}
          </span>
        </div>
        <p className="text-xs text-white/70 mt-0.5">{range(session.inicio, session.fin)}</p>
      </header>
      <div className="px-4 pt-3 pb-1 space-y-1">
        {session.tracks.map((t) => (
          <p key={t.numero} className="text-xs font-bold text-[#0D2C54]">
            Track {t.numero} · {trackTitle(t.numero, t.titulo)}
          </p>
        ))}
        {session.chair && (
          <p className="text-xs text-gray-500">
            {p.chair}: <span className="font-semibold text-gray-700">{session.chair}</span>
          </p>
        )}
      </div>
      <ul className="px-4 pb-3">
        {session.papers.filter((x) => !x.vacio).map((paper) => (
          <PaperRow key={paper.codigo} paper={paper} p={p} />
        ))}
      </ul>
    </article>
  );
};

const EventRow: React.FC<{ event: ProgramEvent; p: ProgramContent }> = ({ event, p }) => {
  // Los eventos comunes tienen nombre propio por idioma; las plenarias se traducen por frases.
  const name = p.events[event.clase] || translate(event.nombre, p.phrases);
  const featured = ['keynote', 'plenaria'].includes(event.clase);
  const quiet = ['cafe', 'receso'].includes(event.clase);
  if (quiet) {
    return (
      <div className="flex items-center gap-4 py-2 text-sm text-gray-500">
        <span className="w-24 shrink-0 font-bold text-gray-400">{range(event.inicio, event.fin)}</span>
        <span className="flex-1 border-t border-dashed border-gray-200" />
        <span>{name}</span>
        <span className="flex-1 border-t border-dashed border-gray-200" />
      </div>
    );
  }
  return (
    <div
      className={`rounded-2xl px-5 py-4 flex flex-col sm:flex-row gap-1 sm:gap-5 ${
        featured ? 'bg-gradient-to-r from-[#0D2C54] to-[#1A4B8A] text-white shadow-md' : 'bg-slate-50 border border-gray-100'
      }`}
    >
      <span className={`w-24 shrink-0 text-sm font-bold ${featured ? 'text-[#F4A261]' : 'text-[#2A9D8F]'}`}>
        {range(event.inicio, event.fin)}
      </span>
      <div className="min-w-0">
        <p className={`font-bold ${featured ? 'text-white' : 'text-[#0D2C54]'}`}>{name}</p>
        {event.titulo && <p className={`text-base font-semibold mt-1 ${featured ? 'text-white' : 'text-[#0D2C54]'}`}>“{event.titulo}”</p>}
        {event.personas && event.personas.length > 0 && (
          <p className={`text-sm mt-1 ${featured ? 'text-white/80' : 'text-gray-600'}`}>
            <span className="font-semibold">{translate(event.rol || '', p.phrases)}:</span> {event.personas.join(', ')}
          </p>
        )}
        {event.lugar && featured && <p className="text-xs mt-1 text-white/60">{translate(event.lugar, p.phrases)}</p>}
      </div>
    </div>
  );
};

type SearchHit = { paper: ProgramPaper; session: ProgramSession; day: ProgramDay };

export const ProgramSection: React.FC = () => {
  const { content } = useLanguage();
  const p = content.sections.program;
  const tracks = content.sections.thematicAxes.tracks;

  const [data, setData] = useState<ProgramData | null>(null);
  const [failed, setFailed] = useState(false);
  const [dayId, setDayId] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadProgram()
      .then((loaded) => {
        if (cancelled) return;
        setData(loaded);
        setDayId(initialDay(loaded));
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const trackTitle = (n: number, fallback: string) => tracks.find((t) => t.id === `Track ${n}`)?.title || fallback;

  const hits = useMemo<SearchHit[]>(() => {
    const q = normalize(query.trim());
    if (!data || q.length < 2) return [];
    const out: SearchHit[] = [];
    data.dias.forEach((day) =>
      day.filas
        .filter((f): f is ProgramBlock => f.tipo === 'bloque')
        .forEach((block) =>
          block.sesiones.forEach((sid) => {
            const session = data.sesiones[sid];
            session.papers.forEach((paper) => {
              if (paper.vacio) return;
              const haystack = normalize(
                [paper.codigo, paper.titulo, ...(paper.autores || []).map((a) => a.nombre), ...(paper.presentadores_extra || []), session.id, session.chair].join(' ')
              );
              if (haystack.includes(q)) out.push({ paper, session, day });
            });
          })
        )
    );
    return out;
  }, [data, query]);

  const day = data?.dias.find((d) => d.id === dayId);

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-3 max-w-3xl">
          <p className="text-gray-600 leading-relaxed">{p.intro}</p>
          {data && (
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-[#0D2C54]">
              <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-gray-100 rounded-lg px-3 py-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-[#2A9D8F]" />
                {data.dias.map((d) => dayLabel(d.nombre, p)).join(' · ')}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-gray-100 rounded-lg px-3 py-1.5">
                <MapPinIcon className="w-3.5 h-3.5 text-[#2A9D8F]" />
                {data.cabecera.sede} · {data.cabecera.direccion}
              </span>
            </div>
          )}
        </div>
        <a
          href={p.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start lg:self-auto shrink-0 inline-flex items-center gap-2 bg-[#F4A261] hover:bg-[#E76F51] text-[#0D2C54] hover:text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {p.downloadPdf}
        </a>
      </div>

      {failed && <p className="text-sm text-red-500 font-semibold">{p.loadError}</p>}
      {!data && !failed && <p className="text-sm text-gray-400">{p.loading}</p>}

      {data && (
        <>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex flex-wrap gap-2" role="tablist">
              {data.dias.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  role="tab"
                  aria-selected={d.id === dayId && !query}
                  onClick={() => {
                    setDayId(d.id);
                    setQuery('');
                  }}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    d.id === dayId && !query ? 'bg-[#0D2C54] text-white shadow-md' : 'bg-slate-100 text-[#0D2C54] hover:bg-slate-200'
                  }`}
                >
                  {dayLabel(d.nombre, p)}
                </button>
              ))}
            </div>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={p.searchPlaceholder}
              aria-label={p.searchPlaceholder}
              className="w-full md:max-w-sm md:ml-auto px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none text-sm"
            />
          </div>
          <p className="text-xs text-gray-400">
            {p.timezoneNote} {p.presenterNote}
          </p>

          {query.trim().length >= 2 ? (
            <div className="space-y-3">
              <p className="text-sm font-bold text-[#0D2C54]">{p.searchResults.replace('{n}', String(hits.length))}</p>
              {hits.length === 0 && <p className="text-sm text-gray-500">{p.noResults}</p>}
              <ul className="space-y-3">
                {hits.map(({ paper, session, day: d }) => (
                  <li key={paper.codigo} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-2 sm:gap-5">
                    <div className="sm:w-48 shrink-0 text-xs font-bold text-[#2A9D8F] space-y-0.5">
                      <p>{dayLabel(d.nombre, p)}</p>
                      <p>{range(paper.inicio, paper.fin)}</p>
                      <p className="text-[#0D2C54]">
                        {session.id} · {p.room} {session.sala}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0D2C54] leading-snug" lang={paper.idioma}>
                        <span className="text-[#2A9D8F]">{paper.codigo}</span> · {paper.titulo}
                      </p>
                      <Authors paper={paper} presenterLabel={p.presenter} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            day && (
              <div className="space-y-4">
                {day.filas.map((fila, i) =>
                  fila.tipo === 'evento' ? (
                    <EventRow key={i} event={fila} p={p} />
                  ) : (
                    <section key={i} className="bg-slate-50 rounded-3xl border border-gray-100 p-4 md:p-6 space-y-4">
                      <h3 className="flex flex-wrap items-baseline gap-x-3 text-[#0D2C54]">
                        <span className="text-sm font-bold text-[#2A9D8F]">{range(fila.inicio, fila.fin)}</span>
                        <span className="text-lg font-extrabold font-['Montserrat']">{p.parallelSessions}</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
                        {fila.sesiones.map((sid) => (
                          <SessionCard key={sid} session={data.sesiones[sid]} day={day} p={p} trackTitle={trackTitle} />
                        ))}
                      </div>
                    </section>
                  )
                )}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
};
