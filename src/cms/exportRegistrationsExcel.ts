import { RegistrationCategory, RegistrationRecord, RegistrationStatus } from '../../types';
import { Paper } from './CMSDataContext';
import { normalizePaperId, resolveRegistrationPaperId } from './registrationSegments';

export interface ExportExcelOptions {
  registrations: RegistrationRecord[];
  allRegistrations: RegistrationRecord[];
  statusFilter: 'all' | RegistrationStatus;
  categoryFilter: 'all' | RegistrationCategory;
  acceptedPapers: Paper[];
  statusLabels: Record<RegistrationStatus, string>;
  categoryLabels: Record<RegistrationCategory, string>;
  mode?: 'filtered' | 'all';
}

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return dateStr;
  }
};

const sanitizeSheetName = (name: string): string => {
  // Excel sheet names cannot exceed 31 chars and cannot contain: \ / ? * [ ] :
  const cleaned = name.replace(/[\\/?*[\]:]/g, ' ').trim();
  return cleaned.slice(0, 31) || 'Hoja';
};

export const buildRegistrationRow = (
  reg: RegistrationRecord,
  acceptedById: Map<string, Paper>,
  acceptedPapers: Paper[],
  statusLabels: Record<RegistrationStatus, string>,
  categoryLabels: Record<RegistrationCategory, string>
) => {
  const verifiedPaperId = resolveRegistrationPaperId(reg, acceptedPapers) || '';
  const paper = verifiedPaperId ? acceptedById.get(normalizePaperId(verifiedPaperId)) : undefined;

  return {
    'ID Registro': reg.id,
    'Estado': statusLabels[reg.status] || reg.status,
    'Categoría': categoryLabels[reg.category] || reg.category,
    'Tarifa': reg.phase === 'early-bird' ? 'Early Bird' : 'Regular',
    'Monto (USD)': reg.amountUsd,
    'Moneda': reg.currency || 'USD',
    'Nombres': reg.firstName || '',
    'Apellidos': reg.lastName || '',
    'Nombre Completo': `${reg.firstName || ''} ${reg.lastName || ''}`.trim(),
    'Email': reg.email || '',
    'País': reg.country || '',
    'Afiliación / Institución': reg.affiliation || '',
    'Restricción Alimentaria': reg.dietary || 'Ninguna',
    'Paper ID (CMS)': reg.cmsPaperId || '',
    'Paper ID Verificado': paper?.id || verifiedPaperId || '',
    'Título Paper': paper?.title || reg.paperTitle || '',
    'Autor Presentador': reg.presenterName || '',
    'Email Autor en CMS': reg.cmsEmail || '',
    'Cobertura Paper': reg.coverage || '',
    'Tipo Estudiante': reg.studentType || '',
    'Programa / Carrera': reg.program || '',
    'Nivel Académico': reg.level || '',
    'Empresa / Stand': reg.companyName || '',
    'Teléfono Contacto': reg.contactPhone || '',
    'RUT / Tax ID': reg.billingTaxId || '',
    'Representante 2 Stand': reg.standRepresentative2Name || '',
    'Email Representante 2': reg.standRepresentative2Email || '',
    'Asistente Cena Adicional': reg.dinnerAttendeeName || '',
    'Usuario Ticket Cena': reg.ticketUserName || '',
    'Dieta Ticket Cena': reg.ticketDietary || '',
    'Notas Stand': reg.standNotes || '',
    'ID Registro Principal': reg.mainRegistrationId || '',
    'Email Autor Principal': reg.mainAuthorEmail || '',
    'Participante Principal': reg.mainParticipantName || '',
    'Email Participante Principal': reg.mainParticipantEmail || '',
    'Código Transacción': reg.transactionCode || '',
    'Tiene Comprobante': reg.comprobanteFileKey ? 'Sí' : 'No',
    'Archivo Comprobante': reg.comprobanteFileName || '',
    'Tiene Certificado Estudiante': reg.studentProofFileKey ? 'Sí' : 'No',
    'Archivo Certificado': reg.studentProofFileName || '',
    'Nota Staff': reg.staffNote || '',
    'Revisado Por': reg.reviewedBy || '',
    'Último Aviso Automático': reg.statusNotified ? statusLabels[reg.statusNotified] : '',
    'Fecha Último Aviso': reg.statusNotifiedAt ? formatDate(reg.statusNotifiedAt) : '',
    'Anulado Por': reg.cancelledBy || '',
    'Fecha Creación': formatDate(reg.createdAt),
    'Fecha Subida Comprobante': reg.comprobanteAt ? formatDate(reg.comprobanteAt) : '',
    'Fecha Actualización': formatDate(reg.updatedAt),
  };
};

