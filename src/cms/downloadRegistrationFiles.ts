import { RegistrationCategory, RegistrationRecord, RegistrationStatus } from '../../types';
import { apiFetch } from './api';

// Descarga por lotes de comprobantes de pago y certificados de estudiante.
//
// El servidor firma todas las URLs en una sola llamada (POST /api/gcs-sign con
// action 'sign-downloads'); el navegador baja cada archivo directo desde GCS y
// arma un ZIP con una carpeta por tipo de documento.

export interface RegistrationFile {
  registrationId: string;
  fileKey: string;
  zipPath: string;
}

const FOLDERS = {
  comprobante: 'comprobantes',
  certificado: 'certificados-estudiante',
} as const;

// Descargas simultáneas desde GCS: suficiente para avanzar rápido sin saturar la red.
const CONCURRENCY = 4;

const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const extensionOf = (fileName?: string, fileKey?: string): string => {
  const match = /\.([a-z0-9]{1,5})$/i.exec(fileName || '') || /\.([a-z0-9]{1,5})$/i.exec(fileKey || '');
  return match ? `.${match[1].toLowerCase()}` : '.pdf';
};

// Archivos adjuntos de las inscripciones: comprobantes/REG-0001_Perez-Juan.pdf, etc.
export const collectRegistrationFiles = (registrations: RegistrationRecord[]): RegistrationFile[] =>
  registrations.flatMap((reg) => {
    const person = slugify(`${reg.lastName || ''} ${reg.firstName || ''}`) || 'sin-nombre';
    const entries: Array<[string, string | undefined, string | undefined]> = [
      [FOLDERS.comprobante, reg.comprobanteFileKey, reg.comprobanteFileName],
      [FOLDERS.certificado, reg.studentProofFileKey, reg.studentProofFileName],
    ];
    return entries
      .filter(([, fileKey]) => Boolean(fileKey))
      .map(([folder, fileKey, fileName]) => ({
        registrationId: reg.id,
        fileKey: fileKey!,
        zipPath: `${folder}/${reg.id}_${person}${extensionOf(fileName, fileKey)}`,
      }));
  });

const buildZipName = (statusFilter: 'all' | RegistrationStatus, categoryFilter: 'all' | RegistrationCategory) => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateSlug = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  const filterSlug =
    statusFilter === 'all' && categoryFilter === 'all'
      ? 'todos'
      : `${categoryFilter}_${statusFilter}`.replace(/[^a-zA-Z0-9_-]/g, '-');
  return `clagtee2026_comprobantes-certificados_${filterSlug}_${dateSlug}.zip`;
};

export interface DownloadZipOptions {
  files: RegistrationFile[];
  statusFilter: 'all' | RegistrationStatus;
  categoryFilter: 'all' | RegistrationCategory;
  onProgress?: (done: number, total: number) => void;
}

export interface DownloadZipResult {
  downloaded: number;
  failed: RegistrationFile[];
}

export const downloadRegistrationFilesZip = async ({
  files,
  statusFilter,
  categoryFilter,
  onProgress,
}: DownloadZipOptions): Promise<DownloadZipResult> => {
  const { zipSync, strToU8 } = await import('fflate');

  const response = await apiFetch('/api/gcs-sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sign-downloads', objects: files.map((file) => file.fileKey) }),
  });
  if (!response.ok) throw new Error('sign-failed');
  const { urls } = (await response.json()) as { urls: Record<string, string> };

  const entries: Record<string, Uint8Array> = {};
  const failed: RegistrationFile[] = [];
  let next = 0;
  let done = 0;

  const worker = async () => {
    while (next < files.length) {
      const file = files[next++];
      try {
        const url = urls[file.fileKey];
        if (!url) throw new Error('missing-url');
        const fileResponse = await fetch(url);
        if (!fileResponse.ok) throw new Error(`HTTP ${fileResponse.status}`);
        entries[file.zipPath] = new Uint8Array(await fileResponse.arrayBuffer());
      } catch {
        failed.push(file);
      }
      done += 1;
      onProgress?.(done, files.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker));

  const downloaded = Object.keys(entries).length;
  if (downloaded === 0) throw new Error('no-files-downloaded');
  if (failed.length > 0) {
    entries['_no-descargados.txt'] = strToU8(
      `Archivos que no se pudieron descargar:\n\n${failed.map((file) => `${file.zipPath}\t${file.fileKey}`).join('\n')}\n`
    );
  }

  // PDFs e imágenes ya vienen comprimidos: se guardan sin recomprimir (level 0).
  const zipped = zipSync(entries, { level: 0 });
  const blobUrl = URL.createObjectURL(new Blob([zipped as BlobPart], { type: 'application/zip' }));
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = buildZipName(statusFilter, categoryFilter);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Se libera después: revocar al instante puede cortar la descarga de un ZIP grande.
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);

  return { downloaded, failed };
};
