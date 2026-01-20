import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRightIcon } from '../../components/icons';
import { appData } from '../../data/content';
import { PaperInput } from './CMSDataContext';

export const SubmissionForm: React.FC<{
  onCancel: () => void;
  onSubmit: (payload: PaperInput) => void;
}> = ({ onCancel, onSubmit }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<PaperInput>({
    title: '',
    abstract: '',
    keywords: '',
    authors: [{ name: '', email: '', affiliation: '' }],
    track: 'Planificación, Operación y Confiabilidad de Sistemas de Potencia',
    fileName: '',
    fileUrl: '',
    fileKey: '',
  });
  const [fileName, setFileName] = useState<string>('');
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const trackOptions = useMemo(
    () => appData.content.sections.thematicAxes.tracks.map((track) => track.title),
    []
  );

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const updateAuthor = (index: number, field: keyof PaperInput['authors'][number], value: string) => {
    setFormData((prev) => {
      const nextAuthors = [...prev.authors];
      nextAuthors[index] = { ...nextAuthors[index], [field]: value };
      return { ...prev, authors: nextAuthors };
    });
  };

  const addAuthor = () => {
    setFormData((prev) => ({
      ...prev,
      authors: [...prev.authors, { name: '', email: '', affiliation: '' }],
    }));
  };

  const removeAuthor = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      authors: prev.authors.filter((_, idx) => idx !== index),
    }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setFileName('');
      setIsFileLoading(false);
      setFileError(null);
      setFormData((prev) => ({ ...prev, fileName: '', fileUrl: '', fileKey: '' }));
      return;
    }
    setFileName(file.name);
    setFormData((prev) => ({ ...prev, fileName: file.name }));
    setIsFileLoading(true);
    setFileError(null);
    const uploadFile = async () => {
      try {
        const response = await fetch('/api/gcs-sign-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type || 'application/pdf',
          }),
        });
        if (!response.ok) {
          throw new Error('No se pudo obtener la URL de carga.');
        }
        const payload = (await response.json()) as {
          uploadUrl: string;
          fileKey: string;
          publicUrl?: string;
        };

        const uploadResponse = await fetch(payload.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'application/pdf',
          },
          body: file,
        });
        if (!uploadResponse.ok) {
          throw new Error('La carga del PDF fallo.');
        }

        setFormData((prev) => ({
          ...prev,
          fileUrl: payload.publicUrl || '',
          fileKey: payload.fileKey,
        }));
      } catch (error) {
        setFileError('Error al subir el archivo. Intenta nuevamente.');
        setFormData((prev) => ({ ...prev, fileUrl: '', fileKey: '' }));
      } finally {
        setIsFileLoading(false);
      }
    };

    void uploadFile();
  };

  const handleSubmit = () => {
    onSubmit({ ...formData, fileName });
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Progress Bar */}
      <div className="bg-[#F8FAFC] px-8 py-4 flex items-center justify-between border-b border-gray-100">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center space-x-3 flex-1 last:flex-none">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
              step === s ? 'bg-[#2A9D8F] text-white' : step > s ? 'bg-[#0D2C54] text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {s}
            </div>
            {s < 3 && <div className={`h-1 flex-grow mx-2 rounded-full ${step > s ? 'bg-[#0D2C54]' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <div className="p-8">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <h4 className="text-xl font-bold text-[#0D2C54]">Información Básica</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Título del Trabajo</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none transition-all"
                  placeholder="Ej: Análisis de estabilidad en microrredes..."
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Eje Temático</label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none transition-all"
                  value={formData.track}
                  onChange={(e) => setFormData({ ...formData, track: e.target.value })}
                >
                  {trackOptions.map((track) => (
                    <option key={track} value={track}>
                      {track}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Resumen (Abstract)</label>
                <textarea 
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none transition-all"
                  placeholder="Máximo 300 palabras..."
                  value={formData.abstract}
                  onChange={(e) => setFormData({...formData, abstract: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Palabras clave</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none transition-all"
                  placeholder="Ej: IA, confiabilidad, redes inteligentes"
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                />
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <h4 className="text-xl font-bold text-[#0D2C54]">Autores</h4>
            {formData.authors.map((author, index) => (
              <div key={index} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Nombre Completo</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none"
                      value={author.name}
                      onChange={(event) => updateAuthor(index, 'name', event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none"
                      value={author.email}
                      onChange={(event) => updateAuthor(index, 'email', event.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Afiliacion</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none"
                      value={author.affiliation}
                      onChange={(event) => updateAuthor(index, 'affiliation', event.target.value)}
                    />
                  </div>
                  <div className="flex items-end justify-end">
                    {formData.authors.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAuthor(index)}
                        className="text-xs font-bold text-red-400 hover:text-red-500"
                      >
                        Eliminar autor
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addAuthor}
              className="text-[#2A9D8F] font-bold text-sm hover:underline"
            >
              + Añadir otro autor
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <h4 className="text-xl font-bold text-[#0D2C54]">Carga de Archivo</h4>
            <label className="border-4 border-dashed border-gray-100 rounded-3xl p-12 text-center hover:border-[#2A9D8F]/20 transition-colors cursor-pointer block">
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
              <div className="w-16 h-16 bg-[#F8FAFC] rounded-2xl flex items-center justify-center mx-auto mb-4">
                 <ChevronRightIcon className="w-8 h-8 text-gray-400 rotate-[-90deg]" />
              </div>
              <p className="font-bold text-[#0D2C54]">
                {fileName ? `Archivo cargado: ${fileName}` : 'Pulsa para subir o arrastra tu PDF'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {isFileLoading ? 'Subiendo archivo...' : 'Tamaño máximo 10MB'}
              </p>
              {fileError && <p className="text-xs text-red-500 mt-2">{fileError}</p>}
            </label>
          </motion.div>
        )}

        <div className="mt-12 flex items-center justify-between">
          <button 
            onClick={step === 1 ? onCancel : prevStep}
            className="text-gray-500 font-bold hover:text-gray-700 transition-colors"
          >
            {step === 1 ? 'Cancelar' : 'Anterior'}
          </button>
          <button 
            onClick={step === 3 ? handleSubmit : nextStep}
            disabled={step === 3 && (isFileLoading || !formData.fileKey)}
            className="bg-[#0D2C54] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#1A4B8A] transition-all flex items-center space-x-2 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span>{step === 3 ? 'Finalizar Envío' : 'Siguiente Paso'}</span>
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
