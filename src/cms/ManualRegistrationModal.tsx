import React, { useState, useId } from 'react';
import { RegistrationCategory, RegistrationRecord, RegistrationStatus } from '../../types';
import { Paper } from './CMSDataContext';
import { apiFetch } from './api';
import { categoryLabels, statusLabels } from './StaffDashboard';
import { REGISTRATION_PRICING } from '../../data/registration';

interface ManualRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (record: RegistrationRecord, notified?: boolean) => void;
  acceptedPapers?: Paper[];
}

export const ManualRegistrationModal: React.FC<ManualRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  acceptedPapers = [],
}) => {
  const [category, setCategory] = useState<RegistrationCategory>('autor');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('Chile');
  const [affiliation, setAffiliation] = useState('');
  const [dietary, setDietary] = useState('');

  // Paper details
  const [selectedPaperId, setSelectedPaperId] = useState<string>('');
  const [customPaperId, setCustomPaperId] = useState('');
  const [paperTitle, setPaperTitle] = useState('');
  const [presenterName, setPresenterName] = useState('');

  // Student details
  const [studentType, setStudentType] = useState<'autor' | 'asistente'>('autor');
  const [studentLevel, setStudentLevel] = useState<'pregrado' | 'magister' | 'doctorado'>('pregrado');

  // Payment & Comprobante
  const [amountUsd, setAmountUsd] = useState<number>(REGISTRATION_PRICING['autor'].regular);
  const [transactionCode, setTransactionCode] = useState('');
  const [status, setStatus] = useState<RegistrationStatus>('pago-validado');
  const [staffNote, setStaffNote] = useState('');
  const [notifyParticipant, setNotifyParticipant] = useState(true);

  // File upload state
  const [fileKey, setFileKey] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputId = useId();

  if (!isOpen) return null;

  const needsPaper =
    category === 'autor' ||
    category === 'paper-adicional' ||
    (category === 'estudiante' && studentType === 'autor');

  const handleCategoryChange = (newCat: RegistrationCategory) => {
    setCategory(newCat);
    const standardPrice = REGISTRATION_PRICING[newCat]?.regular ?? 350;
    setAmountUsd(standardPrice);
  };

  const handlePaperSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedPaperId(val);
    if (val === 'custom' || !val) {
      setPaperTitle('');
      setCustomPaperId('');
    } else {
      const found = acceptedPapers.find((p) => p.id === val);
      if (found) {
        setCustomPaperId(found.id);
        setPaperTitle(found.title);
        if (!presenterName) {
          setPresenterName(`${firstName} ${lastName}`.trim() || (found.authors?.[0]?.name ?? ''));
        }
      }
    }
  };

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
      if (!putResponse.ok) throw new Error('Error al subir el archivo a Cloud Storage.');

      setFileKey(signed.fileKey);
      setFileName(file.name);
      setFileUrl(signed.publicUrl || '');
    } catch (err: unknown) {
      console.error('Upload comprobante failed:', err);
      setUploadError(err instanceof Error ? err.message : 'Error al subir el comprobante.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('Por favor complete Nombre, Apellido y Correo Electrónico.');
      return;
    }

    const effectivePaperId = selectedPaperId === 'custom' ? customPaperId.trim() : (selectedPaperId || customPaperId.trim());

    if (needsPaper && !effectivePaperId) {
      setError('Para esta categoría debe indicar el ID del Paper aceptado.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await apiFetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual-registration',
          category,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          country: country.trim(),
          affiliation: affiliation.trim(),
          dietary: dietary.trim() || undefined,
          amountUsd,
          cmsPaperId: needsPaper ? effectivePaperId : undefined,
          paperTitle: needsPaper ? paperTitle.trim() : undefined,
          presenterName: needsPaper ? (presenterName.trim() || `${firstName} ${lastName}`.trim()) : undefined,
          studentType: category === 'estudiante' ? studentType : undefined,
          studentLevel: category === 'estudiante' ? studentLevel : undefined,
          comprobanteFileKey: fileKey || undefined,
          comprobanteFileName: fileName || undefined,
          comprobanteUrl: fileUrl || undefined,
          transactionCode: transactionCode.trim() || undefined,
          status,
          staffNote: staffNote.trim() || undefined,
          notifyParticipant,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al procesar la inscripción manual.');
      }

      const data = (await response.json()) as { registration: RegistrationRecord; notified?: boolean };
      onSuccess(data.registration, data.notified);
      onClose();
    } catch (err: unknown) {
      console.error('Manual registration error:', err);
      setError(err instanceof Error ? err.message : 'No se pudo crear la inscripción manual.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-2xl w-full my-8 overflow-hidden text-left">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0D2C54] to-[#1E4D8C] text-white p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold">Inscripción Manual de Participante</h3>
                <p className="text-xs text-blue-200">
                  Registra manualmente a un participante que envió su comprobante directamente.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Categoría */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Categoría de Inscripción *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(['autor', 'general', 'estudiante', 'paper-adicional', 'cena-adicional', 'empresa-stand'] as RegistrationCategory[]).map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryChange(cat)}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all text-left flex flex-col justify-between ${
                      category === cat
                        ? 'border-[#2A9D8F] bg-[#2A9D8F]/10 text-[#0D2C54] shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-white'
                    }`}
                  >
                    <span>{categoryLabels[cat]}</span>
                    <span className="text-[10px] text-gray-400 mt-1 font-normal">
                      USD {REGISTRATION_PRICING[cat]?.regular ?? 0}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Datos Personales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Nombre *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ej. Juan"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Apellido *
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ej. Pérez"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Correo Electrónico *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="autor@universidad.edu"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                País *
              </label>
              <input
                type="text"
                required
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Chile, Argentina, Brasil..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Institución / Universidad / Empresa
            </label>
            <input
              type="text"
              value={affiliation}
              onChange={(e) => setAffiliation(e.target.value)}
              placeholder="Ej. Pontificia Universidad Católica de Valparaíso"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none text-sm"
            />
          </div>

          {/* Paper Asociado (si aplica) */}
          {needsPaper && (
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <svg className="w-4 h-4 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.5L20 8.5V19a2 2 0 01-2 2z" />
                </svg>
                <span>Datos del Artículo Científico (CLAGTEE 2026)</span>
              </div>

              {acceptedPapers.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Seleccionar Paper Aceptado
                  </label>
                  <select
                    value={selectedPaperId}
                    onChange={handlePaperSelect}
                    className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-xs font-medium text-gray-800 focus:ring-2 focus:ring-[#2A9D8F] outline-none"
                  >
                    <option value="">-- Seleccionar de la lista de papers aceptados --</option>
                    {acceptedPapers.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.id} - {p.title.slice(0, 75)}{p.title.length > 75 ? '...' : ''}
                      </option>
                    ))}
                    <option value="custom">Otro (ingresar ID manualmente)</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    ID del Paper *
                  </label>
                  <input
                    type="text"
                    required={needsPaper}
                    value={selectedPaperId && selectedPaperId !== 'custom' ? selectedPaperId : customPaperId}
                    onChange={(e) => setCustomPaperId(e.target.value)}
                    placeholder="Ej. INT-29"
                    disabled={Boolean(selectedPaperId && selectedPaperId !== 'custom')}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-mono uppercase focus:ring-2 focus:ring-[#2A9D8F] outline-none disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Autor Presentador
                  </label>
                  <input
                    type="text"
                    value={presenterName}
                    onChange={(e) => setPresenterName(e.target.value)}
                    placeholder={firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Nombre del expositor'}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs focus:ring-2 focus:ring-[#2A9D8F] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Título del Paper
                </label>
                <input
                  type="text"
                  value={paperTitle}
                  onChange={(e) => setPaperTitle(e.target.value)}
                  placeholder="Título completo del artículo"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs focus:ring-2 focus:ring-[#2A9D8F] outline-none"
                />
              </div>
            </div>
          )}

          {/* Opciones de estudiante */}
          {category === 'estudiante' && (
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Rol del Estudiante
                </label>
                <select
                  value={studentType}
                  onChange={(e) => setStudentType(e.target.value as 'autor' | 'asistente')}
                  className="w-full px-3 py-2 rounded-xl border border-blue-200 bg-white text-xs"
                >
                  <option value="autor">Estudiante Autor (expone paper)</option>
                  <option value="asistente">Estudiante Asistente (sin paper)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Nivel de Estudios
                </label>
                <select
                  value={studentLevel}
                  onChange={(e) => setStudentLevel(e.target.value as 'pregrado' | 'magister' | 'doctorado')}
                  className="w-full px-3 py-2 rounded-xl border border-blue-200 bg-white text-xs"
                >
                  <option value="pregrado">Pregrado</option>
                  <option value="magister">Magíster / Maestría</option>
                  <option value="doctorado">Doctorado</option>
                </select>
              </div>
            </div>
          )}

          {/* Comprobante de Pago (Subida directa) */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Comprobante de Pago Enviado por el Participante
              </label>
              {fileKey && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  Archivo cargado
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
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
                <span>{isUploading ? 'Subiendo archivo…' : fileKey ? 'Reemplazar comprobante' : 'Subir archivo de comprobante'}</span>
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
                <span className="text-xs text-slate-600 truncate max-w-xs font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  {fileName}
                </span>
              )}
            </div>

            {uploadError && (
              <p className="text-xs text-red-600 font-medium">{uploadError}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Monto Validado (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={amountUsd}
                  onChange={(e) => setAmountUsd(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  N° de Transacción / Referencia PUCV
                </label>
                <input
                  type="text"
                  value={transactionCode}
                  onChange={(e) => setTransactionCode(e.target.value)}
                  placeholder="Ej. TX-984321 o PortalEventos ID"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-800"
                />
              </div>
            </div>
          </div>

          {/* Estado de Registro & Opciones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Estado a Asignar *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RegistrationStatus)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-800 focus:ring-2 focus:ring-[#2A9D8F] outline-none"
              >
                <option value="pago-validado">{statusLabels['pago-validado']} (Recomendado)</option>
                <option value="confirmada">{statusLabels['confirmada']}</option>
                <option value="comprobante-recibido">{statusLabels['comprobante-recibido']}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Nota Interna del Staff
              </label>
              <input
                type="text"
                value={staffNote}
                onChange={(e) => setStaffNote(e.target.value)}
                placeholder="Ej. Comprobante recibido por email el 15/10"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-800"
              />
            </div>
          </div>

          {/* Notificar por correo */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <input
              id="notifyParticipant"
              type="checkbox"
              checked={notifyParticipant}
              onChange={(e) => setNotifyParticipant(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-[#2A9D8F] focus:ring-[#2A9D8F] w-4 h-4"
            />
            <label htmlFor="notifyParticipant" className="text-xs text-slate-700 cursor-pointer">
              <strong>Enviar notificación por correo al participante</strong> con la confirmación de su inscripción y sus accesos al sistema del congreso.
            </label>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="px-6 py-2.5 rounded-xl bg-[#2A9D8F] hover:bg-[#238C7E] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Registrando…</span>
                </>
              ) : (
                <span>Crear Inscripción</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
