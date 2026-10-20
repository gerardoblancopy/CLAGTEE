// Integración con el formulario electrónico de copyright de IEEE (eCF).
//
// IEEE no acepta formularios generados por la conferencia: el autor debe firmar
// en ecopyright.ieee.org. El CMS envía por POST los datos del artículo (spec
// "IEEE Electronic Copyright" v1.4, sección 2.1), el autor firma allí, IEEE le
// envía por correo el PDF firmado y vuelve al CMS (rtrnurl) para subirlo.
//
// Requisitos del lado de IEEE (los gestiona el comité con ecopyright@ieee.org):
// - El título de la publicación debe estar registrado y coincidir EXACTAMENTE
//   con la Letter of Acquisition (si no: error 1003).
// - ArtSource es el Conference Record Number de 5 dígitos (si no: error 1002).
// - El dominio del CMS debe estar registrado como sitio de origen (si no: 1001).

import { PDFArray, PDFDocument, PDFRawStream, decodePDFRawStream } from 'pdf-lib';

export const IEEE_ECF_URL = 'https://ecopyright.ieee.org/ECTT/IntroPage.jsp';

// Título y número tal como figuran en el portal de conferencias de IEEE
// ("(70524) 2026 XVI Latin American Congress ..."): "Latin American" va sin guion.
export const IEEE_ECF_PUB_TITLE =
  '2026 XVI Latin American Congress on Electricity Generation and Transmission (CLAGTEE)';

// Conference Record Number (también es el Conference ID de PDF eXpress, 70524X, sin la X).
export const IEEE_ECF_ART_SOURCE = '70524';

export const CAMERA_READY_SUPPORT_EMAIL = 'clagtee2026@clagtee.org';

// Parámetro que el CMS recibe al volver desde el eCF: /cms?ecf=<paperId>
export const ECF_RETURN_PARAM = 'ecf';

const EMAIL_PATTERN = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

export interface EcfAuthor {
  name?: string;
  email?: string;
}

export interface EcfSubmission {
  paperId: string;
  title: string;
  authors: EcfAuthor[];
  signerEmail?: string;
}

// "Ana Pérez", "Ana Pérez and Luis Soto", "Ana Pérez, Luis Soto and Eva Ruiz"
export const formatEcfAuthorNames = (authors: EcfAuthor[]) => {
  const names = authors.map((author) => (author.name || '').trim()).filter(Boolean);
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

// El eCF rechaza la conexión entera (error 1007) si un solo correo es inválido,
// así que se descartan los mal formados. El firmante va primero.
export const collectEcfEmails = (submission: EcfSubmission) => {
  const seen = new Set<string>();
  const emails: string[] = [];
  [submission.signerEmail, ...submission.authors.map((author) => author.email)].forEach((raw) => {
    const email = (raw || '').trim();
    const key = email.toLowerCase();
    if (!EMAIL_PATTERN.test(email) || seen.has(key)) return;
    seen.add(key);
    emails.push(email);
  });
  return emails;
};

export const buildEcfFields = (submission: EcfSubmission, returnUrl: string): Record<string, string> => ({
  PubTitle: IEEE_ECF_PUB_TITLE,
  ArtTitle: submission.title.trim(),
  AuthName: formatEcfAuthorNames(submission.authors),
  // Caracteres válidos según IEEE: a-z A-Z 0-9 - _ . / ( ) ; (si no: error 1010)
  ArtId: submission.paperId.replace(/[^a-zA-Z0-9\-_./();]/g, '-'),
  ArtSource: IEEE_ECF_ART_SOURCE,
  AuthEmail: collectEcfEmails(submission).join(','),
  rtrnurl: returnUrl,
});

export const buildEcfReturnUrl = (paperId: string) =>
  `${window.location.origin}/cms?${ECF_RETURN_PARAM}=${encodeURIComponent(paperId)}`;

// Navega (en la misma pestaña) al eCF de IEEE con los datos precargados.
export const openIeeeEcf = (submission: EcfSubmission) => {
  // IEEE valida el Referer contra la URL registrada (error 1001). Por defecto el
  // navegador solo envía el dominio a otro sitio; así envía la URL completa del CMS.
  const referrerPolicy = document.createElement('meta');
  referrerPolicy.name = 'referrer';
  referrerPolicy.content = 'no-referrer-when-downgrade';
  document.head.appendChild(referrerPolicy);

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = IEEE_ECF_URL;
  form.acceptCharset = 'UTF-8';
  Object.entries(buildEcfFields(submission, buildEcfReturnUrl(submission.paperId))).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
};

export const readEcfReturnPaperId = () =>
  new URLSearchParams(window.location.search).get(ECF_RETURN_PARAM);

// Quita ?ecf= de la URL para que recargar la página no repita el aviso de regreso.
export const clearEcfReturnParam = () => {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(ECF_RETURN_PARAM)) return;
  url.searchParams.delete(ECF_RETURN_PARAM);
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
};

