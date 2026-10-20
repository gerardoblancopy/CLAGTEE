import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { SubmissionIcon, ChevronRightIcon } from '../../components/icons';
import { useAuth } from './AuthContext';
import { Paper, useCMSData } from './CMSDataContext';
import { DownloadLink } from './DownloadLink';
import { RevisionUpload } from './RevisionUpload';
import { MyRegistrationCard } from './MyRegistrationCard';

const statusStyles: Record<string, string> = {
  'pending': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'under-review': 'bg-blue-100 text-blue-700 border-blue-200',
  'accepted': 'bg-green-100 text-green-700 border-green-200',
  'rejected': 'bg-red-100 text-red-700 border-red-200',
  'withdrawn': 'bg-gray-100 text-gray-600 border-gray-200',
};

const statusLabels: Record<string, string> = {
  'pending': 'Pendiente',
  'under-review': 'En Revisión',
  'accepted': 'Aceptado',
  'rejected': 'Rechazado',
  'withdrawn': 'Retirado',
};

const recommendationLabels: Record<string, string> = {
  'accept': 'Aceptar',
  'minor-revision': 'Revisión menor',
  'major-revision': 'Revisión mayor',
  'reject': 'Rechazar',
};

const formatDate = (value: string) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

interface PaperCardProps {
  paper: Paper;
  isCoAuthor?: boolean;
  currentUserEmail?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEditSubmission?: (paperId: string) => void;
  onWithdraw?: (paperId: string) => void;
}

