/**
 * Native PDF text extraction using pdfjs-dist. Reconstructs visual rows by
 * grouping text items with similar Y positions, which recovers table structure
 * from spreadsheet-style PDFs without any OCR.
 *
 * If the text layer is empty/negligible, {@link parsePdf} reports needsOcr=true
 * so the router can escalate to OCR (Tesseract → Google) in a later PR.
 */

import type { ExtractedPage, ExtractedTable, RawExtraction } from '../extraction/extractionContracts';

interface PdfTextItem {
  str: string;
  x: number;
  y: number;
}

/** Group items on a page into visual rows and join left-to-right. */
function itemsToRows(items: PdfTextItem[], yTolerance = 3): string[] {
  const buckets = new Map<number, PdfTextItem[]>();
  for (const it of items) {
    if (!it.str.trim()) continue;
    // Snap Y to a tolerance so items on the same visual line group together.
    const key = Math.round(it.y / yTolerance) * yTolerance;
    const list = buckets.get(key) ?? [];
    list.push(it);
    buckets.set(key, list);
  }
  const ys = [...buckets.keys()].sort((a, b) => b - a); // top-to-bottom
  const rows: string[] = [];
  for (const y of ys) {
    const line = buckets
      .get(y)!
      .sort((a, b) => a.x - b.x)
      .map((i) => i.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (line) rows.push(line);
  }
  return rows;
}

export async function parsePdf(bytes: Uint8Array): Promise<RawExtraction> {
  // Dynamic import keeps this compatible with both the tsx (ESM) dev runtime
  // and the esbuild CJS production bundle (pdfjs v6 is ESM-only).
  const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // pdfjs transfers ownership of the ArrayBuffer and detaches it, which would
  // corrupt the caller's bytes. Hand it a private copy so this stays pure.
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(bytes),
    isEvalSupported: false,
    useSystemFonts: true,
    // Silence noisy font warnings in the server log.
    verbosity: 0,
  }).promise;

  const pages: ExtractedPage[] = [];
  const tables: ExtractedTable[] = [];
  let combined = '';

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items: PdfTextItem[] = content.items
      .filter((i: any) => typeof i.str === 'string')
      .map((i: any) => ({ str: i.str, x: i.transform[4], y: i.transform[5] }));
    const rows = itemsToRows(items);
    const pageText = rows.join('\n');
    pages.push({ page: p, text: pageText });
    combined += (combined ? '\n' : '') + pageText;
    if (rows.length > 1) {
      tables.push({ headers: [], rows: rows.map((r) => [r]), page: p - 1 });
    }
  }

  const text = combined.trim();
  const needsOcr = text.replace(/\s/g, '').length < 20;

  return {
    method: 'native_pdf_text',
    text,
    pages,
    tables,
    pageCount: doc.numPages,
    confidence: needsOcr ? 0.1 : 0.9,
    needsOcr,
  };
}
