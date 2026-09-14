import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ReviewIcon, ChevronRightIcon, SparklesIcon } from '../../components/icons';
import { useAuth } from './AuthContext';
import { useCMSData } from './CMSDataContext';
import { DownloadLink } from './DownloadLink';

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
    const { papers, submitReview, requestAIReview } = useCMSData();
    const [activePaperId, setActivePaperId] = useState<string | null>(null);
    const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
    const [isGeneratingAI, setIsGeneratingAI] = useState<Record<string, boolean>>({});
    const [aiAssistedMap, setAiAssistedMap] = useState<Record<string, { modelUsed?: string; decisionLabel?: string }>>({});
    const [aiErrorMap, setAiErrorMap] = useState<Record<string, string>>({});
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

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

    const handleGenerateAI = async (paperId: string) => {
        setIsGeneratingAI((prev) => ({ ...prev, [paperId]: true }));
        setAiErrorMap((prev) => ({ ...prev, [paperId]: '' }));
        setActivePaperId(paperId);
        try {
            const result = await requestAIReview(paperId);
            if (result) {
                updateDraft(paperId, {
                    score: result.score,
                    confidence: result.confidence,
                    recommendation: result.recommendation,
                    status: result.status,
                    comments: result.comments,
                });
                setAiAssistedMap((prev) => ({
                    ...prev,
                    [paperId]: {
                        modelUsed: result.modelUsed,
                        decisionLabel: result.decisionLabel,
                    },
                }));
            }
        } catch (err: any) {
            setAiErrorMap((prev) => ({
                ...prev,
                [paperId]: err?.message || 'No se pudo completar la revisión asistida con IA. Verifique el archivo del artículo.',
            }));
        } finally {
            setIsGeneratingAI((prev) => ({ ...prev, [paperId]: false }));
        }
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

                                    <div className="flex-shrink-0 flex items-center gap-2.5">
                                        <button
                                            type="button"
                                            disabled={isGeneratingAI[paper.id]}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleGenerateAI(paper.id);
                                            }}
                                            className="bg-gradient-to-r from-amber-500 via-[#F4A261] to-orange-500 text-white px-4 md:px-5 py-3 rounded-xl font-bold hover:brightness-105 transition-all flex items-center space-x-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm"
                                            title="Generar evaluación técnica y auditoría bibliográfica asistida con IA (Skill CLAGTEE e IEEE)"
                                        >
                                            {isGeneratingAI[paper.id] ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                                    </svg>
                                                    <span>Analizando con IA...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <SparklesIcon className="w-4 h-4 text-white" />
                                                    <span>Revisión IA</span>
                                                </>
                                            )}
                                        </button>

                                        {existingReview ? (
                                            <button
                                                onClick={() => setActivePaperId(isOpen ? null : paper.id)}
                                                className="bg-gray-100 text-gray-700 px-5 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors flex items-center space-x-2 text-xs md:text-sm"
                                            >
                                                <span>Editar evaluación</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setActivePaperId(isOpen ? null : paper.id)}
                                                className="bg-[#2A9D8F] text-white px-5 py-3 rounded-xl font-bold hover:bg-[#238C7E] transition-colors flex items-center space-x-2 text-xs md:text-sm"
                                            >
                                                <span>Evaluar ahora</span>
                                                <ChevronRightIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {isOpen && (
                                    <div className="bg-[#F8FAFC] border border-gray-100 rounded-2xl p-6 space-y-4">
                                        {/* Estado de carga de IA */}
                                        {isGeneratingAI[paper.id] && (
                                            <div className="p-4 md:p-5 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-4 animate-pulse shadow-sm">
                                                <div className="p-3 bg-amber-100 text-amber-700 rounded-xl flex-shrink-0">
                                                    <SparklesIcon className="w-6 h-6 animate-spin" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-bold text-amber-900 text-sm">
                                                        Auditoría técnica y bibliográfica en progreso (Skill CLAGTEE Reviewer)
                                                    </p>
                                                    <p className="text-xs text-amber-700 leading-relaxed">
                                                        Leyendo manuscrito en PDF, auditando consistencia matemática, verificando referencias reales contra alucinaciones y redactando informe estructurado para CMS...
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Error de IA si ocurrió */}
                                        {aiErrorMap[paper.id] && (
                                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-3 text-xs text-red-700">
                                                <span>{aiErrorMap[paper.id]}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleGenerateAI(paper.id)}
                                                    className="font-bold underline text-red-900 flex-shrink-0 hover:text-red-950"
                                                >
                                                    Reintentar
                                                </button>
                                            </div>
                                        )}

                                        {/* Banner de Borrador de IA aplicado */}
                                        {aiAssistedMap[paper.id] && (
                                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-900 shadow-sm">
                                                <div className="flex items-start space-x-2.5">
                                                    <span className="text-lg">✨</span>
                                                    <div className="space-y-0.5">
                                                        <p className="font-bold text-emerald-950">
                                                            Borrador sugerido por IA (Norma CLAGTEE 2026 / IEEE)
                                                        </p>
                                                        <p className="text-emerald-800 leading-relaxed">
                                                            Se han precompletado los puntajes y el informe técnico. Tienes el control total para revisar, ajustar o complementar el texto antes de guardar.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(draft.comments);
                                                            setCopyFeedback(paper.id);
                                                            setTimeout(() => setCopyFeedback(null), 2500);
                                                        }}
                                                        className="font-bold bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100/70 px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        {copyFeedback === paper.id ? '¡Copiado!' : 'Copiar informe'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isGeneratingAI[paper.id]}
                                                        onClick={() => handleGenerateAI(paper.id)}
                                                        className="font-bold bg-emerald-700 text-white hover:bg-emerald-800 px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        Regenerar
                                                    </button>
                                                </div>
                                            </div>
                                        )}

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
                                                <DownloadLink
                                                    fileKey={paper.fileKey}
                                                    fileUrl={paper.fileUrl}
                                                    fileName={paper.fileName}
                                                    className="text-[#2A9D8F] font-bold hover:underline"
                                                >
                                                    Descargar PDF
                                                </DownloadLink>
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
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-gray-500">
                                                    Comentarios para el autor y comité (Texto plano CMS)
                                                </label>
                                                <button
                                                    type="button"
                                                    disabled={isGeneratingAI[paper.id]}
                                                    onClick={() => handleGenerateAI(paper.id)}
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors"
                                                >
                                                    <SparklesIcon className="w-3.5 h-3.5" />
                                                    <span>{draft.comments ? 'Regenerar con IA' : 'Generar borrador con IA'}</span>
                                                </button>
                                            </div>
                                            <textarea
                                                rows={12}
                                                className="w-full px-3.5 py-3 rounded-lg border border-gray-200 text-xs md:text-sm font-mono leading-relaxed focus:border-[#2A9D8F] focus:ring-1 focus:ring-[#2A9D8F]"
                                                value={draft.comments}
                                                onChange={(event) => updateDraft(paper.id, { comments: event.target.value })}
                                                placeholder="Ingresa tus observaciones técnicas o presiona 'Revisión IA' para generar una propuesta basada en la rúbrica oficial de CLAGTEE e IEEE..."
                                            />
                                        </div>
                                        <div className="flex items-center justify-between pt-2">
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
