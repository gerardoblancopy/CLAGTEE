import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { Paper, useCMSData } from './CMSDataContext';
import { DownloadLink } from './DownloadLink';
import { apiFetch, requestDownloadUrl } from './api';
import {
  validateIeeePdf,
  IeeeValidationResult,
  generateIeeeFormatCertificatePdf,
} from '../utils/ieeePdfValidator';
import {
  CAMERA_READY_SUPPORT_EMAIL,
  IEEE_ECF_SIGN_BUTTON,
  clearEcfReturnParam,
  detectGeneratedPdf,
  formatEcfAuthorNames,
  isGeneratedEcfFileName,
  openIeeeEcf,
  readEcfReturnPaperId,
} from './ieeeEcf';
import { looksNonEnglish } from '../utils/language';

// Helper to upload a File or Blob directly to GCS via the signed URL endpoint
async function uploadToGcs(fileOrBlob: File | Blob, fileName: string): Promise<{ fileKey: string; fileUrl: string }> {
  const response = await apiFetch('/api/gcs-sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName,
      contentType: 'application/pdf',
      prefix: 'submissions',
    }),
  });
  if (!response.ok) {
    throw new Error('No se pudo obtener la autorización de subida a GCS');
  }
  const payload = (await response.json()) as {
    uploadUrl: string;
    fileKey: string;
    publicUrl?: string;
  };

  const uploadResponse = await fetch(payload.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body: fileOrBlob,
  });
  if (!uploadResponse.ok) {
    throw new Error('Fallo al transferir el archivo al almacenamiento seguro');
  }

  return { fileKey: payload.fileKey, fileUrl: payload.publicUrl || '' };
}

const isPdfFile = (file: File) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

const normalizeSpaces = (value: string) => value.replace(/\s+/g, ' ').trim();

type Feedback = { tone: 'success' | 'warning' | 'error'; text: string };

const FEEDBACK_STYLES: Record<Feedback['tone'], string> = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  error: 'bg-rose-50 border-rose-200 text-rose-900',
};

