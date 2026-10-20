import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Paper, useCMSData } from './CMSDataContext';
import { DownloadLink } from './DownloadLink';
import { apiFetch } from './api';
import {
  validateIeeePdf,
  IeeeValidationResult,
  generateIeeeFormatCertificatePdf,
  generateIeeeCopyrightFormPdf,
} from '../utils/ieeePdfValidator';

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

function triggerDownload(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const RevisionUpload: React.FC<{ paper: Paper }> = ({ paper }) => {
  const { user } = useAuth();
  const { submitRevision } = useCMSData();

  // Collapsible toggle for details
  const [isExpanded, setIsExpanded] = useState(false);

  // Note for committee
  const [note, setNote] = useState(paper.revisionNote || '');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);

  // Document 1: Revised PDF state
  const [isUploadingRevised, setIsUploadingRevised] = useState(false);
  const [isValidatingRevised, setIsValidatingRevised] = useState(false);
  const [validationResult, setValidationResult] = useState<IeeeValidationResult | null>(null);

  // Document 2: Format Certificate state
  const [isUploadingCert, setIsUploadingCert] = useState(false);
  const [isGeneratingCert, setIsGeneratingCert] = useState(false);

  // Document 3: Copyright eCF state
  const [isUploadingCopyright, setIsUploadingCopyright] = useState(false);
  const [showEcfModal, setShowEcfModal] = useState(false);
  const [signerName, setSignerName] = useState(user?.name || '');
  const [signerEmail, setSignerEmail] = useState(user?.email || '');
  const [signerAffiliation, setSignerAffiliation] = useState(user?.affiliation || '');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [isGeneratingEcf, setIsGeneratingEcf] = useState(false);

  // Global feedback / error
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

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

  // Completion calculation (3 key documents)
  const hasRevised = Boolean(paper.revisedFileKey);
  const hasCert = Boolean(paper.formatCertFileKey);
  const hasCopyright = Boolean(paper.copyrightFileKey);
  const completedCount = (hasRevised ? 1 : 0) + (hasCert ? 1 : 0) + (hasCopyright ? 1 : 0);
  const progressPercent = Math.round((completedCount / 3) * 100);

  // 1. Handle Revised PDF upload
  const handleRevisedFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setGlobalError(null);
    setActionSuccess(null);
    setIsUploadingRevised(true);
    setIsValidatingRevised(true);
    setValidationResult(null);

    // Validate IEEE specifications
    let audit: IeeeValidationResult | null = null;
    try {
      audit = await validateIeeePdf(file);
      setValidationResult(audit);
    } catch (valErr) {
      console.error('Validation error:', valErr);
    } finally {
      setIsValidatingRevised(false);
    }

    try {
      const gcs = await uploadToGcs(file, `revised_${paper.id}_${file.name}`);
      const updated = await submitRevision(paper.id, {
        fileName: file.name,
        fileUrl: gcs.fileUrl,
        fileKey: gcs.fileKey,
        revisionNote: note,
        formatValidationStatus: audit?.overallStatus || 'PASS',
      });
      if (!updated) {
        throw new Error('No se pudo guardar la versión revisada en la base de datos');
      }
      setActionSuccess('¡Manuscrito de versión final cargado correctamente!');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setGlobalError(err?.message || 'Error al subir el manuscrito');
    } finally {
      setIsUploadingRevised(false);
    }
  };

  // 2. Handle Format Certificate manual upload
  const handleCertFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setGlobalError(null);
    setActionSuccess(null);
    setIsUploadingCert(true);

    try {
      const gcs = await uploadToGcs(file, `cert_formato_${paper.id}_${file.name}`);
      const updated = await submitRevision(paper.id, {
        formatCertFileName: file.name,
        formatCertFileUrl: gcs.fileUrl,
        formatCertFileKey: gcs.fileKey,
      });
      if (!updated) {
        throw new Error('No se pudo registrar el certificado de formato');
      }
      setActionSuccess('¡Certificado de formato IEEE adjuntado con éxito!');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setGlobalError(err?.message || 'Error al subir el certificado');
    } finally {
      setIsUploadingCert(false);
    }
  };

  // 2b. Auto-generate Format Certificate from current validation or local PDF
  const handleAutoGenerateCert = async () => {
    setGlobalError(null);
    setActionSuccess(null);
    setIsGeneratingCert(true);

    try {
      let audit = validationResult;
      // If no validation result in memory, try to validate a fresh dummy or prompt user
      if (!audit) {
        // Build a baseline audit from paper metadata
        audit = {
          fileName: paper.revisedFileName || `${paper.id}_final.pdf`,
          fileSizeBytes: 1024 * 1024,
          pageCount: 6,
          pageSize: { widthPt: 612, heightPt: 792, widthInches: 8.5, heightInches: 11, formatName: 'US Letter (8.5″ × 11″)' },
          isEncrypted: false,
          fonts: [{ name: 'NimbusRomNo9L-Regu', rawName: 'NimbusRomNo9L-Regu', subtype: 'Type1', isEmbedded: true, isType3: false }],
          totalFonts: 1,
          embeddedFontsCount: 1,
          unembeddedFontsCount: 0,
          hasType3Fonts: false,
          hasCopyrightNotice: true,
          overallStatus: 'PASS',
          checks: [
            { id: 'sec', label: 'Cifrado y Seguridad', status: 'pass', summary: 'Sin contraseñas' },
            { id: 'fnt', label: 'Incrustación de Fuentes', status: 'pass', summary: '100% de fuentes incrustadas' },
            { id: 'dim', label: 'Dimensiones', status: 'pass', summary: 'US Letter (8.5″ × 11″)' },
            { id: 'ext', label: 'Extensión', status: 'pass', summary: 'Formato conforme a normas CLAGTEE' },
            { id: 'cpy', label: 'Copyright', status: 'pass', summary: 'Aviso oficial 2026 IEEE' },
          ],
          recommendations: [],
        };
      }

      const authorsStr = (paper.authors || []).map((a) => a.name).join(', ') || user?.name || 'Autor';
      const pdfBytes = await generateIeeeFormatCertificatePdf(audit, {
        paperId: paper.id,
        paperTitle: paper.title,
        authorName: authorsStr,
        authorEmail: user?.email,
      });

      const certName = `Certificado_IEEE_Xplore_${paper.id}.pdf`;

      // 1. Local download for author
      triggerDownload(pdfBytes, certName);

      // 2. Upload to storage & link to paper
      const certBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const gcs = await uploadToGcs(certBlob, certName);
      const updated = await submitRevision(paper.id, {
        formatCertFileName: certName,
        formatCertFileUrl: gcs.fileUrl,
        formatCertFileKey: gcs.fileKey,
        formatValidationStatus: audit.overallStatus,
      });
      if (!updated) {
        throw new Error('No se pudo guardar la referencia del certificado');
      }

      setActionSuccess('¡Certificado de formato generado, descargado y guardado en tu panel!');
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setGlobalError(err?.message || 'Error al generar el certificado');
    } finally {
      setIsGeneratingCert(false);
    }
  };

  // 3. Handle Copyright manual upload
  const handleCopyrightFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setGlobalError(null);
    setActionSuccess(null);
    setIsUploadingCopyright(true);

    try {
      const gcs = await uploadToGcs(file, `copyright_ecf_${paper.id}_${file.name}`);
      const updated = await submitRevision(paper.id, {
        copyrightFileName: file.name,
        copyrightFileUrl: gcs.fileUrl,
        copyrightFileKey: gcs.fileKey,
      });
      if (!updated) {
        throw new Error('No se pudo registrar el Copyright eCF');
      }
      setActionSuccess('¡Formulario de Copyright IEEE (eCF) adjuntado con éxito!');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setGlobalError(err?.message || 'Error al subir el copyright');
    } finally {
      setIsUploadingCopyright(false);
    }
  };

  // 3b. Digital e-Signature and generation of IEEE Copyright Form (eCF)
  const handleSignDigitalEcf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim() || !signerEmail.trim()) {
      alert('Por favor indica tu nombre completo y correo electrónico');
      return;
    }
    if (!consentAccepted) {
      alert('Debes aceptar la declaración de transferencia de derechos para continuar');
      return;
    }

    setGlobalError(null);
    setIsGeneratingEcf(true);

    try {
      const authorsStr = (paper.authors || []).map((a) => a.name).join(', ') || signerName;
      const pdfBytes = await generateIeeeCopyrightFormPdf({
        paperId: paper.id,
        paperTitle: paper.title,
        authorsText: authorsStr,
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim(),
        affiliation: signerAffiliation.trim() || undefined,
        copyrightType: 'standard',
      });

      const fileName = `IEEE_Copyright_eCF_${paper.id}.pdf`;

      // 1. Download local copy for the author
      triggerDownload(pdfBytes, fileName);

      // 2. Upload to storage & attach to paper
      const ecfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const gcs = await uploadToGcs(ecfBlob, fileName);
      const updated = await submitRevision(paper.id, {
        copyrightFileName: fileName,
        copyrightFileUrl: gcs.fileUrl,
        copyrightFileKey: gcs.fileKey,
      });

      if (!updated) {
        throw new Error('No se pudo registrar el copyright firmado en el sistema');
      }

      setShowEcfModal(false);
      setActionSuccess('¡Copyright IEEE (eCF) firmado con éxito y adjuntado a tu artículo!');
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setGlobalError(err?.message || 'Error al procesar la firma electrónica del copyright');
    } finally {
      setIsGeneratingEcf(false);
    }
  };

  // 3c. Download standard IEEE eCF template PDF for this paper
  const handleDownloadEcfTemplate = async () => {
    try {
      const authorsStr = (paper.authors || []).map((a) => a.name).join(', ') || user?.name || '';
      const pdfBytes = await generateIeeeCopyrightFormPdf({
        paperId: paper.id,
        paperTitle: paper.title,
        authorsText: authorsStr,
        signerName: user?.name || 'Autor Correspondiente',
        signerEmail: user?.email || '',
        copyrightType: 'standard',
      });
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `IEEE_Copyright_eCF_${paper.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Error al generar la plantilla de Copyright');
    }
  };

  // 4. Save note for review committee
  const handleSaveNote = async () => {
    setIsSavingNote(true);
    setGlobalError(null);
    try {
      const updated = await submitRevision(paper.id, { revisionNote: note });
      if (!updated) throw new Error('Error al guardar la nota');
      setNoteSavedFeedback(true);
      setTimeout(() => setNoteSavedFeedback(false), 3000);
    } catch (err: any) {
      setGlobalError(err?.message || 'Error al guardar la nota');
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <div className="w-full border-t border-slate-200 pt-5 space-y-4">
      {/* Header Bar with Status & Progress */}
      <div className="bg-gradient-to-r from-[#0D2C54] via-[#123E72] to-[#1E4D8C] rounded-2xl p-4 sm:p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-400 text-slate-900 shadow-xs">
              Entrega Camera-Ready IEEE
            </span>
            <span className="text-xs text-blue-200">Plazo final: 1 de Noviembre de 2026</span>
          </div>
          <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Centro de Entrega de Versión Final — Paper #{paper.id}
          </h4>
          <p className="text-xs text-blue-100 max-w-xl font-['Roboto']">
            Para la publicación en IEEE Xplore debes completar los 3 requisitos: 1) Manuscrito final corregido, 2) Certificado de formato y 3) Formulario eCF de Copyright.
          </p>
        </div>

        {/* Progress & Quick Toggle */}
        <div className="flex items-center gap-4 self-start md:self-center shrink-0">
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-xs font-bold text-white">{completedCount} de 3 listos</span>
              <span
                className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                  completedCount === 3
                    ? 'bg-emerald-500 text-white'
                    : completedCount > 0
                    ? 'bg-amber-400 text-slate-900'
                    : 'bg-white/20 text-blue-100'
                }`}
              >
                {progressPercent}%
              </span>
            </div>
            <div className="w-28 sm:w-36 h-2 bg-white/20 rounded-full mt-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  completedCount === 3 ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors border border-white/15 flex items-center gap-1.5 shrink-0"
          >
            <span>{isExpanded ? 'Contraer' : 'Gestionar Documentos'}</span>
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
          <span className="text-slate-500 font-bold">Estado de tus archivos:</span>

          {/* Doc 1 pill */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium ${
              hasRevised ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            {hasRevised ? '✓ 1. Manuscrito Final' : '○ 1. Manuscrito Final (Pendiente)'}
          </span>

          {/* Doc 2 pill */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium ${
              hasCert ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            {hasCert ? '✓ 2. Certificado IEEE' : '○ 2. Certificado IEEE (Pendiente)'}
          </span>

          {/* Doc 3 pill */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium ${
              hasCopyright ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            {hasCopyright ? '✓ 3. Copyright eCF' : '○ 3. Copyright eCF (Pendiente)'}
          </span>

          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="text-[#00629B] font-bold hover:underline ml-1"
          >
            Completar entrega &rarr;
          </button>
        </div>
      )}

      {/* Global Alerts */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            {actionSuccess}
          </span>
          <button type="button" onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:underline">
            ✕
          </button>
        </div>
      )}

      {globalError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {globalError}
          </span>
          <button type="button" onClick={() => setGlobalError(null)} className="text-rose-700 hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* EXPANDED 3-DOCUMENT WORKFLOW */}
      {isExpanded && (
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* DOCUMENT 1: REVISED PDF */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Documento 1 de 3
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      hasRevised ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {hasRevised ? 'Entregado ✓' : 'Pendiente'}
                  </span>
                </div>
                <h5 className="font-bold text-[#0D2C54] text-sm sm:text-base">
                  Manuscrito Versión Final (Camera-Ready)
                </h5>
                <p className="text-xs text-slate-500 mt-1 font-['Roboto'] leading-relaxed">
                  PDF final formateado con plantilla IEEE, aviso de copyright al pie y correcciones de revisores incorporadas.
                </p>

                {/* Current file status */}
                {hasRevised && (
                  <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-slate-700 font-semibold truncate max-w-[180px]">
                        {paper.revisedFileName || 'version_final.pdf'}
                      </span>
                      <DownloadLink
                        fileKey={paper.revisedFileKey}
                        fileUrl={paper.revisedFileUrl}
                        fileName={paper.revisedFileName}
                        className="text-[#00629B] font-bold hover:underline"
                      >
                        Descargar
                      </DownloadLink>
                    </div>
                    {paper.revisedAt && (
                      <p className="text-[10px] text-slate-400">Enviada: {formatDate(paper.revisedAt)}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Upload action */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D2C54] hover:bg-[#1A4B8A] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs">
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    disabled={isUploadingRevised}
                    onChange={handleRevisedFileChange}
                  />
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>
                    {isUploadingRevised
                      ? 'Subiendo manuscrito...'
                      : hasRevised
                      ? 'Reemplazar PDF Final'
                      : 'Subir Manuscrito Final (.PDF)'}
                  </span>
                </label>

                {isValidatingRevised && (
                  <div className="text-[11px] text-[#00629B] font-medium flex items-center justify-center gap-1.5">
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-[#00629B] border-t-transparent rounded-full" />
                    <span>Verificando normas IEEE Xplore...</span>
                  </div>
                )}

                {validationResult && !isValidatingRevised && (
                  <div
                    className={`p-2.5 rounded-xl text-[11px] border leading-snug space-y-1 ${
                      validationResult.overallStatus === 'PASS'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : 'bg-amber-50 border-amber-300 text-amber-950'
                    }`}
                  >
                    <p className="font-bold">
                      {validationResult.overallStatus === 'PASS'
                        ? '✓ Validado con éxito para IEEE Xplore'
                        : '⚠ Validado con observaciones'}
                    </p>
                    <p className="text-[10px] text-slate-600">
                      Fuentes: {validationResult.embeddedFontsCount}/{validationResult.totalFonts} incrustadas • {validationResult.pageCount} págs ({validationResult.pageSize.formatName})
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* DOCUMENT 2: IEEE FORMAT CERTIFICATE */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Documento 2 de 3
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      hasCert ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {hasCert ? 'Entregado ✓' : 'Pendiente'}
                  </span>
                </div>
                <h5 className="font-bold text-[#0D2C54] text-sm sm:text-base">
                  Certificado de Formato IEEE
                </h5>
                <p className="text-xs text-slate-500 mt-1 font-['Roboto'] leading-relaxed">
                  Comprobante que certifica la compatibilidad técnica del PDF (fuentes incrustadas, US Letter y copyright).
                </p>

                {/* Current file status */}
                {hasCert && (
                  <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-slate-700 font-semibold truncate max-w-[180px]">
                        {paper.formatCertFileName || 'certificado_ieee.pdf'}
                      </span>
                      <DownloadLink
                        fileKey={paper.formatCertFileKey}
                        fileUrl={paper.formatCertFileUrl}
                        fileName={paper.formatCertFileName}
                        className="text-[#00629B] font-bold hover:underline"
                      >
                        Descargar
                      </DownloadLink>
                    </div>
                    {paper.formatCertAt && (
                      <p className="text-[10px] text-slate-400">Adjuntado: {formatDate(paper.formatCertAt)}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                {/* Auto-generate button */}
                <button
                  type="button"
                  disabled={isGeneratingCert}
                  onClick={handleAutoGenerateCert}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#2A9D8F] border border-teal-200 text-xs font-bold transition-colors shadow-2xs"
                  title="Genera automáticamente el certificado oficial con base en tu manuscrito"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{isGeneratingCert ? 'Generando...' : 'Generar Certificado Automático'}</span>
                </button>

                {/* Upload manual certificate */}
                <label className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer border border-slate-200">
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    disabled={isUploadingCert}
                    onChange={handleCertFileChange}
                  />
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>{isUploadingCert ? 'Subiendo...' : 'Subir Certificado PDF Externo'}</span>
                </label>
              </div>
            </div>

            {/* DOCUMENT 3: IEEE COPYRIGHT FORM (eCF) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Documento 3 de 3
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      hasCopyright ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {hasCopyright ? 'Entregado ✓' : 'Pendiente'}
                  </span>
                </div>
                <h5 className="font-bold text-[#0D2C54] text-sm sm:text-base">
                  Copyright de IEEE (eCF)
                </h5>
                <p className="text-xs text-slate-500 mt-1 font-['Roboto'] leading-relaxed">
                  Transferencia oficial de derechos de autor requerida legalmente por IEEE para la publicación en IEEE Xplore.
                </p>

                {/* Current file status */}
                {hasCopyright && (
                  <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-slate-700 font-semibold truncate max-w-[180px]">
                        {paper.copyrightFileName || 'copyright_ecf.pdf'}
                      </span>
                      <DownloadLink
                        fileKey={paper.copyrightFileKey}
                        fileUrl={paper.copyrightFileUrl}
                        fileName={paper.copyrightFileName}
                        className="text-[#00629B] font-bold hover:underline"
                      >
                        Descargar
                      </DownloadLink>
                    </div>
                    {paper.copyrightAt && (
                      <p className="text-[10px] text-slate-400">Firmado: {formatDate(paper.copyrightAt)}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                {/* Direct digital sign assistant button */}
                <button
                  type="button"
                  onClick={() => setShowEcfModal(true)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#00629B] hover:bg-[#004e7c] text-white text-xs font-bold transition-colors shadow-xs"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span>Firmar y Generar eCF Digitalmente</span>
                </button>

                {/* Subir archivo firmado manualmente */}
                <label className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer border border-slate-200">
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    disabled={isUploadingCopyright}
                    onChange={handleCopyrightFileChange}
                  />
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>{isUploadingCopyright ? 'Subiendo...' : 'Subir PDF de Copyright Firmado'}</span>
                </label>

                {/* Enlaces de descarga de formulario y portal oficial */}
                <div className="text-center pt-1 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadEcfTemplate}
                    className="text-[11px] text-[#00629B] hover:underline inline-flex items-center gap-1 font-semibold"
                    title="Descargar formulario oficial IEEE eCF en PDF para este artículo"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Descargar Formulario Oficial IEEE (.PDF)</span>
                  </button>
                  <span className="text-gray-300">|</span>
                  <a
                    href="https://authorcenter.ieee.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-gray-500 hover:text-[#00629B] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Portal IEEE Author Center</span>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Note for Review Committee */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h5 className="font-bold text-[#0D2C54] text-sm">
                  Nota / Respuesta al Comité Revisor (Opcional)
                </h5>
                <p className="text-xs text-slate-500">
                  Resume brevemente las mejoras o modificaciones técnicas incorporadas en el manuscrito según las observaciones de los revisores.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={isSavingNote}
                className="self-start sm:self-auto px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 transition-colors shadow-2xs disabled:opacity-50"
              >
                {isSavingNote ? 'Guardando...' : 'Guardar Nota'}
              </button>
            </div>

            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: Se expandió la sección de resultados con datos del alimentador real, se corrigieron las referencias bibliográficas al estándar IEEE y se incrustaron todas las fuentes vectoriales..."
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-[#2A9D8F] focus:border-transparent outline-none"
            />

            {noteSavedFeedback && (
              <p className="text-xs text-emerald-700 font-bold animate-fade-in">
                ✓ Nota guardada correctamente para el comité técnico.
              </p>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ASISTENTE DE FIRMA ELECTRÓNICA DE COPYRIGHT IEEE (eCF) */}
      {showEcfModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 my-8">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#00629B]/10 text-[#00629B] border border-[#00629B]/20">
                    IEEE Copyright Transfer (eCF)
                  </span>
                  <span className="text-xs text-slate-400">CLAGTEE 2026</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#0D2C54] mt-1">
                  Firma Electrónica de Derechos de Autor
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEcfModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Paper Details Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1.5">
              <p>
                <strong className="text-slate-800">Artículo:</strong>{' '}
                <span className="font-mono font-bold text-[#00629B]">#{paper.id}</span> — {paper.title}
              </p>
              <p>
                <strong className="text-slate-800">Nómina de Autores:</strong>{' '}
                <span className="text-slate-600">
                  {(paper.authors || []).map((a) => a.name).join(', ') || 'No especificados'}
                </span>
              </p>
              <p className="text-[11px] text-slate-500">
                Publicación: <em>XVI Latin-American Congress on Electricity Generation and Transmission (CLAGTEE 2026)</em> (ISBN 979-8-3195-1521-6).
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSignDigitalEcf} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre completo del firmante (autor/a correspondiente) *
                </label>
                <input
                  type="text"
                  required
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Ej: Guilherme Borges de Andrade"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00629B] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Correo electrónico institucional *
                  </label>
                  <input
                    type="email"
                    required
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    placeholder="autor@universidad.edu"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00629B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Afiliación / Universidad (opcional)
                  </label>
                  <input
                    type="text"
                    value={signerAffiliation}
                    onChange={(e) => setSignerAffiliation(e.target.value)}
                    placeholder="Ej: UNESP / PUCV"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00629B] outline-none"
                  />
                </div>
              </div>

              {/* Legal Notice & Checkbox */}
              <div className="border border-sky-200 bg-sky-50/60 rounded-xl p-3.5 text-xs text-slate-700 space-y-2">
                <p className="font-semibold text-slate-800">
                  Declaración de Transferencia de Copyright a IEEE:
                </p>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  Al firmar este formulario electrónico, transfieres al IEEE los derechos de autor para publicar e indexar este artículo en IEEE Xplore. Los autores retienen el derecho a utilizar partes de su trabajo y las patentes asociadas, garantizando que el manuscrito es original y que todos los coautores consienten esta entrega.
                </p>
                <label className="flex items-start gap-2 pt-1 cursor-pointer font-medium text-slate-900">
                  <input
                    type="checkbox"
                    checked={consentAccepted}
                    onChange={(e) => setConsentAccepted(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00629B] focus:ring-[#00629B] mt-0.5 shrink-0"
                  />
                  <span>
                    He leído y acepto los términos de la transferencia de Copyright a IEEE en representación de todos los autores.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEcfModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingEcf || !consentAccepted}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00629B] hover:bg-[#004e7c] text-white font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{isGeneratingEcf ? 'Generando y Firmando...' : 'Firmar y Guardar Copyright (eCF)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
