import React, { useMemo, useState } from 'react';
import { User, useAuth } from './AuthContext';
import { Paper } from './CMSDataContext';
import { resolvePaperAuthors } from './exportPapersExcel';

export interface PaperEmailTarget {
  mode: 'single' | 'bulk';
  paper?: Paper;
  papers?: Paper[];
  filterLabel?: string;
  defaultStatus?: string;
}

interface PaperEmailModalProps {
  target: PaperEmailTarget | null;
  onClose: () => void;
  users: User[];
  onSentSuccess?: (message: string) => void;
}

const TEMPLATES: Record<
  string,
  { label: string; subject: string; body: string; forStatus?: string }
> = {
  acceptance: {
    label: 'Aceptación de trabajo',
    forStatus: 'accepted',
    subject: 'CLAGTEE 2026 — Notificación de aceptación del trabajo ({paper})',
    body: `Estimados/as autores/as:

Nos complace informarles que su trabajo "{titulo}" ({paper}) ha sido ACEPTADO para su presentación y publicación en los anales del XVI Congreso Latinoamericano de Generación, Transporte y Distribución de Energía Eléctrica (CLAGTEE 2026), que se celebrará en Valparaíso, Chile.

Para asegurar la inclusión definitiva de su artículo en el programa oficial y en las actas de la conferencia, al menos uno de los autores debe completar su registro antes de la fecha límite establecida:
https://www.clagtee2026.org/

¡Felicitaciones por este importante logro y los esperamos en Valparaíso!

Atentamente,
Comité Organizador CLAGTEE 2026`,
  },
  rejection: {
    label: 'Notificación de no aceptación',
    forStatus: 'rejected',
    subject: 'CLAGTEE 2026 — Notificación de evaluación del trabajo ({paper})',
    body: `Estimados/as autores/as:

Agradecemos sinceramente el envío de su trabajo "{titulo}" ({paper}) al XVI Congreso Latinoamericano de Generación, Transporte y Distribución de Energía Eléctrica (CLAGTEE 2026).

Tras el riguroso proceso de revisión por pares y la deliberación del comité técnico, lamentamos comunicarle que en esta oportunidad su artículo no ha podido ser seleccionado para presentación en el congreso debido a las limitaciones de espacio del programa técnico.

Apreciamos enormemente su interés, el esfuerzo volcado en la investigación y esperamos contar con sus valiosas contribuciones en las próximas ediciones de la conferencia.

Atentamente,
Comité Técnico CLAGTEE 2026`,
  },
  unregisteredReminder: {
    label: 'Recordatorio de inscripción (papers aceptados)',
    forStatus: 'accepted',
    subject: 'CLAGTEE 2026 — Recordatorio urgente de inscripción ({paper})',
    body: `Estimados/as autores/as del trabajo "{titulo}" ({paper}):

Le recordamos que su trabajo se encuentra formalmente aceptado para CLAGTEE 2026, pero en nuestros registros aún no figura una inscripción activa asociada a su presentación.

Para asegurar que su trabajo sea incluido en el programa final del congreso y publicado en las actas, le solicitamos formalizar su inscripción a la mayor brevedad en:
https://www.clagtee2026.org/

Si ya realizó el pago correspondiente o tiene alguna duda con el proceso, por favor responda a este correo o cargue su comprobante en el sistema.

Saludos cordiales,
Comité Organizador CLAGTEE 2026`,
  },
  custom: {
    label: 'Mensaje personalizado en blanco',
    subject: 'CLAGTEE 2026 — Información sobre su trabajo ({paper})',
    body: `Estimados/as autores/as:

Nos comunicamos con ustedes respecto a su trabajo "{titulo}" ({paper}) postulado a CLAGTEE 2026.

[Escriba aquí su mensaje personalizado]

Atentamente,
Comité CLAGTEE 2026`,
  },
};

