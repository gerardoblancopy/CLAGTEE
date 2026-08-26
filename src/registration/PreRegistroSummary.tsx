import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatUsd } from '../../data/registration';
import { useRegistration } from './RegistrationContext';

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none transition-all';

export const PreRegistroSummary: React.FC = () => {
  const { content } = useLanguage();
  const r = content.sections.registration;
  const { registration, submitComprobante, uploadFile, isSubmitting, reset } = useRegistration();

  const [fileKey, setFileKey] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState(false);
  const [transactionCode, setTransactionCode] = useState('');

  if (!registration) return null;

  const couponApplied = Boolean(registration.couponCode);
  const received = registration.status === 'comprobante-recibido' || registration.status === 'pago-validado' || registration.status === 'confirmada';
  const canSubmit = !!fileKey || transactionCode.trim().length > 0;

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileLoading(true);
    setFileError(false);
    try {
      const result = await uploadFile(file, 'comprobantes');
      setFileKey(result.fileKey);
      setFileUrl(result.fileUrl);
    } catch {
      setFileError(true);
      setFileKey('');
    } finally {
      setFileLoading(false);
    }
  };

  const handleSubmit = async () => {
    await submitComprobante({
      comprobanteFileKey: fileKey || undefined,
      comprobanteUrl: fileUrl || undefined,
      comprobanteFileName: fileName || undefined,
      transactionCode: transactionCode.trim() || undefined,
    });
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-10 text-left space-y-8">
      {/* Resumen */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-[#0D2C54]">{r.summary.title}</h3>
        <div className="bg-[#F8FAFC] border border-gray-100 rounded-2xl p-5 space-y-2">
          <p className="text-sm text-gray-600">
            {r.summary.idLabel}: <strong className="text-[#0D2C54]">{registration.id}</strong>
          </p>
          <p className="text-sm text-gray-600">
            {r.summary.categoryLabel}: <strong>{r.categories[registration.category].name}</strong>
          </p>
          <p className="text-sm text-gray-600">
            {r.summary.amountLabel}: <strong>{formatUsd(registration.amountUsd)}</strong>
          </p>
          <p className="text-sm text-gray-600">
            {r.statuses[registration.status]}
          </p>
        </div>
      </div>

      {couponApplied ? (
        <div className="bg-[#E9F7F4] border border-[#2A9D8F]/30 rounded-2xl p-6 text-[#0D2C54]">
          <p className="font-semibold">{r.messages.couponConfirmed}</p>
        </div>
      ) : received ? (
        <div className="bg-[#E9F7F4] border border-[#2A9D8F]/30 rounded-2xl p-6 text-[#0D2C54]">
          <p className="font-semibold">{r.messages.comprobanteSent}</p>
          <p className="text-sm mt-2 text-gray-600">{r.warnings.manualValidation}</p>
        </div>
      ) : (
        <>
          {/* Paso 1: pagar */}
          <div className="space-y-3">
            <p className="text-sm text-gray-600">{r.summary.payInstruction}</p>
            <a
              href={registration.paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-[#F4A261] text-[#0D2C54] px-7 py-3 rounded-xl font-bold hover:bg-[#E76F51] hover:text-white transition-all shadow-lg"
            >
              {r.buttons.pay}
            </a>
          </div>

          {/* Paso 2: comprobante */}
          <div className="space-y-4 border-t border-gray-100 pt-6">
            <h4 className="text-lg font-bold text-[#0D2C54]">{r.comprobante.title}</h4>
            <p className="text-sm text-gray-500">{r.comprobante.instruction}</p>
            <label className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center block cursor-pointer hover:border-[#2A9D8F]/40 transition-colors">
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFile} />
              <span className="text-sm font-semibold text-[#0D2C54]">{fileName || r.comprobante.fileLabel}</span>
              <span className="block text-xs text-gray-400 mt-1">
                {fileLoading ? r.messages.loading : r.comprobante.fileAccepted}
              </span>
              {fileError && <span className="block text-xs text-red-500 mt-1">{r.messages.errorGeneric}</span>}
            </label>

            <div className="flex items-center gap-3">
              <div className="flex-grow border-t border-gray-100" />
              <span className="text-xs text-gray-400 uppercase">{r.comprobante.eitherHint}</span>
              <div className="flex-grow border-t border-gray-100" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">{r.comprobante.codeLabel}</label>
              <input className={inputClass} value={transactionCode} onChange={(e) => setTransactionCode(e.target.value)} />
            </div>

            <div className="bg-[#F8FAFC] border border-gray-100 rounded-xl p-4 text-sm text-gray-500">
              {r.warnings.manualValidation}
            </div>

            <div className="flex items-center justify-between">
              <button type="button" onClick={reset} className="text-gray-500 font-bold hover:text-gray-700 transition-colors">
                {r.buttons.startOver}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting || fileLoading}
                className="bg-[#0D2C54] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#1A4B8A] transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? r.messages.creating : r.buttons.submitComprobante}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
