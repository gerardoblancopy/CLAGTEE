// Texto de las páginas de un PDF tal como lo vería un lector, con pdf.js.
//
// Los PDFs de Word, LibreOffice y LaTeX guardan el texto comprimido y codificado
// por fuente, así que buscar en los bytes crudos no encuentra casi nada. pdf.js
// se carga solo cuando se valida un PDF (build "legacy" para navegadores antiguos).

export async function extractPdfPagesText(data: Uint8Array, maxPages = 1): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
    const { default: workerSrc } = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  }

  // pdf.js se queda con el buffer que recibe: se le pasa una copia
  const pdf = await pdfjs.getDocument({ data: data.slice(), isEvalSupported: false }).promise;
  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= Math.min(maxPages, pdf.numPages); pageNumber += 1) {
      const content = await (await pdf.getPage(pageNumber)).getTextContent();
      pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
    }
    return pages.join('\n');
  } finally {
    await pdf.destroy();
  }
}
