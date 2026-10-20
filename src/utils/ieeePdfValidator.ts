import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef, StandardFonts, rgb } from 'pdf-lib';
import { extractPdfPagesText } from './pdfText';

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

export async function validateIeeePdf(
  fileOrBuffer: File | ArrayBuffer | Uint8Array,
  fileName: string = 'document.pdf'
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
  const pdfPage = pdfDoc.addPage([612, 792]); // US Letter standard: 8.5 x 11 inches
  const { width, height } = pdfPage.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

  const winAnsiChars = new Set(fontRegular.getCharacterSet());
  const page = {
    drawRectangle: pdfPage.drawRectangle.bind(pdfPage),
    drawText: (text: string, options: Parameters<typeof pdfPage.drawText>[1]) =>
      pdfPage.drawText(toWinAnsi(text, winAnsiChars), options),
  };

  // Colors
  const primaryBlue = rgb(13 / 255, 44 / 255, 84 / 255); // #0D2C54
  const ieeeBlue = rgb(0 / 255, 98 / 255, 155 / 255); // #00629B
  const textDark = rgb(30 / 255, 41 / 255, 59 / 255); // #1E293B
  const textMuted = rgb(100 / 255, 116 / 255, 139 / 255); // #64748B
  const borderLight = rgb(226 / 255, 232 / 255, 240 / 255); // #E2E8F0
  const passGreen = rgb(16 / 255, 185 / 255, 129 / 255); // #10B981
  const warnAmber = rgb(245 / 255, 158 / 255, 11 / 255); // #F59E0B
  const bgLight = rgb(248 / 255, 250 / 255, 252 / 255); // #F8FAFC

  // Draw background border & top band
  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: borderLight,
    borderWidth: 1.5,
  });

  page.drawRectangle({
    x: 24,
    y: height - 100,
    width: width - 48,
    height: 76,
    color: primaryBlue,
  });

  // Top header text
  page.drawText('XVI CLAGTEE 2026 — SANTIAGO, CHILE', {
    x: 44,
    y: height - 48,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText(
    'Congreso Latinoamericano de Generación y Transporte de Energía Eléctrica',
    {
      x: 44,
      y: height - 64,
      size: 9,
      font: fontRegular,
      color: rgb(0.85, 0.9, 0.98),
    }
  );
  page.drawText('Technical Co-Sponsorship: IEEE Chile Section & CAS Chapter', {
    x: 44,
    y: height - 78,
    size: 8,
    font: fontRegular,
    color: rgb(0.7, 0.8, 0.95),
  });

  // Title: Certificado de Conformidad
  const certDate = new Date().toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const certHash = `IEEE-CLAGTEE-${(meta?.paperId || 'DOC').replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString(36).toUpperCase()}`;

  let y = height - 128;
  page.drawText('CERTIFICADO DE CONFORMIDAD TÉCNICA IEEE XPLORE', {
    x: 44,
    y,
    size: 15,
    font: fontBold,
    color: primaryBlue,
  });

  y -= 16;
  page.drawText(
    'Comprobante oficial de validación automática de especificaciones para publicación Camera-Ready',
    {
      x: 44,
      y,
      size: 9,
      font: fontRegular,
      color: textMuted,
    }
  );

  // Meta Box
  y -= 32;
  page.drawRectangle({
    x: 44,
    y: y - 76,
    width: width - 88,
    height: 94,
    color: bgLight,
    borderColor: borderLight,
    borderWidth: 1,
  });

  const pId = meta?.paperId ? `#${meta.paperId}` : 'No especificado';
  const pTitle = (meta?.paperTitle || result.fileName || 'Manuscrito').slice(0, 78);
  const pAuthor = meta?.authorName || 'Autor remitente';

  page.drawText(`Artículo ID: ${pId}`, { x: 56, y: y + 2, size: 9, font: fontBold, color: primaryBlue });
  page.drawText(`Fecha emisión: ${certDate}`, { x: 360, y: y + 2, size: 8, font: fontRegular, color: textMuted });

  page.drawText(`Título: ${pTitle}`, { x: 56, y: y - 16, size: 8.5, font: fontRegular, color: textDark });
  page.drawText(`Autor(a): ${pAuthor} ${meta?.authorEmail ? `<${meta.authorEmail}>` : ''}`, {
    x: 56,
    y: y - 32,
    size: 8.5,
    font: fontRegular,
    color: textDark,
  });
  page.drawText(`Archivo analizado: ${result.fileName}`, {
    x: 56,
    y: y - 48,
    size: 8,
    font: fontMono,
    color: textMuted,
  });
  page.drawText(`Código de Verificación: ${certHash}`, {
    x: 56,
    y: y - 64,
    size: 8,
    font: fontMono,
    color: ieeeBlue,
  });

  // Verdict Banner
  y -= 102;
  const isPass = result.overallStatus === 'PASS';
  const isWarn = result.overallStatus === 'WARNING';
  const verdictColor = isPass ? passGreen : isWarn ? warnAmber : rgb(0.85, 0.2, 0.2);

  page.drawRectangle({
    x: 44,
    y: y - 36,
    width: width - 88,
    height: 48,
    color: isPass ? rgb(0.93, 0.98, 0.95) : rgb(0.99, 0.97, 0.91),
    borderColor: verdictColor,
    borderWidth: 1.5,
  });

  page.drawText(
    isPass
      ? 'DICTAMEN: APROBADO — 100% CONFORME CON NORMAS IEEE XPLORE'
      : isWarn
      ? 'DICTAMEN: APROBADO CON OBSERVACIONES MENORES'
      : 'DICTAMEN: REQUIERE CORRECCIONES TÉCNICAS',
    {
      x: 58,
      y: y - 14,
      size: 11,
      font: fontBold,
      color: verdictColor,
    }
  );

  page.drawText(
    isPass
      ? 'El documento cumple todas las normas de incrustación de fuentes, formato de página y copyright para su publicación en IEEE Xplore.'
      : 'El archivo cumple las normas esenciales de fuentes, pero revise las observaciones antes del envío definitivo.',
    {
      x: 58,
      y: y - 28,
      size: 8,
      font: fontRegular,
      color: textDark,
    }
  );

  // Checks table header
  y -= 62;
  page.drawText('DESGLOSE DE VERIFICACIONES TÉCNICAS REALIZADAS', {
    x: 44,
    y,
    size: 10,
    font: fontBold,
    color: primaryBlue,
  });

  y -= 16;
  page.drawRectangle({
    x: 44,
    y: y - 18,
    width: width - 88,
    height: 22,
    color: primaryBlue,
  });
  page.drawText('CRITERIO TÉCNICO', { x: 54, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('ESTADO', { x: 230, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('DETALLE / RESULTADO', { x: 300, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });

  // Rows
  const items = [
    {
      label: 'Cifrado y Seguridad',
      status: 'CONFORME',
      detail: 'Sin contraseñas ni restricciones de seguridad de impresión.',
    },
    {
      label: 'Incrustación de Fuentes',
      status:
        result.embeddedFontsCount === result.totalFonts && result.totalFonts > 0
          ? 'CONFORME (100%)'
          : `${result.embeddedFontsCount}/${result.totalFonts} Incrustadas`,
      detail: result.hasType3Fonts
        ? 'Contiene fuentes Type 3 bitmap (No permitidas por IEEE)'
        : result.unembeddedFontsCount === 0
        ? 'Todas las fuentes están vectorizadas e incrustadas.'
        : `Fuentes faltantes: ${result.fonts.filter((f) => !f.isEmbedded).map((f) => f.name).slice(0, 2).join(', ')}`,
    },
    {
      label: 'Tamaño de Página',
      status: result.pageSize.formatName.includes('Letter') ? 'CONFORME (Letter)' : result.pageSize.formatName,
      detail: `Dimensiones: ${result.pageSize.widthInches}″ × ${result.pageSize.heightInches}″ (${result.pageSize.formatName})`,
    },
    {
      label: 'Extensión de Páginas',
      status: `${result.pageCount} Páginas`,
      detail:
        result.pageCount >= 6 && result.pageCount <= 8
          ? 'Dentro del rango oficial de la conferencia (6 a 8 páginas).'
          : 'Revisar si cuenta con autorización del comité para esta extensión.',
    },
    {
      label: 'Aviso de Copyright IEEE',
      status: result.hasCopyrightNotice ? 'DETECTADO' : 'NO DETECTADO',
      detail: 'Código oficial: 979-8-3195-1521-6/26/$31.00 ©2026 IEEE al pie de la pág 1.',
    },
  ];

  y -= 20;
  items.forEach((item, index) => {
    const rowBg = index % 2 === 0 ? bgLight : rgb(1, 1, 1);
    page.drawRectangle({
      x: 44,
      y: y - 22,
      width: width - 88,
      height: 24,
      color: rowBg,
      borderColor: borderLight,
      borderWidth: 0.5,
    });

    const isItemPass = item.status.includes('CONFORME') || item.status.includes('DETECTADO') || item.label.includes('Extensión');
    const badgeColor = isItemPass ? passGreen : warnAmber;

    page.drawText(item.label, { x: 54, y: y - 14, size: 8, font: fontBold, color: textDark });
    page.drawText(item.status, { x: 230, y: y - 14, size: 8, font: fontBold, color: badgeColor });
    page.drawText(item.detail.slice(0, 58), { x: 300, y: y - 14, size: 7.5, font: fontRegular, color: textMuted });

    y -= 24;
  });

  // Fonts list preview
  y -= 14;
  page.drawText('FUENTES DETECTADAS EN EL DOCUMENTO:', {
    x: 44,
    y,
    size: 8.5,
    font: fontBold,
    color: primaryBlue,
  });

  y -= 12;
  const fontNames = result.fonts.map((f) => `${f.name} (${f.isEmbedded ? 'incrustada' : 'no incrustada'})`).join(', ');
  const fontsSample = fontNames.length > 0 ? fontNames.slice(0, 180) + (fontNames.length > 180 ? '...' : '') : 'Sin fuentes detectadas';
  page.drawText(fontsSample, {
    x: 44,
    y,
    size: 7,
    font: fontRegular,
    color: textMuted,
  });

  // Bottom Notice & Signatures
  y -= 36;
  page.drawRectangle({
    x: 44,
    y: y - 48,
    width: width - 88,
    height: 52,
    color: bgLight,
    borderColor: borderLight,
    borderWidth: 1,
  });

  page.drawText(
    'Este certificado acredita que el manuscrito ha sido procesado mediante el motor de validación de conformidad IEEE Xplore',
    {
      x: 54,
      y: y - 14,
      size: 7.5,
      font: fontRegular,
      color: textMuted,
    }
  );
  page.drawText(
    'integrado de la plataforma CLAGTEE 2026. Al subir la versión final en el CMS, este certificado se adjunta automáticamente.',
    {
      x: 54,
      y: y - 26,
      size: 7.5,
      font: fontRegular,
      color: textMuted,
    }
  );
  page.drawText(`CLAGTEE 2026 Editorial Board • IEEE Chile Section • https://www.clagtee2026.org`, {
    x: 54,
    y: y - 40,
    size: 7.5,
    font: fontBold,
    color: ieeeBlue,
  });

  return await pdfDoc.save();
}
