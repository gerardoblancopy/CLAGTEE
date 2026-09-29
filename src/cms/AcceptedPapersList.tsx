import React, { useMemo, useState } from 'react';
import { RegistrationCategory, RegistrationRecord, RegistrationStatus } from '../../types';
import { useAuth } from './AuthContext';
import { Paper, PaperStatus, useCMSData } from './CMSDataContext';
import {
  exportPapersToExcel,
  paperStatusLabels,
  paperStatusStyles,
  resolvePaperAuthors,
} from './exportPapersExcel';
import { normalizePaperId, resolveRegistrationPaperId } from './registrationSegments';
import { PaperEmailModal, PaperEmailTarget } from './PaperEmailModal';

type PaperClassificationFilter = 'all' | PaperStatus;
type RegistrationFilter = 'all' | 'sin-inscripcion' | 'con-inscripcion' | Exclude<RegistrationStatus, 'cancelada'>;

const PAPER_STATUS_OPTIONS: PaperStatus[] = [
  'accepted',
  'rejected',
  'under-review',
  'pending',
  'withdrawn',
];

const REG_STATUS_OPTIONS: RegistrationFilter[] = [
  'all',
  'sin-inscripcion',
  'con-inscripcion',
  'confirmada',
  'pago-validado',
  'comprobante-recibido',
  'observado',
  'pre-registro-creado',
];

const ExcelIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
    <path d="M8.5 13.5l1.8 3-1.8 3h1.7l1-1.9 1 1.9h1.7l-1.8-3 1.8-3h-1.7l-1 1.9-1-1.9H8.5z" />
  </svg>
);

const CopyIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
    />
  </svg>
);

interface AcceptedPapersListProps {
  papers?: Paper[];
  acceptedPapers?: Paper[];
  registrations: RegistrationRecord[];
  statusLabels: Record<RegistrationStatus, string>;
  statusStyles: Record<RegistrationStatus, string>;
  categoryLabels: Record<RegistrationCategory, string>;
}

