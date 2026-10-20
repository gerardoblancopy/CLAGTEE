import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import { extractPdfPagesText } from './pdfText';
import { detectLanguage, LANGUAGE_NAMES, looksNonEnglish } from './language';

export interface FontInfo {
  name: string;
  rawName: string;
  subtype: string;
  isEmbedded: boolean;
  isType3: boolean;
}

export interface IeeeValidationCheck {
  id: string;
  label: string;
  status: 'pass' | 'warning' | 'fail';
  summary: string;
  details?: string;
}

export interface IeeeValidationResult {
  fileName: string;
  fileSizeBytes: number;
  pageCount: number;
  pageSize: {
    widthPt: number;
    heightPt: number;
    widthInches: number;
    heightInches: number;
    formatName: string; // 'US Letter' | 'A4' | 'Otro'
  };
  isEncrypted: boolean;
  fonts: FontInfo[];
  totalFonts: number;
  embeddedFontsCount: number;
  unembeddedFontsCount: number;
  hasType3Fonts: boolean;
  hasCopyrightNotice: boolean;
  overallStatus: 'PASS' | 'WARNING' | 'FAIL';
  checks: IeeeValidationCheck[];
  recommendations: string[];
}

// Clean font name removing random subset prefix (e.g., 'ABCDEF+TimesNewRoman' -> 'TimesNewRoman')
function cleanFontName(rawName: string): string {
  let name = rawName.startsWith('/') ? rawName.slice(1) : rawName;
  if (/^[A-Z]{6}\+/.test(name)) {
    name = name.slice(7);
  }
  return name;
}

export interface IeeeValidationOptions {
  // Título en inglés declarado por el autor: se comprueba que coincida con el del PDF
  expectedTitle?: string;
}

// Normaliza texto para comparar títulos: sin acentos, ligaduras, signos ni espacios
const compactForMatch = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

// Abstract de la primera página: desde "Abstract" hasta "Index Terms"/"Keywords"/"Introduction"
function extractAbstract(pageText: string): string | null {
  let start = pageText.search(/\bAbstract\s*[—–\-:.]/i);
  if (start < 0) start = pageText.search(/\b(Abstract|ABSTRACT)\b/);
  if (start < 0) return null;
  const rest = pageText.slice(start).replace(/^Abstract\s*[—–\-:.]?\s*/i, '');
  const end = rest.search(
    /\b(Index\s*Terms|Key\s*-?\s*words|Palabras\s+clave|Palavras[\s-]+chave|I\s*NTRODUCTION|Introduction|INTRODUCCI[OÓ]N|Introducci[oó]n|INTRODU[CÇ][AÃ]O|Introdu[cç][aã]o|(?:I|1)\.\s+[A-ZÁÉÍÓÚÇ]{4,})/
  );
  // Si no hay marcador de fin, basta con el comienzo: el abstract va justo después del encabezado
  return (end > 0 ? rest.slice(0, end) : rest).trim().split(/\s+/).slice(0, 80).join(' ');
}

