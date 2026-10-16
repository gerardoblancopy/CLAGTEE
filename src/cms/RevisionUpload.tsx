import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Paper, useCMSData } from './CMSDataContext';
import { DownloadLink } from './DownloadLink';
import { apiFetch } from './api';
import { validateIeeePdf, IeeeValidationResult } from '../utils/ieeePdfValidator';

// Envio de la version revisada (camera-ready) de un paper ya aceptado.
// Reutiliza el mismo flujo de carga firmada que SubmissionForm: se firma la
// subida en /api/gcs-sign y luego se guarda la referencia en el paper.
export const RevisionUpload: React.FC<{ paper: Paper }> = ({ paper }) => {
  const { user } = useAuth();
  const { submitRevision } = useCMSData();
  const [isOpen, setIsOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileKey, setFileKey] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [note, setNote] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isValidatingPdf, setIsValidatingPdf] = useState(false);
  const [auditResult, setAuditResult] = useState<IeeeValidationResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setFileName('');
      setFileKey('');
      setFileUrl('');
      return;
    }

    setFileName(file.name);
    setFileKey('');
    setFileUrl('');
    setAuditResult(null);
    setError(null);
    setSuccess(false);
    setIsUploading(true);
    setIsValidatingPdf(true);

    // Run IEEE compliance analysis in background
    validateIeeePdf(file)
      .then((res) => setAuditResult(res))
      .catch((err) => console.error('Error analyzing IEEE compliance:', err))
      .finally(() => setIsValidatingPdf(false));

    try {
      const response = await apiFetch('/api/gcs-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || 'application/pdf',
        }),
      });
      if (!response.ok) {
        throw new Error('sign-failed');
      }
      const payload = (await response.json()) as {
        uploadUrl: string;
        fileKey: string;
        publicUrl?: string;
      };

      const uploadResponse = await fetch(payload.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/pdf' },
        body: file,
      });
      if (!uploadResponse.ok) {
        throw new Error('upload-failed');
      }

      setFileKey(payload.fileKey);
      setFileUrl(payload.publicUrl || '');
    } catch (uploadError) {
      setError('Error al subir el archivo. Intenta nuevamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !fileKey) return;
    setIsSaving(true);
    setError(null);
    const updated = await submitRevision(paper.id, {
      fileName,
      fileUrl,
      fileKey,
      revisionNote: note,
    });
    setIsSaving(false);
    if (!updated) {
      setError('No se pudo enviar la version revisada.');
      return;
    }
    setSuccess(true);
    setIsOpen(false);
    setFileName('');
    setFileKey('');
    setFileUrl('');
    setNote('');
  };

  return (
    <div className="w-full md:basis-full border-t border-gray-100 pt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold text-[#0D2C54]">Version revisada (final)</span>
        {paper.revisedFileKey ? (
          <DownloadLink
            fileKey={paper.revisedFileKey}
            fileName={paper.revisedFileName}
            className="text-[#2A9D8F] text-xs font-bold hover:underline"
          >
            Descargar version revisada
          </DownloadLink>
        ) : (
          <span className="text-xs text-gray-400">Aun no has enviado una version revisada.</span>
        )}
        {paper.revisedAt && (
          <span className="text-xs text-gray-400">Enviada el {formatDate(paper.revisedAt)}</span>
        )}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="text-xs font-bold text-[#0D2C54] hover:underline"
        >
          {isOpen
            ? 'Cancelar'
            : paper.revisedFileKey
            ? 'Reemplazar version revisada'
            : 'Enviar version revisada'}
        </button>
      </div>

      {success && !isOpen && (
        <p className="text-xs text-green-700 font-bold">Version revisada enviada correctamente.</p>
      )}

      {isOpen && (
        <div className="bg-[#F8FAFC] border border-gray-100 rounded-xl p-4 space-y-3">
          <label className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[#2A9D8F]/40 transition-colors cursor-pointer block">
            <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
            <p className="text-sm font-bold text-[#0D2C54]">
              {fileName ? `Archivo seleccionado: ${fileName}` : 'Pulsa para subir el PDF revisado'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {isUploading ? 'Subiendo archivo...' : 'Solo PDF, tamaño máximo 10MB'}
            </p>
          </label>

          {/* Validation Feedback */}
          {isValidatingPdf && (
            <div className="p-3 bg-sky-50 rounded-lg border border-sky-200 text-xs text-sky-800 flex items-center gap-2">
              <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-sky-600 border-t-transparent rounded-full" />
              <span>Verificando compatibilidad técnica con normas IEEE Xplore...</span>
            </div>
          )}

          {auditResult && !isValidatingPdf && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                auditResult.overallStatus === 'PASS'
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                  : auditResult.overallStatus === 'WARNING'
                  ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                  : 'bg-rose-50/70 border-rose-300 text-rose-950'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  {auditResult.overallStatus === 'PASS' ? '✓' : auditResult.overallStatus === 'WARNING' ? '⚠' : '✕'}
                  {auditResult.overallStatus === 'PASS'
                    ? 'Manuscrito Aprobado para IEEE Xplore'
                    : auditResult.overallStatus === 'WARNING'
                    ? 'Aprobado con Observaciones'
                    : 'Atención: No cumple especificaciones IEEE Xplore'}
                </span>
                <span className="text-[11px] font-mono">{auditResult.pageCount} págs · {auditResult.pageSize.formatName}</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Fuentes: {auditResult.embeddedFontsCount}/{auditResult.totalFonts} incrustadas.
                {auditResult.unembeddedFontsCount > 0 && (
                  <span className="font-semibold text-rose-700 ml-1">
                    (Fuentes faltantes: {auditResult.fonts.filter((f) => !f.isEmbedded).map((f) => f.name).join(', ')})
                  </span>
                )}
              </p>
              {auditResult.recommendations.length > 0 && (
                <ul className="text-[11px] list-disc pl-4 space-y-0.5 text-slate-700 mt-1">
                  {auditResult.recommendations.slice(0, 2).map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">
              Nota para el comité (opcional)
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Describe brevemente los cambios realizados respecto a las observaciones de los revisores."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none text-sm"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!fileKey || isUploading || isSaving}
            className="bg-[#0D2C54] text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-[#1A4B8A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Enviando...' : 'Enviar version revisada'}
          </button>
        </div>
      )}

      {paper.revisionNote && !isOpen && (
        <p className="text-xs text-gray-500 whitespace-pre-line">
          Nota enviada: {paper.revisionNote}
        </p>
      )}
    </div>
  );
};
