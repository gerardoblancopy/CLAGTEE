import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PreCongressProfile, PreCongressRegistration, RegistrationRecord } from '../../types';
import { apiFetch } from './api';
import { statusLabels } from './StaffDashboard';

const PROFILE_LABELS: Record<PreCongressProfile, string> = {
  estudiante: 'Estudiante',
  academico: 'Académico/a',
  industria: 'Industria',
  'sector-publico': 'Sector público',
  otro: 'Otro',
};

const PROFILE_STYLES: Record<PreCongressProfile, string> = {
  estudiante: 'bg-blue-100 text-blue-700',
  academico: 'bg-purple-100 text-purple-700',
  industria: 'bg-amber-100 text-amber-700',
  'sector-publico': 'bg-teal-100 text-teal-700',
  otro: 'bg-gray-100 text-gray-600',
};

type ClagteeFilter = 'all' | 'inscrito' | 'no-inscrito';

const CLAGTEE_FILTER_LABELS: Record<ClagteeFilter, string> = {
  all: 'Todos',
  inscrito: 'Inscrito en CLAGTEE',
  'no-inscrito': 'Sin inscripción CLAGTEE',
};

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
};

const ExcelIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
    <path d="M8.5 13.5l1.8 3-1.8 3h1.7l1-1.9 1 1.9h1.7l-1.8-3 1.8-3h-1.7l-1 1.9-1-1.9H8.5z" />
  </svg>
);

