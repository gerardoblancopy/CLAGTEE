import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from './AuthContext';
import { useCMSData } from './CMSDataContext';
import { RegistrationCategory, RegistrationRecord, RegistrationStatus } from '../../types';
import { DownloadLink } from './DownloadLink';
import { apiFetch } from './api';
import { StaffMailer } from './StaffMailer';
import { AcceptedPapersList } from './AcceptedPapersList';
import { MailSegment, getUncoveredPapers, normalizePaperId, resolveRegistrationPaperId } from './registrationSegments';
import { exportRegistrationsToExcel } from './exportRegistrationsExcel';
import { collectRegistrationFiles, downloadRegistrationFilesZip } from './downloadRegistrationFiles';

const STATUS_ORDER: RegistrationStatus[] = [
  'pre-registro-creado',
  'comprobante-recibido',
  'observado',
  'pago-validado',
  'confirmada',
  'cancelada',
];

export const statusLabels: Record<RegistrationStatus, string> = {
  'pre-registro-creado': 'Pre-registro',
  'comprobante-recibido': 'Comprobante recibido',
  observado: 'Observado',
  'pago-validado': 'Pago validado',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
};

export const statusStyles: Record<RegistrationStatus, string> = {
  'pre-registro-creado': 'bg-gray-100 text-gray-600',
  'comprobante-recibido': 'bg-blue-100 text-blue-700',
  observado: 'bg-yellow-100 text-yellow-700',
  'pago-validado': 'bg-teal-100 text-teal-700',
  confirmada: 'bg-green-100 text-green-700',
  cancelada: 'bg-red-100 text-red-700',
};

export const categoryLabels: Record<RegistrationCategory, string> = {
  autor: 'Autor',
  general: 'General',
  estudiante: 'Estudiante',
  'paper-adicional': 'Paper adicional',
  'cena-adicional': 'Cena adicional',
  'empresa-stand': 'Stand Empresas',
};

const PAPER_CATEGORIES: RegistrationCategory[] = ['autor', 'paper-adicional'];

// Estados que envían un correo automático al participante (ver api/_lib/participant-access.js).
const NOTIFY_STATUSES: RegistrationStatus[] = ['observado', 'pago-validado', 'confirmada'];

const CheckIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ExcelIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
    <path d="M8.5 13.5l1.8 3-1.8 3h1.7l1-1.9 1 1.9h1.7l-1.8-3 1.8-3h-1.7l-1 1.9-1-1.9H8.5z" />
  </svg>
);

const ZipIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" />
  </svg>
);

