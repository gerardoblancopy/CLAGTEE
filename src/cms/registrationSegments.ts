// Segmentación de destinatarios para los correos del staff.
// "Sin iniciar" = autores de papers aceptados que aún no tienen ninguna
// inscripción activa que cubra el paper; el resto son estados de inscripción.
import { RegistrationCategory, RegistrationRecord, RegistrationStatus } from '../../types';
import { Paper } from './CMSDataContext';

export type MailSegment = 'total' | 'sin-iniciar' | Exclude<RegistrationStatus, 'cancelada'>;

// En 'total', si una persona aparece varias veces se conserva la inscripción que más requiere acción.
const ACTIVE_STATUS_ORDER: MailSegment[] = ['pre-registro-creado', 'observado', 'comprobante-recibido', 'pago-validado', 'confirmada'];

export interface MailRecipient {
  key: string;
  email: string;
  name: string;
  detail: string;
  paperIds: string[];
  registrationId?: string;
  category?: RegistrationCategory;
}

export const normalizePaperId = (value?: string) => String(value || '').trim().toUpperCase();

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/** Papers aceptados sin ninguna inscripción activa asociada. */
export const getUncoveredPapers = (acceptedPapers: Paper[], registrations: RegistrationRecord[]): Paper[] => {
  const covered = new Set(
    registrations
      .filter((reg) => reg.status !== 'cancelada' && reg.cmsPaperId)
      .map((reg) => normalizePaperId(reg.cmsPaperId))
  );
  return acceptedPapers.filter((paper) => !covered.has(normalizePaperId(paper.id)));
};

/** Todos los coautores de los papers sin cubrir, un destinatario por correo. */
const buildNotStartedRecipients = (uncoveredPapers: Paper[]): MailRecipient[] => {
  const byEmail = new Map<string, MailRecipient>();
  uncoveredPapers.forEach((paper) => {
    paper.authors.forEach((author) => {
      const email = String(author.email || '').trim().toLowerCase();
      if (!isEmail(email)) return;
      const existing = byEmail.get(email);
      if (existing) {
        existing.paperIds.push(paper.id);
        existing.detail = existing.paperIds.join(', ');
        return;
      }
      byEmail.set(email, { key: email, email, name: author.name || '', detail: paper.id, paperIds: [paper.id] });
    });
  });
  return [...byEmail.values()].sort((a, b) => a.name.localeCompare(b.name));
};

export const buildRecipients = (
  segment: MailSegment,
  registrations: RegistrationRecord[],
  uncoveredPapers: Paper[],
  categoryLabels: Record<RegistrationCategory, string>
): MailRecipient[] => {
  if (segment === 'sin-iniciar') return buildNotStartedRecipients(uncoveredPapers);

  // Total: inscritos activos + coautores sin iniciar, un correo por persona.
  if (segment === 'total') {
    const byEmail = new Map<string, MailRecipient>();
    ACTIVE_STATUS_ORDER.forEach((status) =>
      buildRecipients(status, registrations, uncoveredPapers, categoryLabels).forEach((recipient) => {
        if (!byEmail.has(recipient.email)) byEmail.set(recipient.email, recipient);
      })
    );
    buildNotStartedRecipients(uncoveredPapers).forEach((recipient) => {
      const existing = byEmail.get(recipient.email);
      if (!existing) {
        byEmail.set(recipient.email, recipient);
        return;
      }
      recipient.paperIds
        .filter((paperId) => !existing.paperIds.includes(paperId))
        .forEach((paperId) => existing.paperIds.push(paperId));
    });
    return [...byEmail.values()];
  }

  return registrations
    .filter((reg) => reg.status === segment)
    .map((reg) => ({
      key: reg.id,
      email: String(reg.email || '').trim().toLowerCase(),
      name: `${reg.firstName || ''} ${reg.lastName || ''}`.trim(),
      detail: [reg.id, categoryLabels[reg.category], reg.cmsPaperId].filter(Boolean).join(' · '),
      paperIds: reg.cmsPaperId ? [reg.cmsPaperId] : [],
      registrationId: reg.id,
      category: reg.category,
    }));
};

/** Vista previa local; el servidor hace el reemplazo real (con títulos y enlaces). */
export const previewBody = (text: string, values: Record<string, string>) =>
  text
    .split('\n')
    .filter((line) => !Object.keys(values).some((key) => !values[key] && line.includes(`{${key}}`)))
    .join('\n')
    .replace(/\{(nombre|paper|registro|enlace)\}/g, (_, key: string) => values[key] || '');
