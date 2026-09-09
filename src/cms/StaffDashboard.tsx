import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from './AuthContext';
import { useCMSData } from './CMSDataContext';
import { RegistrationCategory, RegistrationRecord, RegistrationStatus } from '../../types';
import { DownloadLink } from './DownloadLink';
import { apiFetch } from './api';

const STATUS_ORDER: RegistrationStatus[] = [
  'pre-registro-creado',
  'comprobante-recibido',
  'observado',
  'pago-validado',
  'confirmada',
  'cancelada',
];

const statusLabels: Record<RegistrationStatus, string> = {
  'pre-registro-creado': 'Pre-registro',
  'comprobante-recibido': 'Comprobante recibido',
  observado: 'Observado',
  'pago-validado': 'Pago validado',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
};

const statusStyles: Record<RegistrationStatus, string> = {
  'pre-registro-creado': 'bg-gray-100 text-gray-600',
  'comprobante-recibido': 'bg-blue-100 text-blue-700',
  observado: 'bg-yellow-100 text-yellow-700',
  'pago-validado': 'bg-teal-100 text-teal-700',
  confirmada: 'bg-green-100 text-green-700',
  cancelada: 'bg-red-100 text-red-700',
};

const categoryLabels: Record<RegistrationCategory, string> = {
  autor: 'Autor',
  general: 'General',
  estudiante: 'Estudiante',
  'paper-adicional': 'Paper adicional',
  'cena-adicional': 'Cena adicional',
};

const PAPER_CATEGORIES: RegistrationCategory[] = ['autor', 'paper-adicional'];

