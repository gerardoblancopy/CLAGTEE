import { RegistrationRecord, RegistrationStatus } from '../../types';
import { User } from './AuthContext';
import { Paper, PaperStatus } from './CMSDataContext';
import { normalizePaperId, resolveRegistrationPaperId } from './registrationSegments';

export const paperStatusLabels: Record<PaperStatus, string> = {
  pending: 'Pendiente',
  'under-review': 'En revisión',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
  withdrawn: 'Retirado',
};

export const paperStatusStyles: Record<PaperStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'under-review': 'bg-blue-100 text-blue-800 border-blue-200',
  accepted: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  withdrawn: 'bg-gray-100 text-gray-700 border-gray-200',
};

export interface AuthorDetails {
  correspondingAuthor: {
    name: string;
    email: string;
    affiliation?: string;
  };
  coAuthors: Array<{
    name: string;
    email: string;
    affiliation?: string;
  }>;
  allAuthors: Array<{
    name: string;
    email: string;
    affiliation?: string;
    isCorresponding: boolean;
  }>;
  allEmails: string[];
}

export const resolvePaperAuthors = (paper: Paper, users: User[] = []): AuthorDetails => {
  const submitterUser = users.find(
    (u) =>
      u.id === paper.submitterId ||
      (Boolean(u.email) && u.email.trim().toLowerCase() === paper.submitterId?.trim().toLowerCase())
  );
  const submitterEmail = (submitterUser?.email || '').trim().toLowerCase();

  const authors = Array.isArray(paper.authors) ? paper.authors : [];

  let corrIndex = -1;
  if (submitterEmail) {
    corrIndex = authors.findIndex(
      (a) => (a.email || '').trim().toLowerCase() === submitterEmail
    );
  }
  if (corrIndex === -1 && submitterUser?.name) {
    corrIndex = authors.findIndex(
      (a) => (a.name || '').trim().toLowerCase() === submitterUser.name.trim().toLowerCase()
    );
  }
  if (corrIndex === -1 && authors.length > 0) {
    corrIndex = 0;
  }

  let correspondingAuthor: { name: string; email: string; affiliation?: string };
  if (corrIndex >= 0 && authors[corrIndex]) {
    const a = authors[corrIndex];
    correspondingAuthor = {
      name: a.name || submitterUser?.name || 'Autor principal',
      email: a.email || submitterUser?.email || '',
      affiliation: a.affiliation || submitterUser?.affiliation || '',
    };
  } else if (submitterUser) {
    correspondingAuthor = {
      name: submitterUser.name || 'Autor principal',
      email: submitterUser.email || '',
      affiliation: submitterUser.affiliation || '',
    };
  } else {
    correspondingAuthor = {
      name: 'Sin autor registrado',
      email: '',
      affiliation: '',
    };
  }

  const coAuthors = authors
    .filter((_, idx) => idx !== corrIndex)
    .map((a) => ({
      name: a.name || '',
      email: a.email || '',
      affiliation: a.affiliation || '',
    }));

  const allAuthors = authors.map((a, idx) => ({
    name: a.name || '',
    email: a.email || '',
    affiliation: a.affiliation || '',
    isCorresponding:
      idx === corrIndex ||
      (Boolean(submitterEmail) && (a.email || '').trim().toLowerCase() === submitterEmail),
  }));

  const emailSet = new Set<string>();
  if (correspondingAuthor.email) emailSet.add(correspondingAuthor.email.trim().toLowerCase());
  authors.forEach((a) => {
    if (a.email?.trim()) emailSet.add(a.email.trim().toLowerCase());
  });
  if (submitterUser?.email?.trim()) emailSet.add(submitterUser.email.trim().toLowerCase());

  return {
    correspondingAuthor,
    coAuthors,
    allAuthors,
    allEmails: Array.from(emailSet),
  };
};

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return dateStr;
  }
};

const sanitizeSheetName = (name: string): string => {
  const cleaned = name.replace(/[\\/?*[\]:]/g, ' ').trim();
  return cleaned.slice(0, 31) || 'Hoja';
};

export interface ExportPapersExcelOptions {
  papers: Paper[];
  allPapers: Paper[];
  users?: User[];
  registrations?: RegistrationRecord[];
  paperFilter: 'all' | PaperStatus;
  statusLabels?: Record<RegistrationStatus, string>;
  mode?: 'filtered' | 'all';
}

