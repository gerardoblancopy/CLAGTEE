import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RegistrationCategory, RegistrationRecord } from '../../types';
import { Paper } from './CMSDataContext';
import { apiFetch } from './api';
import { MailRecipient, MailSegment, buildRecipients, previewBody } from './registrationSegments';

const BATCH_SIZE = 10;

const SEGMENTS: Array<{ id: MailSegment; label: string }> = [
  { id: 'total', label: 'Total' },
  { id: 'sin-iniciar', label: 'Sin iniciar' },
  { id: 'pre-registro-creado', label: 'Pre-registro sin pago' },
  { id: 'observado', label: 'Observado' },
  { id: 'comprobante-recibido', label: 'Comprobante recibido' },
  { id: 'pago-validado', label: 'Pago validado' },
  { id: 'confirmada', label: 'Confirmada' },
];

const EARLY_BIRD_DEADLINE = (import.meta as { env?: Record<string, string> }).env?.VITE_EARLY_BIRD_DEADLINE;

const formatDeadline = () =>
  EARLY_BIRD_DEADLINE
    ? new Date(EARLY_BIRD_DEADLINE).toLocaleDateString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Santiago',
      })
    : '[fecha de cierre]';

const TEMPLATES = [
  {
    label: 'Recordatorio Early Bird',
    subject: () => `CLAGTEE 2026: la tarifa Early Bird cierra el ${formatDeadline()}`,
    body: () =>
      `Le recordamos que la tarifa Early Bird de inscripción al CLAGTEE 2026 estará vigente solo hasta el ${formatDeadline()}. Después de esa fecha se aplicará la tarifa regular.\n\n` +
      `Trabajo(s): {paper}\nN° de pre-registro: {registro}\n\n` +
      `Para inscribirse o completar su inscripción, ingrese aquí:\n{enlace}\n\n` +
      'Recuerde que cada trabajo aceptado debe contar con al menos un autor inscrito.',
  },
  {
    label: 'Completar inscripción',
    subject: () => 'CLAGTEE 2026: complete su inscripción',
    body: () =>
      'Registramos su pre-registro {registro} al CLAGTEE 2026, pero aún no hemos recibido el comprobante de pago.\n\n' +
      'Trabajo(s): {paper}\n\n' +
      'Puede pagar y adjuntar el comprobante desde su enlace personal:\n{enlace}\n\n' +
      'También puede retomarlo desde su perfil de autor en el CMS: https://www.clagtee2026.org/cms',
  },
];

interface SendResult {
  sent: number;
  failed: Array<{ email: string; error: string }>;
}

interface StaffMailerProps {
  registrations: RegistrationRecord[];
  uncoveredPapers: Paper[];
  categoryLabels: Record<RegistrationCategory, string>;
  segment: MailSegment;
  onSegmentChange: (segment: MailSegment) => void;
}

