#!/usr/bin/env node
/**
 * Fails if corporate KPI helpers invent zeros for unavailable business metrics.
 */
import fs from 'node:fs';

const kpis = fs.readFileSync(new URL('../server/corporate/kpis.ts', import.meta.url), 'utf8');
if (!kpis.includes("value: null") || !kpis.includes("quality: 'UNAVAILABLE'")) {
  console.error('zero-demo-production-gate: KPI engine must emit null + UNAVAILABLE');
  process.exit(1);
}
if (/metricId:\s*'mrr'[\s\S]{0,200}value:\s*0/.test(kpis)) {
  console.error('zero-demo-production-gate: do not invent MRR zero');
  process.exit(1);
}
console.log('zero-demo-production-gate: corporate KPIs refuse invented zeros');
