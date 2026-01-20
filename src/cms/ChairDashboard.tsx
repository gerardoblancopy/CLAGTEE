import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { UserIcon } from '../../components/icons';
import { useAuth } from './AuthContext';
import { PaperStatus, useCMSData } from './CMSDataContext';

const statusStyles = {
  'pending': 'bg-yellow-100 text-yellow-700',
  'under-review': 'bg-blue-100 text-blue-700',
  'accepted': 'bg-green-100 text-green-700',
  'rejected': 'bg-red-100 text-red-700',
  'withdrawn': 'bg-gray-100 text-gray-600',
};

const statusLabels: Record<PaperStatus, string> = {
  pending: 'Pendiente',
  'under-review': 'En revision',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
  withdrawn: 'Retirado',
};

export const ChairDashboard: React.FC = () => {
  const [filter, setFilter] = useState('all');
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    affiliation: '',
  });
  const [inviteResult, setInviteResult] = useState<{ email: string; tempPassword: string } | null>(
    null
  );
  const { users, inviteReviewer, error, clearError, isLoading } = useAuth();
  const { papers, assignReviewer, setDecision, deletePaper } = useCMSData();

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

  const reviewers = useMemo(() => users.filter((user) => user.role === 'reviewer'), [users]);

  const filteredPapers = useMemo(() => {
    if (filter === 'all') return papers;
    return papers.filter((paper) => paper.status === filter);
  }, [filter, papers]);

  const pendingCount = papers.filter((paper) => paper.status === 'pending').length;

  const handleAssign = (paperId: string) => {
    const reviewerId = assignments[paperId];
    if (!reviewerId) return;
    assignReviewer(paperId, reviewerId);
    setAssignments((prev) => ({ ...prev, [paperId]: '' }));
  };

  const handleDelete = async (paperId: string) => {
    const ok = window.confirm('¿Deseas eliminar este trabajo? Esta accion no se puede deshacer.');
    if (!ok) return;
    await deletePaper(paperId);
  };

  const resolveReviewerName = (reviewerId: string) =>
    reviewers.find((reviewer) => reviewer.id === reviewerId)?.name || 'Revisor externo';

  const recommendationLabels: Record<string, string> = {
    'accept': 'Aceptar',
    'minor-revision': 'Revision menor',
    'major-revision': 'Revision mayor',
    'reject': 'Rechazar',
  };

  const handleInviteSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) return;
    const result = await inviteReviewer(inviteForm);
    if (result) {
      setInviteResult(result);
      setInviteForm({ name: '', email: '', affiliation: '' });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-[#0D2C54]">Panel de Control (Chair)</h3>
          <p className="text-gray-500">Gestión general de envíos y asignaciones</p>
        </div>
        <div className="flex space-x-4">
           {/* Summary Cards */}
           <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                {papers.length}
              </div>
              <span className="text-sm font-medium text-gray-600">Total Papers</span>
           </div>
           <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 font-bold">
                {pendingCount}
              </div>
              <span className="text-sm font-medium text-gray-600">Pendientes</span>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-lg font-bold text-[#0D2C54]">Invitar revisores</h4>
            <p className="text-sm text-gray-500">
              Crea cuentas de revision y comparte las credenciales generadas.
            </p>
          </div>
        </div>
        <form onSubmit={handleInviteSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Nombre completo</label>
            <input
              type="text"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none"
              value={inviteForm.name}
              onChange={(event) =>
                setInviteForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Nombre del revisor"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
            <input
              type="email"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none"
              value={inviteForm.email}
              onChange={(event) =>
                setInviteForm((prev) => ({ ...prev, email: event.target.value }))
              }
              placeholder="reviewer@universidad.cl"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Afiliacion</label>
            <input
              type="text"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none"
              value={inviteForm.affiliation}
              onChange={(event) =>
                setInviteForm((prev) => ({ ...prev, affiliation: event.target.value }))
              }
              placeholder="Institucion"
            />
          </div>
          <div className="md:col-span-3 flex items-center justify-between">
            <div className="text-xs text-gray-400">
              Se genera una clave temporal para el primer acceso.
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-[#2A9D8F] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#238C7E] transition-colors disabled:opacity-70"
            >
              {isLoading ? 'Creando...' : 'Invitar revisor'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {inviteResult && (
          <div className="mt-4 bg-[#F8FAFC] border border-gray-100 rounded-xl p-4 text-sm text-gray-600">
            <p className="font-bold text-[#0D2C54] mb-2">Credenciales generadas</p>
            <p>Email: {inviteResult.email}</p>
            <p>Clave temporal: {inviteResult.tempPassword}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex space-x-2">
            {['all', 'pending', 'under-review', 'accepted', 'rejected', 'withdrawn'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${
                      filter === f ? 'bg-[#0D2C54] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {f === 'all' ? 'Todos' : statusLabels[f as PaperStatus]}
                </button>
            ))}
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <div className="col-span-1">ID</div>
            <div className="col-span-4">Título / Track</div>
            <div className="col-span-2">Autor</div>
            <div className="col-span-2">Estado</div>
            <div className="col-span-3">Revisor Asignado</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-100">
            {filteredPapers.map((paper) => (
              <motion.div 
                key={paper.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-[#F8FAFC] transition-colors group"
              >
                <div className="col-span-1 font-bold text-[#0D2C54]">#{paper.id}</div>
                <div className="col-span-4">
                  <p className="font-bold text-gray-800 truncate">{paper.title}</p>
                  <p className="text-xs text-gray-400">{paper.track}</p>
                  {paper.fileKey || paper.fileUrl ? (
                    <button
                      type="button"
                      onClick={() => handleDownload(paper.fileKey, paper.fileUrl, paper.fileName)}
                      className="text-xs font-bold text-[#2A9D8F] hover:underline mt-1"
                    >
                      Descargar PDF
                    </button>
                  ) : (
                    <p className="text-[11px] text-gray-400 mt-1">PDF no disponible</p>
                  )}
                </div>
                <div className="col-span-2 text-sm text-gray-600 flex items-center">
                  <UserIcon className="w-3 h-3 mr-1 text-gray-400" />
                  {paper.authors[0]?.name || 'Autor principal'}
                </div>
                <div className="col-span-2">
                  <select
                    className={`px-2 py-1 rounded text-xs font-bold ${statusStyles[paper.status]}`}
                    value={paper.status}
                    onChange={(event) => setDecision(paper.id, event.target.value as PaperStatus)}
                  >
                    {(['pending', 'under-review', 'accepted', 'rejected', 'withdrawn'] as PaperStatus[]).map(
                      (status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div className="col-span-3">
                  {paper.assignedReviewerIds.length > 0 ? (
                    <div className="flex flex-col text-xs text-gray-600 gap-1">
                      {paper.assignedReviewerIds.map((reviewerId) => (
                        <div key={reviewerId} className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs mr-2">
                            {resolveReviewerName(reviewerId).charAt(0)}
                          </div>
                          <span>{resolveReviewerName(reviewerId)}</span>
                        </div>
                      ))}
                      <span className="text-[11px] text-gray-400">
                        Reviews: {paper.reviews.length}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedPaperId((prev) => (prev === paper.id ? null : paper.id))
                        }
                        className="text-[#2A9D8F] text-[11px] font-bold hover:underline text-left"
                      >
                        {expandedPaperId === paper.id ? 'Ocultar evaluaciones' : 'Ver evaluaciones'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(paper.id)}
                        className="text-red-500 text-[11px] font-bold hover:underline text-left"
                      >
                        Eliminar envio
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <select
                        className="text-xs px-2 py-1 border border-gray-200 rounded-lg"
                        value={assignments[paper.id] || ''}
                        onChange={(event) =>
                          setAssignments((prev) => ({
                            ...prev,
                            [paper.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Selecciona revisor</option>
                        {reviewers.map((reviewer) => (
                          <option key={reviewer.id} value={reviewer.id}>
                            {reviewer.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAssign(paper.id)}
                        className="text-[#2A9D8F] text-xs font-bold hover:underline flex items-center"
                        disabled={!assignments[paper.id]}
                      >
                        + Asignar Revisor
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(paper.id)}
                        className="text-red-500 text-xs font-bold hover:underline text-left"
                      >
                        Eliminar envio
                      </button>
                    </div>
                  )}
                </div>

                {expandedPaperId === paper.id && (
                  <div className="col-span-12 bg-white border border-gray-100 rounded-xl p-4 text-sm text-gray-600">
                    {paper.reviews.length === 0 ? (
                      <p className="text-sm text-gray-400">Aun no hay evaluaciones.</p>
                    ) : (
                      <div className="grid gap-3">
                        {paper.reviews.map((review) => (
                          <div key={review.id} className="bg-[#F8FAFC] border border-gray-100 rounded-lg p-3">
                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                              <span className="font-bold text-[#0D2C54]">
                                {resolveReviewerName(review.reviewerId)}
                              </span>
                              <span>
                                Recomendacion: {recommendationLabels[review.recommendation] || review.recommendation}
                              </span>
                              <span>Puntaje: {review.score}</span>
                              <span>Confianza: {review.confidence}</span>
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
      </div>
    </div>
  );
};
