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

export const IEEE_ECF_URL = 'https://ecopyright.ieee.org/ECTT/IntroPage.jsp';

export const IEEE_ECF_PUB_TITLE =
  '2026 XVI Latin-American Congress on Electricity Generation and Transmission (CLAGTEE)';

// Conference Record Number: el Conference ID de PDF eXpress (70524X) sin la X.
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