export const AcceptedPapersList: React.FC<AcceptedPapersListProps> = ({
  papers: papersProp,
  acceptedPapers,
  registrations,
  statusLabels,
  statusStyles,
  categoryLabels,
}) => {
  const { user, users } = useAuth();
  const { papers: contextPapers, setDecision } = useCMSData();

  // Preferir lista completa de papers
  const allPapersList = useMemo(() => {
    if (papersProp && papersProp.length > 0) return papersProp;
    if (contextPapers && contextPapers.length > 0) return contextPapers;
    return acceptedPapers || [];
  }, [papersProp, contextPapers, acceptedPapers]);

  const [paperFilter, setPaperFilter] = useState<PaperClassificationFilter>('all');
  const [regFilter, setRegFilter] = useState<RegistrationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [expandedAuthorsId, setExpandedAuthorsId] = useState<string | null>(null);
  const [emailTarget, setEmailTarget] = useState<PaperEmailTarget | null>(null);

  // Mapa de inscripciones asociadas por paperId real
  const regByPaperId = useMemo(() => {
    const map = new Map<string, RegistrationRecord[]>();
    registrations
      .filter((reg) => reg.status !== 'cancelada' && reg.cmsPaperId)
      .forEach((reg) => {
        const resolved = resolveRegistrationPaperId(reg, allPapersList);
        if (!resolved) return;
        const key = normalizePaperId(resolved);
        map.set(key, [...(map.get(key) || []), reg]);
      });
    return map;
  }, [registrations, allPapersList]);

  // Conteos por estado de paper
  const paperStatusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allPapersList.length };
    PAPER_STATUS_OPTIONS.forEach((st) => {
      counts[st] = allPapersList.filter((p) => p.status === st).length;
    });
    return counts;
  }, [allPapersList]);

  // Filtrado reactivo de papers
  const visiblePapers = useMemo(() => {
    return allPapersList.filter((paper) => {
      // 1. Filtro por clasificación / estado del paper
      if (paperFilter !== 'all' && paper.status !== paperFilter) {
        return false;
      }

      // 2. Filtro por inscripción
      const regs = regByPaperId.get(normalizePaperId(paper.id)) || [];
      if (regFilter === 'sin-inscripcion' && regs.length > 0) return false;
      if (regFilter === 'con-inscripcion' && regs.length === 0) return false;
      if (
        regFilter !== 'all' &&
        regFilter !== 'sin-inscripcion' &&
        regFilter !== 'con-inscripcion' &&
        !regs.some((r) => r.status === regFilter)
      ) {
        return false;
      }

      // 3. Filtro por búsqueda textual
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = (paper.id || '').toLowerCase().includes(q);
        const titleMatch = (paper.title || '').toLowerCase().includes(q);
        const trackMatch = (paper.track || '').toLowerCase().includes(q);

        const authorsInfo = resolvePaperAuthors(paper, users);
        const corrMatch =
          authorsInfo.correspondingAuthor.name.toLowerCase().includes(q) ||
          authorsInfo.correspondingAuthor.email.toLowerCase().includes(q);
        const coAuthorMatch = authorsInfo.coAuthors.some(
          (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
        );

        if (!idMatch && !titleMatch && !trackMatch && !corrMatch && !coAuthorMatch) {
          return false;
        }
      }

      return true;
    });
  }, [allPapersList, paperFilter, regFilter, searchQuery, regByPaperId, users]);

  // Cambiar clasificación de un paper (Aceptar, Rechazar, En revisión, etc.)
  const handleClassificationChange = async (paperId: string, newStatus: PaperStatus) => {
    const currentPaper = allPapersList.find((p) => p.id === paperId);
    if (!currentPaper || currentPaper.status === newStatus) return;

    const confirmMsg = `¿Deseas clasificar el paper "${paperId}" como "${paperStatusLabels[newStatus]}"?`;
    if (!window.confirm(confirmMsg)) return;

    setUpdatingId(paperId);
    setFeedback(null);
    try {
      await setDecision(paperId, newStatus);
      setFeedback(`Paper ${paperId} clasificado como "${paperStatusLabels[newStatus]}".`);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback(`Error al clasificar el paper ${paperId}.`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Copiar correos al portapapeles
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setFeedback(`Copiado: ${label}`);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Copiar correos de todos los papers visibles
  const handleCopyAllVisibleEmails = () => {
    const emailSet = new Set<string>();
    visiblePapers.forEach((p) => {
      const details = resolvePaperAuthors(p, users);
      details.allEmails.forEach((email) => emailSet.add(email));
    });
    const list = Array.from(emailSet).join(', ');
    if (!list) {
      setFeedback('No hay correos en la selección actual.');
      return;
    }
    copyToClipboard(list, `${emailSet.size} correos de autores`);
  };

  // Exportar a Excel (.xlsx)
  const handleExport = async (mode: 'filtered' | 'all' = 'filtered') => {
    setIsExporting(true);
    setFeedback(null);
    try {
      await exportPapersToExcel({
        papers: visiblePapers,
        allPapers: allPapersList,
        users,
        registrations,
        paperFilter,
        statusLabels,
        mode,
      });
      const filterName =
        paperFilter === 'all' ? 'todos los papers' : `papers ${paperStatusLabels[paperFilter].toLowerCase()}s`;
      setFeedback(
        mode === 'all'
          ? `Planilla Excel generada con los ${allPapersList.length} papers del sistema (con pestañas).`
          : `Planilla Excel descargada con los ${visiblePapers.length} ${filterName}.`
      );
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      console.error('Error al exportar papers a Excel:', err);
      setFeedback('No se pudo generar la planilla Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  const isStaffOrChair = user?.role === 'chair' || user?.role === 'staff';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden space-y-4">
      {/* Header y Filtros */}
      <div className="p-5 border-b border-gray-100 space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h4 className="text-xl font-bold text-[#0D2C54] flex items-center gap-2">
              <span>Clasificación y Gestión de Papers</span>
              <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-semibold border border-blue-200">
                {visiblePapers.length} de {allPapersList.length} trabajos
              </span>
            </h4>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Clasifica trabajos (Aceptados, Rechazados, etc.), visualiza autores correspondientes y co-autores, y exporta a Excel según cada filtro.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setEmailTarget({
                  mode: 'bulk',
                  papers: visiblePapers,
                  filterLabel:
                    paperFilter === 'all'
                      ? 'Todos los papers'
                      : `Papers ${paperStatusLabels[paperFilter]}s`,
                  defaultStatus: paperFilter !== 'all' ? paperFilter : undefined,
                })
              }
              disabled={visiblePapers.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#2A9D8F] hover:bg-[#21867a] text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 active:scale-[0.98]"
              title={`Enviar correo masivo a los autores de los ${visiblePapers.length} papers filtrados`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Enviar correo masivo ({visiblePapers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => void handleExport('filtered')}
              disabled={visiblePapers.length === 0 || isExporting}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#107C41] hover:bg-[#0D6B37] text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow active:scale-[0.98]"
              title={`Descargar Excel con los ${visiblePapers.length} papers del filtro actual`}
            >
              <ExcelIcon className="w-4 h-4" />
              <span>{isExporting ? 'Generando Excel…' : `Descargar Excel (${visiblePapers.length})`}</span>
            </button>

            {paperFilter !== 'all' && (
              <button
                type="button"
                onClick={() => void handleExport('all')}
                disabled={allPapersList.length === 0 || isExporting}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 transition-all disabled:opacity-50"
                title="Descargar libro Excel completo con todas las clasificaciones y pestañas"
              >
                <ExcelIcon className="w-3.5 h-3.5 text-gray-500" />
                <span>Todos ({allPapersList.length})</span>
              </button>
            )}
          </div>
        </div>

        {feedback && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-2.5 rounded-xl animate-fade-in flex items-center justify-between">
            <span>{feedback}</span>
            <button type="button" onClick={() => setFeedback(null)} className="text-emerald-600 hover:underline text-[11px]">
              Cerrar
            </button>
          </div>
        )}

        {/* 1. Selector de Clasificación de Papers */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Clasificación / Estado del Paper:
            </span>
            <button
              type="button"
              onClick={handleCopyAllVisibleEmails}
              className="text-xs font-semibold text-[#2A9D8F] hover:underline flex items-center gap-1"
              title="Copiar todos los correos de autores de los papers visibles al portapapeles"
            >
              <CopyIcon className="w-3.5 h-3.5" />
              <span>Copiar correos filtrados</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPaperFilter('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                paperFilter === 'all' ? 'bg-[#0D2C54] text-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              Todos ({paperStatusCounts.all || 0})
            </button>

            <button
              type="button"
              onClick={() => setPaperFilter('accepted')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                paperFilter === 'accepted'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
              }`}
            >
              ✓ Aceptados ({paperStatusCounts.accepted || 0})
            </button>

            <button
              type="button"
              onClick={() => setPaperFilter('rejected')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                paperFilter === 'rejected'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}
            >
              ✕ Rechazados ({paperStatusCounts.rejected || 0})
            </button>

            <button
              type="button"
              onClick={() => setPaperFilter('under-review')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                paperFilter === 'under-review'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              En revisión ({paperStatusCounts['under-review'] || 0})
            </button>

            <button
              type="button"
              onClick={() => setPaperFilter('pending')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                paperFilter === 'pending'
                  ? 'bg-yellow-600 text-white shadow-sm'
                  : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
              }`}
            >
              Pendientes ({paperStatusCounts.pending || 0})
            </button>

            <button
              type="button"
              onClick={() => setPaperFilter('withdrawn')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                paperFilter === 'withdrawn'
                  ? 'bg-gray-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Retirados ({paperStatusCounts.withdrawn || 0})
            </button>
          </div>
        </div>

        {/* 2. Filtro secundario: Cruce con Inscripción y Buscador */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase w-20">Inscripción:</span>
            {REG_STATUS_OPTIONS.slice(0, 4).map((filterOpt) => (
              <button
                key={filterOpt}
                type="button"
                onClick={() => setRegFilter(filterOpt)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  regFilter === filterOpt
                    ? 'bg-[#2A9D8F] text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {filterOpt === 'all'
                  ? 'Todas'
                  : filterOpt === 'sin-inscripcion'
                  ? 'Sin inscripción'
                  : filterOpt === 'con-inscripcion'
                  ? 'Con inscripción'
                  : statusLabels[filterOpt] || filterOpt}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Buscar por ID, título, autor o email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]"
            />
          </div>
        </div>
      </div>

      {/* Lista de Papers */}
      <div className="divide-y divide-gray-100">
        {visiblePapers.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {allPapersList.length === 0
              ? 'No hay papers cargados en el sistema.'
              : 'No se encontraron papers con los filtros seleccionados.'}
          </div>
        ) : (
          visiblePapers.map((paper) => {
            const authorsInfo = resolvePaperAuthors(paper, users);
            const regs = regByPaperId.get(normalizePaperId(paper.id)) || [];
            const isUpdating = updatingId === paper.id;
            const isAuthorsExpanded = expandedAuthorsId === paper.id;

            return (
              <div
                key={paper.id}
                className="p-4 sm:p-5 hover:bg-[#F8FAFC] transition-colors space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  {/* ID, Título y Clasificación */}
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-sm bg-slate-100 text-[#0D2C54] px-2.5 py-0.5 rounded border border-slate-200">
                        {paper.id}
                      </span>
                      {paper.track && (
                        <span className="text-[11px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {paper.track}
                        </span>
                      )}
                    </div>
                    <h5 className="font-bold text-gray-900 text-base leading-snug">
                      {paper.title}
                    </h5>
                  </div>

                  {/* Clasificador / Selector de Decisión */}
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-gray-400 uppercase">Clasificación:</span>
                      {isStaffOrChair ? (
                        <select
                          value={paper.status}
                          disabled={isUpdating}
                          onChange={(e) => handleClassificationChange(paper.id, e.target.value as PaperStatus)}
                          className={`px-3 py-1 text-xs font-bold rounded-lg border focus:ring-2 focus:ring-[#2A9D8F] ${
                            paperStatusStyles[paper.status] || 'bg-gray-100 text-gray-800'
                          } ${isUpdating ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                          title="Haz clic para cambiar la clasificación del paper"
                        >
                          {PAPER_STATUS_OPTIONS.map((st) => (
                            <option key={st} value={st}>
                              {paperStatusLabels[st]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                            paperStatusStyles[paper.status] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {paperStatusLabels[paper.status]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sección de Autores: Autor Correspondiente y Co-autores */}
                <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-3 text-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {/* Autor correspondiente */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">
                        Autor correspondiente (sometió)
                      </span>
                      <strong className="text-gray-900 font-bold">
                        {authorsInfo.correspondingAuthor.name}
                      </strong>
                      {authorsInfo.correspondingAuthor.email && (
                        <span className="inline-flex items-center gap-1 text-gray-500">
                          <a
                            href={`mailto:${authorsInfo.correspondingAuthor.email}`}
                            className="text-[#2A9D8F] hover:underline"
                          >
                            {authorsInfo.correspondingAuthor.email}
                          </a>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(authorsInfo.correspondingAuthor.email, 'correo')}
                            title="Copiar correo"
                            className="text-gray-400 hover:text-gray-700"
                          >
                            <CopyIcon className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {authorsInfo.correspondingAuthor.affiliation && (
                        <span className="text-gray-400">
                          · {authorsInfo.correspondingAuthor.affiliation}
                        </span>
                      )}
                    </div>

                    {/* Botones de correo de este paper */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setEmailTarget({
                            mode: 'single',
                            paper,
                            defaultStatus: paper.status,
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-teal-50 text-[#0D2C54] hover:text-[#2A9D8F] text-[11px] font-bold rounded-lg border border-gray-200 transition-colors shadow-2xs"
                        title={`Enviar correo a los autores del paper ${paper.id}`}
                      >
                        <svg className="w-3.5 h-3.5 text-[#2A9D8F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>Enviar correo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(authorsInfo.allEmails.join(', '), `correos del paper ${paper.id}`)
                        }
                        className="text-[11px] font-semibold text-gray-500 hover:text-[#0D2C54] flex items-center gap-1 hover:underline"
                        title="Copiar todos los correos de este paper al portapapeles"
                      >
                        <CopyIcon className="w-3 h-3" />
                        <span>Copiar correos ({authorsInfo.allEmails.length})</span>
                      </button>
                    </div>
                  </div>

                  {/* Co-autores */}
                  <div className="pt-1 border-t border-gray-200/60">
                    {authorsInfo.coAuthors.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-[11px] font-semibold">
                            Co-autores ({authorsInfo.coAuthors.length}):
                          </span>
                          {authorsInfo.coAuthors.length > 2 && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedAuthorsId((prev) => (prev === paper.id ? null : paper.id))
                              }
                              className="text-[10px] text-[#2A9D8F] font-bold hover:underline"
                            >
                              {isAuthorsExpanded ? 'Ver menos' : `Ver todos (${authorsInfo.coAuthors.length})`}
                            </button>
                          )}
                        </div>

                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {(isAuthorsExpanded
                            ? authorsInfo.coAuthors
                            : authorsInfo.coAuthors.slice(0, 3)
                          ).map((co, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 bg-white border border-gray-200 px-2 py-0.5 rounded text-[11px] text-gray-700"
                            >
                              <span className="font-medium">{co.name}</span>
                              {co.email && (
                                <a
                                  href={`mailto:${co.email}`}
                                  className="text-gray-400 hover:text-[#2A9D8F]"
                                  title={co.email}
                                >
                                  &lt;{co.email}&gt;
                                </a>
                              )}
                              {co.affiliation && (
                                <span className="text-gray-400 text-[10px]">({co.affiliation})</span>
                              )}
                            </span>
                          ))}
                          {!isAuthorsExpanded && authorsInfo.coAuthors.length > 3 && (
                            <span className="text-[11px] text-gray-400 self-center">
                              +{authorsInfo.coAuthors.length - 3} más
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-[11px] italic">Sin co-autores registrados</span>
                    )}
                  </div>
                </div>

                {/* Cruce con Inscripción en CMS */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-semibold text-[11px]">Estado de inscripción:</span>
                    {regs.length > 0 ? (
                      regs.map((reg) => (
                        <span
                          key={reg.id}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusStyles[reg.status] || 'bg-gray-100 text-gray-700'}`}
                          title={`${reg.firstName} ${reg.lastName} · ${categoryLabels[reg.category] || reg.category} · ${reg.email}`}
                        >
                          {reg.id} · {statusLabels[reg.status] || reg.status} ({categoryLabels[reg.category] || reg.category})
                        </span>
                      ))
                    ) : (
                      <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
                        Sin inscripción asociada
                      </span>
                    )}
                  </div>

                  {paper.reviews && paper.reviews.length > 0 && (
                    <span className="text-gray-400 text-[11px]">
                      {paper.reviews.length} evaluación(es) · Promedio:{' '}
                      {(
                        paper.reviews.reduce((acc, r) => acc + (r.score || 0), 0) /
                        paper.reviews.length
                      ).toFixed(1)}
                      /5
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de envío de correos (individual o masivo con filtros) */}
      <PaperEmailModal
        target={emailTarget}
        onClose={() => setEmailTarget(null)}
        users={users}
        onSentSuccess={(msg) => {
          setFeedback(msg);
          setTimeout(() => setFeedback(null), 5000);
        }}
      />
    </div>
  );
};
