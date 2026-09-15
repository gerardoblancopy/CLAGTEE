import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { UserIcon } from '../../components/icons';
import { User, useAuth } from './AuthContext';
import { Paper, PaperStatus, useCMSData } from './CMSDataContext';
import { DownloadLink } from './DownloadLink';

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
  const [activeTab, setActiveTab] = useState<'papers' | 'reviewers' | 'authors'>('papers');
  const [filter, setFilter] = useState('all');
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    affiliation: '',
  });
  const [inviteResult, setInviteResult] = useState<{
    email: string;
    tempPassword: string;
    emailSent?: boolean;
    emailError?: string | null;
  } | null>(
    null
  );
  const { users, inviteReviewer, resendReviewerInvitation, deleteReviewer, deleteAuthor, sendEmailToUser, error, clearError, isLoading } = useAuth();
  const {
    papers,
    assignReviewer,
    notifyReviewerAssignments,
    unassignReviewer,
    setDecision,
    deletePaper,
  } = useCMSData();

  const [emailModal, setEmailModal] = useState<{
    to: string | string[];
    name?: string;
    label: string;
    title: string;
    decisionPaper?: Paper;
  } | null>(null);
  const [emailForm, setEmailForm] = useState({ subject: '', body: '' });
  const [emailFeedback, setEmailFeedback] = useState<string | null>(null);
  const [includeReviewerComments, setIncludeReviewerComments] = useState(true);
  const [resendResult, setResendResult] = useState<{ email: string; tempPassword: string } | null>(
    null
  );
  const [notifyResult, setNotifyResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleResendInvitation = async (reviewer: User) => {
    const ok = window.confirm(
      `Se enviara una nueva invitacion a "${reviewer.name}" <${reviewer.email}> con una clave temporal nueva.\n\n` +
        'Si el revisor ya definio su propia contrasena, dejara de funcionar y tendra que usar la nueva. ¿Continuar?'
    );
    if (!ok) return;
    const result = await resendReviewerInvitation(reviewer.email);
    if (result) {
      setResendResult({ email: result.email, tempPassword: result.tempPassword });
    }
  };

  const handleDeleteReviewer = async (reviewerId: string, reviewerName: string) => {
    const ok = window.confirm(`¿Deseas eliminar al revisor "${reviewerName}"? Esta accion no se puede deshacer.`);
    if (!ok) return;
    await deleteReviewer(reviewerId);
  };

  const handleDeleteAuthor = async (authorId: string, authorName: string) => {
    const ok = window.confirm(
      `¿Deseas eliminar al autor "${authorName}"? Sus envios permaneceran en el sistema. Esta accion no se puede deshacer.`
    );
    if (!ok) return;
    await deleteAuthor(authorId);
  };

  const openEmailModal = (
    to: string | string[],
    name?: string,
    label?: string,
    title?: string,
    initialSubject = '',
    initialBody = ''
  ) => {
    const displayLabel = label || (Array.isArray(to) ? `${to.length} destinatarios` : `${name || ''} <${to}>`);
    setEmailModal({ to, name, label: displayLabel, title: title || 'Enviar email' });
    setEmailForm({ subject: initialSubject, body: initialBody });
    setEmailFeedback(null);
    clearError();
  };

  const closeEmailModal = () => {
    setEmailModal(null);
    setEmailForm({ subject: '', body: '' });
    setEmailFeedback(null);
  };

  const handleSendEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!emailModal) return;
    if (!emailForm.subject.trim() || !emailForm.body.trim()) return;
    if (emailModal.decisionPaper) {
      const count = Array.isArray(emailModal.to) ? emailModal.to.length : 1;
      const decision = emailModal.decisionPaper.status === 'accepted' ? 'aceptación' : 'rechazo';
      const ok = window.confirm(
        `Se enviará la notificación de ${decision} de "${emailModal.decisionPaper.title}" a ${count} destinatario(s). Esta acción no se puede deshacer. ¿Continuar?`
      );
      if (!ok) return;
    }
    const ok = await sendEmailToUser({
      to: emailModal.to,
      name: emailModal.name,
      subject: emailForm.subject,
      body: emailForm.body,
    });
    if (ok) {
      setEmailFeedback('Correo enviado correctamente.');
      setEmailForm({ subject: '', body: '' });
      setTimeout(() => closeEmailModal(), 1500);
    }
  };

  const reviewers = useMemo(() => users.filter((user) => user.role === 'reviewer'), [users]);
  const authors = useMemo(() => users.filter((user) => user.role === 'author'), [users]);

  const reviewersWithPendingReviews = useMemo(() => {
    return (reviewers || []).filter((reviewer) => {
      const assigned = (papers || []).filter((p) => Array.isArray(p?.assignedReviewerIds) && p.assignedReviewerIds.includes(reviewer.id));
      const reviewedCount = (papers || []).reduce(
        (acc, p) => acc + (Array.isArray(p?.reviews) ? p.reviews.filter((r) => r?.reviewerId === reviewer.id).length : 0),
        0
      );
      return assigned.length > reviewedCount;
    });
  }, [reviewers, papers]);

  const openEmailAllReviewers = (onlyPending = false) => {
    const targetReviewers = onlyPending ? reviewersWithPendingReviews : reviewers;
    const emails = targetReviewers.map((r) => r.email).filter(Boolean);
    if (emails.length === 0) {
      alert(onlyPending ? 'No hay revisores con evaluaciones pendientes.' : 'No hay revisores registrados con correo.');
      return;
    }
    const labelText = onlyPending
      ? `Revisores con pendientes (${emails.length} destinatarios)`
      : `Todos los revisores (${emails.length} destinatarios)`;
    const titleText = onlyPending
      ? 'Enviar email a revisores con evaluaciones pendientes'
      : 'Enviar email a todos los revisores';

    const defaultSubject = onlyPending
      ? 'CLAGTEE 2026 - Recordatorio de evaluaciones pendientes'
      : 'CLAGTEE 2026 - Comunicación oficial a revisores';

    const defaultBody = onlyPending
      ? `Estimado/a Revisor/a,\n\nLe recordamos amablemente que tiene trabajos asignados con dictámenes pendientes para el congreso CLAGTEE 2026.\n\nAgradecemos completar sus evaluaciones en la plataforma a la brevedad posible para continuar con el proceso editorial:\nhttps://www.clagtee2026.org/admin\n\nSaludos cordiales,\nComité Organizador CLAGTEE 2026`
      : `Estimados/as Revisores/as,\n\nLes escribimos en nombre del Comité Organizador del XVI Latin-American Congress on Electricity Generation and Transmission (CLAGTEE 2026), a celebrarse los días 28, 29 y 30 de octubre de 2026.\n\nAgradecemos profundamente su valiosa colaboración en el proceso de revisión por pares.\n\nPueden acceder a su panel de revisor en cualquier momento en:\nhttps://www.clagtee2026.org/admin\n\nSaludos cordiales,\nChairman CLAGTEE 2026`;

    openEmailModal(emails, undefined, labelText, titleText, defaultSubject, defaultBody);
  };

  const filteredPapers = useMemo(() => {
    if (filter === 'all') return papers;
    return papers.filter((paper) => paper.status === filter);
  }, [filter, papers]);

  const pendingCount = papers.filter((paper) => paper.status === 'pending').length;

  const handleAssign = async (paperId: string) => {
    const reviewerId = assignments[paperId];
    if (!reviewerId) return;
    const result = await assignReviewer(paperId, reviewerId);
    setAssignments((prev) => ({ ...prev, [paperId]: '' }));
    // La asignacion se guarda igual aunque el aviso por correo falle.
    if (result && !result.emailSent) {
      window.alert(
        `Revisor asignado, pero el aviso por correo no se envio${
          result.emailError ? `: ${result.emailError}` : '.'
        }\nPuedes enviarle el resumen a mano desde la pestana "Revisores".`
      );
    }
  };

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString('es-CL', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  // Ultimo correo de asignacion enviado al revisor (automatico o manual).
  const assignmentStatus = (reviewer: User) => {
    if (reviewer.assignmentNotifyError) {
      return {
        label: 'Aviso fallido',
        title: reviewer.assignmentNotifyError,
        className: 'bg-red-100 text-red-700',
      };
    }
    if (reviewer.assignmentNotifiedAt) {
      return {
        label: `Aviso ${formatDateTime(reviewer.assignmentNotifiedAt)}`,
        title: reviewer.assignmentNotifiedAt,
        className: 'bg-blue-100 text-blue-700',
      };
    }
    return null;
  };

  const handleNotifyAssignments = async (reviewer: User, assignedCount: number) => {
    const ok = window.confirm(
      `Se enviara a "${reviewer.name}" <${reviewer.email}> un resumen con los ${assignedCount} trabajo(s) asignados, su estado de revision y las estadisticas de sus evaluaciones. ¿Continuar?`
    );
    if (!ok) return;
    const result = await notifyReviewerAssignments(reviewer.id);
    if (result?.emailSent) {
      setNotifyResult({
        ok: true,
        message: `Resumen enviado a ${reviewer.email} con ${result.papersCount || assignedCount} trabajo(s).`,
      });
      return;
    }
    setNotifyResult({
      ok: false,
      message: `No se pudo enviar el resumen a ${reviewer.email}${
        result?.emailError ? `: ${result.emailError}` : '.'
      }`,
    });
  };

  const handleUnassign = async (paperId: string, reviewerId: string, reviewerName: string) => {
    const ok = window.confirm(
      `¿Deseas quitar a "${reviewerName}" de este trabajo? Dejara de verlo en su panel.`
    );
    if (!ok) return;
    await unassignReviewer(paperId, reviewerId);
  };

  const handleDelete = async (paperId: string) => {
    const ok = window.confirm('¿Deseas eliminar este trabajo? Esta accion no se puede deshacer.');
    if (!ok) return;
    await deletePaper(paperId);
  };

  const resolveReviewerName = (reviewerId: string) =>
    reviewers.find((reviewer) => reviewer.id === reviewerId)?.name || 'Revisor externo';

  // Reviewers invited before the outcome was recorded have neither field set,
  // which is unknown rather than failed.
  const invitationStatus = (reviewer: User) => {
    if (reviewer.invitationError) {
      return {
        label: 'Invitacion fallida',
        title: reviewer.invitationError,
        className: 'bg-red-100 text-red-700',
      };
    }
    if (reviewer.invitationSentAt) {
      return {
        label: 'Invitacion enviada',
        title: reviewer.invitationSentAt,
        className: 'bg-green-100 text-green-700',
      };
    }
    return {
      label: 'Sin registro',
      title: 'Invitado antes de que se registrara el envio. Verifica en Resend.',
      className: 'bg-gray-100 text-gray-500',
    };
  };

  const recommendationLabels: Record<string, string> = {
    'accept': 'Aceptar',
    'minor-revision': 'Revisión menor',
    'major-revision': 'Revisión mayor',
    'reject': 'Rechazar',
  };

  const resolveDecisionRecipients = (paper: Paper) => {
    const submitter = users.find((candidate) => candidate.id === paper.submitterId);
    const emails = [submitter?.email, ...paper.authors.map((author) => author.email)]
      .map((email) => (email || '').trim().toLowerCase())
      .filter(Boolean);
    return Array.from(new Set(emails));
  };

  const buildReviewerCommentsBlock = (paper: Paper) => {
    if (paper.reviews.length === 0) return '';
    const blocks = paper.reviews.map((review, index) => {
      const recommendation = recommendationLabels[review.recommendation] || review.recommendation;
      const header = `Revisor ${index + 1} — Recomendación: ${recommendation} | Puntaje: ${review.score}/5`;
      const comments = review.comments.trim() || 'Sin comentarios adicionales.';
      return `${header}\n${comments}`;
    });
    return `Comentarios de la revisión por pares:\n\n${blocks.join('\n\n')}\n\n`;
  };

  const buildDecisionEmail = (paper: Paper, withComments: boolean) => {
    const accepted = paper.status === 'accepted';
    const commentsBlock = withComments ? buildReviewerCommentsBlock(paper) : '';
    const subject = accepted
      ? `CLAGTEE 2026 — Notificación de aceptación del trabajo (${paper.id})`
      : `CLAGTEE 2026 — Notificación de evaluación del trabajo (${paper.id})`;

    const body = accepted
      ? `Estimados/as autores/as:

Nos complace informarles que su trabajo titulado "${paper.title}" (ID: ${paper.id}), postulado en el área temática "${paper.track}", ha sido ACEPTADO para su presentación y publicación en el XVI Congreso Latinoamericano de Generación y Transmisión de Energía Eléctrica (CLAGTEE 2026).

${commentsBlock}Próximamente les haremos llegar las instrucciones detalladas para la preparación de la versión final del manuscrito (camera-ready) y los requisitos para la inscripción de los autores al congreso.

Agradecemos sinceramente su valiosa contribución científica y dedicación.

Atentamente,
Comité Organizador CLAGTEE 2026`
      : `Estimados/as autores/as:

Agradecemos sinceramente el envío de su trabajo titulado "${paper.title}" (ID: ${paper.id}) al área temática "${paper.track}" de CLAGTEE 2026.

Tras el riguroso proceso de evaluación y revisión por pares, lamentamos comunicarles que en esta oportunidad el trabajo no ha sido seleccionado para su presentación en el congreso.

${commentsBlock}Apreciamos enormemente su interés en CLAGTEE 2026 y los motivamos a seguir compartiendo sus investigaciones en futuras ediciones del congreso.

Atentamente,
Comité Organizador CLAGTEE 2026`;

    return { subject, body };
  };

  const openDecisionEmail = (paper: Paper) => {
    const recipients = resolveDecisionRecipients(paper);
    if (recipients.length === 0) {
      window.alert('Este trabajo no tiene direcciones de correo asociadas.');
      return;
    }
    const withComments = paper.reviews.length > 0;
    setIncludeReviewerComments(withComments);
    setEmailModal({
      to: recipients,
      label: recipients.join(', '),
      title: paper.status === 'accepted' ? 'Notificar aceptación' : 'Notificar rechazo',
      decisionPaper: paper,
    });
    setEmailForm(buildDecisionEmail(paper, withComments));
    setEmailFeedback(null);
    clearError();
  };

  const toggleReviewerComments = (checked: boolean) => {
    setIncludeReviewerComments(checked);
    if (!emailModal?.decisionPaper) return;
    setEmailForm(buildDecisionEmail(emailModal.decisionPaper, checked));
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
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">
              {reviewers.length}
            </div>
            <span className="text-sm font-medium text-gray-600">Revisores</span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
              {authors.length}
            </div>
            <span className="text-sm font-medium text-gray-600">Autores</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('papers')}
            className={`px-6 py-3 rounded-xl font-bold transition-colors ${activeTab === 'papers'
              ? 'bg-[#0D2C54] text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
          >
            📄 Papers ({papers.length})
          </button>
          <button
            onClick={() => setActiveTab('reviewers')}
            className={`px-6 py-3 rounded-xl font-bold transition-colors ${activeTab === 'reviewers'
              ? 'bg-[#0D2C54] text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
          >
            👥 Revisores ({reviewers.length})
          </button>
          <button
            onClick={() => setActiveTab('authors')}
            className={`px-6 py-3 rounded-xl font-bold transition-colors ${activeTab === 'authors'
              ? 'bg-[#0D2C54] text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
          >
            ✍️ Autores ({authors.length})
          </button>
        </div>

        {/* Global Email Actions to Reviewers */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openEmailAllReviewers(false)}
            disabled={reviewers.length === 0}
            className="bg-[#2A9D8F] text-white px-4 py-3 rounded-xl text-xs md:text-sm font-bold hover:bg-[#238C7E] transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            title="Enviar correo a todos los revisores registrados"
          >
            <span>✉ Enviar email a revisores ({reviewers.length})</span>
          </button>

          {reviewersWithPendingReviews.length > 0 && (
            <button
              type="button"
              onClick={() => openEmailAllReviewers(true)}
              className="bg-amber-600 text-white px-4 py-3 rounded-xl text-xs md:text-sm font-bold hover:bg-amber-700 transition-all flex items-center gap-2 shadow-sm"
              title={`Enviar recordatorio urgente a ${reviewersWithPendingReviews.length} revisores con evaluaciones pendientes`}
            >
              <span>🔔 Recordar pendientes ({reviewersWithPendingReviews.length})</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'papers' && (
        <>
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
                {inviteResult.emailSent === false ? (
                  <p className="mt-2 text-red-600 font-bold">
                    El correo de invitacion NO se envio
                    {inviteResult.emailError ? `: ${inviteResult.emailError}` : '.'} Entrega estas
                    credenciales por otro medio o reintenta desde la tabla de revisores.
                  </p>
                ) : (
                  <p className="mt-2 text-green-700">Correo de invitacion enviado.</p>
                )}
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
                  className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${filter === f ? 'bg-[#0D2C54] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
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
                    {paper.fileKey ? (
                      <DownloadLink
                        fileKey={paper.fileKey}
                        fileName={paper.fileName}
                        className="inline-block text-xs font-bold text-[#2A9D8F] hover:underline mt-1"
                      >
                        Descargar PDF
                      </DownloadLink>
                    ) : paper.fileUrl ? (
                      <a
                        href={paper.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-xs font-bold text-[#2A9D8F] hover:underline mt-1"
                      >
                        Descargar PDF
                      </a>
                    ) : (
                      <p className="text-[11px] text-gray-400 mt-1">PDF no disponible</p>
                    )}
                    {paper.revisedFileKey && (
                      <DownloadLink
                        fileKey={paper.revisedFileKey}
                        fileName={paper.revisedFileName}
                        className="block text-xs font-bold text-[#0D2C54] hover:underline mt-1"
                      >
                        Descargar version revisada
                      </DownloadLink>
                    )}
                    {paper.revisionNote && (
                      <p className="text-[11px] text-gray-500 mt-1 whitespace-pre-line">
                        Nota del autor: {paper.revisionNote}
                      </p>
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
                    {(() => {
                      const assignedIds = Array.isArray(paper?.assignedReviewerIds) ? paper.assignedReviewerIds : [];
                      const availableReviewers = (reviewers || []).filter(
                        (reviewer) => !assignedIds.includes(reviewer.id)
                      );
                      return (
                        <div className="flex flex-col gap-2">
                          {assignedIds.length > 0 && (
                            <div className="flex flex-col text-xs text-gray-600 gap-1">
                              {assignedIds.map((reviewerId) => (
                                <div key={reviewerId} className="flex items-center">
                                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs mr-2">
                                    {resolveReviewerName(reviewerId).charAt(0)}
                                  </div>
                                  <span className="flex-1 truncate">
                                    {resolveReviewerName(reviewerId)}
                                  </span>
                                  <button
                                    type="button"
                                    title="Quitar revisor"
                                    aria-label={`Quitar a ${resolveReviewerName(reviewerId)}`}
                                    onClick={() =>
                                      handleUnassign(
                                        paper.id,
                                        reviewerId,
                                        resolveReviewerName(reviewerId)
                                      )
                                    }
                                    className="ml-2 text-red-500 hover:text-red-600 text-sm font-bold leading-none px-1"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                              <span className="text-[11px] text-gray-400">
                                Reviews: {Array.isArray(paper?.reviews) ? paper.reviews.length : 0}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedPaperId((prev) => (prev === paper.id ? null : paper.id))
                                }
                                className="text-[#2A9D8F] text-[11px] font-bold hover:underline text-left"
                              >
                                {expandedPaperId === paper.id
                                  ? 'Ocultar evaluaciones'
                                  : 'Ver evaluaciones'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const emails = assignedReviewers.map((r) => r.email).filter(Boolean);
                                  if (emails.length > 0) {
                                    openEmailModal(
                                      emails,
                                      undefined,
                                      `Revisores de #${paper.id} (${emails.join(', ')})`,
                                      `Enviar email a revisores de #${paper.id}`,
                                      `CLAGTEE 2026 - Consulta sobre artículo #${paper.id}: ${paper.title}`,
                                      `Estimado/a Revisor/a,\n\nNos comunicamos en relación al artículo #${paper.id} titulado "${paper.title}" asignado a su evaluación en el congreso CLAGTEE 2026.\n\n...\n\nSaludos cordiales,\nChairman CLAGTEE 2026`
                                    );
                                  }
                                }}
                                className="text-[#0D2C54] text-[11px] font-bold hover:underline text-left flex items-center gap-1"
                              >
                                ✉ Email a revisores ({assignedReviewers.length})
                              </button>
                            </div>
                          )}

                          {availableReviewers.length > 0 ? (
                            <>
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
                                {availableReviewers.map((reviewer) => (
                                  <option key={reviewer.id} value={reviewer.id}>
                                    {reviewer.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleAssign(paper.id)}
                                className="text-[#2A9D8F] text-xs font-bold hover:underline flex items-center disabled:opacity-40"
                                disabled={!assignments[paper.id]}
                              >
                                + Asignar Revisor
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-gray-400">
                              Todos los revisores estan asignados
                            </span>
                          )}

                          {(paper.status === 'accepted' || paper.status === 'rejected') && (
                            <button
                              type="button"
                              onClick={() => openDecisionEmail(paper)}
                              className="text-[#0D2C54] text-xs font-bold hover:underline text-left"
                            >
                              ✉ Notificar {paper.status === 'accepted' ? 'aceptación' : 'rechazo'}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDelete(paper.id)}
                            className="text-red-500 text-xs font-bold hover:underline text-left"
                          >
                            Eliminar envío
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {expandedPaperId === paper.id && (
                    <div className="col-span-12 bg-white border border-gray-100 rounded-xl p-4 text-sm text-gray-600">
                      {(() => {
                        const reviewsList = Array.isArray(paper?.reviews) ? paper.reviews : [];
                        return reviewsList.length === 0 ? (
                          <p className="text-sm text-gray-400">Aun no hay evaluaciones.</p>
                        ) : (
                          <div className="grid gap-3">
                            {reviewsList.map((review) => (
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
                        );
                      })()}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'reviewers' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-lg font-bold text-[#0D2C54]">Lista de Revisores</h4>
              <p className="text-sm text-gray-500">
                Gestiona los evaluadores, reenvía credenciales o comunícate directamente con el equipo de revisión.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openEmailAllReviewers(false)}
                disabled={reviewers.length === 0}
                className="bg-[#0D2C54] text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-[#1A4B8A] transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                title="Enviar un correo personalizado a todos los revisores"
              >
                <span>✉ Enviar email a revisores ({reviewers.length})</span>
              </button>
              {reviewersWithPendingReviews.length > 0 && (
                <button
                  type="button"
                  onClick={() => openEmailAllReviewers(true)}
                  className="bg-amber-600 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors flex items-center gap-1.5 shadow-sm"
                  title={`Enviar recordatorio a ${reviewersWithPendingReviews.length} revisores con dictámenes pendientes`}
                >
                  <span>🔔 Recordar pendientes ({reviewersWithPendingReviews.length})</span>
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mx-4 mt-4 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {resendResult && (
            <div className="mx-4 mt-4 bg-green-50 border border-green-100 text-sm text-gray-700 px-4 py-3 rounded-xl">
              <p className="font-bold text-green-700 mb-1">Invitacion reenviada</p>
              <p>Email: {resendResult.email}</p>
              <p>Nueva clave temporal: {resendResult.tempPassword}</p>
              <button
                type="button"
                onClick={() => setResendResult(null)}
                className="mt-2 text-xs font-bold text-gray-500 hover:underline"
              >
                Cerrar
              </button>
            </div>
          )}

          {notifyResult && (
            <div
              className={`mx-4 mt-4 border text-sm px-4 py-3 rounded-xl ${
                notifyResult.ok
                  ? 'bg-green-50 border-green-100 text-green-700'
                  : 'bg-red-50 border-red-100 text-red-600'
              }`}
            >
              <p className="font-bold">{notifyResult.message}</p>
              <button
                type="button"
                onClick={() => setNotifyResult(null)}
                className="mt-2 text-xs font-bold text-gray-500 hover:underline"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <div className="col-span-3">Nombre</div>
            <div className="col-span-3">Email</div>
            <div className="col-span-2">Afiliación</div>
            <div className="col-span-1">Papers</div>
            <div className="col-span-1">Reviews</div>
            <div className="col-span-2">Acciones</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100">
            {reviewers.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No hay revisores registrados. Invita revisores desde la pestaña "Papers".
              </div>
            ) : (
              reviewers.map((reviewer) => {
                const assignedPapers = (papers || []).filter((p) =>
                  Array.isArray(p?.assignedReviewerIds) && p.assignedReviewerIds.includes(reviewer.id)
                );
                const completedReviews = (papers || []).reduce(
                  (count, p) => count + (Array.isArray(p?.reviews) ? p.reviews.filter((r) => r?.reviewerId === reviewer.id).length : 0),
                  0
                );
                return (
                  <motion.div
                    key={reviewer.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div className="col-span-3 flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2A9D8F] to-[#0D2C54] flex items-center justify-center text-white font-bold mr-3">
                        {reviewer.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-gray-800">{reviewer.name}</span>
                    </div>
                    <div className="col-span-3 text-sm text-gray-600">
                      <span className="block break-all">{reviewer.email}</span>
                      {(() => {
                        const status = invitationStatus(reviewer);
                        return (
                          <span
                            title={status.title}
                            className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${status.className}`}
                          >
                            {status.label}
                          </span>
                        );
                      })()}
                      {(() => {
                        const status = assignmentStatus(reviewer);
                        if (!status) return null;
                        return (
                          <span
                            title={status.title}
                            className={`inline-block mt-1 ml-1 px-2 py-0.5 rounded text-[10px] font-bold ${status.className}`}
                          >
                            {status.label}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="col-span-2 text-sm text-gray-500">
                      {reviewer.affiliation || '—'}
                    </div>
                    <div className="col-span-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${assignedPapers.length > 0
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-500'
                        }`}>
                        {assignedPapers.length}
                      </span>
                    </div>
                    <div className="col-span-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${completedReviews > 0
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                        }`}>
                        {completedReviews}
                      </span>
                    </div>
                    <div className="col-span-2 flex flex-col gap-1 items-start">
                      <button
                        type="button"
                        onClick={() =>
                          openEmailModal(
                            reviewer.email,
                            reviewer.name,
                            `${reviewer.name} <${reviewer.email}>`,
                            `Enviar email a ${reviewer.name}`,
                            `CLAGTEE 2026 - Consulta sobre arbitraje`,
                            `Estimado/a ${reviewer.name},\n\nNos comunicamos respecto a su labor de revisión en el congreso CLAGTEE 2026.\n\n...\n\nSaludos cordiales,\nChairman CLAGTEE 2026`
                          )
                        }
                        disabled={isLoading}
                        className="text-[#2A9D8F] text-xs font-bold hover:underline disabled:opacity-50 flex items-center gap-1"
                      >
                        ✉ Enviar email
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNotifyAssignments(reviewer, assignedPapers.length)}
                        disabled={isLoading || assignedPapers.length === 0}
                        title={
                          assignedPapers.length === 0
                            ? 'Este revisor no tiene trabajos asignados'
                            : 'Enviar resumen con sus trabajos asignados, estado y estadisticas'
                        }
                        className="text-[#0D2C54] text-xs font-bold hover:underline disabled:opacity-40 disabled:cursor-not-allowed text-left"
                      >
                        📋 Enviar resumen de revisiones
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResendInvitation(reviewer)}
                        disabled={isLoading}
                        className="text-gray-500 text-xs font-medium hover:underline disabled:opacity-50"
                      >
                        🔑 Reenviar invitacion
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReviewer(reviewer.id, reviewer.name)}
                        disabled={isLoading}
                        className="text-red-500 text-xs font-bold hover:underline disabled:opacity-50"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'authors' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h4 className="text-lg font-bold text-[#0D2C54]">Lista de Autores</h4>
            <p className="text-sm text-gray-500">Todos los autores registrados en el sistema</p>
          </div>

          <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <div className="col-span-3">Nombre</div>
            <div className="col-span-3">Email</div>
            <div className="col-span-3">Afiliación</div>
            <div className="col-span-1">Papers</div>
            <div className="col-span-2">Acciones</div>
          </div>

          <div className="divide-y divide-gray-100">
            {authors.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                Aún no hay autores registrados.
              </div>
            ) : (
              authors.map((author) => {
                const submittedPapers = papers.filter((p) => p.submitterId === author.id);
                return (
                  <motion.div
                    key={author.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div className="col-span-3 flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-[#0D2C54] flex items-center justify-center text-white font-bold mr-3">
                        {author.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-gray-800">{author.name}</span>
                    </div>
                    <div className="col-span-3 text-sm text-gray-600 truncate">{author.email}</div>
                    <div className="col-span-3 text-sm text-gray-500">
                      {author.affiliation || '—'}
                    </div>
                    <div className="col-span-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${submittedPapers.length > 0
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-500'
                        }`}>
                        {submittedPapers.length}
                      </span>
                    </div>
                    <div className="col-span-2 flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => openEmailModal(author.email, author.name)}
                        className="text-[#2A9D8F] text-xs font-bold hover:underline text-left"
                      >
                        ✉️ Enviar email
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAuthor(author.id, author.name)}
                        disabled={isLoading}
                        className="text-red-500 text-xs font-bold hover:underline text-left disabled:opacity-50"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      )}

      {emailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-lg font-bold text-[#0D2C54]">{emailModal.title}</h4>
                <p className="text-sm text-gray-500 break-all">
                  Para: <span className="font-bold">{emailModal.label}</span>
                </p>
                {emailModal.decisionPaper && (
                  <p className="text-xs text-gray-400 mt-1">
                    {emailModal.decisionPaper.id} · {emailModal.decisionPaper.title}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeEmailModal}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Asunto</label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm((prev) => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none"
                  placeholder="Asunto del correo"
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-500">Mensaje</label>
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-gray-400 font-medium">Plantillas:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailForm({
                          subject: '[CLAGTEE 2026] Recordatorio importante: Plazo de revisiones vence mañana – Nueva funcionalidad "Borrador IA"',
                          body: `Estimado/a colega y miembro del Comité Técnico de Revisores de CLAGTEE 2026,\n\nEsperamos que se encuentre muy bien.\n\nLe escribimos desde el Comité de Programa Técnico de CLAGTEE 2026 para recordarle cordialmente que el plazo límite para el envío de las evaluaciones de los artículos asignados vence mañana.\n\n🚀 NUEVA FUNCIONALIDAD: "Borrador IA" para agilizar su proceso de revisión\n\nCon el objetivo de facilitarle el trabajo y optimizar sus tiempos de evaluación, hemos integrado en la plataforma una nueva herramienta de asistencia:\n• Botón "Borrador IA": Al ingresar a su panel de revisor, verá junto a cada artículo asignado el botón "Borrador IA". Al pulsarlo, el sistema analiza el manuscrito en PDF y genera en segundos un borrador estructurado de evaluación técnica y auditoría de referencias.\n• Ajuste asistido o edición directa: Puede usar "Ajustar Revisión IA" para afinar el dictamen con instrucciones simples o editar el texto libremente.\n• Criterio experto: El borrador es solo una sugerencia de partida para ahorrarle tiempo; la decisión final y las observaciones definitivas están siempre bajo su total supervisión.\n\nPara ingresar y enviar sus evaluaciones, acceda a:\n👉 https://clagtee2026.org/cms\n\nAgradecemos sinceramente su valioso compromiso y colaboración con el congreso.\n\nAtentamente,\nComité de Programa Técnico (TPC)\nXVI Latin-American Congress on Electricity Generation and Transmission (CLAGTEE 2026)\nSitio web: https://clagtee2026.org`,
                        });
                      }}
                      className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold transition-colors"
                    >
                      Plazo mañana + Borrador IA
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailForm({
                          subject: 'CLAGTEE 2026 - Recordatorio de evaluaciones asignadas',
                          body: `Estimado/a Revisor/a,\n\nLe recordamos amablemente que tiene trabajos asignados con evaluaciones pendientes para el congreso CLAGTEE 2026.\n\nAgradecemos completar sus dictámenes en la plataforma para asegurar el oportuno avance del proceso editorial:\nhttps://clagtee2026.org/cms\n\nSaludos cordiales,\nComité Organizador CLAGTEE 2026`,
                        });
                      }}
                      className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors"
                    >
                      Recordatorio
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailForm({
                          subject: 'CLAGTEE 2026 - Pautas y criterios de revisión',
                          body: `Estimado/a Revisor/a,\n\nLe compartimos las directrices clave para la evaluación técnica en CLAGTEE 2026 (28, 29 y 30 de octubre de 2026):\n1. Calificación en escala de 1 a 5 puntos.\n2. Todos los artículos evaluados son aceptados para las actas de CLAGTEE 2026.\n3. Los cambios mayores se formulan como requisitos de delimitación conceptual, limitaciones y discusión crítica para IEEE Xplore, sin solicitar nuevas simulaciones ni nuevas formulaciones matemáticas.\n\nAcceso a la plataforma:\nhttps://clagtee2026.org/cms\n\nAtentamente,\nChairman CLAGTEE 2026`,
                        });
                      }}
                      className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors"
                    >
                      Pautas
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailForm({
                          subject: 'CLAGTEE 2026 - Agradecimiento por su labor de arbitraje',
                          body: `Estimado/a Revisor/a,\n\nQueremos expresar nuestro sincero agradecimiento por su rigurosa y dedicada labor en la evaluación técnica de los artículos de CLAGTEE 2026.\n\nSu contribución científica asegura el más alto nivel de excelencia en el congreso.\n\nCordialmente,\nChairman CLAGTEE 2026`,
                        });
                      }}
                      className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors"
                    >
                      Agradecimiento
                    </button>
                  </div>
                </div>
                <textarea
                  value={emailForm.body}
                  onChange={(e) => setEmailForm((prev) => ({ ...prev, body: e.target.value }))}
                  rows={8}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none resize-none font-sans text-xs md:text-sm"
                  placeholder="Escribe el contenido del mensaje..."
                  required
                />
              </div>

              {emailModal.decisionPaper && Array.isArray(emailModal.decisionPaper.reviews) && emailModal.decisionPaper.reviews.length > 0 && (
                <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeReviewerComments}
                    onChange={(e) => toggleReviewerComments(e.target.checked)}
                    className="mt-1 accent-[#2A9D8F]"
                  />
                  <span>
                    Incluir comentarios de los revisores ({emailModal.decisionPaper.reviews.length})
                    <span className="block text-xs text-gray-400">
                      Al cambiar esta opcion se regenera el mensaje y se pierden las ediciones manuales.
                    </span>
                  </span>
                </label>
              )}

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              {emailFeedback && (
                <div className="bg-green-50 border border-green-100 text-green-700 text-sm px-4 py-3 rounded-xl">
                  {emailFeedback}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEmailModal}
                  className="px-4 py-2 rounded-xl text-gray-600 font-bold hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !emailForm.subject.trim() || !emailForm.body.trim()}
                  className="bg-[#2A9D8F] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#238C7E] disabled:opacity-50"
                >
                  {isLoading ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
