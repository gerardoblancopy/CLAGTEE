import React, { useState, useRef } from 'react';
import { validateIeeePdf, IeeeValidationResult, generateIeeeFormatCertificatePdf } from '../src/utils/ieeePdfValidator';

interface IeeePdfValidatorWidgetProps {
  onValidated?: (result: IeeeValidationResult) => void;
  className?: string;
  compact?: boolean;
}

export const IeeePdfValidatorWidget: React.FC<IeeePdfValidatorWidgetProps> = ({
  onValidated,
  className = '',
  compact = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<IeeeValidationResult | null>(null);
  const [showFontsList, setShowFontsList] = useState(false);
  const [copiedGs, setCopiedGs] = useState(false);
  const [isDownloadingCert, setIsDownloadingCert] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const gsCommand =
    'gs -dNOPAUSE -dBATCH -sDEVICE=pdfwrite -dPDFSETTINGS=/prepress -dEmbedAllFonts=true -sOutputFile=fixed_embedded.pdf original.pdf';

  const handleDownloadCertificate = async () => {
    if (!result) return;
    setIsDownloadingCert(true);
    try {
      const pdfBytes = await generateIeeeFormatCertificatePdf(result);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificado_Conformidad_IEEE_${result.fileName.replace(/\.pdf$/i, '')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Error al generar el certificado');
    } finally {
      setIsDownloadingCert(false);
    }
  };

  const handleCopyGs = async () => {
    try {
      await navigator.clipboard.writeText(gsCommand);
      setCopiedGs(true);
      setTimeout(() => setCopiedGs(false), 3000);
    } catch {
      // ignore
    }
  };

  const processFile = async (file: File) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Por favor seleccione un archivo en formato PDF (.pdf).');
      return;
    }

    setIsValidating(true);
    setResult(null);
    setShowFontsList(false);

    try {
      const auditResult = await validateIeeePdf(file);
      setResult(auditResult);
      if (onValidated) {
        onValidated(auditResult);
      }
    } catch (err) {
      console.error('Validation error:', err);
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const resetValidator = () => {
    setResult(null);
    setShowFontsList(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      {/* Header bar */}
      <div className="bg-gradient-to-r from-[#00629B] via-[#0D2C54] to-[#0A2240] p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
              <svg className="w-5 h-5 text-sky-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-sky-400/20 text-sky-200 border border-sky-400/30">
                  Verificación Automática
                </span>
                <span className="text-[11px] text-sky-200/80">Reemplazo PDF eXpress</span>
              </div>
              <h4 className="text-lg md:text-xl font-bold tracking-tight text-white">
                Validador de Conformidad IEEE Xplore
              </h4>
            </div>
          </div>
          {result && (
            <button
              onClick={resetValidator}
              className="self-start sm:self-auto text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sky-100 transition-colors flex items-center gap-1.5 border border-white/15"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Evaluar otro PDF</span>
            </button>
          )}
        </div>
        <p className="text-xs md:text-sm text-sky-100/90 font-['Roboto'] mt-2 leading-relaxed">
          Comprueba de forma instantánea si tu PDF cumple con todos los requisitos de publicación en IEEE Xplore:
          incrustación total de fuentes, formato carta estadounidense, ausencia de contraseñas y presencia del copyright oficial.
        </p>
      </div>

      <div className="p-6">
        {/* Drop Zone / Upload */}
        {!result && !isValidating && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#00629B] bg-sky-50/70 scale-[0.99]'
                : 'border-slate-300 hover:border-[#00629B] hover:bg-slate-50/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#00629B]/10 text-[#00629B] flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-base font-bold text-[#0D2C54] mb-1">
              Arrastra y suelta tu archivo PDF aquí
            </p>
            <p className="text-xs md:text-sm text-slate-500 mb-4">
              o haz clic para seleccionar tu manuscrito desde tu dispositivo
            </p>
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00629B] hover:bg-[#004e7c] text-white text-xs font-bold transition-all shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Seleccionar Manuscrito PDF
            </span>
          </div>
        )}

        {/* Validating Spinner */}
        {isValidating && (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#00629B] border-t-transparent mb-4"></div>
            <h5 className="text-base font-bold text-[#0D2C54]">Analizando especificaciones de IEEE Xplore...</h5>
            <p className="text-xs text-slate-500 mt-1">
              Inspeccionando tablas de fuentes, MediaBox, permisos y aviso de copyright.
            </p>
          </div>
        )}

        {/* Audit Results */}
        {result && (
          <div className="space-y-6">
            {/* Top Verdict Banner */}
            <div
              className={`rounded-2xl p-5 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                result.overallStatus === 'PASS'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : result.overallStatus === 'WARNING'
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-bold text-white shadow-xs ${
                    result.overallStatus === 'PASS'
                      ? 'bg-emerald-600'
                      : result.overallStatus === 'WARNING'
                      ? 'bg-amber-600'
                      : 'bg-rose-600'
                  }`}
                >
                  {result.overallStatus === 'PASS' ? (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : result.overallStatus === 'WARNING' ? (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        result.overallStatus === 'PASS'
                          ? 'bg-emerald-200 text-emerald-900'
                          : result.overallStatus === 'WARNING'
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-rose-200 text-rose-900'
                      }`}
                    >
                      {result.overallStatus === 'PASS'
                        ? 'Dictamen: Aprobado'
                        : result.overallStatus === 'WARNING'
                        ? 'Dictamen: Aprobado con Observaciones'
                        : 'Dictamen: Requiere Correcciones'}
                    </span>
                    <span className="text-xs text-slate-600 font-mono font-medium truncate max-w-xs">
                      {result.fileName}
                    </span>
                  </div>
                  <h5 className="text-base sm:text-lg font-bold">
                    {result.overallStatus === 'PASS'
                      ? '¡Manuscrito 100% Conforme con Estándares IEEE Xplore!'
                      : result.overallStatus === 'WARNING'
                      ? 'Manuscrito apto, con observaciones recomendadas a revisar'
                      : 'El PDF presenta observaciones técnicas que deben ser corregidas'}
                  </h5>
                  <p className="text-xs text-slate-700 mt-1 font-['Roboto'] leading-relaxed">
                    {result.overallStatus === 'PASS'
                      ? 'Todas las fuentes están incrustadas, el formato es correcto y el archivo está listo para ser enviado a través del CMS.'
                      : result.overallStatus === 'WARNING'
                      ? 'Las fuentes principales están incrustadas, pero verifique las observaciones de extensión o copyright a continuación.'
                      : 'IEEE Xplore podría rechazar este artículo debido a fuentes no incrustadas o restricciones de seguridad.'}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadCertificate}
                      disabled={isDownloadingCert}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#00629B] hover:bg-[#004e7c] text-white font-bold text-xs shadow-xs transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>{isDownloadingCert ? 'Generando...' : 'Descargar Certificado de Formato IEEE (.PDF)'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs text-slate-500 block">Páginas detectadas</span>
                <span className="text-2xl font-black text-[#0D2C54]">{result.pageCount}</span>
              </div>
            </div>

            {/* Checklist Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {result.checks.map((chk) => (
                <div
                  key={chk.id}
                  className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                    chk.status === 'pass'
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : chk.status === 'warning'
                      ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-rose-50/40 border-rose-200'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 ${
                      chk.status === 'pass'
                        ? 'bg-emerald-600 text-white'
                        : chk.status === 'warning'
                        ? 'bg-amber-600 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {chk.status === 'pass' ? '✓' : chk.status === 'warning' ? '!' : '✕'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#0D2C54] uppercase tracking-wide">
                        {chk.label}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-800 mt-0.5 leading-snug">
                      {chk.summary}
                    </p>
                    {chk.details && (
                      <p className="text-[11px] text-slate-500 mt-1 font-['Roboto'] leading-relaxed">
                        {chk.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Font details toggle */}
            {result.totalFonts > 0 && (
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0D2C54]">
                      Auditoría de Fuentes del Manuscrito:
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-800">
                      {result.embeddedFontsCount} / {result.totalFonts} incrustadas
                    </span>
                  </div>
                  <button
                    onClick={() => setShowFontsList(!showFontsList)}
                    className="text-xs font-bold text-[#00629B] hover:underline"
                  >
                    {showFontsList ? 'Ocultar listado' : 'Ver detalle de fuentes'}
                  </button>
                </div>

                {showFontsList && (
                  <div className="mt-3 max-h-56 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
                    {result.fonts.map((f, i) => (
                      <div key={i} className="p-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              f.isEmbedded ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <span className="font-mono text-slate-800 font-medium">{f.name}</span>
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {f.subtype}
                          </span>
                        </div>
                        <span
                          className={`text-[11px] font-bold ${
                            f.isEmbedded ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {f.isEmbedded ? 'Incrustada ✓' : 'NO Incrustada ✕'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recommendations / Solutions if warning or fail */}
            {result.recommendations.length > 0 && (
              <div className="border border-amber-200 bg-amber-50/60 rounded-xl p-5">
                <h5 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Instrucciones para corregir el PDF:
                </h5>
                <ul className="space-y-2 text-xs text-slate-700 font-['Roboto'] mb-3">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-700 font-bold">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>

                {/* Ghostscript command snippet */}
                <div className="bg-slate-900 rounded-lg p-3 text-xs text-emerald-400 font-mono flex items-center justify-between gap-3 overflow-x-auto">
                  <code>{gsCommand}</code>
                  <button
                    onClick={handleCopyGs}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-sans text-[11px] font-bold shrink-0 transition-colors"
                  >
                    {copiedGs ? '¡Copiado!' : 'Copiar comando'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