export const buildPaperRow = (
  paper: Paper,
  authorDetails: AuthorDetails,
  matchingRegs: RegistrationRecord[],
  regStatusLabels: Record<string, string> = {}
) => {
  const { correspondingAuthor, coAuthors, allAuthors, allEmails } = authorDetails;

  const reviews = Array.isArray(paper.reviews) ? paper.reviews : [];
  const avgScore =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.score || 0), 0) / reviews.length
      : null;

  return {
    'ID Paper': paper.id,
    'Título': paper.title,
    'Área Temática (Track)': paper.track || 'General',
    'Clasificación / Estado': paperStatusLabels[paper.status] || paper.status,
    'Autor Correspondiente (Quien Sometió)': correspondingAuthor.name,
    'Email Autor Correspondiente': correspondingAuthor.email,
    'Afiliación Autor Correspondiente': correspondingAuthor.affiliation || '',
    'Cant. Co-autores': coAuthors.length,
    'Nombres de Co-autores': coAuthors.map((c) => c.name).join('; '),
    'Emails de Co-autores': coAuthors.map((c) => c.email).filter(Boolean).join('; '),
    'Detalle Completo Autores': allAuthors
      .map(
        (a) =>
          `${a.name}${a.email ? ` <${a.email}>` : ''}${a.affiliation ? ` [${a.affiliation}]` : ''}${a.isCorresponding ? ' (Correspondiente)' : ''}`
      )
      .join(' | '),
    'Todos los Emails (Separados por coma)': allEmails.join(', '),
    'Tiene Inscripción en CMS': matchingRegs.length > 0 ? 'Sí' : 'No',
    'ID(s) Inscripción CMS': matchingRegs.map((r) => r.id).join(', '),
    'Estado(s) Inscripción': matchingRegs.map((r) => regStatusLabels[r.status] || r.status).join(', '),
    'Participante(s) Inscrito(s)': matchingRegs.map((r) => `${r.firstName} ${r.lastName}`).join(', '),
    'Emails Participante(s)': matchingRegs.map((r) => r.email).join(', '),
    'Cant. Evaluaciones': reviews.length,
    'Puntaje Promedio (1-5)': avgScore != null ? Number(avgScore.toFixed(2)) : 'Sin evaluar',
    'Notificación de Decisión': paper.decisionNotifiedAt ? 'Notificado' : 'Pendiente',
    'Fecha de Notificación': formatDate(paper.decisionNotifiedAt),
    'Fecha de Envío': formatDate(paper.submittedAt),
    'Última Modificación': formatDate(paper.updatedAt),
  };
};

