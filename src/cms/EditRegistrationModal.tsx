import React, { useState, useEffect, useId } from 'react';
import { RegistrationCategory, RegistrationPhase, RegistrationRecord, RegistrationStatus } from '../../types';
import { Paper } from './CMSDataContext';
import { apiFetch } from './api';
import { categoryLabels, statusLabels } from './StaffDashboard';
import { REGISTRATION_PRICING } from '../../data/registration';
import { DownloadLink } from './DownloadLink';

interface EditRegistrationModalProps {
  registration: RegistrationRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (record: RegistrationRecord, notified?: boolean) => void;
  acceptedPapers?: Paper[];
}

export const EditRegistrationModal: React.FC<EditRegistrationModalProps> = ({
  registration,
  isOpen,
  onClose,
  onSuccess,
  acceptedPapers = [],
}) => {
  const [category, setCategory] = useState<RegistrationCategory>('autor');
  const [phase, setPhase] = useState<RegistrationPhase>('early-bird');
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
  const [cmsEmail, setCmsEmail] = useState('');
  const [coverage, setCoverage] = useState<'principal' | 'adicional'>('principal');

  // Student details
  const [studentType, setStudentType] = useState<'autor' | 'asistente'>('autor');
  const [studentLevel, setStudentLevel] = useState<'pregrado' | 'magister' | 'doctorado'>('pregrado');

  // Payment & Comprobante
  const [amountUsd, setAmountUsd] = useState<number>(300);
  const [transactionCode, setTransactionCode] = useState('');
  const [status, setStatus] = useState<RegistrationStatus>('pago-validado');
  const [staffNote, setStaffNote] = useState('');
  const [notifyParticipant, setNotifyParticipant] = useState(false);

  // File upload state for comprobante
  const [fileKey, setFileKey] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Student proof
  const [studentProofKey, setStudentProofKey] = useState('');
  const [studentProofName, setStudentProofName] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputId = useId();

  useEffect(() => {
    if (registration && isOpen) {
      setCategory(registration.category);
      setPhase(registration.phase === 'regular' ? 'regular' : 'early-bird');
      setAmountUsd(registration.amountUsd ?? (REGISTRATION_PRICING[registration.category]?.earlyBird ?? 0));
      setFirstName(registration.firstName || '');
      setLastName(registration.lastName || '');
      setEmail(registration.email || '');
      setCountry(registration.country || 'Chile');
      setAffiliation(registration.affiliation || '');
      setDietary(registration.dietary || '');

      const paperId = registration.cmsPaperId || '';
      setSelectedPaperId(paperId);
      setCustomPaperId(paperId);
      setPaperTitle(registration.paperTitle || '');
      setPresenterName(registration.presenterName || `${registration.firstName || ''} ${registration.lastName || ''}`.trim());
      setCmsEmail(registration.cmsEmail || registration.email || '');
      setCoverage(registration.coverage === 'adicional' ? 'adicional' : 'principal');

      setStudentType(registration.studentType === 'asistente' ? 'asistente' : 'autor');
      setStudentLevel(registration.level || 'pregrado');

      setTransactionCode(registration.transactionCode || '');
      setStatus(registration.status);
      setStaffNote(registration.staffNote || '');
      setNotifyParticipant(false);

      setFileKey(registration.comprobanteFileKey || '');
      setFileName(registration.comprobanteFileName || '');
      setFileUrl(registration.comprobanteUrl || '');

      setStudentProofKey(registration.studentProofFileKey || '');
      setStudentProofName(registration.studentProofFileName || '');

      setError(null);
      setUploadError(null);
    }
  }, [registration, isOpen]);

  if (!isOpen || !registration) return null;

  const needsPaper =
    category === 'autor' ||
    category === 'paper-adicional' ||
    (category === 'estudiante' && studentType === 'autor');

  const handleCategoryChange = (newCat: RegistrationCategory) => {
    setCategory(newCat);
    const standardPrice = phase === 'early-bird'
      ? (REGISTRATION_PRICING[newCat]?.earlyBird ?? 300)
      : (REGISTRATION_PRICING[newCat]?.regular ?? 350);
    setAmountUsd(standardPrice);
  };

  const handlePhaseChange = (newPhase: RegistrationPhase) => {
    setPhase(newPhase);
    const standardPrice = newPhase === 'early-bird'
      ? (REGISTRATION_PRICING[category]?.earlyBird ?? 300)
      : (REGISTRATION_PRICING[category]?.regular ?? 350);
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
      console.error('Error al subir comprobante:', err);
      setUploadError(err instanceof Error ? err.message : 'Error al subir el archivo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('Nombre, apellido y correo electrónico son obligatorios.');
      return;
    }

    const effectivePaperId = selectedPaperId === 'custom' ? customPaperId.trim() : selectedPaperId;
    if (needsPaper && !effectivePaperId) {
      setError('Para esta categoría debe indicar el ID del Paper aceptado.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch('/api/registrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'staff-edit',
          id: registration.id,
          category,
          phase,
          amountUsd,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          country: country.trim(),
          affiliation: affiliation.trim(),
          dietary: dietary.trim() || '',
          cmsPaperId: needsPaper ? effectivePaperId : '',
          paperTitle: needsPaper ? paperTitle.trim() : '',
          presenterName: needsPaper ? presenterName.trim() : '',
          cmsEmail: needsPaper ? cmsEmail.trim() : '',
          coverage: category === 'paper-adicional' ? 'adicional' : coverage,
          studentType: category === 'estudiante' ? studentType : undefined,
          studentLevel: category === 'estudiante' ? studentLevel : undefined,
          transactionCode: transactionCode.trim(),
          status,
          staffNote: staffNote.trim(),
          notifyParticipant,
          comprobanteFileKey: fileKey || undefined,
          comprobanteFileName: fileName || undefined,
          comprobanteUrl: fileUrl || undefined,
          studentProofFileKey: studentProofKey || undefined,
          studentProofFileName: studentProofName || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al actualizar el registro.');
      }

      const data = (await response.json()) as { registration: RegistrationRecord; notified?: boolean };
      onSuccess(data.registration, data.notified);
      onClose();
    } catch (err: unknown) {
      console.error('Edit registration error:', err);
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el registro.');
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">Editar Registro</h3>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold">
                    {registration.id}
                  </span>
                </div>
                <p className="text-xs text-white/80">
                  Modifique datos personales, categoría, tarifa Early Bird/Regular o comprobante asociado.
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
                        ? 'border-[#2A9D8F] bg-[#2A9D8F]/10 text-[#0D2C54] shadow-sm ring-1 ring-[#2A9D8F]/30'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-white'
                    }`}
                  >
                    <span>{categoryLabels[cat]}</span>
                    <span className="text-[10px] text-gray-400 mt-1 font-normal">
                      USD {phase === 'early-bird' ? (REGISTRATION_PRICING[cat]?.earlyBird ?? 0) : (REGISTRATION_PRICING[cat]?.regular ?? 0)}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Tarifa / Fase: Early Bird vs Regular */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Tarifa Aplicable (Valores Early Bird / Regular) *
              </label>
              <span className="text-[11px] text-gray-500">
                Seleccione para cargar los valores correspondientes
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handlePhaseChange('early-bird')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  phase === 'early-bird'
                    ? 'border-amber-500 bg-amber-500/15 text-amber-950 shadow-sm ring-2 ring-amber-500/30 font-bold'
                    : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                    Early Bird
                  </span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-200/80 text-amber-950 font-bold">
                    USD {REGISTRATION_PRICING[category]?.earlyBird ?? 0}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1 font-normal">
                  Tarifa temprana con descuento oficial
                </p>
              </button>

              <button
                type="button"
                onClick={() => handlePhaseChange('regular')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  phase === 'regular'
                    ? 'border-[#0D2C54] bg-[#0D2C54]/10 text-[#0D2C54] shadow-sm ring-2 ring-[#0D2C54]/30 font-bold'
                    : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0D2C54] inline-block"></span>
                    Regular
                  </span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold">
                    USD {REGISTRATION_PRICING[category]?.regular ?? 0}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1 font-normal">
                  Tarifa estándar de la conferencia
                </p>
              </button>
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#2A9D8F] focus:ring-2 focus:ring-[#2A9D8F]/20 text-sm outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Apellidos *
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#2A9D8F] focus:ring-2 focus:ring-[#2A9D8F]/20 text-sm outline-none transition-all"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#2A9D8F] focus:ring-2 focus:ring-[#2A9D8F]/20 text-sm outline-none transition-all"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#2A9D8F] focus:ring-2 focus:ring-[#2A9D8F]/20 text-sm outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Institución / Afiliación
              </label>
              <input
                type="text"
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                placeholder="Universidad o Empresa"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#2A9D8F] focus:ring-2 focus:ring-[#2A9D8F]/20 text-sm outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Requerimiento Dietario
              </label>
              <input
                type="text"
                value={dietary}
                onChange={(e) => setDietary(e.target.value)}
                placeholder="Ej. Vegetariano, Vegano, Celíaco"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#2A9D8F] focus:ring-2 focus:ring-[#2A9D8F]/20 text-sm outline-none transition-all"
              />
            </div>
          </div>

          {/* Sección de Paper (si aplica) */}
          {needsPaper && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
              <h4 className="text-xs font-bold text-[#0D2C54] uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4 text-[#2A9D8F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Asociación con Artículo Aceptado (CMS)
              </h4>

              {acceptedPapers.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Seleccionar de la lista de Papers Aceptados
                  </label>
                  <select
                    value={selectedPaperId}
                    onChange={handlePaperSelect}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-800 focus:ring-2 focus:ring-[#2A9D8F] outline-none"
                  >
                    <option value="">-- Seleccionar Paper aceptado --</option>
                    {acceptedPapers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.id} — {p.title.slice(0, 70)}...
                      </option>
                    ))}
                    <option value="custom">Otro (ingresar manualmente)</option>
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
                    value={selectedPaperId === 'custom' || !acceptedPapers.length ? customPaperId : selectedPaperId}
                    onChange={(e) => {
                      setSelectedPaperId('custom');
                      setCustomPaperId(e.target.value);
                    }}
                    placeholder="Ej. #23 o 23"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-mono font-bold text-gray-800"
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
                    placeholder="Nombre de quien expone"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Título del Artículo
                </label>
                <input
                  type="text"
                  value={paperTitle}
                  onChange={(e) => setPaperTitle(e.target.value)}
                  placeholder="Título del trabajo aceptado"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Correo del Autor en CMS
                  </label>
                  <input
                    type="email"
                    value={cmsEmail}
                    onChange={(e) => setCmsEmail(e.target.value)}
                    placeholder="Correo de la cuenta CMS del autor"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Tipo de Cobertura
                  </label>
                  <select
                    value={coverage}
                    onChange={(e) => setCoverage(e.target.value as 'principal' | 'adicional')}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 outline-none"
                  >
                    <option value="principal">Artículo Principal</option>
                    <option value="adicional">Artículo Adicional</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Sección Estudiante (si categoría es estudiante) */}
          {category === 'estudiante' && (
            <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                Datos de Estudiante
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Tipo de Estudiante
                  </label>
                  <select
                    value={studentType}
                    onChange={(e) => setStudentType(e.target.value as 'autor' | 'asistente')}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-800"
                  >
                    <option value="autor">Estudiante Autor (expone paper)</option>
                    <option value="asistente">Estudiante Asistente (sin paper)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Nivel Académico
                  </label>
                  <select
                    value={studentLevel}
                    onChange={(e) => setStudentLevel(e.target.value as 'pregrado' | 'magister' | 'doctorado')}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-800"
                  >
                    <option value="pregrado">Pregrado / Grado</option>
                    <option value="magister">Magíster / Maestría</option>
                    <option value="doctorado">Doctorado</option>
                  </select>
                </div>
              </div>
              {studentProofKey && (
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <span className="text-gray-500 font-semibold">Certificado actual:</span>
                  <DownloadLink fileKey={studentProofKey} fileName={studentProofName} className="text-[#2A9D8F] font-bold underline">
                    {studentProofName || 'Ver certificado'}
                  </DownloadLink>
                </div>
              )}
            </div>
          )}

          {/* Sección de Pago, Monto y Comprobante */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-[#0D2C54] uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4 text-[#2A9D8F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Comprobante de Pago y Transacción
            </h4>

            {fileKey && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <span className="text-xs font-bold text-gray-800">Comprobante guardado: </span>
                    <DownloadLink fileKey={fileKey} fileName={fileName} className="text-xs text-[#2A9D8F] font-bold hover:underline">
                      {fileName || 'Descargar archivo'}
                    </DownloadLink>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <label
                htmlFor={fileInputId}
                className={`cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                  isUploading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>{isUploading ? 'Subiendo...' : fileKey ? 'Reemplazar Comprobante' : 'Subir Comprobante'}</span>
              </label>
              <input
                id={fileInputId}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />

              {fileName && !isUploading && (
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
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <button
                    type="button"
                    onClick={() => handlePhaseChange('early-bird')}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-semibold hover:bg-amber-200 transition-colors"
                  >
                    Early Bird (${REGISTRATION_PRICING[category]?.earlyBird ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePhaseChange('regular')}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-semibold hover:bg-slate-200 transition-colors"
                  >
                    Regular (${REGISTRATION_PRICING[category]?.regular ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmountUsd(0)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold hover:bg-emerald-200 transition-colors"
                  >
                    Liberada ($0)
                  </button>
                </div>
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

          {/* Estado de Registro & Nota Interna */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Estado del Registro *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RegistrationStatus)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-800 focus:ring-2 focus:ring-[#2A9D8F] outline-none"
              >
                <option value="pago-validado">{statusLabels['pago-validado']} (Válido)</option>
                <option value="confirmada">{statusLabels['confirmada']} (Aprobado)</option>
                <option value="comprobante-recibido">{statusLabels['comprobante-recibido']}</option>
                <option value="pre-registro-creado">{statusLabels['pre-registro-creado']}</option>
                <option value="observado">{statusLabels['observado']} (Requiere corrección)</option>
                <option value="cancelada">{statusLabels['cancelada']}</option>
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
                placeholder="Ej. Registro editado tras confirmar pago"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-800"
              />
            </div>
          </div>

          {/* Notificar por correo */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <input
              id="editNotifyParticipant"
              type="checkbox"
              checked={notifyParticipant}
              onChange={(e) => setNotifyParticipant(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-[#2A9D8F] focus:ring-[#2A9D8F] w-4 h-4"
            />
            <label htmlFor="editNotifyParticipant" className="text-xs text-slate-700 cursor-pointer">
              <strong>Enviar notificación por correo al participante</strong> con la confirmación de su inscripción y sus accesos al sistema del congreso.
            </label>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="px-6 py-2.5 rounded-xl bg-[#2A9D8F] hover:bg-[#238276] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Guardando Cambios...</span>
                </>
              ) : (
                <span>Guardar Cambios</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
