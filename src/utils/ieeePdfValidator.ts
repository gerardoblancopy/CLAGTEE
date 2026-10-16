import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef } from 'pdf-lib';

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

  // Copyright notice text scan in raw bytes
  const rawBytesStr = new TextDecoder('latin1').decode(new Uint8Array(buffer.slice(0, Math.min(buffer.byteLength, 150000))));
  const hasCopyrightNotice =
    /979-8-3195-1521-6/i.test(rawBytesStr) ||
    /979-8-3195/i.test(rawBytesStr) ||
    /IEEEpubid/i.test(rawBytesStr) ||
    /copyright.*2026.*IEEE/i.test(rawBytesStr) ||
    /©.*2026.*IEEE/i.test(rawBytesStr);

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
