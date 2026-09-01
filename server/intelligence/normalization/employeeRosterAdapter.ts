/**
 * ScheduleDocument/EmployeeDocument adapter: converts a raw extraction of a
 * new-hire roster into canonical employee candidates. Deterministic, pure, and
 * evidence-preserving (the source line is retained on each candidate).
 *
 * Handles the messy real-world layout seen in NRO workbooks:
 *   "[note] First Last <BS#### | Pending> <Position...> <M/D/YYYY> <user> x x x ... (phone) email ..."
 */

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/;
const DATE_RE = /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/;
const EXTERNAL_ID_RE = /^BS\d{5,}$/i;

export interface EmployeeCandidate {
  firstName: string;
  lastName: string;
  fullName: string;
  employeeExternalId?: string;
  position?: string;
  hireDate?: string; // ISO yyyy-mm-dd
  phone?: string;
  email?: string;
  status: 'active' | 'pending';
  credentials: Record<string, string>;
  /** Raw source line (redact before logging). */
  sourceLine: string;
  /** Per-row extraction confidence in [0,1]. */
  confidence: number;
  warnings: string[];
}

export interface RosterExtractionResult {
  candidates: EmployeeCandidate[];
  skippedLines: number;
  overallConfidence: number;
}

function toIsoDate(raw: string): string | undefined {
  const m = raw.match(DATE_RE);
  if (!m) return undefined;
  let [, mm, dd, yy] = m;
  let year = Number(yy);
  if (year < 100) year += 2000;
  const month = String(Number(mm)).padStart(2, '0');
  const day = String(Number(dd)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizePhone(raw: string): string | undefined {
  const m = raw.match(PHONE_RE);
  if (!m) return undefined;
  const digits = m[0].replace(/\D/g, '');
  if (digits.length !== 10) return m[0].trim();
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function stripNicknames(tokens: string[]): string[] {
  // Remove quoted nickname tokens like "kavan" or "Alex".
  return tokens.filter((t) => !(t.startsWith('"') || t.endsWith('"')));
}

/** A line is a candidate roster row if it carries an email, phone, or BS id. */
function looksLikeRosterRow(line: string): boolean {
  return EMAIL_RE.test(line) || PHONE_RE.test(line) || /\bBS\d{5,}\b/i.test(line) || /\bpending\b/i.test(line);
}

function parseLine(line: string): EmployeeCandidate | null {
  const clean = line.replace(/\s+/g, ' ').trim();
  if (!looksLikeRosterRow(clean)) return null;

  const warnings: string[] = [];
  const tokens = clean.split(' ');

  // Locate the employee-id anchor (BS#### or the literal "Pending").
  let idIdx = tokens.findIndex((t) => EXTERNAL_ID_RE.test(t));
  let externalId: string | undefined;
  let status: 'active' | 'pending' = 'active';
  if (idIdx >= 0) {
    externalId = tokens[idIdx].toUpperCase();
  } else {
    idIdx = tokens.findIndex((t) => /^pending$/i.test(t));
    status = 'pending';
    if (idIdx < 0) {
      // No anchor at all; can't reliably parse a name boundary.
      warnings.push('no employee id / Pending anchor found');
    }
  }

  // Name = last two non-nickname tokens before the anchor.
  const beforeAnchor = idIdx > 0 ? tokens.slice(0, idIdx) : tokens.slice(0, 2);
  const nameTokens = stripNicknames(beforeAnchor).filter((t) => /[A-Za-z]/.test(t));
  const lastName = nameTokens.length ? nameTokens[nameTokens.length - 1] : '';
  const firstName = nameTokens.length >= 2 ? nameTokens[nameTokens.length - 2] : '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || nameTokens.join(' ') || 'Unknown';
  if (!firstName || !lastName) warnings.push('name parsed with low certainty');

  // Position = tokens after the anchor up to the hire date.
  let position: string | undefined;
  if (idIdx >= 0) {
    const after = tokens.slice(idIdx + 1);
    const dateAt = after.findIndex((t) => DATE_RE.test(t));
    const posTokens = (dateAt >= 0 ? after.slice(0, dateAt) : after.slice(0, 2)).filter((t) =>
      /[A-Za-z]/.test(t),
    );
    position = posTokens.join(' ') || undefined;
  }

  const hireDate = toIsoDate(clean);
  const phone = normalizePhone(clean);
  const emailMatch = clean.match(EMAIL_RE);
  const email = emailMatch ? emailMatch[0].toLowerCase() : undefined;

  // Credential flags: count of standalone "x" markers (NHO/SH/FHC/Alcohol cols).
  const xCount = (clean.match(/(?:^| )x(?= |$)/gi) || []).length;
  const credentials: Record<string, string> = {};
  if (xCount > 0) credentials.completedChecks = String(xCount);
  if (/\balcohol\b/i.test(clean) || /\bready\b/i.test(clean)) credentials.alcohol = 'noted';

  // Confidence: strongest when we have an email + a name + (id or position).
  let confidence = 0.4;
  if (email) confidence += 0.25;
  if (externalId) confidence += 0.2;
  if (firstName && lastName) confidence += 0.15;
  confidence = Math.min(1, confidence);

  return {
    firstName,
    lastName,
    fullName,
    employeeExternalId: status === 'pending' ? undefined : externalId,
    position,
    hireDate,
    phone,
    email,
    status,
    credentials,
    sourceLine: clean,
    confidence,
    warnings,
  };
}

/**
 * Parse an employee roster from extracted text. Header/section lines that don't
 * look like rows are skipped (counted, not deleted).
 */
export function extractEmployeeRoster(text: string): RosterExtractionResult {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const candidates: EmployeeCandidate[] = [];
  let skipped = 0;

  for (const line of lines) {
    const parsed = parseLine(line);
    if (parsed && (parsed.email || parsed.employeeExternalId || parsed.status === 'pending')) {
      candidates.push(parsed);
    } else {
      skipped++;
    }
  }

  const overallConfidence = candidates.length
    ? candidates.reduce((s, c) => s + c.confidence, 0) / candidates.length
    : 0;

  return { candidates, skippedLines: skipped, overallConfidence };
}
