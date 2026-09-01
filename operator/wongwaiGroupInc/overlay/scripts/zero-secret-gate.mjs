#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'server/corporate');
const SKIP = new Set(['node_modules', 'dist', '.git', 'bun.lock', 'pnpm-lock.yaml']);
const PATTERNS = [
  /sk_live_[A-Za-z0-9]+/,
  /sk_test_[A-Za-z0-9]{8,}/,
  /whsec_[A-Za-z0-9]+/,
  /BEGIN (RSA |OPENSSH )?PRIVATE KEY/,
  /AIza[0-9A-Za-z\-_]{20,}/,
  /SERVICE_ROLE_KEY\s*=\s*['\"]eyJ/,
];

const hits = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|mjs|json|md|yml|yaml|env)$/.test(entry.name) && entry.name !== '.env.example') {
      const text = fs.readFileSync(full, 'utf8');
      for (const pattern of PATTERNS) {
        if (pattern.test(text)) hits.push(`${full} matches ${pattern}`);
      }
    }
  }
}

walk(ROOT);
if (hits.length) {
  console.error('zero-secret-gate failed:\n' + hits.join('\n'));
  process.exit(1);
}
console.log('zero-secret-gate: no live secret material detected');
