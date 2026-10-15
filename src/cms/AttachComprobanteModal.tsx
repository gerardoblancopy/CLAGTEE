import React, { useState, useId } from 'react';
import { RegistrationRecord, RegistrationStatus } from '../../types';
import { apiFetch } from './api';
import { categoryLabels, statusLabels } from './StaffDashboard';

interface AttachComprobanteModalProps {
  registration: RegistrationRecord | null;
  onClose: () => void;
  onSuccess: (updated: RegistrationRecord, notified?: boolean) => void;
}

export const AttachComprobanteModal: React.FC<AttachComprobanteModalProps> = ({
  registration,
  onClose,
  onSuccess,
}) => {
  const [fileKey, setFileKey] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [transactionCode, setTransactionCode] = useState(registration?.transactionCode || '');
  const [status, setStatus] = useState<RegistrationStatus>('pago-validado');
  const [staffNote, setStaffNote] = useState('');
  const [notifyParticipant, setNotifyParticipant] = useState(true);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputId = useId();

  if (!registration) return null;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const signResponse = await fetch('/api/gcs-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          prefix: 'comprobantes',
        }),
      });
      if (!signResponse.ok) throw new Error('No se pudo generar la URL de carga.');
      const signed = (await signResponse.json()) as {
        uploadUrl: string;
        fileKey: string;
        publicUrl?: string;
      };

      const putResponse = await fetch(signed.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!putResponse.ok) throw new Error('Error al subir el comprobante.');

      setFileKey(signed.fileKey);
      setFileName(file.name);
      setFileUrl(signed.publicUrl || '');
    } catch (err: unknown) {
      console.error('Upload failed:', err);
      setUploadError(err instanceof Error ? err.message : 'Error al subir el comprobante.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileKey && !registration.comprobanteFileKey && !transactionCode.trim()) {
      setError('Debe subir un archivo de comprobante o indicar un código de transacción.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await apiFetch('/api/registrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'staff-attach-comprobante',
          id: registration.id,
          comprobanteFileKey: fileKey || undefined,
          comprobanteFileName: fileName || undefined,
          comprobanteUrl: fileUrl || undefined,
          transactionCode: transactionCode.trim() || undefined,
          newStatus: status,
          staffNote: staffNote.trim() || undefined,
          notifyParticipant,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al adjuntar el comprobante.');
      }

      const data = (await response.json()) as { registration: RegistrationRecord; notified?: boolean };
      onSuccess(data.registration, data.notified);
      onClose();
    } catch (err: unknown) {
      console.error('Attach comprobante error:', err);
      setError(err instanceof Error ? err.message : 'No se pudo guardar el comprobante.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden text-left">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0D2C54] to-[#1E4D8C] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold">Adjuntar Comprobante de Pago</h3>
              <p className="text-xs text-blue-200">
                {registration.id} • {registration.firstName} {registration.lastName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Info resumen */}
          <div className="p-3 bg-[#F8FAFC] border border-gray-100 rounded-xl text-xs space-y-1">
            <p><strong>Categoría:</strong> {categoryLabels[registration.category]} (USD {registration.amountUsd})</p>
            <p><strong>Correo:</strong> {registration.email}</p>
            {registration.cmsPaperId && <p><strong>Paper:</strong> #{registration.cmsPaperId} - {registration.paperTitle}</p>}
          </div>

          {/* Subir archivo */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Archivo de Comprobante (PDF o Imagen)
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <label
                htmlFor={fileInputId}
                className={`cursor-pointer px-4 py-2.5 rounded-xl border font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm ${
                  isUploading
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-wait'
                    : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 hover:border-[#2A9D8F]'
                }`}
              >
                <svg className="w-4 h-4 text-[#2A9D8F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>{isUploading ? 'Subiendo…' : fileKey ? 'Reemplazar' : 'Seleccionar archivo'}</span>
              </label>
              <input
                id={fileInputId}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />

              {fileName && (
                <span className="text-xs text-slate-600 truncate max-w-xs font-mono bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                  {fileName}
                </span>
              )}
            </div>
            {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
          </div>

          {/* N° Transacción */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              N° de Transacción / Referencia Bancaria
            </label>
            <input
              type="text"
              value={transactionCode}
              onChange={(e) => setTransactionCode(e.target.value)}
              placeholder="Ej. TX-123456"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#2A9D8F] outline-none"
            />
          </div>

          {/* Estado a asignar */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Actualizar Estado a *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as RegistrationStatus)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-[#2A9D8F] outline-none"
            >
              <option value="pago-validado">{statusLabels['pago-validado']} (Recomendado)</option>
              <option value="confirmada">{statusLabels['confirmada']}</option>
              <option value="comprobante-recibido">{statusLabels['comprobante-recibido']}</option>
            </select>
          </div>

          {/* Nota Staff */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Nota del Staff (opcional)
            </label>
            <input
              type="text"
              value={staffNote}
              onChange={(e) => setStaffNote(e.target.value)}
              placeholder="Ej. Recibido por correo el 15 de octubre"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-800"
            />
          </div>

          {/* Notificar por correo */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
            <input
              id="notifyParticipantAttach"
              type="checkbox"
              checked={notifyParticipant}
              onChange={(e) => setNotifyParticipant(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-[#2A9D8F] focus:ring-[#2A9D8F] w-4 h-4"
            />
            <label htmlFor="notifyParticipantAttach" className="text-xs text-slate-700 cursor-pointer">
              Notificar al participante por correo del cambio de estado y confirmación.
            </label>
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-bold uppercase tracking-wider"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="px-5 py-2 rounded-xl bg-[#2A9D8F] hover:bg-[#238C7E] text-white text-xs font-bold uppercase tracking-wider shadow disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? 'Guardando…' : 'Guardar Comprobante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