export const PaperEmailModal: React.FC<PaperEmailModalProps> = ({
  target,
  onClose,
  users,
  onSentSuccess,
}) => {
  const { sendEmailToUser } = useAuth();

  if (!target) return null;

  const isSingle = target.mode === 'single' && Boolean(target.paper);
  const singlePaper = target.paper;
  const bulkPapers = target.papers || [];

  // En modo single, resolver autor correspondiente y coautores
  const singleAuthorsInfo = useMemo(() => {
    if (!singlePaper) return null;
    return resolvePaperAuthors(singlePaper, users);
  }, [singlePaper, users]);

  // Selección de destinatarios en modo single
  const [includeCorresponding, setIncludeCorresponding] = useState(true);
  const [includeCoAuthors, setIncludeCoAuthors] = useState(true);

  // Selección de destinatarios en modo bulk: 'corresponding-only' | 'all-authors'
  const [bulkRecipientType, setBulkRecipientType] = useState<'corresponding-only' | 'all-authors'>(
    'corresponding-only'
  );

  // Determinar plantilla inicial según contexto
  const initialTemplateKey = useMemo(() => {
    if (isSingle && singlePaper) {
      if (singlePaper.status === 'accepted') return 'acceptance';
      if (singlePaper.status === 'rejected') return 'rejection';
    }
    if (target.defaultStatus === 'accepted') return 'acceptance';
    if (target.defaultStatus === 'rejected') return 'rejection';
    return 'custom';
  }, [isSingle, singlePaper, target.defaultStatus]);

  const [selectedTemplate, setSelectedTemplate] = useState<string>(initialTemplateKey);

  const buildInitialContent = (templateKey: string) => {
    const tmpl = TEMPLATES[templateKey] || TEMPLATES.custom;
    let s = tmpl.subject;
    let b = tmpl.body;

    if (isSingle && singlePaper) {
      s = s.replace(/\{paper\}/g, singlePaper.id).replace(/\{titulo\}/g, singlePaper.title);
      b = b.replace(/\{paper\}/g, singlePaper.id).replace(/\{titulo\}/g, singlePaper.title);
      if (singleAuthorsInfo?.correspondingAuthor.name) {
        b = b.replace(/\{nombre\}/g, singleAuthorsInfo.correspondingAuthor.name);
      }
    }
    return { subject: s, body: b };
  };

  const [subject, setSubject] = useState<string>(() => buildInitialContent(initialTemplateKey).subject);
  const [body, setBody] = useState<string>(() => buildInitialContent(initialTemplateKey).body);

  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; paperId?: string } | null>(
    null
  );
  const [sendError, setSendError] = useState<string | null>(null);

  // Cambiar plantilla
  const handleTemplateChange = (key: string) => {
    setSelectedTemplate(key);
    const { subject: newSubject, body: newBody } = buildInitialContent(key);
    setSubject(newSubject);
    setBody(newBody);
  };

  // Destinatarios en modo single
  const singleRecipients = useMemo(() => {
    if (!singleAuthorsInfo) return [];
    const list: string[] = [];
    if (includeCorresponding && singleAuthorsInfo.correspondingAuthor.email) {
      list.push(singleAuthorsInfo.correspondingAuthor.email.trim().toLowerCase());
    }
    if (includeCoAuthors) {
      singleAuthorsInfo.coAuthors.forEach((c) => {
        if (c.email) list.push(c.email.trim().toLowerCase());
      });
    }
    return Array.from(new Set(list));
  }, [singleAuthorsInfo, includeCorresponding, includeCoAuthors]);

  // Total de destinatarios estimados en modo bulk
  const bulkEmailsCount = useMemo(() => {
    const emailSet = new Set<string>();
    bulkPapers.forEach((p) => {
      const details = resolvePaperAuthors(p, users);
      if (details.correspondingAuthor.email) {
        emailSet.add(details.correspondingAuthor.email.trim().toLowerCase());
      }
      if (bulkRecipientType === 'all-authors') {
        details.coAuthors.forEach((c) => {
          if (c.email) emailSet.add(c.email.trim().toLowerCase());
        });
      }
    });
    return emailSet.size;
  }, [bulkPapers, users, bulkRecipientType]);

  // Enviar correos
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      setSendError('El asunto y el cuerpo del correo no pueden estar vacíos.');
      return;
    }

    setSendError(null);
    setIsSending(true);

    if (isSingle && singlePaper) {
      // Modo individual
      if (singleRecipients.length === 0) {
        setSendError('No hay destinatarios válidos seleccionados para este paper.');
        setIsSending(false);
        return;
      }

      const confirmMsg = `¿Enviar este correo a ${singleRecipients.length} destinatario(s) del paper ${singlePaper.id}?`;
      if (!window.confirm(confirmMsg)) {
        setIsSending(false);
        return;
      }

      try {
        const ok = await sendEmailToUser({
          to: singleRecipients,
          name: singleAuthorsInfo?.correspondingAuthor.name,
          subject: subject.trim(),
          body: body.trim(),
        });

        if (ok) {
          onSentSuccess?.(`Correo enviado exitosamente a los autores del paper ${singlePaper.id}.`);
          onClose();
        } else {
          setSendError('No se pudo enviar el correo.');
        }
      } catch (err: any) {
        setSendError(err?.message || 'Error al enviar el correo.');
      } finally {
        setIsSending(false);
      }
    } else {
      // Modo masivo
      if (bulkPapers.length === 0) {
        setSendError('No hay papers en la lista para enviar correos.');
        setIsSending(false);
        return;
      }

      const hasPlaceholders = body.includes('{paper}') || body.includes('{titulo}') || subject.includes('{paper}') || subject.includes('{titulo}');
      const confirmMsg = `¿Confirmas enviar correos masivos a los autores de los ${bulkPapers.length} papers seleccionados (${bulkEmailsCount} destinatarios únicos aprox.)?`;
      if (!window.confirm(confirmMsg)) {
        setIsSending(false);
        return;
      }

      let sentCount = 0;
      let failedPapers: string[] = [];

      try {
        if (hasPlaceholders) {
          // Envío personalizado paper por paper para sustituir {paper} y {titulo} de cada autor
          for (let i = 0; i < bulkPapers.length; i++) {
            const currentPaper = bulkPapers[i];
            const details = resolvePaperAuthors(currentPaper, users);

            const paperRecipients = new Set<string>();
            if (details.correspondingAuthor.email) {
              paperRecipients.add(details.correspondingAuthor.email.trim().toLowerCase());
            }
            if (bulkRecipientType === 'all-authors') {
              details.coAuthors.forEach((c) => {
                if (c.email) paperRecipients.add(c.email.trim().toLowerCase());
              });
            }

            const toList = Array.from(paperRecipients);
            if (toList.length === 0) continue;

            setProgress({
              current: i + 1,
              total: bulkPapers.length,
              paperId: currentPaper.id,
            });

            const pSubject = subject
              .replace(/\{paper\}/g, currentPaper.id)
              .replace(/\{titulo\}/g, currentPaper.title)
              .replace(/\{nombre\}/g, details.correspondingAuthor.name);

            const pBody = body
              .replace(/\{paper\}/g, currentPaper.id)
              .replace(/\{titulo\}/g, currentPaper.title)
              .replace(/\{nombre\}/g, details.correspondingAuthor.name);

            try {
              const ok = await sendEmailToUser({
                to: toList,
                name: details.correspondingAuthor.name,
                subject: pSubject,
                body: pBody,
              });
              if (ok) sentCount++;
              else failedPapers.push(currentPaper.id);
            } catch {
              failedPapers.push(currentPaper.id);
            }
          }
        } else {
          // Envío grupal directo a la lista consolidada de destinatarios
          const allEmails = new Set<string>();
          bulkPapers.forEach((p) => {
            const details = resolvePaperAuthors(p, users);
            if (details.correspondingAuthor.email) {
              allEmails.add(details.correspondingAuthor.email.trim().toLowerCase());
            }
            if (bulkRecipientType === 'all-authors') {
              details.coAuthors.forEach((c) => {
                if (c.email) allEmails.add(c.email.trim().toLowerCase());
              });
            }
          });

          const toList = Array.from(allEmails);
          setProgress({ current: 1, total: 1 });
          const ok = await sendEmailToUser({
            to: toList,
            subject: subject.trim(),
            body: body.trim(),
          });
          if (ok) sentCount = bulkPapers.length;
        }

        if (failedPapers.length > 0) {
          onSentSuccess?.(
            `Enviado a ${sentCount} papers. Fallaron ${failedPapers.length} papers: ${failedPapers.join(', ')}.`
          );
        } else {
          onSentSuccess?.(
            `Correos masivos enviados con éxito para los ${sentCount} papers seleccionados.`
          );
        }
        onClose();
      } catch (err: any) {
        setSendError(err?.message || 'Error durante el envío de correos masivos.');
      } finally {
        setIsSending(false);
        setProgress(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-gray-100 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <h3 className="text-lg font-bold text-[#0D2C54] flex items-center gap-2">
              <svg className="w-5 h-5 text-[#2A9D8F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>{isSingle ? `Enviar correo a autores de ${singlePaper?.id}` : `Envío masivo de correos: ${target.filterLabel || 'Filtro actual'}`}</span>
            </h3>
            <p className="text-xs text-gray-500">
              {isSingle
                ? `Redacta y envía un correo a los autores del trabajo "${singlePaper?.title}"`
                : `Enviando a los autores de los ${bulkPapers.length} papers filtrados`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200/60 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {sendError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl font-semibold">
              {sendError}
            </div>
          )}

          {/* Destinatarios */}
          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200/80 space-y-2">
            <span className="font-bold text-gray-700 block uppercase tracking-wider text-[11px]">
              Destinatarios:
            </span>

            {isSingle && singleAuthorsInfo ? (
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCorresponding}
                    onChange={(e) => setIncludeCorresponding(e.target.checked)}
                    className="rounded text-[#2A9D8F] focus:ring-[#2A9D8F]"
                  />
                  <span>
                    <strong>Autor correspondiente:</strong> {singleAuthorsInfo.correspondingAuthor.name}{' '}
                    &lt;{singleAuthorsInfo.correspondingAuthor.email || 'Sin correo'}&gt;
                  </span>
                </label>

                {singleAuthorsInfo.coAuthors.length > 0 && (
                  <label className="flex items-center gap-2 text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeCoAuthors}
                      onChange={(e) => setIncludeCoAuthors(e.target.checked)}
                      className="rounded text-[#2A9D8F] focus:ring-[#2A9D8F]"
                    />
                    <span>
                      <strong>Co-autores ({singleAuthorsInfo.coAuthors.length}):</strong>{' '}
                      {singleAuthorsInfo.coAuthors.map((c) => c.name).join(', ')}
                    </span>
                  </label>
                )}

                <div className="text-[11px] text-gray-500 pt-1 border-t border-gray-200">
                  Total destinatarios seleccionados:{' '}
                  <strong className="text-[#0D2C54]">{singleRecipients.length}</strong> ({singleRecipients.join(', ') || 'ninguno'})
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-1.5 text-gray-800 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="bulkType"
                      value="corresponding-only"
                      checked={bulkRecipientType === 'corresponding-only'}
                      onChange={() => setBulkRecipientType('corresponding-only')}
                      className="text-[#2A9D8F] focus:ring-[#2A9D8F]"
                    />
                    <span>Solo autor correspondiente (quien sometió)</span>
                  </label>

                  <label className="flex items-center gap-1.5 text-gray-800 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="bulkType"
                      value="all-authors"
                      checked={bulkRecipientType === 'all-authors'}
                      onChange={() => setBulkRecipientType('all-authors')}
                      className="text-[#2A9D8F] focus:ring-[#2A9D8F]"
                    />
                    <span>Todos los autores (correspondiente + co-autores)</span>
                  </label>
                </div>

                <div className="text-[11px] text-gray-600 bg-white p-2 rounded-lg border border-gray-200">
                  Se enviará a los autores de <strong>{bulkPapers.length} papers</strong> (aprox.{' '}
                  <strong>{bulkEmailsCount} correos únicos</strong>).
                  <span className="block text-[10px] text-gray-400 mt-0.5">
                    Tip: Puedes usar <code>{'{paper}'}</code>, <code>{'{titulo}'}</code> o <code>{'{nombre}'}</code> en el asunto o cuerpo para personalizar cada correo automáticamente.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Plantillas */}
          <div className="space-y-1">
            <span className="font-bold text-gray-600 block text-[11px] uppercase tracking-wider">
              Cargar plantilla predefinida:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(TEMPLATES).map(([key, tmpl]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleTemplateChange(key)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors border ${
                    selectedTemplate === key
                      ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-xs'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Asunto */}
          <div className="space-y-1">
            <label className="block font-bold text-gray-700">Asunto del correo:</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#2A9D8F] focus:border-transparent font-medium"
            />
          </div>

          {/* Cuerpo */}
          <div className="space-y-1">
            <label className="block font-bold text-gray-700">Cuerpo del correo:</label>
            <textarea
              required
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#2A9D8F] focus:border-transparent font-mono whitespace-pre-wrap leading-relaxed"
            />
          </div>

          {/* Barra de Progreso en Envío Masivo */}
          {progress && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl space-y-1.5">
              <div className="flex justify-between font-bold text-blue-800 text-[11px]">
                <span>Enviando correos masivos... {progress.paperId ? `(${progress.paperId})` : ''}</span>
                <span>
                  {progress.current} de {progress.total}
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 transition-all duration-300 rounded-full"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Nota de copia y respuesta institucional */}
          <div className="bg-emerald-50/80 border border-emerald-200/70 p-2.5 rounded-lg flex items-center gap-2 text-[11px] text-emerald-800">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>
              <strong>Copia institucional:</strong> Todos los correos se envían con copia oculta (BCC) y dirección de respuesta (Reply-To) a <span className="font-mono font-semibold underline text-[#0D2C54]">clagtee2026@pucv.cl</span>.
            </span>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSending || (isSingle && singleRecipients.length === 0)}
              className="inline-flex items-center gap-2 px-5 py-2 bg-[#2A9D8F] hover:bg-[#21867a] text-white font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isSending ? (
                <span>Enviando...</span>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>{isSingle ? 'Enviar correo' : `Enviar a ${bulkPapers.length} papers`}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
