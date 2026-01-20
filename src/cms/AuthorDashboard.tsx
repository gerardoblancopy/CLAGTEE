import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { SubmissionIcon, ChevronRightIcon } from '../../components/icons';
import { useAuth } from './AuthContext';
import { useCMSData } from './CMSDataContext';

const statusStyles = {
  'pending': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'under-review': 'bg-blue-100 text-blue-700 border-blue-200',
  'accepted': 'bg-green-100 text-green-700 border-green-200',
  'rejected': 'bg-red-100 text-red-700 border-red-200',
  'withdrawn': 'bg-gray-100 text-gray-600 border-gray-200',
};

const statusLabels = {
  'pending': 'Pendiente',
  'under-review': 'En Revisión',
  'accepted': 'Aceptado',
  'rejected': 'Rechazado',
  'withdrawn': 'Retirado',
};

export const AuthorDashboard: React.FC<{ onNewSubmission: () => void }> = ({ onNewSubmission }) => {
  const { user } = useAuth();
  const { papers, withdrawPaper } = useCMSData();
  const [expandedPaperId, setExpandedPaperId] = React.useState<string | null>(null);

  const triggerDownload = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'paper.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownload = async (fileKey?: string, fileUrl?: string, fileName?: string) => {
    if (fileKey) {
      try {
        const response = await fetch(`/api/gcs-sign-download?object=${encodeURIComponent(fileKey)}`);
        if (!response.ok) {
          throw new Error('No se pudo generar la descarga.');
        }
        const payload = (await response.json()) as { url: string };
        window.open(payload.url, '_blank', 'noopener,noreferrer');
        return;
      } catch (error) {
        // Fall back to fileUrl if available
      }
    }
    if (!fileUrl) return;
    if (fileUrl.startsWith('data:')) {
      triggerDownload(fileUrl, fileName || 'paper.pdf');
      return;
    }
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  const myPapers = useMemo(() => {
    if (!user) return [];
    return papers.filter((paper) => paper.submitterId === user.id);
  }, [papers, user]);

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const recommendationLabels: Record<string, string> = {
    'accept': 'Aceptar',
    'minor-revision': 'Revision menor',
    'major-revision': 'Revision mayor',
    'reject': 'Rechazar',
  };

  const handleWithdraw = async (paperId: string) => {
    const ok = window.confirm('¿Deseas retirar este trabajo?');
    if (!ok) return;
    await withdrawPaper(paperId);
  };

  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-[#0D2C54] to-[#1E4D8C] rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-2xl font-bold mb-2">¡Bienvenido de nuevo, {user?.name || 'Autor'}!</h3>
          <p className="text-blue-100 max-w-xl">
            Aquí puedes gestionar tus trabajos científicos, revisar el estado de tus evaluaciones y realizar nuevos envíos para el CLAGTEE 2026.
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

      {/* Submissions List */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-xl font-bold text-[#0D2C54]">Mis Trabajos Enviados</h4>
          <span className="text-sm text-gray-500">{myPapers.length} trabajos encontrados</span>
        </div>

        {myPapers.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
            <p className="text-gray-500 mb-4">Aun no tienes trabajos enviados.</p>
            <button
              onClick={onNewSubmission}
              className="bg-[#2A9D8F] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#238C7E] transition-colors"
            >
              Crear mi primer envio
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {myPapers.map((paper) => (
              <motion.div
                key={paper.id}
                whileHover={{ scale: 1.01 }}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-6"
              >
                <div className="flex items-center space-x-6">
                  <div className="w-12 h-12 bg-[#F8FAFC] rounded-xl flex items-center justify-center border border-gray-100">
                    <span className="text-xs font-bold text-gray-400">#{paper.id}</span>
                  </div>
                  <div>
                    <h5 className="font-bold text-[#0D2C54] mb-1">{paper.title}</h5>
                    <p className="text-sm text-gray-500">{paper.track}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {paper.keywords.length > 0 ? paper.keywords.join(', ') : 'Sin palabras clave'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-1">Ultima actualizacion</p>
                    <p className="text-sm font-medium text-gray-700">{formatDate(paper.updatedAt)}</p>
                  </div>
                  {paper.fileKey || paper.fileUrl ? (
                    <button
                      type="button"
                      onClick={() => handleDownload(paper.fileKey, paper.fileUrl, paper.fileName)}
                      className="text-[#2A9D8F] text-xs font-bold hover:underline"
                    >
                      Descargar PDF
                    </button>
                  ) : null}
                  <div className={`px-4 py-1.5 rounded-full text-xs font-bold border ${statusStyles[paper.status]}`}>
                    {statusLabels[paper.status]}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedPaperId((prev) => (prev === paper.id ? null : paper.id))
                    }
                    className="text-xs font-bold text-gray-500 hover:text-[#0D2C54] transition-colors flex items-center gap-1"
                  >
                    <span>
                      {expandedPaperId === paper.id ? 'Ocultar evaluaciones' : 'Ver evaluaciones'}
                    </span>
                    <ChevronRightIcon
                      className={`w-4 h-4 transition-transform ${
                        expandedPaperId === paper.id ? 'rotate-90' : ''
                      }`}
                    />
                  </button>
                </div>

                {expandedPaperId === paper.id && (
                  <div className="w-full border-t border-gray-100 pt-4 text-sm text-gray-600 space-y-3">
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500 items-center">
                      <span>Estado actual: {statusLabels[paper.status]}</span>
                      <span>Evaluaciones: {paper.reviews.length}</span>
                      {paper.status !== 'withdrawn' && (
                        <button
                          type="button"
                          onClick={() => handleWithdraw(paper.id)}
                          className="text-red-500 font-bold hover:underline"
                        >
                          Retirar envio
                        </button>
                      )}
                    </div>
                    {paper.reviews.length === 0 ? (
                      <p className="text-sm text-gray-400">Aun no hay evaluaciones.</p>
                    ) : (
                      <div className="grid gap-3">
                        {paper.reviews.map((review, index) => (
                          <div
                            key={review.id}
                            className="bg-[#F8FAFC] border border-gray-100 rounded-xl p-4"
                          >
                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                              <span className="font-bold text-[#0D2C54]">
                                Revisor {index + 1}
                              </span>
                              <span>
                                Recomendacion: {recommendationLabels[review.recommendation] || review.recommendation}
                              </span>
                              <span>Puntaje: {review.score}</span>
                            </div>
                            {review.comments ? (
                              <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">
                                {review.comments}
                              </p>
                            ) : (
                              <p className="mt-2 text-xs text-gray-400">Sin comentarios.</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