// ---------------------------------------------------------------------------
// Copyrights generados por la propia web (retirados): IEEE no los reconoce
// ---------------------------------------------------------------------------

// Nombres que usaba el generador retirado ("IEEE_Copyright_eCF_CIE-6.pdf",
// "IEEE_Copyright_Form_CLAGTEE_2026.pdf", con o sin " (1)" del navegador).
// Sirven para marcar los copyrights que ya quedaron subidos con ese formato.
const GENERATED_ECF_FILE_NAME = /IEEE_Copyright_(eCF_[A-Za-z0-9-]+|Form_CLAGTEE_2026)( ?\(\d+\))?\.pdf$/i;

export const isGeneratedEcfFileName = (fileName?: string) => GENERATED_ECF_FILE_NAME.test((fileName || '').trim());

export type GeneratedPdfKind = 'fake-ecf' | 'format-certificate';

// Texto de las páginas de un PDF hecho con pdf-lib: sus fuentes estándar
// escriben cada línea como <hex WinAnsi> Tj dentro de streams comprimidos.
const extractPdfLibText = (pdf: PDFDocument) => {
  const chunks: string[] = [];
  const readStream = (stream: unknown) => {
    if (!(stream instanceof PDFRawStream)) return;
    const content = new TextDecoder('latin1').decode(decodePDFRawStream(stream).decode());
    for (const match of content.matchAll(/<([0-9A-Fa-f\s]+)>\s*Tj/g)) {
      const hex = match[1].replace(/\s/g, '');
      chunks.push(String.fromCharCode(...(hex.match(/../g) || []).map((byte) => parseInt(byte, 16))));
    }
  };
  pdf.getPages().forEach((page) => {
    const contents = page.node.Contents();
    if (contents instanceof PDFArray) {
      contents.asArray().forEach((ref) => readStream(pdf.context.lookup(ref)));
    } else {
      readStream(contents);
    }
  });
  return chunks.join('\n');
};

// Reconoce los PDFs que generaba esta web (formulario eCF propio o certificado
// de formato) para que no se suban como copyright firmado en IEEE.
export const detectGeneratedPdf = async (file: File): Promise<GeneratedPdfKind | null> => {
  if (isGeneratedEcfFileName(file.name)) return 'fake-ecf';
  try {
    // updateMetadata: false conserva el Producer original del archivo
    const pdf = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false, ignoreEncryption: true });
    if (!`${pdf.getProducer() || ''} ${pdf.getCreator() || ''}`.includes('pdf-lib')) return null;
    const text = extractPdfLibText(pdf);
    if (text.includes('IEEE ELECTRONIC COPYRIGHT FORM')) return 'fake-ecf';
    if (text.includes('CERTIFICADO DE CONFORMIDAD')) return 'format-certificate';
  } catch (error) {
    console.error('No se pudo inspeccionar el PDF de copyright:', error);
  }
  return null;
};
