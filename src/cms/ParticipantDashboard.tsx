import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useCMSData, Paper } from './CMSDataContext';
import { MyRegistrationCard } from './MyRegistrationCard';
import { DownloadLink } from './DownloadLink';
import { ChevronRightIcon } from '../../components/icons';

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

const formatDate = (value: string) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const ParticipantDashboard: React.FC = () => {
  const { user } = useAuth();
  const { papers } = useCMSData();
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);

  const normUserEmail = (user?.email || '').toLowerCase().trim();

  // Artículos asociados al participante (ya sea como coautor o submitter)
  const myAssociatedPapers = React.useMemo(() => {
    if (!user || !normUserEmail) return [];
    return papers.filter((paper) => {
      if (paper.submitterId === user.id) return true;
      return (
        Array.isArray(paper.authors) &&
        paper.authors.some(
          (a) => a && typeof a.email === 'string' && a.email.toLowerCase().trim() === normUserEmail
        )
      );
    });
  }, [papers, user, normUserEmail]);

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-[#0D2C54] to-[#1E4D8C] rounded-3xl p-8 text-white shadow-lg">
        <h3 className="text-2xl font-bold mb-2">¡Bienvenido/a, {user?.name || 'participante'}!</h3>
        <p className="text-blue-100 max-w-xl">
          Aquí puedes revisar el estado de tu inscripción al CLAGTEE 2026, pagar, subir tu comprobante y hacer seguimiento a tus artículos asociados.
        </p>
      </div>

      <MyRegistrationCard accountEmail={user?.email} registerHref="/#inscripcion" />

      {/* Artículos vinculados como coautor o autor */}
      {myAssociatedPapers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xl font-bold text-[#0D2C54]">Mis Artículos Asociados</h4>
              <p className="text-xs text-gray-500">
                Trabajos científicos en los que figuras como autor o coautor para CLAGTEE 2026.
              </p>
            </div>
            <span className="text-xs font-bold text-[#2A9D8F] bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
              {myAssociatedPapers.length} {myAssociatedPapers.length === 1 ? 'artículo' : 'artículos'}
            </span>
          </div>

          <div className="grid gap-4">
            {myAssociatedPapers.map((paper) => {
              const isExpanded = expandedPaperId === paper.id;
              const isSubmitter = paper.submitterId === user?.id;

              return (
                <div
                  key={paper.id}
                  className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-[#F8FAFC] rounded-xl flex items-center justify-center border border-gray-100 shrink-0">
                        <span className="text-xs font-bold text-gray-400">#{paper.id}</span>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              isSubmitter
                                ? 'bg-blue-100 text-blue-700 border-blue-200'
                                : 'bg-purple-100 text-purple-700 border-purple-200'
                            }`}
                          >
                            {isSubmitter ? 'Autor Remitente' : 'Coautor'}
                          </span>
                          <span className="text-xs text-gray-500 font-medium">{paper.track}</span>
                        </div>
                        <h5 className="font-bold text-[#0D2C54] text-base mb-1">{paper.title}</h5>
                        {Array.isArray(paper.authors) && paper.authors.length > 0 && (
                          <p className="text-xs text-gray-500 mb-1">
                            <strong>Autores: </strong>
                            {paper.authors.map((author, idx) => {
                              const isCurrent =
                                author.email &&
                                author.email.toLowerCase().trim() === normUserEmail;
                              return (
                                <span
                                  key={idx}
                                  className={
                                    isCurrent
                                      ? 'font-bold text-[#0D2C54] underline decoration-[#2A9D8F]'
                                      : ''
                                  }
                                >
                                  {author.name}
                                  {idx < paper.authors.length - 1 ? ', ' : ''}
                                </span>
                              );
                            })}
                          </p>
                        )}
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

                      <div
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          statusStyles[paper.status] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {statusLabels[paper.status] || paper.status}
                      </div>

                      {paper.reviews && paper.reviews.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedPaperId((prev) => (prev === paper.id ? null : paper.id))}
                          className="text-xs font-bold text-gray-500 hover:text-[#0D2C54] transition-colors flex items-center gap-1"
                        >
                          <span>{isExpanded ? 'Ocultar revisiones' : 'Ver revisiones'}</span>
                          <ChevronRightIcon
                            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpanded && paper.reviews && paper.reviews.length > 0 && (
                    <div className="w-full border-t border-gray-100 pt-4 space-y-3">
                      <p className="text-xs font-bold text-[#0D2C54]">
                        Evaluaciones registradas ({paper.reviews.length}):
                      </p>
                      <div className="grid gap-2">
                        {paper.reviews.map((review, idx) => (
                          <div
                            key={review.id || idx}
                            className="bg-[#F8FAFC] border border-gray-100 rounded-xl p-3 text-xs"
                          >
                            <div className="flex items-center gap-3 text-gray-500 mb-1">
                              <span className="font-bold text-[#0D2C54]">Revisor {idx + 1}</span>
                              <span>Recomendación: <strong>{review.recommendation}</strong></span>
                              {review.score !== undefined && <span>Puntaje: <strong>{review.score}</strong></span>}
                            </div>
                            {review.comments && (
                              <p className="text-gray-600 whitespace-pre-line bg-white p-2 rounded border border-gray-100 mt-1">
                                {review.comments}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