export const StaffMailer: React.FC<StaffMailerProps> = ({
  registrations,
  uncoveredPapers,
  categoryLabels,
  segment,
  onSegmentChange,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | RegistrationCategory>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);
  const [lastByEmail, setLastByEmail] = useState<Record<string, { at: string; subject: string }>>({});

  const countFor = (id: MailSegment) => buildRecipients(id, registrations, uncoveredPapers, categoryLabels).length;

  const recipients = useMemo(() => {
    const all = buildRecipients(segment, registrations, uncoveredPapers, categoryLabels);
    return segment === 'sin-iniciar' || categoryFilter === 'all'
      ? all
      : all.filter((recipient) => recipient.category === categoryFilter);
  }, [segment, categoryFilter, registrations, uncoveredPapers, categoryLabels]);

  // Por defecto se selecciona todo el segmento visible; el envío siempre pide confirmación.
  const recipientKeys = recipients.map((recipient) => recipient.key).join('|');
  useEffect(() => {
    setSelected(new Set(recipients.map((recipient) => recipient.key)));
    setResult(null);
  }, [recipientKeys]);

  const fetchLog = useCallback(async () => {
    try {
      const response = await apiFetch('/api/registrations?scope=email-log');
      if (!response.ok) return;
      const payload = (await response.json()) as { lastByEmail?: Record<string, { at: string; subject: string }> };
      setLastByEmail(payload.lastByEmail || {});
    } catch {
      // El historial es informativo; si falla, el envío sigue disponible.
    }
  }, []);

  useEffect(() => {
    void fetchLog();
  }, [fetchLog]);

  const targets = recipients.filter((recipient) => selected.has(recipient.key));
  const previewTarget = targets[0];
  const allSelected = recipients.length > 0 && targets.length === recipients.length;

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const handleSend = async () => {
    if (!subject.trim() || !body.trim() || targets.length === 0) return;
    const ok = window.confirm(`Se enviará "${subject.trim()}" a ${targets.length} destinatario(s). ¿Continuar?`);
    if (!ok) return;

    const failed: SendResult['failed'] = [];
    let sent = 0;
    setResult(null);
    setProgress({ done: 0, total: targets.length });

    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE);
      try {
        const response = await apiFetch('/api/registrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'notify',
            subject: subject.trim(),
            body: body.trim(),
            segment,
            archive: i === 0,
            recipients: batch.map(({ email, name, registrationId, paperIds }) => ({ email, name, registrationId, paperIds })),
          }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as { results: Array<{ email: string; ok: boolean; error?: string }> };
        payload.results.forEach((item) => {
          if (item.ok) sent += 1;
          else failed.push({ email: item.email, error: item.error || 'error' });
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'error';
        batch.forEach((recipient) => failed.push({ email: recipient.email, error: message }));
      }
      setProgress({ done: Math.min(i + BATCH_SIZE, targets.length), total: targets.length });
    }

    setProgress(null);
    setResult({ sent, failed });
    void fetchLog();
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  const renderPreview = (recipient: MailRecipient) =>
    previewBody(body, {
      nombre: recipient.name,
      paper: recipient.paperIds.join('; '),
      registro: recipient.registrationId || '',
      enlace: recipient.registrationId ? '(enlace personal para retomar su inscripción)' : '(enlace al formulario de inscripción)',
    });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h4 className="text-lg font-bold text-[#0D2C54]">Comunicaciones a autores y participantes</h4>
        <p className="text-sm text-gray-500">
          Filtra por clasificación, selecciona destinatarios (todos o individuales) y envía un correo personalizado.
        </p>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {SEGMENTS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSegmentChange(item.id)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                segment === item.id ? 'bg-[#0D2C54] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {item.label} ({countFor(item.id)})
            </button>
          ))}
        </div>

        {segment !== 'sin-iniciar' && (
          <select
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'all' | RegistrationCategory)}
          >
            <option value="all">Todas las categorías</option>
            {(Object.keys(categoryLabels) as RegistrationCategory[]).map((category) => (
              <option key={category} value={category}>
                {categoryLabels[category]}
              </option>
            ))}
          </select>
        )}

        {segment === 'total' && (
          <p className="text-xs text-gray-500">
            Todos: inscripciones activas y coautores sin iniciar, un correo por persona. Revise la selección antes de enviar.
          </p>
        )}

        {segment === 'sin-iniciar' && (
          <p className="text-xs text-gray-500">
            Coautores de {uncoveredPapers.length} paper(s) aceptado(s) que aún no tienen ninguna inscripción activa.
          </p>
        )}

        <div className="border border-gray-100 rounded-xl max-h-96 overflow-y-auto">
          <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-gray-50 text-xs font-bold text-gray-500 uppercase sticky top-0">
            <div className="col-span-1">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => setSelected(allSelected ? new Set() : new Set(recipients.map((r) => r.key)))}
                aria-label="Seleccionar todos"
              />
            </div>
            <div className="col-span-4">Destinatario</div>
            <div className="col-span-3">Detalle</div>
            <div className="col-span-3">Último correo</div>
            <div className="col-span-1" />
          </div>
          {recipients.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">No hay destinatarios en esta clasificación.</div>
          ) : (
            recipients.map((recipient) => {
              const last = lastByEmail[recipient.email];
              return (
                <label
                  key={recipient.key}
                  className="grid grid-cols-12 gap-3 px-4 py-2 items-center text-sm border-t border-gray-50 hover:bg-[#F8FAFC] cursor-pointer"
                >
                  <div className="col-span-1">
                    <input type="checkbox" checked={selected.has(recipient.key)} onChange={() => toggle(recipient.key)} />
                  </div>
                  <div className="col-span-4 min-w-0">
                    <p className="font-bold text-gray-800 truncate">{recipient.name || '—'}</p>
                    <p className="text-xs text-gray-400 truncate">{recipient.email}</p>
                  </div>
                  <div className="col-span-3 text-xs text-gray-600 truncate" title={recipient.detail}>
                    {recipient.detail}
                  </div>
                  <div className="col-span-3 text-xs text-gray-500 truncate" title={last?.subject}>
                    {last ? `${formatDate(last.at)} · ${last.subject}` : '—'}
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setSelected(new Set([recipient.key]));
                      }}
                      className="text-[11px] font-bold text-[#2A9D8F] hover:underline"
                    >
                      Solo este
                    </button>
                  </div>
                </label>
              );
            })
          )}
        </div>

        <div className="space-y-3 border-t border-gray-100 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Plantillas:</span>
            {TEMPLATES.map((template) => (
              <button
                key={template.label}
                type="button"
                onClick={() => {
                  setSubject(template.subject());
                  setBody(template.body());
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F4A261]/15 text-[#0D2C54] hover:bg-[#F4A261]/30 transition-colors"
              >
                {template.label}
              </button>
            ))}
          </div>
          <input
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none"
            placeholder="Asunto"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <textarea
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none min-h-[180px] text-sm"
            placeholder="Mensaje (el saludo 'Estimado/a <nombre>' se agrega automáticamente)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <p className="text-xs text-gray-400">
            Marcadores: {'{nombre}'}, {'{paper}'}, {'{registro}'}, {'{enlace}'} (enlace personal si ya tiene inscripción; si no,
            el formulario). Las líneas cuyo marcador queda vacío se omiten.
          </p>

          {previewTarget && body.trim() && (
            <div className="bg-[#F8FAFC] border border-gray-100 rounded-xl p-4 text-sm text-gray-600 space-y-2">
              <p className="text-xs font-bold text-gray-400 uppercase">Vista previa para {previewTarget.email}</p>
              {previewTarget.name && <p>Estimado/a <strong>{previewTarget.name}</strong>,</p>}
              <p className="whitespace-pre-line">{renderPreview(previewTarget)}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-gray-500">
              {progress ? `Enviando ${progress.done}/${progress.total}…` : `${targets.length} destinatario(s) seleccionado(s)`}
            </span>
            <button
              type="button"
              onClick={handleSend}
              disabled={Boolean(progress) || targets.length === 0 || !subject.trim() || !body.trim()}
              className="bg-[#0D2C54] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#1A4B8A] transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Enviar a {targets.length} destinatario(s)
            </button>
          </div>

          {result && (
            <div
              className={`rounded-xl px-4 py-3 text-sm border ${
                result.failed.length ? 'bg-yellow-50 border-yellow-100 text-yellow-800' : 'bg-green-50 border-green-100 text-green-700'
              }`}
            >
              <p className="font-bold">
                Enviados: {result.sent}. Fallidos: {result.failed.length}.
              </p>
              {result.failed.map((item) => (
                <p key={item.email} className="text-xs">
                  {item.email}: {item.error}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