// Inscripciones al Pre-congreso (Workshop + Seminario de IA), para staff y chair.
export const PreCongressDashboard: React.FC = () => {
  const [attendees, setAttendees] = useState<PreCongressRegistration[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileFilter, setProfileFilter] = useState<'all' | PreCongressProfile>('all');
  const [clagteeFilter, setClagteeFilter] = useState<ClagteeFilter>('all');
  const [search, setSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [preResponse, regResponse] = await Promise.all([
        apiFetch('/api/registrations?scope=pre-congress'),
        apiFetch('/api/registrations?scope=staff'),
      ]);
      if (!preResponse.ok) throw new Error('fetch-failed');
      const prePayload = (await preResponse.json()) as { registrations: PreCongressRegistration[] };
      setAttendees(prePayload.registrations || []);
      // El cruce con CLAGTEE es informativo: si falla, la lista se muestra igual.
      if (regResponse.ok) {
        const regPayload = (await regResponse.json()) as { registrations: RegistrationRecord[] };
        setRegistrations(regPayload.registrations || []);
      }
      setError(null);
    } catch {
      setError('No se pudieron cargar las inscripciones al Pre-congreso.');
    } finally {
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const interval = window.setInterval(() => void fetchData(), 30000);
    return () => window.clearInterval(interval);
  }, [fetchData]);

  // Inscripción activa al congreso con el mismo correo (de contacto o del CMS).
  const clagteeByEmail = useMemo(() => {
    const map = new Map<string, RegistrationRecord>();
    registrations
      .filter((reg) => reg.status !== 'cancelada')
      .forEach((reg) => {
        [reg.email, reg.cmsEmail].forEach((email) => {
          const key = (email || '').trim().toLowerCase();
          if (key && !map.has(key)) map.set(key, reg);
        });
      });
    return map;
  }, [registrations]);

  const clagteeOf = useCallback(
    (attendee: PreCongressRegistration) => clagteeByEmail.get(attendee.email.trim().toLowerCase()),
    [clagteeByEmail]
  );

  const matchesSearch = useCallback(
    (attendee: PreCongressRegistration) => {
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return [
        attendee.id,
        `${attendee.firstName} ${attendee.lastName}`,
        attendee.email,
        attendee.institution,
        attendee.position,
        attendee.country,
      ].some((value) => (value || '').toLowerCase().includes(query));
    },
    [search]
  );

  const matchesClagtee = useCallback(
    (attendee: PreCongressRegistration) => {
      if (clagteeFilter === 'all') return true;
      return clagteeFilter === 'inscrito' ? Boolean(clagteeOf(attendee)) : !clagteeOf(attendee);
    },
    [clagteeFilter, clagteeOf]
  );

  // Cada fila de chips cuenta dentro de los demás filtros activos.
  const forProfileChips = useMemo(
    () => attendees.filter((a) => matchesSearch(a) && matchesClagtee(a)),
    [attendees, matchesSearch, matchesClagtee]
  );
  const forClagteeChips = useMemo(
    () => attendees.filter((a) => matchesSearch(a) && (profileFilter === 'all' || a.profile === profileFilter)),
    [attendees, matchesSearch, profileFilter]
  );
  const filtered = useMemo(
    () => forProfileChips.filter((a) => profileFilter === 'all' || a.profile === profileFilter),
    [forProfileChips, profileFilter]
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import('xlsx');
      const rows = filtered.map((a) => {
        const reg = clagteeOf(a);
        return {
          ID: a.id,
          Nombre: a.firstName,
          Apellido: a.lastName,
          Email: a.email,
          Teléfono: a.phone || '',
          'Institución / Empresa': a.institution,
          Cargo: a.position || '',
          País: a.country,
          Perfil: PROFILE_LABELS[a.profile] || a.profile,
          'Inscripción CLAGTEE': reg?.id || '',
          'Estado CLAGTEE': reg ? statusLabels[reg.status] : '',
          Comentarios: a.comments || '',
          'Fecha inscripción': formatDate(a.createdAt),
        };
      });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ Mensaje: 'Sin inscripciones para este filtro' }]),
        'Pre-congreso'
      );
      const stamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `clagtee2026_precongreso_${stamp}.xlsx`);
    } catch (err) {
      console.error('Error al exportar el Pre-congreso a Excel:', err);
      setError('No se pudo generar la planilla Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  const chipClass = (active: boolean, activeColor: string) =>
    `px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
      active ? `${activeColor} text-white` : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
    }`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-[#0D2C54]">Pre-congreso</h3>
          <p className="text-gray-500">
            Workshop + Seminario: Inteligencia Artificial aplicada a Sistemas Eléctricos · 27 de octubre
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {[
            { label: 'Inscritos', value: attendees.length, color: 'bg-blue-100 text-blue-600' },
            {
              label: 'También en CLAGTEE',
              value: attendees.filter((a) => clagteeOf(a)).length,
              color: 'bg-green-100 text-green-600',
            },
          ].map((card) => (
            <div key={card.label} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${card.color}`}>
                {card.value}
              </div>
              <span className="text-sm font-medium text-gray-600">{card.label}</span>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase w-20">Perfil</span>
          {(['all', ...(Object.keys(PROFILE_LABELS) as PreCongressProfile[])] as const).map((p) => (
            <button key={p} type="button" onClick={() => setProfileFilter(p)} className={chipClass(profileFilter === p, 'bg-[#0D2C54]')}>
              {p === 'all' ? 'Todos' : PROFILE_LABELS[p]} (
              {p === 'all' ? forProfileChips.length : forProfileChips.filter((a) => a.profile === p).length})
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase w-20">CLAGTEE</span>
          {(Object.keys(CLAGTEE_FILTER_LABELS) as ClagteeFilter[]).map((c) => (
            <button key={c} type="button" onClick={() => setClagteeFilter(c)} className={chipClass(clagteeFilter === c, 'bg-[#2A9D8F]')}>
              {CLAGTEE_FILTER_LABELS[c]} (
              {c === 'all'
                ? forClagteeChips.length
                : forClagteeChips.filter((a) => (c === 'inscrito' ? Boolean(clagteeOf(a)) : !clagteeOf(a))).length}
              )
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center bg-white p-3.5 sm:p-4 rounded-xl border border-gray-100 shadow-sm gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, correo, institución, país o ID"
            className="w-72 max-w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#2A9D8F] outline-none"
          />
          <span className="text-sm text-gray-700">
            Mostrando <strong className="text-[#0D2C54] font-bold">{filtered.length}</strong> de{' '}
            <strong className="text-gray-900 font-bold">{attendees.length}</strong> inscritos
          </span>
        </div>
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={filtered.length === 0 || isExporting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#107C41] hover:bg-[#0D6B37] text-white text-sm font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ExcelIcon className="w-4 h-4" />
          <span>{isExporting ? 'Generando Excel…' : `Descargar Excel (${filtered.length})`}</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-12 gap-3 p-4 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
          <div className="col-span-1">ID</div>
          <div className="col-span-3">Participante</div>
          <div className="col-span-3">Institución / cargo</div>
          <div className="col-span-1">País</div>
          <div className="col-span-1">Perfil</div>
          <div className="col-span-2">CLAGTEE</div>
          <div className="col-span-1">Fecha</div>
        </div>
        <div className="divide-y divide-gray-100">
          {!hasLoaded ? (
            <div className="p-8 text-center text-gray-400">Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              {attendees.length === 0 ? 'Aún no hay inscripciones al Pre-congreso.' : 'No hay inscripciones en este filtro.'}
            </div>
          ) : (
            filtered.map((a) => {
              const reg = clagteeOf(a);
              return (
                <div key={a.id} className="grid grid-cols-12 gap-3 p-4 items-center hover:bg-[#F8FAFC] transition-colors text-sm">
                  <div className="col-span-1 font-bold text-[#0D2C54]">{a.id}</div>
                  <div className="col-span-3 min-w-0">
                    <p className="font-bold text-gray-800 truncate">
                      {a.firstName} {a.lastName}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{a.email}</p>
                    {a.phone && <p className="text-xs text-gray-400 truncate">{a.phone}</p>}
                  </div>
                  <div className="col-span-3 min-w-0">
                    <p className="text-gray-700 truncate">{a.institution}</p>
                    {a.position && <p className="text-xs text-gray-400 truncate">{a.position}</p>}
                    {a.comments && (
                      <p className="text-xs text-gray-500 italic mt-1 break-words" title={a.comments}>
                        “{a.comments}”
                      </p>
                    )}
                  </div>
                  <div className="col-span-1 text-gray-600 truncate">{a.country}</div>
                  <div className="col-span-1">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${PROFILE_STYLES[a.profile] || PROFILE_STYLES.otro}`}>
                      {PROFILE_LABELS[a.profile] || a.profile}
                    </span>
                  </div>
                  <div className="col-span-2 text-xs">
                    {reg ? (
                      <span className="text-green-700 font-bold" title={statusLabels[reg.status]}>
                        {reg.id}
                        <span className="block font-normal text-[11px] text-gray-400">{statusLabels[reg.status]}</span>
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>
                  <div className="col-span-1 text-xs text-gray-500">{formatDate(a.createdAt)}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
