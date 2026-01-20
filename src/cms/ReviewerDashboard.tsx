import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ReviewIcon, ChevronRightIcon } from '../../components/icons';
import { useAuth } from './AuthContext';
import { useCMSData } from './CMSDataContext';

type ReviewRecommendation = 'accept' | 'minor-revision' | 'major-revision' | 'reject';

interface ReviewDraft {
    score: number;
    confidence: number;
    recommendation: ReviewRecommendation;
    comments: string;
    status: 'under-review' | 'accepted' | 'rejected';
}

const defaultDraft: ReviewDraft = {
    score: 4,
    confidence: 3,
    recommendation: 'accept',
    comments: '',
    status: 'under-review',
};

export const ReviewerDashboard: React.FC = () => {
    const { user } = useAuth();
    const { papers, submitReview } = useCMSData();
    const [activePaperId, setActivePaperId] = useState<string | null>(null);
    const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});

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
                const response = await fetch(
                    `/api/gcs-sign-download?object=${encodeURIComponent(fileKey)}`
                );
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

    const assignedPapers = useMemo(() => {
        if (!user) return [];
        return papers.filter((paper) => paper.assignedReviewerIds.includes(user.id));
    }, [papers, user]);

    const updateDraft = (paperId: string, updates: Partial<typeof defaultDraft>) => {
        setDrafts((prev) => ({
            ...prev,
            [paperId]: {
                ...(prev[paperId] || defaultDraft),
                ...updates,
            },
        }));
    };

    const handleSubmit = (paperId: string) => {
        if (!user) return;
        const draft = drafts[paperId] || defaultDraft;
        submitReview(paperId, {
            reviewerId: user.id,
            score: Number(draft.score),
            confidence: Number(draft.confidence),
            recommendation: draft.recommendation,
            comments: draft.comments.trim(),
        }, draft.status);
        setActivePaperId(null);
    };

    return (
        <div className="space-y-8">
             <div className="bg-[#0D2C54] rounded-3xl p-8 text-white shadow-lg flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-bold mb-2">Panel de Revisión</h3>
                    <p className="text-blue-200">
                        Tienes{' '}
                        <span className="font-bold text-white">
                            {assignedPapers.length} asignaciones activas
                        </span>{' '}
                        para esta etapa.
                    </p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl">
                    <ReviewIcon className="w-8 h-8 text-[#2A9D8F]" />
                </div>
             </div>

             <div className="grid gap-6">
                <h4 className="text-xl font-bold text-[#0D2C54]">Trabajos Asignados</h4>
                {assignedPapers.length === 0 ? (
                    <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center text-gray-500">
                        No tienes trabajos asignados por el momento.
                    </div>
                ) : (
                    assignedPapers.map((paper) => {
                        const existingReview = paper.reviews.find((review) => review.reviewerId === user?.id);
                        const baseDraft = existingReview
                            ? {
                                  score: existingReview.score,
                                  confidence: existingReview.confidence,
                                  recommendation: existingReview.recommendation,
                                  comments: existingReview.comments,
                                  status: paper.status === 'accepted' || paper.status === 'rejected'
                                    ? paper.status
                                    : 'under-review',
                              }
                            : {
                                  ...defaultDraft,
                                  status:
                                    paper.status === 'accepted' || paper.status === 'rejected'
                                      ? paper.status
                                      : 'under-review',
                              };
                        const draft = drafts[paper.id] || baseDraft;
                        const isOpen = activePaperId === paper.id;

                        return (
                            <motion.div
                                key={paper.id}
                                whileHover={{ y: -2 }}
                                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-2 flex-grow">
                                        <div className="flex items-center space-x-3">
                                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold">
                                                #{paper.id}
                                            </span>
                                            <h5 className="font-bold text-[#0D2C54] text-lg">{paper.title}</h5>
                                        </div>
                                        <p className="text-gray-500 text-sm line-clamp-2 max-w-2xl">{paper.abstract}</p>
                                        <div className="flex flex-wrap items-center gap-4 text-xs font-medium mt-2">
                                            <span className="text-gray-400">Track: {paper.track}</span>
                                            <span className="text-gray-400">
                                                Revisiones: {paper.reviews.length}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex-shrink-0">
                                        {existingReview ? (
                                            <button
                                                onClick={() => setActivePaperId(isOpen ? null : paper.id)}
                                                className="bg-gray-100 text-gray-500 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors flex items-center space-x-2"
                                            >
                                                <span>Editar evaluacion</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setActivePaperId(isOpen ? null : paper.id)}
                                                className="bg-[#2A9D8F] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#238C7E] transition-colors flex items-center space-x-2"
                                            >
                                                <span>Evaluar ahora</span>
                                                <ChevronRightIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {isOpen && (
                                    <div className="bg-[#F8FAFC] border border-gray-100 rounded-2xl p-6 space-y-4">
                                        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-2">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                                                Resumen completo
                                            </p>
                                            <p className="text-sm text-gray-600 whitespace-pre-line">
                                                {paper.abstract}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                            <span>
                                                Autores:{' '}
                                                {paper.authors.map((author) => author.name).join(', ') ||
                                                    'No informado'}
                                            </span>
                                            {paper.fileKey || paper.fileUrl ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleDownload(paper.fileKey, paper.fileUrl, paper.fileName)
                                                    }
                                                    className="text-[#2A9D8F] font-bold hover:underline"
                                                >
                                                    Descargar PDF
                                                </button>
                                            ) : paper.fileName ? (
                                                <span className="text-gray-400">
                                                    Archivo: {paper.fileName} (sin carga)
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">PDF no disponible</span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <label className="text-xs font-bold text-gray-500">
                                                Puntaje (1-5)
                                                <select
                                                    className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-200"
                                                    value={draft.score}
                                                    onChange={(event) =>
                                                        updateDraft(paper.id, { score: Number(event.target.value) })
                                                    }
                                                >
                                                    {[1, 2, 3, 4, 5].map((value) => (
                                                        <option key={value} value={value}>
                                                            {value}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                            <label className="text-xs font-bold text-gray-500">
                                                Confianza (1-5)
                                                <select
                                                    className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-200"
                                                    value={draft.confidence}
                                                    onChange={(event) =>
                                                        updateDraft(paper.id, { confidence: Number(event.target.value) })
                                                    }
                                                >
                                                    {[1, 2, 3, 4, 5].map((value) => (
                                                        <option key={value} value={value}>
                                                            {value}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                            <label className="text-xs font-bold text-gray-500">
                                                Recomendacion
                                                <select
                                                    className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-200"
                                                    value={draft.recommendation}
                                                    onChange={(event) =>
                                                        updateDraft(paper.id, {
                                                            recommendation: event.target.value as ReviewRecommendation,
                                                        })
                                                    }
                                                >
                                                    <option value="accept">Aceptar</option>
                                                    <option value="minor-revision">Revision menor</option>
                                                    <option value="major-revision">Revision mayor</option>
                                                    <option value="reject">Rechazar</option>
                                                </select>
                                            </label>
                                        </div>
                                        <label className="text-xs font-bold text-gray-500 block">
                                            Estado del paper
                                            <select
                                                className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-200"
                                                value={draft.status}
                                                onChange={(event) =>
                                                    updateDraft(paper.id, {
                                                        status: event.target.value as ReviewDraft['status'],
                                                    })
                                                }
                                            >
                                                <option value="under-review">En revision</option>
                                                <option value="accepted">Aceptado</option>
                                                <option value="rejected">Rechazado</option>
                                            </select>
                                        </label>
                                        <label className="text-xs font-bold text-gray-500 block">
                                            Comentarios para el autor
                                            <textarea
                                                rows={4}
                                                className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-200"
                                                value={draft.comments}
                                                onChange={(event) => updateDraft(paper.id, { comments: event.target.value })}
                                            />
                                        </label>
                                        <div className="flex items-center justify-between">
                                            <button
                                                type="button"
                                                onClick={() => setActivePaperId(null)}
                                                className="text-gray-500 font-bold hover:text-gray-700"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleSubmit(paper.id)}
                                                className="bg-[#0D2C54] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#1A4B8A] transition-all"
                                            >
                                                Guardar evaluacion
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