export async function validateIeeePdf(
  fileOrBuffer: File | ArrayBuffer | Uint8Array,
  fileName: string = 'document.pdf',
  options: IeeeValidationOptions = {}
): Promise<IeeeValidationResult> {
  let buffer: ArrayBuffer;
  let fileSizeBytes = 0;

  if (typeof File !== 'undefined' && fileOrBuffer instanceof File) {
    fileName = fileOrBuffer.name;
    fileSizeBytes = fileOrBuffer.size;
    buffer = await fileOrBuffer.arrayBuffer();
  } else if (fileOrBuffer instanceof Uint8Array) {
    const copy = new Uint8Array(fileOrBuffer.byteLength);
    copy.set(fileOrBuffer);
    buffer = copy.buffer as ArrayBuffer;
    fileSizeBytes = fileOrBuffer.byteLength;
  } else if (fileOrBuffer instanceof ArrayBuffer) {
    buffer = fileOrBuffer;
    fileSizeBytes = fileOrBuffer.byteLength;
  } else {
    buffer = new ArrayBuffer(0);
  }

  const checks: IeeeValidationCheck[] = [];
  const recommendations: string[] = [];

  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(buffer, { updateMetadata: false });
  } catch (err: any) {
    const isEncrypted = err?.message?.toLowerCase().includes('encrypt');
    return {
      fileName,
      fileSizeBytes,
      pageCount: 0,
      pageSize: { widthPt: 0, heightPt: 0, widthInches: 0, heightInches: 0, formatName: 'Desconocido' },
      isEncrypted,
      fonts: [],
      totalFonts: 0,
      embeddedFontsCount: 0,
      unembeddedFontsCount: 0,
      hasType3Fonts: false,
      hasCopyrightNotice: false,
      overallStatus: 'FAIL',
      checks: [
        {
          id: 'readability',
          label: 'Estructura del archivo PDF',
          status: 'fail',
          summary: isEncrypted
            ? 'El PDF está protegido con contraseña o cifrado de seguridad.'
            : 'No se pudo leer el archivo PDF. Puede estar dañado o incompleto.',
          details: 'IEEE Xplore rechaza archivos protegidos con contraseña o que requieran permisos de apertura.',
        },
      ],
      recommendations: [
        'Genere un nuevo PDF sin contraseñas ni restricciones de seguridad de impresión/edición.',
      ],
    };
  }

  const pageCount = pdfDoc.getPageCount();
  const page1 = pageCount > 0 ? pdfDoc.getPage(0) : null;
  const size1 = page1 ? page1.getSize() : { width: 0, height: 0 };

  const widthPt = Math.round(size1.width * 10) / 10;
  const heightPt = Math.round(size1.height * 10) / 10;
  const widthIn = Math.round((widthPt / 72) * 100) / 100;
  const heightIn = Math.round((heightPt / 72) * 100) / 100;

  // Format detection (Letter: 612x792 pt, A4: 595x842 pt)
  let formatName = 'Personalizado';
  const isLetter = Math.abs(widthPt - 612) <= 12 && Math.abs(heightPt - 792) <= 12;
  const isA4 = Math.abs(widthPt - 595) <= 12 && Math.abs(heightPt - 842) <= 12;

  if (isLetter) formatName = 'US Letter (8.5″ × 11″)';
  else if (isA4) formatName = 'A4 (210 × 297 mm)';
  else formatName = `${widthIn}″ × ${heightIn}″ (${widthPt} × ${heightPt} pt)`;

  // Fonts extraction and embedding check
  const context = pdfDoc.context;
  const fontsMap = new Map<string, FontInfo>();

  context.enumerateIndirectObjects().forEach(([, obj]) => {
    if (obj instanceof PDFDict) {
      const type = obj.get(PDFName.of('Type'));
      if (type && type.toString() === '/Font') {
        const subtype = obj.get(PDFName.of('Subtype'))?.toString() || 'Unknown';
        const rawName = obj.get(PDFName.of('BaseFont'))?.toString() || 'Unnamed';
        const name = cleanFontName(rawName);
        const isType3 = subtype === '/Type3';

        let isEmbedded = false;

        // Check direct FontDescriptor
        const descRef = obj.get(PDFName.of('FontDescriptor'));
        const desc = descRef instanceof PDFRef ? context.lookup(descRef) : descRef;
        if (desc instanceof PDFDict) {
          if (
            desc.has(PDFName.of('FontFile')) ||
            desc.has(PDFName.of('FontFile2')) ||
            desc.has(PDFName.of('FontFile3'))
          ) {
            isEmbedded = true;
          }
        }

        // Check Type0 / DescendantFonts
        const descFontsRef = obj.get(PDFName.of('DescendantFonts'));
        const descFonts = descFontsRef instanceof PDFRef ? context.lookup(descFontsRef) : descFontsRef;
        if (descFonts instanceof PDFArray) {
          descFonts.asArray().forEach((dfRef) => {
            const df = dfRef instanceof PDFRef ? context.lookup(dfRef) : dfRef;
            if (df instanceof PDFDict) {
              const dfDescRef = df.get(PDFName.of('FontDescriptor'));
              const dfDesc = dfDescRef instanceof PDFRef ? context.lookup(dfDescRef) : dfDescRef;
              if (dfDesc instanceof PDFDict) {
                if (
                  dfDesc.has(PDFName.of('FontFile')) ||
                  dfDesc.has(PDFName.of('FontFile2')) ||
                  dfDesc.has(PDFName.of('FontFile3'))
                ) {
                  isEmbedded = true;
                }
              }
            }
          });
        }

        // For Type 3 fonts, they define CharProcs directly instead of font files,
        // but IEEE prohibits them because they are bitmap fonts.
        if (isType3) {
          isEmbedded = false;
        }

        const key = `${name}__${subtype}`;
        if (!fontsMap.has(key)) {
          fontsMap.set(key, {
            name,
            rawName,
            subtype: subtype.replace(/^\//, ''),
            isEmbedded,
            isType3,
          });
        }
      }
    }
  });

  const fonts = Array.from(fontsMap.values());
  const totalFonts = fonts.length;
  const embeddedFontsCount = fonts.filter((f) => f.isEmbedded).length;
  const unembeddedFonts = fonts.filter((f) => !f.isEmbedded);
  const unembeddedFontsCount = unembeddedFonts.length;
  const hasType3Fonts = fonts.some((f) => f.isType3);

  // Aviso de copyright (ISBN de CLAGTEE 2026) en el texto de la primera página.
  // Se lee como texto real: los bytes crudos van comprimidos y buscar ahí daba
  // "no detectado" en casi todos los PDFs correctos.
  let firstPageText = '';
  try {
    firstPageText = await extractPdfPagesText(new Uint8Array(buffer), 1);
  } catch (err) {
    console.error('No se pudo leer el texto del PDF:', err);
  }
  const compactText = firstPageText
    .normalize('NFKC')
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, '');
  const rawBytesStr = new TextDecoder('latin1').decode(new Uint8Array(buffer.slice(0, Math.min(buffer.byteLength, 150000))));
  const hasCopyrightNotice = /979-?8-?3195-?1521-?6/.test(compactText) || rawBytesStr.includes('979-8-3195-1521-6');

  // Check 1: Security / Encryption
  checks.push({
    id: 'security',
    label: 'Cifrado y Seguridad',
    status: 'pass',
    summary: 'Sin contraseñas ni restricciones de seguridad.',
    details: 'El archivo permite extracción de texto y procesamiento editorial automático.',
  });

  // Check 2: Font embedding
  if (totalFonts === 0) {
    checks.push({
      id: 'fonts',
      label: 'Incrustación de Fuentes',
      status: 'warning',
      summary: 'No se detectaron descriptores de fuentes vectoriales estándar.',
      details: 'Asegúrese de que el archivo contenga texto seleccionable y no consista únicamente en imágenes escaneadas.',
    });
  } else if (hasType3Fonts) {
    checks.push({
      id: 'fonts',
      label: 'Incrustación de Fuentes (Fuentes Type 3 Prohibidas)',
      status: 'fail',
      summary: 'Se detectaron fuentes bitmap Type 3, no permitidas por IEEE Xplore.',
      details: 'Las fuentes Type 3 generan artefactos borrosos en pantalla. Utilice fuentes vectoriales Type 1 / TrueType.',
    });
    recommendations.push(
      'Si utiliza LaTeX con dvips, agregue el argumento `-Ppdf -G0` para forzar fuentes vectoriales Tipo 1, o compile directamente con pdflatex.'
    );
  } else if (unembeddedFontsCount > 0) {
    const listNames = unembeddedFonts.map((f) => f.name).slice(0, 5).join(', ');
    checks.push({
      id: 'fonts',
      label: 'Incrustación de Fuentes',
      status: 'fail',
      summary: `${unembeddedFontsCount} de ${totalFonts} fuentes NO están incrustadas (${listNames}).`,
      details: 'IEEE Xplore exige que el 100% de las fuentes estén incrustadas (Embedded & Subsetted).',
    });
    recommendations.push(
      'En Microsoft Word: vaya a Archivo > Opciones > Guardar y active la casilla "Incrustar fuentes en el archivo" antes de exportar a PDF.',
      'En LaTeX: verifique compilar con `pdflatex` o ejecute el comando Ghostscript para forzar la incrustación: `gs -dNOPAUSE -dBATCH -sDEVICE=pdfwrite -dPDFSETTINGS=/prepress -dEmbedAllFonts=true -sOutputFile=fixed.pdf original.pdf`'
    );
  } else {
    checks.push({
      id: 'fonts',
      label: 'Incrustación de Fuentes',
      status: 'pass',
      summary: `Excelente: el 100% de las fuentes (${totalFonts}/${totalFonts}) están incrustadas.`,
      details: 'Cumple a cabalidad con la norma de fuentes de IEEE Xplore.',
    });
  }

  // Check 3: Page dimensions
  if (isLetter) {
    checks.push({
      id: 'page-size',
      label: 'Tamaño de Página',
      status: 'pass',
      summary: `Formato US Letter (8.5″ × 11″ / ${widthPt} × ${heightPt} pt).`,
      details: 'Estándar oficial requerido por las publicaciones de IEEE.',
    });
  } else if (isA4) {
    checks.push({
      id: 'page-size',
      label: 'Tamaño de Página',
      status: 'warning',
      summary: `Formato A4 (210 × 297 mm / ${widthPt} × ${heightPt} pt).`,
      details: 'Aunque la plantilla oficial es tamaño Carta (US Letter: 8.5″ × 11″), IEEE acepta A4 en conferencias internacionales siempre que los márgenes se respeten.',
    });
    recommendations.push(
      'Recomendación: Para máxima compatibilidad con IEEE Xplore, configure el tamaño de página a Carta estadounidense (US Letter: 8.5″ × 11″).'
    );
  } else {
    checks.push({
      id: 'page-size',
      label: 'Tamaño de Página',
      status: 'fail',
      summary: `Tamaño no estándar: ${formatName}.`,
      details: 'Los documentos de IEEE deben prepararse en tamaño Carta (US Letter) o A4.',
    });
    recommendations.push(
      'Configure el tamaño de página en US Letter (8.5″ × 11″ / 215.9 mm × 279.4 mm) en su software de edición.'
    );
  }

  // Check 4: Page count (CLAGTEE accepts 6 to 8 pages)
  if (pageCount >= 6 && pageCount <= 8) {
    checks.push({
      id: 'page-count',
      label: 'Extensión del Manuscrito',
      status: 'pass',
      summary: `${pageCount} páginas (dentro del rango permitido de 6 a 8 páginas).`,
      details: 'Cumple con el límite de extensión de la conferencia.',
    });
  } else if (pageCount === 5 || pageCount === 9) {
    checks.push({
      id: 'page-count',
      label: 'Extensión del Manuscrito',
      status: 'warning',
      summary: `${pageCount} páginas (el rango estándar recomendado es de 6 a 8 páginas).`,
      details: 'Verifique si el comité técnico autorizó esta extensión para su artículo.',
    });
  } else {
    checks.push({
      id: 'page-count',
      label: 'Extensión del Manuscrito',
      status: pageCount > 8 ? 'warning' : 'fail',
      summary: `${pageCount} páginas (Límite oficial: 6 a 8 páginas).`,
      details: pageCount > 8 ? 'El artículo supera el límite estándar de 8 páginas.' : 'El artículo tiene menos de 5 páginas.',
    });
    if (pageCount > 8) {
      recommendations.push('Ajuste el contenido para no exceder las 8 páginas reglamentarias de CLAGTEE.');
    }
  }

  // Check 5: Copyright Notice
  if (hasCopyrightNotice) {
    checks.push({
      id: 'copyright',
      label: 'Aviso de Copyright IEEE',
      status: 'pass',
      summary: 'Aviso de copyright / ISBN oficial de CLAGTEE 2026 detectado.',
      details: 'Incluye la línea requerida al pie de la primera página.',
    });
  } else {
    checks.push({
      id: 'copyright',
      label: 'Aviso de Copyright IEEE en Pie de Página',
      status: 'warning',
      summary: 'No se detectó de forma inequívoca el código de copyright en el texto.',
      details: 'Asegúrese de haber agregado `979-8-3195-1521-6/26/$31.00 ©2026 IEEE` en el pie de la primera página.',
    });
    recommendations.push(
      'Agregue el código oficial de copyright al pie de la primera página: `979-8-3195-1521-6/26/$31.00 ©2026 IEEE` (o mediante \\IEEEpubid en LaTeX).'
    );
  }

  // Check 6: Título y abstract en inglés (IEEE PSPB 8.1.1.I: en artículos en otro
  // idioma, título y abstract deben ir en inglés)
  const languageCheck = checkEnglishTitleAndAbstract(firstPageText, options.expectedTitle);
  checks.push(languageCheck.check);
  recommendations.push(...languageCheck.recommendations);

  // Overall status
  const hasFail = checks.some((c) => c.status === 'fail');
  const hasWarning = checks.some((c) => c.status === 'warning');

  const overallStatus: 'PASS' | 'WARNING' | 'FAIL' = hasFail
    ? 'FAIL'
    : hasWarning
    ? 'WARNING'
    : 'PASS';

  return {
    fileName,
    fileSizeBytes,
    pageCount,
    pageSize: {
      widthPt,
      heightPt,
      widthInches: widthIn,
      heightInches: heightIn,
      formatName,
    },
    isEncrypted: false,
    fonts,
    totalFonts,
    embeddedFontsCount,
    unembeddedFontsCount,
    hasType3Fonts,
    hasCopyrightNotice,
    overallStatus,
    checks,
    recommendations,
  };
}