export const exportRegistrationsToExcel = async (options: ExportExcelOptions): Promise<void> => {
  const {
    registrations,
    allRegistrations,
    statusFilter,
    categoryFilter,
    acceptedPapers,
    statusLabels,
    categoryLabels,
    mode = 'filtered',
  } = options;

  // Carga diferida de SheetJS para no penalizar el peso inicial del bundle
  const XLSX = await import('xlsx');

  const acceptedById = new Map<string, Paper>();
  acceptedPapers.forEach((p) => acceptedById.set(normalizePaperId(p.id), p));

  const targetList = mode === 'all' ? allRegistrations : registrations;
  const rows = targetList.map((reg) =>
    buildRegistrationRow(reg, acceptedById, acceptedPapers, statusLabels, categoryLabels)
  );

  const wb = XLSX.utils.book_new();

  // Función auxiliar para auto-ajustar anchos de columnas
  const applyColumnWidths = (ws: any, dataRows: Record<string, any>[]) => {
    if (dataRows.length === 0) return;
    const colKeys = Object.keys(dataRows[0]);
    ws['!cols'] = colKeys.map((key) => {
      const maxLen = dataRows.reduce((max, row) => {
        const val = row[key];
        const len = val != null ? String(val).length : 0;
        return Math.max(max, len);
      }, key.length);
      return { wch: Math.min(Math.max(maxLen + 3, 10), 55) };
    });
  };

  // 1. Hoja principal con los registros correspondientes
  let mainSheetTitle = 'Inscripciones';
  if (mode === 'all') {
    mainSheetTitle = `Todos (${targetList.length})`;
  } else if (statusFilter !== 'all' || categoryFilter !== 'all') {
    const parts = [];
    if (statusFilter !== 'all') parts.push(statusLabels[statusFilter]);
    if (categoryFilter !== 'all') parts.push(categoryLabels[categoryFilter]);
    mainSheetTitle = `${parts.join(' - ')} (${targetList.length})`;
  } else {
    mainSheetTitle = `Registrados (${targetList.length})`;
  }

  const mainWs = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ Mensaje: 'Sin registros para este filtro' }]);
  applyColumnWidths(mainWs, rows);
  XLSX.utils.book_append_sheet(wb, mainWs, sanitizeSheetName(mainSheetTitle));

  // 2. Si se exporta todo (o 'all'), agregar hojas individuales por cada Estado que contenga registros
  if (mode === 'all' || (statusFilter === 'all' && categoryFilter === 'all')) {
    const statusesInUse = Array.from(new Set(allRegistrations.map((r) => r.status)));
    statusesInUse.forEach((st) => {
      const subset = allRegistrations.filter((r) => r.status === st);
      if (subset.length === 0) return;
      const subRows = subset.map((reg) =>
        buildRegistrationRow(reg, acceptedById, acceptedPapers, statusLabels, categoryLabels)
      );
      const subWs = XLSX.utils.json_to_sheet(subRows);
      applyColumnWidths(subWs, subRows);
      const stLabel = statusLabels[st] || st;
      XLSX.utils.book_append_sheet(wb, subWs, sanitizeSheetName(`${stLabel} (${subset.length})`));
    });
  }

  // 3. Hoja de Resumen / Métricas
  const summaryRows = [
    { 'Métrica / Filtro': 'Fecha de Exportación', 'Valor': formatDate(new Date().toISOString()) },
    { 'Métrica / Filtro': 'Filtro Estado Aplicado', 'Valor': statusFilter === 'all' ? 'Todos' : statusLabels[statusFilter] },
    { 'Métrica / Filtro': 'Filtro Categoría Aplicado', 'Valor': categoryFilter === 'all' ? 'Todas' : categoryLabels[categoryFilter] },
    { 'Métrica / Filtro': 'Total Registros Exportados', 'Valor': targetList.length },
    { 'Métrica / Filtro': 'Total Registros en el Sistema', 'Valor': allRegistrations.length },
    {
      'Métrica / Filtro': 'Monto Recaudado Confirmado (USD)',
      'Valor': allRegistrations
        .filter((r) => r.status === 'confirmada' || r.status === 'pago-validado')
        .reduce((sum, r) => sum + (r.amountUsd || 0), 0),
    },
    {
      'Métrica / Filtro': 'Monto en Proceso / Comprobante (USD)',
      'Valor': allRegistrations
        .filter((r) => r.status === 'comprobante-recibido')
        .reduce((sum, r) => sum + (r.amountUsd || 0), 0),
    },
    {
      'Métrica / Filtro': 'Monto Total Potencial Activo (USD)',
      'Valor': allRegistrations
        .filter((r) => r.status !== 'cancelada')
        .reduce((sum, r) => sum + (r.amountUsd || 0), 0),
    },
  ];

  // Desglose por estado
  const statusSummaryRows: any[] = [];
  Object.entries(statusLabels).forEach(([stKey, stLabel]) => {
    const subset = allRegistrations.filter((r) => r.status === stKey);
    const sumUsd = subset.reduce((acc, r) => acc + (r.amountUsd || 0), 0);
    statusSummaryRows.push({
      'Desglose': `Estado: ${stLabel}`,
      'Cantidad': subset.length,
      'Total USD': sumUsd,
    });
  });

  // Desglose por categoría
  const categorySummaryRows: any[] = [];
  Object.entries(categoryLabels).forEach(([catKey, catLabel]) => {
    const subset = allRegistrations.filter((r) => r.category === catKey);
    const sumUsd = subset.reduce((acc, r) => acc + (r.amountUsd || 0), 0);
    categorySummaryRows.push({
      'Desglose': `Categoría: ${catLabel}`,
      'Cantidad': subset.length,
      'Total USD': sumUsd,
    });
  });

  const fullSummaryData = [
    ...summaryRows.map((r) => ({ Concepto: r['Métrica / Filtro'], Detalle: r.Valor, 'Información Adicional': '' })),
    { Concepto: '---', Detalle: '---', 'Información Adicional': '---' },
    ...statusSummaryRows.map((r) => ({ Concepto: r.Desglose, Detalle: `${r.Cantidad} registros`, 'Información Adicional': `USD ${r['Total USD']}` })),
    { Concepto: '---', Detalle: '---', 'Información Adicional': '---' },
    ...categorySummaryRows.map((r) => ({ Concepto: r.Desglose, Detalle: `${r.Cantidad} registros`, 'Información Adicional': `USD ${r['Total USD']}` })),
  ];

  const summaryWs = XLSX.utils.json_to_sheet(fullSummaryData);
  summaryWs['!cols'] = [{ wch: 38 }, { wch: 30 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen y Métricas');

  // 4. Generar y descargar archivo en navegador
  const now = new Date();
  const dateSlug = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  
  let filterSlug = 'todos';
  if (mode === 'all') {
    filterSlug = 'todos-completo';
  } else if (statusFilter !== 'all' || categoryFilter !== 'all') {
    filterSlug = `${categoryFilter}_${statusFilter}`.replace(/[^a-zA-Z0-9_-]/g, '-');
  }

  const fileName = `clagtee2026_registrados_${filterSlug}_${dateSlug}.xlsx`;

  // Escritura binaria y descarga limpia via Blob
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};