export const StaffDashboard: React.FC = () => {
  const { user } = useAuth();
  const { papers } = useCMSData();
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | RegistrationStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | RegistrationCategory>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [mailSegment, setMailSegment] = useState<MailSegment>('sin-iniciar');
  const [isExporting, setIsExporting] = useState(false);
  const [zipProgress, setZipProgress] = useState<{ done: number; total: number } | null>(null);
  const mailerRef = useRef<HTMLDivElement>(null);

  const acceptedPapers = useMemo(() => papers.filter((p) => p.status === 'accepted'), [papers]);
  const acceptedById = useMemo(() => {
    const map = new Map<string, (typeof papers)[number]>();
    acceptedPapers.forEach((p) => map.set(normalizePaperId(p.id), p));
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
    const current = registrations.find((r) => r.id === id);
    const willNotify = Boolean(current) && current!.status !== newStatus && NOTIFY_STATUSES.includes(newStatus);
    let staffNote: string | undefined;
    if (willNotify && newStatus === 'observado') {
      const note = window.prompt(
        `Motivo de la observación de ${id}. Se incluirá en el correo automático a ${current!.email}:`,
        current!.staffNote || ''
      );
      if (note === null) return;
      staffNote = note.trim() || undefined;
    } else if (
      willNotify &&
      !window.confirm(
        `Se cambiará ${id} a "${statusLabels[newStatus]}" y se enviará un correo automático a ${current!.email}. ¿Continuar?`
      )
    ) {
      return;
    }

    setUpdatingId(id);
    setError(null);
    setNotice(null);
    try {
      const response = await apiFetch('/api/registrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, newStatus, staffNote }),
      });
      if (!response.ok) throw new Error('update-failed');
      const payload = (await response.json()) as { registration: RegistrationRecord; notified?: boolean };
      setRegistrations((prev) => prev.map((r) => (r.id === id ? payload.registration : r)));
      if (willNotify) {
        if (payload.notified) setNotice(`${id}: estado actualizado y correo enviado a ${current!.email}.`);
        else setError(`${id}: estado actualizado, pero no se pudo enviar el correo a ${current!.email}.`);
      }
    } catch {
      setError('No se pudo actualizar el estado.');
    } finally {
      setUpdatingId(null);
    }
  };

  const uncoveredPapers = useMemo(
    () => getUncoveredPapers(acceptedPapers, registrations),
    [acceptedPapers, registrations]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: registrations.length };
    STATUS_ORDER.forEach((s) => (c[s] = registrations.filter((r) => r.status === s).length));
    return c;
  }, [registrations]);

  // Filtros combinables: cada fila de chips cuenta dentro del filtro elegido en la otra.
  const inStatus = useMemo(
    () => (filter === 'all' ? registrations : registrations.filter((r) => r.status === filter)),
    [filter, registrations]
  );
  const inCategory = useMemo(
    () => (categoryFilter === 'all' ? registrations : registrations.filter((r) => r.category === categoryFilter)),
    [categoryFilter, registrations]
  );
  const filtered = useMemo(
    () => (categoryFilter === 'all' ? inStatus : inStatus.filter((r) => r.category === categoryFilter)),
    [inStatus, categoryFilter]
  );

  // Comprobantes y certificados de estudiante de las inscripciones del filtro actual.
  const filteredFiles = useMemo(() => collectRegistrationFiles(filtered), [filtered]);

  const handleDownloadFiles = async () => {
    if (filteredFiles.length === 0 || zipProgress) return;
    setZipProgress({ done: 0, total: filteredFiles.length });
    setError(null);
    setNotice(null);
    try {
      const { downloaded, failed } = await downloadRegistrationFilesZip({
        files: filteredFiles,
        statusFilter: filter,
        categoryFilter,
        onProgress: (done, total) => setZipProgress({ done, total }),
      });
      setNotice(`ZIP descargado con ${downloaded} archivos (comprobantes y certificados).`);
      if (failed.length > 0) {
        setError(
          `No se pudieron descargar ${failed.length} archivos (${failed
            .map((file) => file.registrationId)
            .join(', ')}). El ZIP incluye la lista en _no-descargados.txt.`
        );
      }
    } catch (err) {
      console.error('Error al descargar comprobantes y certificados:', err);
      setError('No se pudo generar el ZIP de comprobantes y certificados.');
    } finally {
      setZipProgress(null);
    }
  };

  const handleExport = async (mode: 'filtered' | 'all' = 'filtered') => {
    setIsExporting(true);
    setError(null);
    try {
      await exportRegistrationsToExcel({
        registrations: filtered,
        allRegistrations: registrations,
        statusFilter: filter,
        categoryFilter: categoryFilter,
        acceptedPapers,
        statusLabels,
        categoryLabels,
        mode,
      });
      const activeFilterLabel = [
        filter !== 'all' ? statusLabels[filter] : null,
        categoryFilter !== 'all' ? categoryLabels[categoryFilter] : null,
      ]
        .filter(Boolean)
        .join(' · ');

      setNotice(
        mode === 'all'
          ? `Planilla Excel generada con los ${registrations.length} registros totales.`
          : `Planilla Excel descargada con los ${filtered.length} registros${activeFilterLabel ? ` (${activeFilterLabel})` : ''}.`
      );
    } catch (err) {
      console.error('Error al exportar a Excel:', err);
      setError('No se pudo generar la planilla Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  const renderPaperMatch = (reg: RegistrationRecord) => {
    if (!PAPER_CATEGORIES.includes(reg.category) && reg.category !== 'estudiante') return <span className="text-gray-300">—</span>;
    if (!reg.cmsPaperId) return <span className="text-gray-300">—</span>;
    const paper = acceptedById.get(resolveRegistrationPaperId(reg, acceptedPapers) || '');
    if (paper) {
      // Si el ID escrito no es el real (se reconoció por título), se muestra el real.
      const typedDiffers = normalizePaperId(reg.cmsPaperId) !== normalizePaperId(paper.id);
      return (
        <span
          className="inline-flex items-center gap-1 text-green-700"
          title={typedDiffers ? `${paper.title} (escrito: ${reg.cmsPaperId})` : paper.title}
        >
          <CheckIcon className="w-3.5 h-3.5" />
          <span>{paper.id}</span>
          {typedDiffers && <span className="text-[10px] text-gray-400">(escrito: {reg.cmsPaperId})</span>}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-red-600" title="No coincide con un paper aceptado">
        <XIcon className="w-3.5 h-3.5" />
        <span>{reg.cmsPaperId}</span>
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
        <div className="flex flex-wrap items-center gap-3">
          {/* Botón superior de descarga rápida Excel según filtro activo */}
          <button
            type="button"
            onClick={() => void handleExport('filtered')}
            disabled={filtered.length === 0 || isExporting}
            className="bg-[#107C41] hover:bg-[#0D6B37] text-white px-4 py-2.5 rounded-xl shadow-sm border border-emerald-600 flex items-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow active:scale-[0.98]"
            title={`Descargar Excel con los ${filtered.length} registrados del filtro actual`}
          >
            <ExcelIcon className="w-4 h-4" />
            <span className="text-sm font-bold">
              {isExporting ? 'Generando…' : `Descargar Excel (${filtered.length})`}
            </span>
          </button>

          {/* Total = registros iniciados (cualquier estado) + papers aceptados sin iniciar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold bg-blue-100 text-blue-600">
              {counts.all + uncoveredPapers.length}
            </div>
            <span className="text-sm font-medium text-gray-600 text-left">
              Total
              <span className="block text-[11px] text-gray-400">
                {counts.all} iniciados + {uncoveredPapers.length} sin iniciar
              </span>
            </span>
          </div>
          {/* Papers aceptados sin ninguna inscripción: abre el panel de correos filtrado */}
          <button
            type="button"
            onClick={() => {
              setMailSegment('sin-iniciar');
              mailerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            title="Papers aceptados sin inscripción activa. Clic para escribir a sus autores."
            className="bg-white p-4 rounded-xl shadow-sm border border-orange-200 flex items-center space-x-3 hover:bg-orange-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold bg-orange-100 text-orange-600">
              {uncoveredPapers.length}
            </div>
            <span className="text-sm font-medium text-gray-600 text-left">
              Sin iniciar
              <span className="block text-[11px] text-gray-400">papers sin inscripción</span>
            </span>
          </button>
          {[
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
      {notice && (
        <div className="bg-green-50 border border-green-100 text-green-700 text-sm px-4 py-3 rounded-xl">{notice}</div>
      )}

      {/* Filtros: estado y categoría de inscripción */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase w-20">Estado</span>
          {(['all', ...STATUS_ORDER] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                filter === f ? 'bg-[#0D2C54] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {f === 'all' ? 'Todos' : statusLabels[f]} (
              {f === 'all' ? inCategory.length : inCategory.filter((r) => r.status === f).length})
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase w-20">Categoría</span>
          {(['all', ...(Object.keys(categoryLabels) as RegistrationCategory[])] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                categoryFilter === c ? 'bg-[#2A9D8F] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {c === 'all' ? 'Todas' : categoryLabels[c]} (
              {c === 'all' ? inStatus.length : inStatus.filter((r) => r.category === c).length})
            </button>
          ))}
        </div>
      </div>

      {/* Barra de acción: total filtrado y botón de descarga Excel según cada filtro */}
      <div className="flex flex-wrap justify-between items-center bg-white p-3.5 sm:p-4 rounded-xl border border-gray-100 shadow-sm gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-700">
            Mostrando <strong className="text-[#0D2C54] font-bold">{filtered.length}</strong> de{' '}
            <strong className="text-gray-900 font-bold">{registrations.length}</strong> inscripciones
          </span>
          {filter !== 'all' || categoryFilter !== 'all' ? (
            <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-full font-semibold">
              Filtro: {filter !== 'all' ? statusLabels[filter] : 'Todos los estados'} ·{' '}
              {categoryFilter !== 'all' ? categoryLabels[categoryFilter] : 'Todas las categorías'}
            </span>
          ) : (
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
              Todos los registros seleccionados
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleExport('filtered')}
            disabled={filtered.length === 0 || isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#107C41] hover:bg-[#0D6B37] text-white text-sm font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow active:scale-[0.98]"
            title={`Descargar planilla Excel con los ${filtered.length} registrados según el filtro actual`}
          >
            <ExcelIcon className="w-4 h-4" />
            <span>{isExporting ? 'Generando Excel…' : `Descargar Excel (${filtered.length})`}</span>
          </button>

          <button
            type="button"
            onClick={() => void handleDownloadFiles()}
            disabled={filteredFiles.length === 0 || zipProgress !== null}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0D2C54] hover:bg-[#0A2242] text-white text-sm font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow active:scale-[0.98]"
            title={`Descargar en un ZIP los ${filteredFiles.length} comprobantes de pago y certificados de estudiante del filtro actual`}
          >
            <ZipIcon className="w-4 h-4" />
            <span>
              {zipProgress
                ? `Descargando ${zipProgress.done}/${zipProgress.total}…`
                : `Comprobantes y certificados (${filteredFiles.length})`}
            </span>
          </button>

          {(filter !== 'all' || categoryFilter !== 'all') && (
            <button
              type="button"
              onClick={() => void handleExport('all')}
              disabled={registrations.length === 0 || isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg border border-gray-200 transition-all disabled:opacity-50"
              title="Descargar libro Excel completo con todas las inscripciones y pestañas por estado"
            >
              <ExcelIcon className="w-3.5 h-3.5 text-gray-500" />
              <span>Descargar Todo ({registrations.length})</span>
            </button>
          )}
        </div>
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
                        Comprobante
                      </DownloadLink>
                    )}
                    {reg.studentProofFileKey && (
                      <DownloadLink
                        fileKey={reg.studentProofFileKey}
                        fileName={reg.studentProofFileName}
                        className="text-[11px] font-bold text-[#2A9D8F] hover:underline"
                      >
                        Cert. estudiante
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
                    {reg.companyName && <Detail label="Empresa" value={reg.companyName} />}
                    {reg.contactPhone && <Detail label="Teléfono" value={reg.contactPhone} />}
                    {reg.billingTaxId && <Detail label="RUT / Tax ID" value={reg.billingTaxId} />}
                    {reg.standRepresentative2Name && (
                      <Detail
                        label="Representante 2"
                        value={`${reg.standRepresentative2Name}${reg.standRepresentative2Email ? ` (${reg.standRepresentative2Email})` : ''}`}
                      />
                    )}
                    {reg.dinnerAttendeeName && <Detail label="Asiste a Cena" value={reg.dinnerAttendeeName} />}
                    {reg.standNotes && <Detail label="Notas Stand" value={reg.standNotes} />}
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
                    {reg.statusNotifiedAt && reg.statusNotified && (
                      <Detail
                        label="Último aviso automático"
                        value={`${statusLabels[reg.statusNotified]} · ${new Date(reg.statusNotifiedAt).toLocaleString()}`}
                      />
                    )}
                    {reg.cancelledBy === 'participant' && <Detail label="Anulado por" value="El participante" />}
                    <Detail label="Creado" value={new Date(reg.createdAt).toLocaleString()} />
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>

      <div ref={mailerRef}>
        <StaffMailer
          registrations={registrations}
          uncoveredPapers={uncoveredPapers}
          categoryLabels={categoryLabels}
          segment={mailSegment}
          onSegmentChange={setMailSegment}
        />
      </div>

      {/* Clasificación de papers aceptados y rechazados, datos de autores y exportación Excel */}
      <AcceptedPapersList
        papers={papers}
        acceptedPapers={acceptedPapers}
        registrations={registrations}
        statusLabels={statusLabels}
        statusStyles={statusStyles}
        categoryLabels={categoryLabels}
      />

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
