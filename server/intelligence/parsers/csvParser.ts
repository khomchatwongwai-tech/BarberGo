/**
 * Pure CSV parser (RFC-4180-ish: quoted fields, escaped quotes, CRLF/LF). No
 * dependencies. Used for the native `delimited` strategy.
 */

import type { ExtractedTable, RawExtraction } from '../extraction/extractionContracts';

export function parseCsvText(input: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    // Ignore trailing empty line.
    if (row.length > 1 || row[0] !== '') rows.push(row);
    row = [];
  };

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      pushField();
    } else if (c === '\r') {
      // handled by \n
    } else if (c === '\n') {
      pushField();
      pushRow();
    } else {
      field += c;
    }
  }
  // Flush last field/row.
  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }
  return rows;
}

export function parseCsv(bytes: Uint8Array): RawExtraction {
  const text = new TextDecoder('utf-8').decode(bytes);
  const grid = parseCsvText(text);
  const headers = grid.length > 0 ? grid[0] : [];
  const table: ExtractedTable = {
    headers,
    rows: grid.slice(1),
    page: 0,
  };
  return {
    method: 'native_csv',
    text,
    pages: [{ page: 1, text }],
    tables: grid.length ? [table] : [],
    pageCount: 1,
    confidence: 1,
    needsOcr: false,
  };
}
