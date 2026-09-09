import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Paper, useCMSData } from './CMSDataContext';
import { DownloadLink } from './DownloadLink';
import { apiFetch } from './api';

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
    setError(null);
    setSuccess(false);
    setIsUploading(true);

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