export const StaffDashboard: React.FC = () => {
  const { user } = useAuth();
  const { papers } = useCMSData();
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | RegistrationStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const acceptedPapers = useMemo(() => papers.filter((p) => p.status === 'accepted'), [papers]);
  const acceptedById = useMemo(() => {
    const map = new Map<string, (typeof papers)[number]>();
    acceptedPapers.forEach((p) => map.set(p.id, p));
    return map;
  }, [acceptedPapers]);

  const fetchRegistrations = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const response = await apiFetch('/api/registrations?scope=staff');
      if (!response.ok) throw new Error('fetch-failed');
      const payload = (await response.json()) as { registrations: RegistrationRecord[] };
      setRegistrations(payload.registrations || []);
    } catch {
      setError('No se pudieron cargar las inscripciones.');
    }
  }, [user]);

  useEffect(() => {
    void fetchRegistrations();
    const interval = window.setInterval(() => void fetchRegistrations(), 15000);
    return () => window.clearInterval(interval);
  }, [fetchRegistrations]);

  const updateStatus = async (id: string, newStatus: RegistrationStatus) => {
    if (!user) return;
    setUpdatingId(id);
    setError(null);
    try {
      const response = await apiFetch('/api/registrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, newStatus }),
      });
      if (!response.ok) throw new Error('update-failed');
      const payload = (await response.json()) as { registration: RegistrationRecord };
      setRegistrations((prev) => prev.map((r) => (r.id === id ? payload.registration : r)));
    } catch {
      setError('No se pudo actualizar el estado.');
    } finally {
      setUpdatingId(null);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: registrations.length };
    STATUS_ORDER.forEach((s) => (c[s] = registrations.filter((r) => r.status === s).length));
    return c;
  }, [registrations]);

  const filtered = useMemo(
    () => (filter === 'all' ? registrations : registrations.filter((r) => r.status === filter)),
    [filter, registrations]
  );

  const renderPaperMatch = (reg: RegistrationRecord) => {
    if (!PAPER_CATEGORIES.includes(reg.category) && reg.category !== 'estudiante') return <span className="text-gray-300">—</span>;
    if (!reg.cmsPaperId) return <span className="text-gray-300">—</span>;
    const paper = acceptedById.get(reg.cmsPaperId);
    if (paper) {
      return (
        <span className="inline-flex items-center gap-1 text-green-700" title={paper.title}>
          ✓ {reg.cmsPaperId}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-red-600" title="No coincide con un paper aceptado">
        ✗ {reg.cmsPaperId}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-[#0D2C54]">Inscripciones (Staff)</h3>
          <p className="text-gray-500">Gestión de registros, validación de pagos y documentos</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Total', value: counts.all, color: 'bg-blue-100 text-blue-600' },
            { label: 'Comprobante', value: counts['comprobante-recibido'], color: 'bg-blue-100 text-blue-600' },
            { label: 'Observados', value: counts.observado, color: 'bg-yellow-100 text-yellow-600' },
            { label: 'Confirmados', value: counts.confirmada, color: 'bg-green-100 text-green-600' },
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

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {(['all', ...STATUS_ORDER] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              filter === f ? 'bg-[#0D2C54] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            {f === 'all' ? `Todos (${counts.all})` : `${statusLabels[f]} (${counts[f]})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-12 gap-3 p-4 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
          <div className="col-span-1">ID</div>
          <div className="col-span-3">Participante</div>
          <div className="col-span-2">Categoría</div>
          <div className="col-span-1">Monto</div>
          <div className="col-span-2">Paper</div>
          <div className="col-span-3">Estado / acciones</div>
        </div>

        <div className="divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No hay inscripciones en este filtro.</div>
          ) : (
            filtered.map((reg) => (
              <motion.div
                key={reg.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-12 gap-3 p-4 items-center hover:bg-[#F8FAFC] transition-colors"
              >
                <div className="col-span-1 font-bold text-[#0D2C54] text-sm">{reg.id}</div>
                <div className="col-span-3">
                  <p className="font-bold text-gray-800 truncate">{reg.firstName} {reg.lastName}</p>
                  <p className="text-xs text-gray-400 truncate">{reg.email}</p>
                  <button
                    type="button"
                    onClick={() => setExpandedId((prev) => (prev === reg.id ? null : reg.id))}
                    className="text-[11px] font-bold text-[#2A9D8F] hover:underline mt-1"
                  >
                    {expandedId === reg.id ? 'Ocultar detalle' : 'Ver detalle'}
                  </button>
                </div>
                <div className="col-span-2 text-sm text-gray-600">
                  {categoryLabels[reg.category]}
                  <span className="block text-[11px] text-gray-400">
                    {reg.phase === 'early-bird' ? 'Early Bird' : 'Regular'}
                  </span>
                </div>
                <div className="col-span-1 text-sm font-semibold text-gray-700">USD {reg.amountUsd}</div>
                <div className="col-span-2 text-xs">{renderPaperMatch(reg)}</div>
                <div className="col-span-3 space-y-2">
                  <select
                    className={`w-full px-2 py-1 rounded text-xs font-bold ${statusStyles[reg.status]}`}
                    value={reg.status}
                    disabled={updatingId === reg.id}
                    onChange={(e) => updateStatus(reg.id, e.target.value as RegistrationStatus)}
                  >
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {statusLabels[s]}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    {reg.comprobanteFileKey && (
                      <DownloadLink
                        fileKey={reg.comprobanteFileKey}
                        fileName={reg.comprobanteFileName}
                        className="text-[11px] font-bold text-[#2A9D8F] hover:underline"
                      >
                        📎 Comprobante
                      </DownloadLink>
                    )}
                    {reg.studentProofFileKey && (
                      <DownloadLink
                        fileKey={reg.studentProofFileKey}
                        fileName={reg.studentProofFileName}
                        className="text-[11px] font-bold text-[#2A9D8F] hover:underline"
                      >
                        🎓 Cert. estudiante
                      </DownloadLink>
                    )}
                    {reg.transactionCode && (
                      <span className="text-[11px] text-gray-400">Tx: {reg.transactionCode}</span>
                    )}
                  </div>
                </div>

                {expandedId === reg.id && (
                  <div className="col-span-12 bg-[#F8FAFC] border border-gray-100 rounded-xl p-4 text-sm text-gray-600 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
                    <Detail label="País" value={reg.country} />
                    <Detail label="Afiliación" value={reg.affiliation} />
                    <Detail label="Dieta" value={reg.dietary} />
                    {reg.cmsPaperId && <Detail label="Paper ID (CMS)" value={reg.cmsPaperId} />}
                    {reg.paperTitle && <Detail label="Título paper" value={reg.paperTitle} />}
                    {reg.presenterName && <Detail label="Autor presentador" value={reg.presenterName} />}
                    {reg.cmsEmail && <Detail label="Correo CMS" value={reg.cmsEmail} />}
                    {reg.coverage && <Detail label="Cobertura" value={reg.coverage} />}
                    {reg.mainRegistrationId && <Detail label="Inscripción principal" value={reg.mainRegistrationId} />}
                    {reg.mainAuthorEmail && <Detail label="Correo autor principal" value={reg.mainAuthorEmail} />}
                    {reg.studentType && <Detail label="Tipo estudiante" value={reg.studentType} />}
                    {reg.program && <Detail label="Programa" value={reg.program} />}
                    {reg.level && <Detail label="Nivel" value={reg.level} />}
                    {reg.mainParticipantName && <Detail label="Participante principal" value={reg.mainParticipantName} />}
                    {reg.mainParticipantEmail && <Detail label="Correo participante" value={reg.mainParticipantEmail} />}
                    {reg.ticketUserName && <Detail label="Usa el ticket" value={reg.ticketUserName} />}
                    {reg.ticketDietary && <Detail label="Dieta ticket" value={reg.ticketDietary} />}
                    {reg.staffNote && <Detail label="Nota staff" value={reg.staffNote} />}
                    {reg.reviewedBy && <Detail label="Revisado por" value={reg.reviewedBy} />}
                    <Detail label="Creado" value={new Date(reg.createdAt).toLocaleString()} />
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Accepted papers cross-check */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h4 className="text-lg font-bold text-[#0D2C54]">Papers aceptados ({acceptedPapers.length})</h4>
          <p className="text-sm text-gray-500">Verifica que cada paper aceptado tenga un autor inscrito.</p>
        </div>
        <div className="divide-y divide-gray-100">
          {acceptedPapers.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No hay papers aceptados aún.</div>
          ) : (
            acceptedPapers.map((paper) => {
              const regs = registrations.filter((r) => r.cmsPaperId === paper.id);
              return (
                <div key={paper.id} className="grid grid-cols-12 gap-3 p-4 items-center text-sm">
                  <div className="col-span-1 font-bold text-[#0D2C54]">{paper.id}</div>
                  <div className="col-span-6">
                    <p className="font-bold text-gray-800 truncate">{paper.title}</p>
                    <p className="text-xs text-gray-400 truncate">{paper.authors[0]?.name}</p>
                  </div>
                  <div className="col-span-5">
                    {regs.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-green-700 text-xs font-bold">
                        ✓ Inscrito: {regs.map((r) => r.id).join(', ')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600 text-xs font-bold">
                        ✗ Sin inscripción asociada
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {isLoading && <p className="text-center text-sm text-gray-400">Cargando…</p>}
    </div>
  );
};

const Detail: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <div>
    <span className="block text-[11px] font-bold text-gray-400 uppercase">{label}</span>
    <span className="text-sm text-gray-700 break-words">{value || '—'}</span>
  </div>
);