const VALIDATION_SUMMARY: Record<string, { text: string; className: string }> = {
  PASS: { text: '✓ Formato IEEE verificado', className: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
  WARNING: { text: '⚠ Formato verificado con observaciones', className: 'bg-amber-50 border-amber-200 text-amber-900' },
  FAIL: { text: '✕ Requiere correcciones de formato', className: 'bg-rose-50 border-rose-200 text-rose-900' },
};

const CHECK_STYLES: Record<string, { icon: string; className: string }> = {
  pass: { icon: '✓', className: 'text-emerald-600' },
  warning: { icon: '!', className: 'text-amber-600' },
  fail: { icon: '✕', className: 'text-rose-600' },
};

const StepBadge: React.FC<{ done: boolean; needsFix?: boolean }> = ({ done, needsFix }) => (
  <span
    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
      done
        ? 'bg-emerald-100 text-emerald-800'
        : needsFix
        ? 'bg-rose-100 text-rose-800'
        : 'bg-amber-100 text-amber-800'
    }`}
  >
    {done ? 'Completo ✓' : needsFix ? 'Requiere corrección' : 'Pendiente'}
  </span>
);

export const RevisionUpload: React.FC<{ paper: Paper }> = ({ paper }) => {
  const { user } = useAuth();
  const { submitRevision } = useCMSData();
  const containerRef = useRef<HTMLDivElement>(null);

  // IEEE devuelve al autor a /cms?ecf=<paperId> después de firmar el copyright
  const [returnedFromEcf] = useState(() => readEcfReturnPaperId() === paper.id);

  // Estado de la entrega: el certificado de formato se genera solo al subir el PDF
  const hasRevised = Boolean(paper.revisedFileKey);
  const hasCert = Boolean(paper.formatCertFileKey);
  const hasCopyright = Boolean(paper.copyrightFileKey);
  // Copyright subido con el generador que tuvo la web: IEEE no lo reconoce
  const copyrightInvalid = hasCopyright && isGeneratedEcfFileName(paper.copyrightFileName);
  const copyrightDone = hasCopyright && !copyrightInvalid;
  // El autor firma con el enlace que IEEE le envía por correo (ver IEEE_ECF_SIGN_BUTTON)
  const signByEmail = !IEEE_ECF_SIGN_BUTTON;
  const validationStatus = paper.formatValidationStatus || '';
  // IEEE publica título y abstract en inglés: el autor los confirma tal como están en su PDF
  const savedTitleEn = paper.titleEn || '';
  const savedAbstractEn = paper.abstractEn || '';
  const hasEnglishMeta = Boolean(savedTitleEn && savedAbstractEn);
  const ieeeTitle = savedTitleEn || paper.title;
  const manuscriptNeedsFix = hasRevised && validationStatus === 'FAIL';
  const manuscriptDone = hasRevised && hasCert && !manuscriptNeedsFix && hasEnglishMeta;
  const completedCount = (manuscriptDone ? 1 : 0) + (copyrightDone ? 1 : 0);
  const allDone = completedCount === 2;

  const [isExpanded, setIsExpanded] = useState(() => !allDone || returnedFromEcf);

  // Note for committee
  const [note, setNote] = useState(paper.revisionNote || '');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);

  // Paso 1: título y abstract en inglés (se proponen los del envío si ya están en inglés)
  const [titleEn, setTitleEn] = useState(() => savedTitleEn || (looksNonEnglish(paper.title) ? '' : paper.title));
  const [abstractEn, setAbstractEn] = useState(
    () => savedAbstractEn || (looksNonEnglish(paper.abstract) ? '' : paper.abstract)
  );
  const [isSavingEnglish, setIsSavingEnglish] = useState(false);
  const titleEnNonEnglish = looksNonEnglish(titleEn);
  const abstractEnNonEnglish = looksNonEnglish(abstractEn);
  const englishReady =
    Boolean(normalizeSpaces(titleEn) && normalizeSpaces(abstractEn)) && !titleEnNonEnglish && !abstractEnNonEnglish;
  const englishDirty =
    normalizeSpaces(titleEn) !== normalizeSpaces(savedTitleEn) ||
    normalizeSpaces(abstractEn) !== normalizeSpaces(savedAbstractEn);

  // Paso 1: PDF final (+ validación y certificado automáticos)
  const [manuscriptStage, setManuscriptStage] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<IeeeValidationResult | null>(null);

  // Paso 2: copyright IEEE (eCF)
  const [isUploadingCopyright, setIsUploadingCopyright] = useState(false);
  const [isOpeningEcf, setIsOpeningEcf] = useState(false);

  const [feedback, setFeedback] = useState<Feedback | null>(
    returnedFromEcf && !copyrightDone
      ? {
          tone: 'success',
          text: '¡Bienvenido de vuelta! Si completaste la firma en IEEE, revisa tu correo (también la carpeta de spam) y sube aquí el PDF del formulario que te envió IEEE.',
        }
      : null
  );

  useEffect(() => {
    if (!returnedFromEcf) return;
    clearEcfReturnParam();
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [returnedFromEcf]);

  const formatDate = (value?: string) => {
    if (!value) return '';
    return new Date(value).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const authorsText = (paper.authors || []).map((a) => a.name).filter(Boolean).join(', ') || user?.name || '';

  // Genera el certificado de formato a partir de la revisión real del PDF y lo guarda
  const saveFormatCertificate = async (audit: IeeeValidationResult, title: string) => {
    const certBytes = await generateIeeeFormatCertificatePdf(audit, {
      paperId: paper.id,
      paperTitle: title || paper.title,
      authorName: authorsText,
      authorEmail: user?.email,
    });
    const certName = `Certificado_Formato_IEEE_${paper.id}.pdf`;
    const certGcs = await uploadToGcs(new Blob([certBytes], { type: 'application/pdf' }), certName);
    const withCert = await submitRevision(paper.id, {
      formatCertFileName: certName,
      formatCertFileUrl: certGcs.fileUrl,
      formatCertFileKey: certGcs.fileKey,
      formatValidationStatus: audit.overallStatus,
    });
    if (!withCert) throw new Error('certificate not saved');
  };

  const feedbackForAudit = (status: IeeeValidationResult['overallStatus']): Feedback =>
    status === 'FAIL'
      ? { tone: 'error', text: 'Tu PDF tiene problemas que IEEE Xplore rechazaría. Revisa el detalle, corrígelo y vuelve a subirlo.' }
      : status === 'WARNING'
      ? { tone: 'warning', text: 'Tu PDF quedó registrado con observaciones. Si puedes corregirlas, vuelve a subir el PDF; si no, la entrega queda registrada igual.' }
      : { tone: 'success', text: '¡Listo! Tu PDF final cumple el formato IEEE y tu certificado de formato quedó guardado.' };

  // Paso 1: sube el PDF final, lo valida y genera el certificado de formato
  const handleRevisedFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!isPdfFile(file)) {
      setFeedback({ tone: 'error', text: 'El manuscrito final debe ser un archivo PDF.' });
      return;
    }
    if (!englishReady) {
      setFeedback({ tone: 'error', text: 'Antes de subir el PDF, completa el título y el abstract en inglés.' });
      return;
    }

    setFeedback(null);
    setValidationResult(null);
    const expectedTitle = normalizeSpaces(titleEn);

    try {
      setManuscriptStage('Revisando el formato IEEE...');
      let audit: IeeeValidationResult | null = null;
      try {
        audit = await validateIeeePdf(file, file.name, { expectedTitle });
        setValidationResult(audit);
      } catch (valErr) {
        console.error('Validation error:', valErr);
      }

      setManuscriptStage('Subiendo el PDF...');
      const gcs = await uploadToGcs(file, `revised_${paper.id}_${file.name}`);
      const updated = await submitRevision(paper.id, {
        fileName: file.name,
        fileUrl: gcs.fileUrl,
        fileKey: gcs.fileKey,
        revisionNote: note,
        titleEn: expectedTitle,
        abstractEn: normalizeSpaces(abstractEn),
        ...(audit ? { formatValidationStatus: audit.overallStatus } : {}),
      });
      if (!updated) {
        throw new Error('No se pudo guardar el manuscrito final. Intenta nuevamente.');
      }
      setTitleEn(updated.titleEn || expectedTitle);
      setAbstractEn(updated.abstractEn || abstractEn);

      if (!audit) {
        setFeedback({
          tone: 'warning',
          text: 'Guardamos tu PDF, pero no pudimos revisar su formato automáticamente. Escríbenos si el problema persiste.',
        });
        return;
      }

      setManuscriptStage('Generando el certificado de formato...');
      try {
        await saveFormatCertificate(audit, updated.titleEn || expectedTitle);
      } catch (certErr) {
        console.error('Certificate error:', certErr);
        setFeedback({
          tone: 'warning',
          text: 'Guardamos tu PDF, pero no se pudo generar el certificado de formato. Pulsa "Generar certificado" para reintentarlo.',
        });
        return;
      }
      setFeedback(feedbackForAudit(audit.overallStatus));
    } catch (err: any) {
      setFeedback({ tone: 'error', text: err?.message || 'Error al subir el manuscrito.' });
    } finally {
      setManuscriptStage(null);
    }
  };

  // Vuelve a revisar el PDF ya guardado y genera su certificado, sin volver a subirlo
  // (para entregas sin certificado o revisadas con una versión anterior del validador)
  const handleRecheckStoredPdf = async (expectedTitle: string = savedTitleEn) => {
    if (!paper.revisedFileKey) return;
    setFeedback(null);
    setValidationResult(null);
    try {
      setManuscriptStage('Revisando el formato IEEE...');
      const response = await fetch(await requestDownloadUrl(paper.revisedFileKey));
      if (!response.ok) {
        throw new Error('No se pudo leer tu PDF guardado. Vuelve a subirlo.');
      }
      const audit = await validateIeeePdf(
        new Uint8Array(await response.arrayBuffer()),
        paper.revisedFileName || `${paper.id}.pdf`,
        { expectedTitle }
      );
      setValidationResult(audit);
      setManuscriptStage('Generando el certificado de formato...');
      await saveFormatCertificate(audit, expectedTitle);
      setFeedback(feedbackForAudit(audit.overallStatus));
    } catch (err: any) {
      console.error('Recheck error:', err);
      setFeedback({ tone: 'error', text: err?.message || 'No se pudo revisar tu PDF. Intenta nuevamente o vuelve a subirlo.' });
    } finally {
      setManuscriptStage(null);
    }
  };

  // Paso 1: guarda el título y el abstract en inglés; si ya hay PDF, lo vuelve a
  // revisar para que el certificado compare el título con el del PDF
  const handleSaveEnglish = async () => {
    if (!englishReady) return;
    setIsSavingEnglish(true);
    setFeedback(null);
    try {
      const updated = await submitRevision(paper.id, {
        titleEn: normalizeSpaces(titleEn),
        abstractEn: normalizeSpaces(abstractEn),
      });
      if (!updated) throw new Error('No se pudo guardar el título y el abstract. Intenta nuevamente.');
      setTitleEn(updated.titleEn || '');
      setAbstractEn(updated.abstractEn || '');
      if (updated.revisedFileKey) {
        await handleRecheckStoredPdf(updated.titleEn || normalizeSpaces(titleEn));
      } else {
        setFeedback({ tone: 'success', text: 'Título y abstract en inglés guardados. Ahora sube tu PDF final.' });
      }
    } catch (err: any) {
      setFeedback({ tone: 'error', text: err?.message || 'No se pudo guardar el título y el abstract.' });
    } finally {
      setIsSavingEnglish(false);
    }
  };

  // Paso 2a: abre el eCF oficial de IEEE con los datos del artículo
  const handleOpenEcf = async () => {
    setIsOpeningEcf(true);
    setFeedback(null);
    try {
      await openIeeeEcf({
        paperId: paper.id,
        title: ieeeTitle,
        authors: paper.authors || [],
        signerEmail: user?.email,
      });
    } catch (err: any) {
      setFeedback({ tone: 'error', text: err?.message || 'No se pudo abrir el formulario de IEEE.' });
      setIsOpeningEcf(false);
      return;
    }
    // Si la navegación se cancela (o se vuelve con "Atrás"), el botón se reactiva
    setTimeout(() => setIsOpeningEcf(false), 5000);
  };

  // Paso 2b: sube el PDF que IEEE envía por correo tras firmar
  const handleCopyrightFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!isPdfFile(file)) {
      setFeedback({ tone: 'error', text: 'Sube el formulario en PDF (el archivo que IEEE te envió por correo).' });
      return;
    }

    setFeedback(null);
    setIsUploadingCopyright(true);
    try {
      const generated = await detectGeneratedPdf(file);
      if (generated === 'fake-ecf') {
        setFeedback({
          tone: 'error',
          text: signByEmail
            ? 'Ese PDF lo generaba antes esta web y IEEE no lo reconoce. Firma con el enlace de IEEE que recibirás por correo y sube el PDF que te envíe IEEE.'
            : 'Ese PDF lo generaba antes esta web y IEEE no lo reconoce. Pulsa "Firmar en IEEE (eCF)" y sube el PDF que IEEE te envíe por correo.',
        });
        return;
      }
      if (generated === 'format-certificate') {
        setFeedback({
          tone: 'error',
          text: 'Ese archivo es tu certificado de formato, no el copyright. Sube el PDF que IEEE te envía por correo después de firmar.',
        });
        return;
      }

      const gcs = await uploadToGcs(file, `copyright_ecf_${paper.id}_${file.name}`);
      const updated = await submitRevision(paper.id, {
        copyrightFileName: file.name,
        copyrightFileUrl: gcs.fileUrl,
        copyrightFileKey: gcs.fileKey,
      });
      if (!updated) {
        throw new Error('No se pudo registrar el copyright. Intenta nuevamente.');
      }
      setFeedback({ tone: 'success', text: '¡Copyright IEEE recibido! Quedó adjunto a tu artículo.' });
    } catch (err: any) {
      setFeedback({ tone: 'error', text: err?.message || 'Error al subir el copyright.' });
    } finally {
      setIsUploadingCopyright(false);
    }
  };

  // Save note for review committee
  const handleSaveNote = async () => {
    setIsSavingNote(true);
    setFeedback(null);
    try {
      const updated = await submitRevision(paper.id, { revisionNote: note });
      if (!updated) throw new Error('Error al guardar la nota');
      setNoteSavedFeedback(true);
      setTimeout(() => setNoteSavedFeedback(false), 3000);
    } catch (err: any) {
      setFeedback({ tone: 'error', text: err?.message || 'Error al guardar la nota' });
    } finally {
      setIsSavingNote(false);
    }
  };

  const storedSummary = VALIDATION_SUMMARY[validationStatus];
  const isUploadingRevised = manuscriptStage !== null;

  return (
    <div ref={containerRef} className="w-full border-t border-slate-200 pt-5 space-y-4 scroll-mt-24">
      {/* Header Bar with Status & Progress */}
      <div className="bg-gradient-to-r from-[#0D2C54] via-[#123E72] to-[#1E4D8C] rounded-2xl p-4 sm:p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-400 text-slate-900">
              Versión final IEEE
            </span>
            <span className="text-xs text-blue-200">Plazo: 1 de noviembre de 2026</span>
          </div>
          <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Entrega final — Paper #{paper.id}
          </h4>
          <p className="text-xs text-blue-100 max-w-xl font-['Roboto']">
            {allDone
              ? '¡Entrega completa! Puedes reemplazar tus archivos hasta el plazo final.'
              : signByEmail
              ? 'Solo 2 pasos: sube tu PDF final (con título y abstract en inglés) y firma el copyright de IEEE con el enlace que recibirás por correo.'
              : 'Solo 2 pasos: sube tu PDF final (con título y abstract en inglés) y firma el copyright en el sitio oficial de IEEE.'}
          </p>
        </div>

        {/* Progress & Quick Toggle */}
        <div className="flex items-center gap-4 self-start md:self-center shrink-0">
          <div className="text-right">
            <span className="text-xs font-bold text-white">{completedCount} de 2 pasos completos</span>
            <div className="w-28 sm:w-36 h-2 bg-white/20 rounded-full mt-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${allDone ? 'bg-emerald-400' : 'bg-amber-400'}`}
                style={{ width: `${(completedCount / 2) * 100}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors border border-white/15 flex items-center gap-1.5 shrink-0"
          >
            <span>{isExpanded ? 'Ocultar' : allDone ? 'Ver entrega' : 'Completar entrega'}</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Quick Summary Pill Bar when collapsed */}
      {!isExpanded && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium ${
              manuscriptDone
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : manuscriptNeedsFix
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            {manuscriptDone
              ? '✓ PDF final'
              : manuscriptNeedsFix
              ? '✕ PDF final (requiere corrección)'
              : hasRevised && !hasEnglishMeta
              ? '○ PDF final (falta título y abstract en inglés)'
              : '○ PDF final (pendiente)'}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium ${
              copyrightDone
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : copyrightInvalid
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            {copyrightDone
              ? '✓ Copyright IEEE'
              : copyrightInvalid
              ? '✕ Copyright IEEE (no válido)'
              : '○ Copyright IEEE (pendiente)'}
          </span>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div
          role={feedback.tone === 'error' ? 'alert' : 'status'}
          className={`p-3 border rounded-xl text-xs font-semibold flex items-start justify-between gap-3 ${FEEDBACK_STYLES[feedback.tone]}`}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100" aria-label="Cerrar">
            ✕
          </button>
        </div>
      )}

      {isExpanded && (
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* PASO 1: PDF FINAL */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col gap-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Paso 1 de 2</span>
                  <StepBadge done={manuscriptDone} needsFix={manuscriptNeedsFix} />
                </div>
                <h5 className="font-bold text-[#0D2C54] text-sm sm:text-base">Sube tu PDF final (camera-ready)</h5>
                <p className="text-xs text-slate-500 mt-1 font-['Roboto'] leading-relaxed">
                  Con la plantilla IEEE, las correcciones de los revisores y el aviso de copyright al pie de la primera
                  página. Al subirlo revisamos su formato y generamos tu certificado de formato automáticamente.
                </p>
              </div>

              {/* Título y abstract en inglés (los que se envían a IEEE) */}
              <div
                className={`rounded-xl border p-3 space-y-2.5 ${
                  hasEnglishMeta && !englishDirty ? 'bg-slate-50 border-slate-200' : 'bg-sky-50/60 border-sky-200'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-[#0D2C54]">Título y abstract en inglés</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                    IEEE los publica en inglés aunque tu artículo esté en español o portugués. Cópialos tal como aparecen
                    en tu PDF final: son los datos que enviaremos a IEEE.
                    {hasRevised && !hasEnglishMeta && (
                      <strong className="block text-amber-800 mt-1">Falta confirmarlos para completar este paso.</strong>
                    )}
                  </p>
                </div>
                <label className="block">
                  <span className="text-[11px] font-semibold text-slate-700">Title</span>
                  <input
                    type="text"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    maxLength={400}
                    placeholder="Paper title in English"
                    className="mt-1 w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-[#2A9D8F] focus:border-transparent outline-none"
                  />
                </label>
                {titleEnNonEnglish && (
                  <p className="text-[11px] text-rose-700 font-semibold">
                    El título parece estar en español o portugués. IEEE lo exige en inglés.
                  </p>
                )}
                <label className="block">
                  <span className="text-[11px] font-semibold text-slate-700">Abstract</span>
                  <textarea
                    rows={4}
                    value={abstractEn}
                    onChange={(e) => setAbstractEn(e.target.value)}
                    maxLength={5000}
                    placeholder="Abstract in English, exactly as in your final PDF"
                    className="mt-1 w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-[#2A9D8F] focus:border-transparent outline-none"
                  />
                </label>
                {abstractEnNonEnglish && (
                  <p className="text-[11px] text-rose-700 font-semibold">
                    El abstract parece estar en español o portugués. IEEE lo exige en inglés.
                  </p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-semibold ${hasEnglishMeta && !englishDirty ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {hasEnglishMeta && !englishDirty
                      ? '✓ Guardados'
                      : hasRevised
                      ? 'Sin guardar'
                      : 'Se guardan al subir el PDF'}
                  </span>
                  {(hasRevised || hasEnglishMeta) && (
                    <button
                      type="button"
                      onClick={handleSaveEnglish}
                      disabled={!englishReady || !englishDirty || isSavingEnglish || isUploadingRevised}
                      className="px-3 py-1.5 rounded-lg bg-[#0D2C54] hover:bg-[#1A4B8A] text-white text-[11px] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isSavingEnglish ? 'Guardando...' : 'Guardar'}
                    </button>
                  )}
                </div>
              </div>

              {hasRevised && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-slate-700 font-semibold truncate">
                      {paper.revisedFileName || 'version_final.pdf'}
                    </span>
                    <DownloadLink
                      fileKey={paper.revisedFileKey}
                      fileUrl={paper.revisedFileUrl}
                      fileName={paper.revisedFileName}
                      className="text-[#00629B] font-bold hover:underline shrink-0"
                    >
                      Descargar
                    </DownloadLink>
                  </div>
                  {paper.revisedAt && <p className="text-[10px] text-slate-400">Subido: {formatDate(paper.revisedAt)}</p>}
                  {hasCert ? (
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
                      <span className="text-slate-600">Certificado de formato generado</span>
                      <DownloadLink
                        fileKey={paper.formatCertFileKey}
                        fileUrl={paper.formatCertFileUrl}
                        fileName={paper.formatCertFileName}
                        className="text-[#2A9D8F] font-bold hover:underline shrink-0"
                      >
                        Ver certificado
                      </DownloadLink>
                    </div>
                  ) : (
                    !isUploadingRevised && (
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
                        <span className="text-[11px] text-amber-800">Falta el certificado de formato.</span>
                        <button
                          type="button"
                          onClick={() => handleRecheckStoredPdf()}
                          className="text-[#2A9D8F] font-bold hover:underline shrink-0"
                        >
                          Generar certificado
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Resultado de la revisión de formato */}
              {validationResult ? (
                <div className={`p-3 rounded-xl border text-xs space-y-2 ${VALIDATION_SUMMARY[validationResult.overallStatus].className}`}>
                  <p className="font-bold">{VALIDATION_SUMMARY[validationResult.overallStatus].text}</p>
                  <ul className="space-y-1">
                    {validationResult.checks.map((check) => (
                      <li key={check.id} className="flex items-start gap-2 text-slate-700">
                        <span className={`font-bold w-3 shrink-0 ${CHECK_STYLES[check.status].className}`}>
                          {CHECK_STYLES[check.status].icon}
                        </span>
                        <span>
                          <strong>{check.label}:</strong> {check.summary}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {validationResult.recommendations.length > 0 && (
                    <div className="pt-2 border-t border-black/10 text-slate-700">
                      <p className="font-bold mb-1">Cómo corregirlo:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        {validationResult.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                hasRevised &&
                storedSummary && (
                  <p className={`p-2.5 rounded-xl border text-xs font-bold ${storedSummary.className}`}>
                    {storedSummary.text}
                    {validationStatus !== 'PASS' && (
                      <span className="block font-normal mt-0.5">
                        El detalle está en tu certificado de formato. Corrige y vuelve a subir el PDF si es necesario, o{' '}
                        <button
                          type="button"
                          onClick={() => handleRecheckStoredPdf()}
                          disabled={isUploadingRevised}
                          className="font-bold underline disabled:opacity-50"
                        >
                          vuelve a revisarlo
                        </button>
                        .
                      </span>
                    )}
                  </p>
                )
              )}

              <div className="mt-auto space-y-2 pt-2 border-t border-slate-100">
                <label
                  className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm ${
                    isUploadingRevised
                      ? 'bg-slate-300 text-slate-600 cursor-wait'
                      : !englishReady
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      : 'bg-[#0D2C54] hover:bg-[#1A4B8A] text-white cursor-pointer'
                  }`}
                >
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    disabled={isUploadingRevised || !englishReady}
                    onChange={handleRevisedFileChange}
                  />
                  {isUploadingRevised ? (
                    <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-slate-600 border-t-transparent rounded-full" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  )}
                  <span>{manuscriptStage || (hasRevised ? 'Reemplazar PDF final' : 'Subir PDF final')}</span>
                </label>
                {!englishReady && !isUploadingRevised && (
                  <p className="text-[11px] text-amber-800 text-center font-semibold">
                    Completa primero el título y el abstract en inglés.
                  </p>
                )}
                <p className="text-[11px] text-slate-500 text-center">
                  ¿Quieres revisarlo antes de subirlo? Usa el{' '}
                  <a href="/#ieee-paso-3" target="_blank" rel="noopener noreferrer" className="text-[#00629B] font-semibold hover:underline">
                    validador del Paso 3 de la guía
                  </a>
                  .
                </p>
              </div>
            </div>

            {/* PASO 2: COPYRIGHT IEEE (eCF) */}
            <div
              className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-sm flex flex-col gap-4 ${
                returnedFromEcf && !copyrightDone ? 'border-[#00629B] ring-2 ring-[#00629B]/20' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Paso 2 de 2</span>
                  <StepBadge done={copyrightDone} needsFix={copyrightInvalid} />
                </div>
                <h5 className="font-bold text-[#0D2C54] text-sm sm:text-base">Firma el copyright en IEEE (eCF)</h5>
                <p className="text-xs text-slate-500 mt-1 font-['Roboto'] leading-relaxed">
                  IEEE solo acepta la transferencia de derechos firmada en su sistema oficial. Basta con que{' '}
                  <strong>un autor firme en nombre de todos</strong>.
                </p>
              </div>

              {copyrightInvalid && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                  <p className="font-bold">✕ El copyright subido no es válido</p>
                  <p>
                    <span className="font-mono">{paper.copyrightFileName}</span> lo generaba antes esta web y IEEE no
                    tiene registro de él.{' '}
                    {signByEmail
                      ? 'Firma con el enlace de IEEE que recibirás por correo y sube aquí el PDF firmado que te envíe IEEE.'
                      : 'Firma en IEEE con el botón de abajo y sube el PDF que IEEE te envíe por correo.'}
                  </p>
                </div>
              )}

              {copyrightDone ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-slate-700 font-semibold truncate">
                      {paper.copyrightFileName || 'copyright_ieee.pdf'}
                    </span>
                    <DownloadLink
                      fileKey={paper.copyrightFileKey}
                      fileUrl={paper.copyrightFileUrl}
                      fileName={paper.copyrightFileName}
                      className="text-[#00629B] font-bold hover:underline shrink-0"
                    >
                      Descargar
                    </DownloadLink>
                  </div>
                  {paper.copyrightAt && <p className="text-[10px] text-slate-400">Subido: {formatDate(paper.copyrightAt)}</p>}
                </div>
              ) : (
                <>
                  <ol className="space-y-2 text-xs text-slate-700 font-['Roboto']">
                    {(signByEmail
                      ? [
                          'Recibirás un correo con el enlace al formulario eCF oficial de IEEE para tu artículo (revisa también spam). Te avisaremos cuando se envíen los enlaces.',
                          'Abre el enlace y firma en el sitio de IEEE.',
                          'IEEE te enviará por correo una copia del formulario firmado en PDF: súbela aquí.',
                        ]
                      : [
                          'Revisa los datos y pulsa "Firmar en IEEE". Se abrirá ecopyright.ieee.org con tu artículo ya cargado.',
                          'Completa el formulario de IEEE. Al terminar, IEEE te envía por correo el formulario firmado en PDF y te devuelve a esta página.',
                          'Sube aquí ese PDF.',
                        ]
                    ).map((text, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#00629B] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{text}</span>
                      </li>
                    ))}
                  </ol>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                      {signByEmail ? 'Datos de tu artículo para IEEE' : 'Datos que se enviarán a IEEE'}
                    </p>
                    <p>
                      <strong className="text-slate-800">Artículo:</strong>{' '}
                      <span className="font-mono text-[#00629B] font-bold">{paper.id}</span> — {ieeeTitle}
                      {!savedTitleEn && (
                        <span className="block text-[11px] text-amber-800 font-semibold">
                          Confirma el título en inglés en el Paso 1.
                        </span>
                      )}
                    </p>
                    <p>
                      <strong className="text-slate-800">Autores:</strong>{' '}
                      {formatEcfAuthorNames(paper.authors || []) || 'No especificados'}
                    </p>
                    <p className="text-[11px] text-slate-500 pt-1">
                      ¿Algún dato incorrecto? Escríbenos a{' '}
                      <a href={`mailto:${CAMERA_READY_SUPPORT_EMAIL}?subject=Copyright%20IEEE%20paper%20${encodeURIComponent(paper.id)}`} className="text-[#00629B] font-semibold hover:underline">
                        {CAMERA_READY_SUPPORT_EMAIL}
                      </a>{' '}
                      antes de firmar.
                    </p>
                  </div>

                  {!signByEmail && (
                    <button
                      type="button"
                      onClick={handleOpenEcf}
                      disabled={isOpeningEcf}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00629B] hover:bg-[#004e7c] text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-60 disabled:cursor-wait"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span>{isOpeningEcf ? 'Abriendo IEEE...' : 'Firmar en IEEE (eCF)'}</span>
                    </button>
                  )}
                </>
              )}

              <div className="mt-auto space-y-2 pt-2 border-t border-slate-100">
                <label
                  className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    isUploadingCopyright
                      ? 'bg-slate-300 text-slate-600 cursor-wait'
                      : returnedFromEcf && !copyrightDone
                      ? 'bg-[#0D2C54] hover:bg-[#1A4B8A] text-white cursor-pointer shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer'
                  }`}
                >
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    disabled={isUploadingCopyright}
                    onChange={handleCopyrightFileChange}
                  />
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>
                    {isUploadingCopyright
                      ? 'Subiendo...'
                      : copyrightDone
                      ? 'Reemplazar PDF del copyright'
                      : 'Subir PDF del copyright firmado'}
                  </span>
                </label>
                {!copyrightDone && (
                  <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                    {signByEmail
                      ? '¿No te llegó el enlace de IEEE? Revisa la carpeta de spam; si sigue sin llegar o tienes problemas al firmar, escríbenos.'
                      : '¿Ya firmaste antes? Busca en tu correo el mensaje de IEEE con el formulario en PDF y súbelo aquí. Si IEEE muestra un código de error, escríbenos indicándolo.'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section: Note for Review Committee */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h5 className="font-bold text-[#0D2C54] text-sm">
                  Nota al comité (opcional)
                </h5>
                <p className="text-xs text-slate-500">
                  Resume brevemente los cambios incorporados según las observaciones de los revisores.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={isSavingNote}
                className="self-start sm:self-auto px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 transition-colors disabled:opacity-50"
              >
                {isSavingNote ? 'Guardando...' : 'Guardar nota'}
              </button>
            </div>

            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: Se amplió la sección de resultados, se corrigieron las referencias al estilo IEEE y se incrustaron todas las fuentes."
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-[#2A9D8F] focus:border-transparent outline-none"
            />

            {noteSavedFeedback && (
              <p className="text-xs text-emerald-700 font-bold">✓ Nota guardada.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