function checkEnglishTitleAndAbstract(
  pageText: string,
  expectedTitle?: string
): { check: IeeeValidationCheck; recommendations: string[] } {
  const label = 'Título y Abstract en Inglés';
  const policy = 'IEEE exige título y abstract en inglés, aunque el artículo esté escrito en español o portugués.';
  const fix = 'Escriba un solo título y un solo abstract, ambos en inglés ("Abstract—…" e "Index Terms—…"), sin versión en español ni portugués.';

  if (!pageText.trim()) {
    return {
      check: {
        id: 'language',
        label,
        status: 'warning',
        summary: 'No se pudo leer el texto de la primera página para revisar el idioma.',
        details: policy,
      },
      recommendations: ['Verifique manualmente que el título y el abstract estén en inglés.'],
    };
  }

  const problems: string[] = [];
  const notes: string[] = [];
  let status: IeeeValidationCheck['status'] = 'pass';

  // Encabezados (con mayúscula y guion o dos puntos), no la palabra suelta en el texto
  const secondAbstract = pageText.match(
    /\b(Resumen|RESUMEN|Resumo|RESUMO|Palabras\s+[Cc]lave|PALABRAS\s+CLAVE|Palavras[\s-]+[Cc]have|PALAVRAS[\s-]+CHAVE)\s*[—–\-:.]/
  );
  if (secondAbstract) {
    status = 'fail';
    problems.push(`Se encontró "${secondAbstract[1]}": no incluya un resumen ni palabras clave en español o portugués.`);
  }

  const abstract = extractAbstract(pageText);
  if (abstract === null) {
    if (status === 'pass') status = 'warning';
    problems.push('No se encontró el encabezado "Abstract" en la primera página.');
  } else if (looksNonEnglish(abstract)) {
    status = 'fail';
    problems.push(`El abstract parece estar en ${LANGUAGE_NAMES[detectLanguage(abstract)]}.`);
  } else {
    notes.push('abstract en inglés');
  }

  // El título va al inicio de la página. Se toman tantas palabras como tiene el
  // título esperado (8 si no se conoce) para no mezclarlo con las afiliaciones.
  const title = (expectedTitle || '').trim();
  const titleWords = title ? Math.min(20, Math.max(6, title.split(/\s+/).length)) : 8;
  const abstractStart = pageText.search(/\bAbstract\b/i);
  const pdfTitleSample = (abstractStart > 0 ? pageText.slice(0, abstractStart) : pageText)
    .trim()
    .split(/\s+/)
    .slice(0, titleWords)
    .join(' ');
  if (title && looksNonEnglish(title)) {
    status = 'fail';
    problems.push(`El título indicado en el CMS parece estar en ${LANGUAGE_NAMES[detectLanguage(title)]}.`);
  } else if (title && compactForMatch(pageText).includes(compactForMatch(title))) {
    notes.push('título en inglés coincide con el del CMS');
  } else if (looksNonEnglish(pdfTitleSample)) {
    status = 'fail';
    problems.push(`El título del PDF parece estar en ${LANGUAGE_NAMES[detectLanguage(pdfTitleSample)]}.`);
  } else if (title) {
    if (status === 'pass') status = 'warning';
    problems.push('El título en inglés indicado en el CMS no coincide con el título del PDF.');
  } else if (detectLanguage(pdfTitleSample) === 'en') {
    notes.push('título en inglés');
  }

  if (problems.length === 0) {
    return {
      check: {
        id: 'language',
        label,
        status: 'pass',
        summary: `${notes.join('; ')}.`.replace(/^./, (c) => c.toUpperCase()),
        details: title ? policy : `${policy} Verifique también que el título esté en inglés.`,
      },
      recommendations: [],
    };
  }

  return {
    check: { id: 'language', label, status, summary: problems.join(' '), details: policy },
    recommendations: [
      fix,
      ...(problems.some((p) => p.includes('no coincide'))
        ? ['Use en el CMS exactamente el mismo título en inglés que aparece en su PDF.']
        : []),
    ],
  };
}

