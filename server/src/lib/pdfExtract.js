// Lazy-load pdfjs-dist inside the function — importing at module-load crashes on
// Vercel serverless because pdfjs expects browser globals (DOMMatrix) that only exist
// when @napi-rs/canvas polyfill is present. Importing lazily means the rest of the
// server boots fine even if the PDF extractor can't initialize.
export async function extractPdfText(buffer) {
  try {
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const data = new Uint8Array(buffer);
    const doc = await getDocument({ data, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;
    const parts = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      parts.push(content.items.map(item => item.str).join(' '));
    }
    return parts.join('\n');
  } catch (err) {
    throw new Error(`PDF extraction failed: ${err.message}. (pdfjs-dist may not work on serverless without canvas polyfill.)`);
  }
}