const PaperCard: React.FC<PaperCardProps> = ({
  paper,
  isCoAuthor,
  currentUserEmail,
  isExpanded,
  onToggleExpand,
  onEditSubmission,
  onWithdraw,
}) => {
  const normUserEmail = (currentUserEmail || '').toLowerCase().trim();

  return (
    <motion.div
      whileHover={{ scale: 1.005 }}
      className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-4"
    >
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-[#F8FAFC] rounded-xl flex items-center justify-center border border-gray-100 shrink-0">
            <span className="text-xs font-bold text-gray-400">#{paper.id}</span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {isCoAuthor ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                  Coautor
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                  Autor Principal
                </span>
              )}
              <span className="text-xs text-gray-500 font-medium">{paper.track}</span>
            </div>
            <h5 className="font-bold text-[#0D2C54] text-base mb-1">{paper.title}</h5>
            {Array.isArray(paper.authors) && paper.authors.length > 0 && (
              <p className="text-xs text-gray-500 mb-1">
                <strong>Autores: </strong>
                {paper.authors.map((author, idx) => {
                  const isCurrent = author.email && author.email.toLowerCase().trim() === normUserEmail;
                  return (
                    <span
                      key={idx}
                      className={isCurrent ? 'font-bold text-[#0D2C54] underline decoration-[#2A9D8F]' : ''}
                    >
                      {author.name}
                      {idx < paper.authors.length - 1 ? ', ' : ''}
                    </span>
                  );
                })}
              </p>
            )}
            <p className="text-xs text-gray-400">
              {paper.keywords && paper.keywords.length > 0
                ? paper.keywords.join(', ')
                : 'Sin palabras clave'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:self-start">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] text-gray-400">Actualizado</p>
            <p className="text-xs font-medium text-gray-700">{formatDate(paper.updatedAt)}</p>
          </div>

          {paper.fileKey || paper.fileUrl ? (
            <DownloadLink
              fileKey={paper.fileKey}
              fileUrl={paper.fileUrl}
              fileName={paper.fileName}
              className="text-[#2A9D8F] text-xs font-bold hover:underline"
            >
              Descargar PDF
            </DownloadLink>
          ) : null}

          {paper.revisedFileKey || paper.revisedFileUrl ? (
            <DownloadLink
              fileKey={paper.revisedFileKey}
              fileUrl={paper.revisedFileUrl}
              fileName={paper.revisedFileName}
              className="text-purple-600 text-xs font-bold hover:underline"
            >
              Versión Final
            </DownloadLink>
          ) : null}

          {paper.formatCertFileKey || paper.formatCertFileUrl ? (
            <DownloadLink
              fileKey={paper.formatCertFileKey}
              fileUrl={paper.formatCertFileUrl}
              fileName={paper.formatCertFileName}
              className="text-teal-600 text-xs font-bold hover:underline"
            >
              Certificado IEEE
            </DownloadLink>
          ) : null}

          {paper.copyrightFileKey || paper.copyrightFileUrl ? (
            <DownloadLink
              fileKey={paper.copyrightFileKey}
              fileUrl={paper.copyrightFileUrl}
              fileName={paper.copyrightFileName}
              className="text-[#00629B] text-xs font-bold hover:underline"
            >
              Copyright eCF
            </DownloadLink>
          ) : null}

          {paper.reviews && paper.reviews.length > 0 && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors flex items-center gap-1 border border-blue-200"
              title="Consultar dictamen y recomendaciones de los revisores"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{isExpanded ? 'Ocultar Revisiones' : `Ver Revisiones (${paper.reviews.length})`}</span>
            </button>
          )}

          {!isCoAuthor &&
            paper.status === 'pending' &&
            paper.assignedReviewerIds.length === 0 &&
            onEditSubmission && (
              <button
                type="button"
                onClick={() => onEditSubmission(paper.id)}
                className="text-[#0D2C54] text-xs font-bold hover:underline"
              >
                Editar envío
              </button>
            )}

          <div className={`px-3 py-1 rounded-full text-xs font-bold border ${statusStyles[paper.status] || 'bg-gray-100 text-gray-700'}`}>
            {statusLabels[paper.status] || paper.status}
          </div>

          <button
            type="button"
            onClick={onToggleExpand}
            className="text-xs font-bold text-gray-500 hover:text-[#0D2C54] transition-colors flex items-center gap-1"
          >
            <span>{isExpanded ? 'Ocultar' : 'Detalles'}</span>
            <ChevronRightIcon
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
          </button>
        </div>
      </div>

      {paper.status === 'accepted' && <RevisionUpload paper={paper} />}

      {isExpanded && (
        <div className="w-full border-t border-gray-100 pt-4 text-sm text-gray-600 space-y-3">
          <div className="flex flex-wrap gap-4 text-xs text-gray-500 items-center justify-between">
            <div className="flex gap-4 items-center">
              <span>Estado: <strong>{statusLabels[paper.status] || paper.status}</strong></span>
              <span>Evaluaciones registradas: <strong>{paper.reviews.length}</strong></span>
            </div>
            {!isCoAuthor && paper.status !== 'withdrawn' && onWithdraw && (
              <button
                type="button"
                onClick={() => onWithdraw(paper.id)}
                className="text-red-500 font-bold hover:underline text-xs"
              >
                Retirar envío
              </button>
            )}
          </div>

          {paper.reviews.length === 0 ? (
            <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-100">
              Aún no hay evaluaciones cargadas para este artículo.
            </p>
          ) : (
            <div className="grid gap-3">
              {paper.reviews.map((review, index) => (
                <div
                  key={review.id || index}
                  className="bg-[#F8FAFC] border border-gray-100 rounded-xl p-4"
                >
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-2">
                    <span className="font-bold text-[#0D2C54]">
                      Revisor {index + 1}
                    </span>
                    <span>
                      Recomendación: <strong>{recommendationLabels[review.recommendation] || review.recommendation}</strong>
                    </span>
                    {review.score !== undefined && <span>Puntaje: <strong>{review.score}</strong></span>}
                  </div>
                  {review.comments ? (
                    <p className="text-xs text-gray-600 whitespace-pre-line bg-white p-3 rounded-lg border border-gray-100">
                      {review.comments}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">Sin comentarios adicionales.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export const AuthorDashboard: React.FC<{
  onNewSubmission: () => void;
  onEditSubmission?: (paperId: string) => void;
}> = ({ onNewSubmission, onEditSubmission }) => {
  const { user } = useAuth();
  const { papers, withdrawPaper } = useCMSData();
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);

  const normUserEmail = (user?.email || '').toLowerCase().trim();

  // Trabajos donde el usuario es el autor de contacto (submitter)
  const submittedPapers = useMemo(() => {
    if (!user) return [];
    return papers.filter((paper) => paper.submitterId === user.id);
  }, [papers, user]);

  // Trabajos donde el usuario es coautor (su email está en authors pero no es el submitter)
  const coAuthoredPapers = useMemo(() => {
    if (!user || !normUserEmail) return [];
    return papers.filter((paper) => {
      if (paper.submitterId === user.id) return false;
      return Array.isArray(paper.authors) && paper.authors.some(
        (a) => a && typeof a.email === 'string' && a.email.toLowerCase().trim() === normUserEmail
      );
    });
  }, [papers, user, normUserEmail]);

  const allUserPapers = useMemo(() => {
    return [...submittedPapers, ...coAuthoredPapers];
  }, [submittedPapers, coAuthoredPapers]);

  const acceptedPapers = useMemo(() => {
    return allUserPapers.filter((p) => p.status === 'accepted');
  }, [allUserPapers]);

  const handleWithdraw = async (paperId: string) => {
    const ok = window.confirm('¿Deseas retirar este trabajo?');
    if (!ok) return;
    await withdrawPaper(paperId);
  };

  const toggleExpand = (paperId: string) => {
    setExpandedPaperId((prev) => (prev === paperId ? null : paperId));
  };

  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-[#0D2C54] to-[#1E4D8C] rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-2xl font-bold mb-2">¡Bienvenido de nuevo, {user?.name || 'Autor'}!</h3>
          <p className="text-blue-100 max-w-xl">
            Aquí puedes gestionar tus trabajos científicos, revisar el estado de tus evaluaciones y hacer seguimiento a tus artículos como autor o coautor para el CLAGTEE 2026.
          </p>
          <button 
            onClick={onNewSubmission}
            className="mt-6 bg-[#F4A261] hover:bg-[#E76F51] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md flex items-center space-x-2 group"
          >
            <span>Iniciar Nuevo Envío</span>
            <ChevronRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
        <SubmissionIcon className="absolute right-[-20px] bottom-[-20px] w-64 h-64 text-white/5" />
      </div>

      <MyRegistrationCard accountEmail={user?.email} />

      {/* Banner de Guía para Autores con Artículos Aceptados */}
      {acceptedPapers.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-900 via-[#00629B] to-[#0D2C54] rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-4 border border-emerald-500/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                <svg className="w-7 h-7 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  ¡Artículo(s) Aceptado(s) para IEEE Xplore!
                </span>
                <h4 className="text-xl sm:text-2xl font-black text-white mt-1">
                  Guía de Entrega Final Camera-Ready
                </h4>
              </div>
            </div>
            <a
              href="/#version-final-ieee"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-colors border border-white/20 shrink-0 self-start sm:self-auto"
            >
              <span>Ver Guía Oficial de 6 Pasos</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          <p className="text-xs sm:text-sm text-emerald-100 max-w-3xl leading-relaxed font-['Roboto']">
            Tienes <strong>{acceptedPapers.length} artículo(s) aceptado(s)</strong> para publicación en IEEE Xplore y exposición presencial en CLAGTEE 2026. En cada tarjeta de tus trabajos aceptados abajo encontrarás el <strong>Centro de Entrega Camera-Ready</strong> con los 3 documentos obligatorios:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="bg-white/10 rounded-xl p-3 border border-white/10 backdrop-blur-xs">
              <span className="text-emerald-300 font-bold text-xs block mb-0.5">1. Manuscrito Final</span>
              <p className="text-[11px] text-blue-100">
                Con formato oficial IEEE, aviso de copyright al pie y observaciones de revisores incorporadas.
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 border border-white/10 backdrop-blur-xs">
              <span className="text-teal-300 font-bold text-xs block mb-0.5">2. Certificado de Formato IEEE</span>
              <p className="text-[11px] text-blue-100">
                Puedes generarlo y descargarlo automáticamente con 1 clic desde tu panel.
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 border border-white/10 backdrop-blur-xs">
              <span className="text-sky-300 font-bold text-xs block mb-0.5">3. Copyright IEEE (eCF)</span>
              <p className="text-[11px] text-blue-100">
                Firma electrónica digital integrada directamente en tu artículo o enlace al PDF oficial.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plantilla Oficial para la Presentación */}
      <div className="bg-gradient-to-r from-[#FFFBF5] to-[#FFF5EB] border border-amber-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#D9381E]/10 border border-[#D9381E]/20 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-[#D9381E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200/70 text-amber-900">
                Plantilla Oficial
              </span>
              <span className="text-xs text-gray-500 font-medium">PowerPoint .POTX (16:9)</span>
            </div>
            <h4 className="text-base font-bold text-[#0D2C54]">Plantilla para la Presentación de Ponencias</h4>
            <p className="text-xs text-gray-600 max-w-xl">
              Descarga la plantilla de diapositivas oficial del CLAGTEE 2026 para preparar la exposición oral presencial de tus trabajos.
            </p>
          </div>
        </div>
        <a
          href="/CLAGTEE2026_Plantilla_v2.potx"
          download="CLAGTEE2026_Plantilla_v2.potx"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9381E] hover:bg-[#b82e18] text-white font-bold text-xs uppercase tracking-wider transition-all shadow shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Descargar Plantilla (.POTX)</span>
        </a>
      </div>

      {/* Submissions List - Submitter */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-xl font-bold text-[#0D2C54]">Mis Trabajos Enviados</h4>
            <p className="text-xs text-gray-500">Artículos en los que figuras como autor de contacto / remitente principal.</p>
          </div>
          <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {submittedPapers.length} trabajos
          </span>
        </div>

        {submittedPapers.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center mb-8">
            <p className="text-gray-500 mb-3 text-sm">No has realizado envíos directos como autor remitente.</p>
            <button
              onClick={onNewSubmission}
              className="bg-[#2A9D8F] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#238C7E] transition-colors text-xs"
            >
              Crear nuevo envío
            </button>
          </div>
        ) : (
          <div className="grid gap-4 mb-8">
            {submittedPapers.map((paper) => (
              <PaperCard
                key={paper.id}
                paper={paper}
                currentUserEmail={user?.email}
                isExpanded={expandedPaperId === paper.id}
                onToggleExpand={() => toggleExpand(paper.id)}
                onEditSubmission={onEditSubmission}
                onWithdraw={handleWithdraw}
              />
            ))}
          </div>
        )}
      </div>

      {/* Co-Authored Papers List */}
      {coAuthoredPapers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-xl font-bold text-purple-900">Trabajos como Coautor</h4>
              <p className="text-xs text-gray-500">Artículos enviados por colegas donde figuras en la nómina oficial de autores.</p>
            </div>
            <span className="text-sm font-semibold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
              {coAuthoredPapers.length} trabajos
            </span>
          </div>

          <div className="grid gap-4">
            {coAuthoredPapers.map((paper) => (
              <PaperCard
                key={paper.id}
                paper={paper}
                isCoAuthor={true}
                currentUserEmail={user?.email}
                isExpanded={expandedPaperId === paper.id}
                onToggleExpand={() => toggleExpand(paper.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