// ---------------------------------------------------------------------------
// Generador del Certificado de Conformidad Técnica IEEE Xplore (PDF)
// ---------------------------------------------------------------------------

export interface FormatCertificateMeta {
  paperId?: string;
  paperTitle?: string;
  authorName?: string;
  authorEmail?: string;
}

// Las fuentes estándar de pdf-lib solo codifican WinAnsi: sin esta conversión,
// caracteres como ″ (tamaño de página) o Ł/ş (nombres de autores) abortan la
// generación del PDF con "WinAnsi cannot encode".
const WIN_ANSI_FALLBACKS: Record<string, string> = {
  '″': '"',
  '′': "'",
  'Ł': 'L',
  'ł': 'l',
  'Đ': 'D',
  'đ': 'd',
  'ı': 'i',
  ' ': ' ', // espacio fino que algunos navegadores usan en fechas/horas
};

function toWinAnsi(text: string, supported: Set<number>): string {
  const isSupported = (value: string) =>
    Array.from(value).every((char) => supported.has(char.codePointAt(0) ?? -1));
  return Array.from(text)
    .map((char) => {
      if (isSupported(char)) return char;
      const fallback = WIN_ANSI_FALLBACKS[char] ?? char.normalize('NFD').replace(/[̀-ͯ]/g, '');
      return fallback && isSupported(fallback) ? fallback : '?';
    })
    .join('');
}