export const exportPapersToExcel = async (options: ExportPapersExcelOptions): Promise<void> => {
  const {
    papers,
    allPapers,
    users = [],
    registrations = [],
    paperFilter,
    statusLabels: regStatusLabels = {},
    mode = 'filtered',
  } = options;

  // Carga diferida de SheetJS para preservar rendimiento
  const XLSX = await import('xlsx');

  // Mapa de inscripciones asociadas por paperId
  const regByPaperId = new Map<string, RegistrationRecord[]>();
  registrations
    .filter((r) => r.status !== 'cancelada' && r.cmsPaperId)
    .forEach((reg) => {
      const resolved = resolveRegistrationPaperId(reg, allPapers);
      if (!resolved) return;
      const key = normalizePaperId(resolved);
      regByPaperId.set(key, [...(regByPaperId.get(key) || []), reg]);
    });

  const targetList = mode === 'all' ? allPapers : papers;

  const targetRows = targetList.map((paper) => {
    const authorDetails = resolvePaperAuthors(paper, users);
    const matchingRegs = regByPaperId.get(normalizePaperId(paper.id)) || [];
    return buildPaperRow(paper, authorDetails, matchingRegs, regStatusLabels);
  });

  const wb = XLSX.utils.book_new();

  // Función para auto-ajustar anchos de columnas
  const applyColumnWidths = (ws: any, dataRows: Record<string, any>[]) => {
    if (dataRows.length === 0) return;
    const colKeys = Object.keys(dataRows[0]);
    ws['!cols'] = colKeys.map((key) => {
      const maxLen = dataRows.reduce((max, row) => {
        const val = row[key];
        const len = val != null ? String(val).length : 0;
        return Math.max(max, len);
      }, key.length);
      return { wch: Math.min(Math.max(maxLen + 3, 10), 60) };
    });
  };

  // 1. Hoja principal con los papers visibles / filtrados
  let mainSheetTitle = 'Papers';
  if (mode === 'all') {
    mainSheetTitle = `Todos (${targetList.length})`;
  } else if (paperFilter !== 'all') {
    mainSheetTitle = `${paperStatusLabels[paperFilter] || paperFilter} (${targetList.length})`;
  } else {
    mainSheetTitle = `Papers (${targetList.length})`;
  }

  const mainWs = XLSX.utils.json_to_sheet(
    targetRows.length > 0 ? targetRows : [{ Mensaje: 'Sin papers registrados en este filtro' }]
  );
  applyColumnWidths(mainWs, targetRows);
  XLSX.utils.book_append_sheet(wb, mainWs, sanitizeSheetName(mainSheetTitle));

  // 2. Si se exporta todo (o 'all'), agregar pestañas independientes para Aceptados y Rechazados
  if (mode === 'all' || paperFilter === 'all') {
    const statusesToTab: PaperStatus[] = ['accepted', 'rejected', 'under-review', 'pending', 'withdrawn'];
    statusesToTab.forEach((st) => {
      const subset = allPapers.filter((p) => p.status === st);
      if (subset.length === 0) return;
      const subRows = subset.map((paper) => {
        const authorDetails = resolvePaperAuthors(paper, users);
        const matchingRegs = regByPaperId.get(normalizePaperId(paper.id)) || [];
        return buildPaperRow(paper, authorDetails, matchingRegs, regStatusLabels);
      });
      const subWs = XLSX.utils.json_to_sheet(subRows);
      applyColumnWidths(subWs, subRows);
      const label = paperStatusLabels[st] || st;
      XLSX.utils.book_append_sheet(wb, subWs, sanitizeSheetName(`${label} (${subset.length})`));
    });
  }

  // 3. Hoja de Resumen y Métricas
  const acceptedCount = allPapers.filter((p) => p.status === 'accepted').length;
  const rejectedCount = allPapers.filter((p) => p.status === 'rejected').length;
  const underReviewCount = allPapers.filter((p) => p.status === 'under-review').length;
  const pendingCount = allPapers.filter((p) => p.status === 'pending').length;
  const withdrawnCount = allPapers.filter((p) => p.status === 'withdrawn').length;

  const totalDecided = acceptedCount + rejectedCount;
  const acceptanceRate =
    totalDecided > 0 ? `${((acceptedCount / totalDecided) * 100).toFixed(1)}%` : 'N/A';
  const rejectionRate =
    totalDecided > 0 ? `${((rejectedCount / totalDecided) * 100).toFixed(1)}%` : 'N/A';

  const coveredPapersCount = allPapers.filter(
    (p) => (regByPaperId.get(normalizePaperId(p.id)) || []).length > 0
  ).length;

  const summaryData = [
    { 'Métrica': 'Fecha de Exportación', 'Valor': formatDate(new Date().toISOString()) },
    { 'Métrica': 'Filtro Aplicado', 'Valor': paperFilter === 'all' ? 'Todos' : paperStatusLabels[paperFilter] },
    { 'Métrica': 'Total Papers Exportados', 'Valor': targetList.length },
    { 'Métrica': 'Total Papers en el Sistema', 'Valor': allPapers.length },
    { 'Métrica': 'Papers Aceptados', 'Valor': `${acceptedCount} (${acceptanceRate} de evaluados)` },
    { 'Métrica': 'Papers Rechazados', 'Valor': `${rejectedCount} (${rejectionRate} de evaluados)` },
    { 'Métrica': 'Papers En Revisión', 'Valor': underReviewCount },
    { 'Métrica': 'Papers Pendientes', 'Valor': pendingCount },
    { 'Métrica': 'Papers Retirados', 'Valor': withdrawnCount },
    { 'Métrica': 'Papers con Inscripción Registrada', 'Valor': `${coveredPapersCount} de ${allPapers.length}` },
  ];

  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  summaryWs['!cols'] = [{ wch: 35 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen Estadístico');

  // 4. Descargar archivo en el navegador
  const now = new Date();
  const dateSlug = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  
  let filterSlug = 'todos';
  if (mode === 'all') {
    filterSlug = 'todos-completo';
  } else if (paperFilter !== 'all') {
    filterSlug = paperFilter;
  }

  const fileName = `clagtee2026_papers_${filterSlug}_${dateSlug}.xlsx`;

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
