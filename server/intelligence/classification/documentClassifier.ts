/**
 * Universal document classifier (deterministic-first).
 *
 * Rules run first and are cheap + explainable. When rules are uncertain, a later
 * PR escalates to the existing Gemini AI gateway (server/gemini.ts) — this module
 * exposes {@link classifyDocument} so that escalation can wrap it. `unknown` is a
 * valid result; unknown documents are retained, never discarded.
 */

import { type DocumentCategory } from '../ingestion/ingestionContracts';

export interface ClassificationResult {
  category: DocumentCategory;
  subtype?: string;
  confidence: number;
  method: 'rules' | 'ai' | 'fallback';
  /** Human-readable reasons for the review gate. */
  signals: string[];
}

interface Rule {
  category: DocumentCategory;
  subtype?: string;
  /** Keywords/regex that, when several match, indicate this category. */
  keywords: (string | RegExp)[];
}

const RULES: Rule[] = [
  {
    category: 'employee_record',
    subtype: 'new_hire_roster',
    keywords: [
      'employee id',
      'hire date',
      'position',
      'phone number',
      'email',
      'payroll',
      'onboarding',
      'nho',
      'new hire',
      /\bBS\d{5,}\b/i,
    ],
  },
  {
    category: 'schedule',
    subtype: 'weekly_shift_schedule',
    keywords: ['schedule', 'shift', 'am', 'pm', 'monday', 'tuesday', 'wednesday', 'clock in', 'clock out'],
  },
  {
    category: 'certification',
    keywords: ['food handler', 'alcohol permit', 'servsafe', 'certificate number', 'expiration date', 'issued'],
  },
  {
    category: 'invoice',
    keywords: ['invoice', 'invoice #', 'bill to', 'subtotal', 'amount due', 'unit price', 'qty', 'vendor'],
  },
  {
    category: 'inventory',
    keywords: ['inventory', 'on hand', 'sku', 'unit cost', 'par level', 'count sheet', 'waste'],
  },
  {
    category: 'purchase_order',
    keywords: ['purchase order', 'po number', 'ship to', 'order date'],
  },
  {
    category: 'receipt',
    keywords: ['receipt', 'total paid', 'change due', 'cashier'],
  },
];

function matchCount(haystack: string, keywords: (string | RegExp)[]): { hits: number; matched: string[] } {
  let hits = 0;
  const matched: string[] = [];
  for (const kw of keywords) {
    if (typeof kw === 'string') {
      if (haystack.includes(kw)) {
        hits++;
        matched.push(kw);
      }
    } else if (kw.test(haystack)) {
      hits++;
      matched.push(kw.source);
    }
  }
  return { hits, matched };
}

/**
 * Classify a document from its extracted text. Returns the highest-scoring
 * category, or `unknown` when nothing matches strongly.
 */
export function classifyDocument(text: string): ClassificationResult {
  const hay = text.toLowerCase();
  let best: { rule: Rule; hits: number; matched: string[] } | null = null;

  for (const rule of RULES) {
    const { hits, matched } = matchCount(hay, rule.keywords);
    if (hits > 0 && (!best || hits > best.hits)) best = { rule, hits, matched };
  }

  if (!best || best.hits < 2) {
    return {
      category: 'unknown',
      confidence: best ? Math.min(0.4, best.hits * 0.2) : 0,
      method: 'rules',
      signals: best ? [`weak match: ${best.matched.join(', ')}`] : ['no deterministic signals'],
    };
  }

  // Confidence scales with number of matched signals, capped.
  const confidence = Math.min(0.95, 0.4 + best.hits * 0.12);
  return {
    category: best.rule.category,
    subtype: best.rule.subtype,
    confidence,
    method: 'rules',
    signals: best.matched.map((m) => `matched "${m}"`),
  };
}