export async function generateIeeeFormatCertificatePdf(
  result: IeeeValidationResult,
  meta?: FormatCertificateMeta
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);
  const winAnsiChars = new Set(fontRegular.getCharacterSet());
  const safe = (value: string) => toWinAnsi(value, winAnsiChars);

  // Colors
  const primaryBlue = rgb(13 / 255, 44 / 255, 84 / 255); // #0D2C54
  const ieeeBlue = rgb(0 / 255, 98 / 255, 155 / 255); // #00629B
  const textDark = rgb(30 / 255, 41 / 255, 59 / 255); // #1E293B
  const textMuted = rgb(100 / 255, 116 / 255, 139 / 255); // #64748B
  const borderLight = rgb(226 / 255, 232 / 255, 240 / 255); // #E2E8F0
  const passGreen = rgb(5 / 255, 150 / 255, 105 / 255); // #059669
  const warnAmber = rgb(217 / 255, 119 / 255, 6 / 255); // #D97706
  const failRed = rgb(220 / 255, 38 / 255, 38 / 255); // #DC2626
  const bgLight = rgb(248 / 255, 250 / 255, 252 / 255); // #F8FAFC

  // US Letter: 8.5 x 11 inches. El contenido se ajusta en líneas y salta de página
  // si no cabe (antes se recortaba a mano y se encimaban las columnas).
  const PAGE_W = 612;
  const PAGE_H = 792;
  const LEFT = 44;
  const RIGHT = PAGE_W - 44;
  const BOTTOM = 56;

  const addFramedPage = () => {
    const newPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
    newPage.drawRectangle({ x: 24, y: 24, width: PAGE_W - 48, height: PAGE_H - 48, borderColor: borderLight, borderWidth: 1.5 });
    return newPage;
  };
  let page = addFramedPage();
  let y = PAGE_H - 128;

  const text = (value: string, x: number, atY: number, size: number, font: PDFFont, color = textDark) =>
    page.drawText(safe(value), { x, y: atY, size, font, color });

  const wrap = (value: string, font: PDFFont, size: number, maxWidth: number): string[] => {
    const lines: string[] = [];
    let line = '';
    for (const word of safe(value).split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      // Palabra más ancha que la columna (p. ej. nombres de fuentes): se corta por caracteres
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > maxWidth && rest.length > 1) {
        let cut = rest.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth) cut -= 1;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    if (line) lines.push(line);
    return lines.length > 0 ? lines : [''];
  };

  const ensureSpace = (needed: number) => {
    if (y - needed >= BOTTOM) return;
    page = addFramedPage();
    y = PAGE_H - 60;
  };

  // Header band
  page.drawRectangle({ x: 24, y: PAGE_H - 100, width: PAGE_W - 48, height: 76, color: primaryBlue });
  text('XVI CLAGTEE 2026 — SANTIAGO, CHILE', LEFT, PAGE_H - 48, 11, fontBold, rgb(1, 1, 1));
  text('Congreso Latinoamericano de Generación y Transporte de Energía Eléctrica', LEFT, PAGE_H - 64, 9, fontRegular, rgb(0.85, 0.9, 0.98));
  text('Technical Co-Sponsorship: IEEE Chile Section & CAS Chapter', LEFT, PAGE_H - 78, 8, fontRegular, rgb(0.7, 0.8, 0.95));

  const certDate = new Date().toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const reference = `IEEE-CLAGTEE-${(meta?.paperId || 'DOC').replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString(36).toUpperCase()}`;

  text('CERTIFICADO DE REVISIÓN DE FORMATO IEEE XPLORE', LEFT, y, 15, fontBold, primaryBlue);
  y -= 16;
  text('Resultado de la revisión automática de especificaciones técnicas del PDF final (camera-ready)', LEFT, y, 9, fontRegular, textMuted);

  // Meta box
  y -= 30;
  const firstLine = (value: string, font: PDFFont, size: number, maxWidth: number) => {
    const lines = wrap(value, font, size, maxWidth);
    return lines.length > 1 ? `${lines[0]}…` : lines[0];
  };
  const metaLines: Array<{ value: string; font: PDFFont; size: number; color: ReturnType<typeof rgb> }> = [
    { value: `Título: ${meta?.paperTitle || result.fileName || 'Manuscrito'}`, font: fontRegular, size: 8.5, color: textDark },
    {
      value: `Autor(a): ${meta?.authorName || 'Autor remitente'}${meta?.authorEmail ? ` <${meta.authorEmail}>` : ''}`,
      font: fontRegular,
      size: 8.5,
      color: textDark,
    },
    { value: `Archivo analizado: ${result.fileName}`, font: fontMono, size: 8, color: textMuted },
    { value: `Referencia: ${reference}`, font: fontMono, size: 8, color: ieeeBlue },
  ];
  const metaHeight = 22 + metaLines.length * 15;
  page.drawRectangle({ x: LEFT, y: y - metaHeight + 12, width: RIGHT - LEFT, height: metaHeight, color: bgLight, borderColor: borderLight, borderWidth: 1 });
  text(`Artículo ID: ${meta?.paperId ? `#${meta.paperId}` : 'No especificado'}`, LEFT + 12, y, 9, fontBold, primaryBlue);
  text(`Fecha emisión: ${certDate}`, LEFT + 300, y, 8, fontRegular, textMuted);
  metaLines.forEach((line) => {
    y -= 15;
    text(firstLine(line.value, line.font, line.size, RIGHT - LEFT - 24), LEFT + 12, y, line.size, line.font, line.color);
  });

  // Verdict banner
  const verdict =
    result.overallStatus === 'PASS'
      ? {
          title: 'DICTAMEN: CONFORME — CUMPLE TODAS LAS VERIFICACIONES DE FORMATO',
          body: 'El PDF cumple las verificaciones automáticas de seguridad, fuentes, tamaño de página, extensión y aviso de copyright.',
          color: passGreen,
          fill: rgb(0.93, 0.98, 0.95),
        }
      : result.overallStatus === 'WARNING'
      ? {
          title: 'DICTAMEN: CONFORME CON OBSERVACIONES',
          body: 'El PDF puede procesarse, pero tiene observaciones (marcadas abajo) que deben revisarse y, en lo posible, corregirse antes de la entrega definitiva.',
          color: warnAmber,
          fill: rgb(1, 0.97, 0.9),
        }
      : {
          title: 'DICTAMEN: NO CONFORME — REQUIERE CORRECCIONES',
          body: 'El PDF tiene problemas que IEEE Xplore rechazaría. Corríjalos según las recomendaciones y vuelva a subir el archivo.',
          color: failRed,
          fill: rgb(1, 0.95, 0.95),
        };
  const verdictLines = wrap(verdict.body, fontRegular, 8.5, RIGHT - LEFT - 28);
  const verdictHeight = 30 + verdictLines.length * 11;
  y -= 30;
  page.drawRectangle({ x: LEFT, y: y - verdictHeight, width: RIGHT - LEFT, height: verdictHeight, color: verdict.fill, borderColor: verdict.color, borderWidth: 1.5 });
  text(verdict.title, LEFT + 14, y - 18, 11, fontBold, verdict.color);
  verdictLines.forEach((line, idx) => text(line, LEFT + 14, y - 32 - idx * 11, 8.5, fontRegular, textDark));
  y -= verdictHeight + 26;

  // Checks table: estado y detalle salen de cada verificación real del validador
  const COL_LABEL = LEFT + 10;
  const COL_STATUS = LEFT + 168;
  const COL_DETAIL = LEFT + 262;
  const LABEL_W = COL_STATUS - COL_LABEL - 10;
  const DETAIL_W = RIGHT - COL_DETAIL - 10;
  const STATUS_STYLE = {
    pass: { label: 'CONFORME', color: passGreen },
    warning: { label: 'OBSERVACIÓN', color: warnAmber },
    fail: { label: 'NO CONFORME', color: failRed },
  } as const;

  text('DESGLOSE DE VERIFICACIONES TÉCNICAS REALIZADAS', LEFT, y, 10, fontBold, primaryBlue);
  y -= 8;
  page.drawRectangle({ x: LEFT, y: y - 20, width: RIGHT - LEFT, height: 20, color: primaryBlue });
  text('CRITERIO TÉCNICO', COL_LABEL, y - 13, 8, fontBold, rgb(1, 1, 1));
  text('ESTADO', COL_STATUS, y - 13, 8, fontBold, rgb(1, 1, 1));
  text('DETALLE / RESULTADO', COL_DETAIL, y - 13, 8, fontBold, rgb(1, 1, 1));
  y -= 20;

  result.checks.forEach((check, index) => {
    const style = STATUS_STYLE[check.status];
    const labelLines = wrap(check.label, fontBold, 8, LABEL_W);
    const detailLines = wrap(check.summary, fontRegular, 7.5, DETAIL_W);
    const rowHeight = Math.max(labelLines.length, detailLines.length) * 10 + 12;
    ensureSpace(rowHeight);
    page.drawRectangle({
      x: LEFT,
      y: y - rowHeight,
      width: RIGHT - LEFT,
      height: rowHeight,
      color: index % 2 === 0 ? bgLight : rgb(1, 1, 1),
      borderColor: borderLight,
      borderWidth: 0.5,
    });
    labelLines.forEach((line, idx) => text(line, COL_LABEL, y - 14 - idx * 10, 8, fontBold, textDark));
    text(style.label, COL_STATUS, y - 14, 8, fontBold, style.color);
    detailLines.forEach((line, idx) => text(line, COL_DETAIL, y - 14 - idx * 10, 7.5, fontRegular, textMuted));
    y -= rowHeight;
  });

  // Fonts list
  const fontNames = result.fonts.map((f) => `${f.name} (${f.isEmbedded ? 'incrustada' : 'NO incrustada'})`).join(', ');
  const fontLines = wrap(fontNames || 'Sin fuentes detectadas', fontRegular, 7, RIGHT - LEFT);
  const shownFontLines = fontLines.length > 4 ? [...fontLines.slice(0, 3), `${fontLines[3]} …`] : fontLines;
  y -= 20;
  ensureSpace(14 + shownFontLines.length * 9);
  text(`FUENTES DETECTADAS EN EL DOCUMENTO (${result.totalFonts}):`, LEFT, y, 8.5, fontBold, primaryBlue);
  shownFontLines.forEach((line) => {
    y -= 10;
    text(line, LEFT, y, 7, fontRegular, textMuted);
  });

  // Recommendations
  if (result.recommendations.length > 0) {
    y -= 20;
    ensureSpace(24);
    text('CÓMO CORREGIR LAS OBSERVACIONES:', LEFT, y, 8.5, fontBold, primaryBlue);
    result.recommendations.forEach((recommendation) => {
      const lines = wrap(recommendation.replace(/`/g, ''), fontRegular, 7.5, RIGHT - LEFT - 12);
      ensureSpace(lines.length * 10 + 4);
      lines.forEach((line, idx) => {
        y -= 10;
        text(idx === 0 ? `• ${line}` : `  ${line}`, LEFT + 4, y, 7.5, fontRegular, textDark);
      });
      y -= 2;
    });
  }

  // Footer notice
  const footerLines = wrap(
    'Este certificado resume la revisión automática de formato realizada por la plataforma CLAGTEE 2026 sobre el archivo indicado. Al subir la versión final en el CMS, este certificado se adjunta automáticamente.',
    fontRegular,
    7.5,
    RIGHT - LEFT - 20
  );
  const footerHeight = 24 + footerLines.length * 11;
  y -= 18;
  ensureSpace(footerHeight);
  page.drawRectangle({ x: LEFT, y: y - footerHeight, width: RIGHT - LEFT, height: footerHeight, color: bgLight, borderColor: borderLight, borderWidth: 1 });
  footerLines.forEach((line, idx) => text(line, LEFT + 10, y - 13 - idx * 11, 7.5, fontRegular, textMuted));
  text('CLAGTEE 2026 Editorial Board • IEEE Chile Section • https://www.clagtee2026.org', LEFT + 10, y - 15 - footerLines.length * 11, 7.5, fontBold, ieeeBlue);

  return await pdfDoc.save();
}
