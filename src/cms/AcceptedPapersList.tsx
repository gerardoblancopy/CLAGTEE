import React, { useMemo, useState } from 'react';
import { RegistrationCategory, RegistrationRecord, RegistrationStatus } from '../../types';
import { Paper } from './CMSDataContext';
import { normalizePaperId, resolveRegistrationPaperId } from './registrationSegments';

type PaperStatusFilter = 'all' | 'sin-inscripcion' | Exclude<RegistrationStatus, 'cancelada'>;

const STATUS_FILTERS: PaperStatusFilter[] = [
  'all',
  'sin-inscripcion',
  'pre-registro-creado',
  'comprobante-recibido',
  'observado',
  'pago-validado',
  'confirmada',
];

// Solo estas categorías pueden cubrir un paper.
const PAPER_CATEGORIES: RegistrationCategory[] = ['autor', 'estudiante', 'paper-adicional'];

interface AcceptedPapersListProps {
  acceptedPapers: Paper[];
  registrations: RegistrationRecord[];
  statusLabels: Record<RegistrationStatus, string>;
  statusStyles: Record<RegistrationStatus, string>;
  categoryLabels: Record<RegistrationCategory, string>;
}

// Papers aceptados con su inscripción: filtros por estado de la inscripción
// (o sin inscripción) y por categoría, con conteos cruzados como en la tabla.
export const AcceptedPapersList: React.FC<AcceptedPapersListProps> = ({
  acceptedPapers,
  registrations,
  statusLabels,
  statusStyles,
  categoryLabels,
}) => {
  const [statusFilter, setStatusFilter] = useState<PaperStatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | RegistrationCategory>('all');

  // Cada inscripción activa se resuelve una sola vez a su paper real.
  const rows = useMemo(() => {
    const byPaper = new Map<string, RegistrationRecord[]>();
    registrations
      .filter((reg) => reg.status !== 'cancelada' && reg.cmsPaperId)
      .forEach((reg) => {
        const paperId = resolveRegistrationPaperId(reg, acceptedPapers);
        if (!paperId) return;
        byPaper.set(paperId, [...(byPaper.get(paperId) || []), reg]);
      });
    return acceptedPapers.map((paper) => ({ paper, regs: byPaper.get(normalizePaperId(paper.id)) || [] }));
  }, [acceptedPapers, registrations]);

  const matchesStatus = (regs: RegistrationRecord[], filter: PaperStatusFilter) =>
    filter === 'all' ? true : filter === 'sin-inscripcion' ? regs.length === 0 : regs.some((r) => r.status === filter);
  const matchesCategory = (regs: RegistrationRecord[], filter: 'all' | RegistrationCategory) =>
    filter === 'all' || regs.some((r) => r.category === filter);

  const inCategory = rows.filter((row) => matchesCategory(row.regs, categoryFilter));
  const inStatus = rows.filter((row) => matchesStatus(row.regs, statusFilter));
  const visible = inStatus.filter((row) => matchesCategory(row.regs, categoryFilter));

  const chipClass = (active: boolean, activeColor: string) =>
    `px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
      active ? `${activeColor} text-white` : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
    }`;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 space-y-3">
        <div>
          <h4 className="text-lg font-bold text-[#0D2C54]">
            Papers aceptados ({visible.length === rows.length ? rows.length : `${visible.length} de ${rows.length}`})
          </h4>
          <p className="text-sm text-gray-500">Verifica que cada paper aceptado tenga un autor inscrito.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase w-20">Estado</span>
          {STATUS_FILTERS.map((filter) => (
            <button key={filter} type="button" onClick={() => setStatusFilter(filter)} className={chipClass(statusFilter === filter, 'bg-[#0D2C54]')}>
              {filter === 'all' ? 'Todos' : filter === 'sin-inscripcion' ? 'Sin inscripción' : statusLabels[filter]} (
              {inCategory.filter((row) => matchesStatus(row.regs, filter)).length})
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase w-20">Categoría</span>
          {(['all', ...PAPER_CATEGORIES] as const).map((category) => (
            <button key={category} type="button" onClick={() => setCategoryFilter(category)} className={chipClass(categoryFilter === category, 'bg-[#2A9D8F]')}>
              {category === 'all' ? 'Todas' : categoryLabels[category]} (
              {inStatus.filter((row) => matchesCategory(row.regs, category)).length})
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {visible.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {rows.length === 0 ? 'No hay papers aceptados aún.' : 'No hay papers en este filtro.'}
          </div>
        ) : (
          visible.map(({ paper, regs }) => (
            <div key={paper.id} className="grid grid-cols-12 gap-3 p-4 items-center text-sm">
              <div className="col-span-1 font-bold text-[#0D2C54]">{paper.id}</div>
              <div className="col-span-6">
                <p className="font-bold text-gray-800 truncate" title={paper.title}>{paper.title}</p>
                <p className="text-xs text-gray-400 truncate">{paper.authors.map((author) => author.name).join(', ')}</p>
              </div>
              <div className="col-span-5 flex flex-wrap gap-1.5">
                {regs.length > 0 ? (
                  regs.map((reg) => (
                    <span
                      key={reg.id}
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${statusStyles[reg.status]}`}
                      title={`${reg.firstName} ${reg.lastName} · ${categoryLabels[reg.category]}`}
                    >
                      {reg.id} · {statusLabels[reg.status]}
                    </span>
                  ))
                ) : (
                  <span className="text-red-600 text-xs font-bold">Sin inscripción asociada</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
