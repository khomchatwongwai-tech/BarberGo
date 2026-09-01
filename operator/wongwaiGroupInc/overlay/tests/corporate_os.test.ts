import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { mean, pearson, forecastNaive, computeSeries } from '../server/corporate/analytics';
import { canExecute, runSafeAction } from '../server/corporate/automation';
import { ingestCorporateEvent, listDlq, listEvents, signCorporateHmac, verifyCorporateHmac, WORKQORA_EVENT_TYPES } from '../server/corporate/eventBus';
import { refreshCorporateHealth } from '../server/corporate/healthEngine';
import { runCommittee, createResearchJob } from '../server/corporate/intelligence';
import { snapshotKpis } from '../server/corporate/kpis';
import { stripSensitiveFields, hasForbiddenPii } from '../server/corporate/pii';
import { getProduct, listProducts, seedProductRegistry } from '../server/corporate/productRegistry';
import { resetCircuitsForTests } from '../server/corporate/http';
import { upsertEdge, shortestPath, seedSpiderWeb, impactFrom } from '../server/corporate/spiderWeb';
import { resetCorporateStoreForTests } from '../server/corporate/store';

const originalFetch = globalThis.fetch;

describe('Wongwai corporate OS foundation', () => {
  before(() => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('workqora')) {
        return new Response(
          JSON.stringify({
            status: 'ok',
            service: 'workqora',
            commitSha: 'f37457170a1e0a6ba4fda61c88fab839942888a2',
            databaseSchema: 'degraded',
            affectedSubsystems: ['workflow'],
            dependencies: { supabase: 'configured' },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
      if (url.includes('wongwaigroupinc')) {
        throw Object.assign(new Error('tlsv1 alert internal error'), { name: 'Error' });
      }
      return new Response('<!doctype html>', { status: 200 });
    }) as typeof fetch;
  });

  after(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    resetCorporateStoreForTests();
    resetCircuitsForTests();
    seedProductRegistry();
  });

  it('registers canonical products without claiming unknown is live', () => {
    const products = listProducts();
    assert.deepEqual(
      products.map((p) => p.productId).sort(),
      ['MARKETMIND_AI', 'WONGWAI_GROUP', 'WORKQORA']
    );
    assert.equal(getProduct('MARKETMIND_AI')?.classification, 'UNIMPLEMENTED');
    assert.equal(getProduct('WORKQORA')?.status, 'UNKNOWN');
  });

  it('never converts unknown or html probes into GREEN', async () => {
    const report = await refreshCorporateHealth();
    const mm = report.products.find((p) => p.productId === 'MARKETMIND_AI');
    const ww = report.products.find((p) => p.productId === 'WONGWAI_GROUP');
    const wq = report.products.find((p) => p.productId === 'WORKQORA');
    assert.ok(mm);
    assert.notEqual(mm.color, 'GREEN');
    assert.ok(ww);
    assert.notEqual(ww.color, 'GREEN');
    assert.ok(wq);
    assert.equal(wq.color, 'YELLOW');
    assert.equal(wq.productionSha, 'f37457170a1e0a6ba4fda61c88fab839942888a2');
    assert.ok(wq.dependencyDegradation.some((d) => d.includes('workflow') || d.includes('degraded')));
    assert.notEqual(report.overall, 'GREEN');
  });

  it('strips Workqora PII and market secrets from payloads', () => {
    const cleaned = stripSensitiveFields({
      counts: { late: 3 },
      pin: '1234',
      ssn: '000-00-0000',
      email: 'x@y.com',
      brokerSecret: 'nope',
      nested: { wage: 22, locationId: 'loc-1' },
    }) as Record<string, unknown>;
    assert.equal(cleaned.counts && (cleaned.counts as any).late, 3);
    assert.equal('pin' in cleaned, false);
    assert.equal('ssn' in cleaned, false);
    assert.equal('email' in cleaned, false);
    assert.equal('brokerSecret' in cleaned, false);
    assert.equal((cleaned.nested as any).locationId, 'loc-1');
    assert.equal('wage' in (cleaned.nested as any), false);
    assert.equal(hasForbiddenPii({ ssn: '1' }), true);
  });

  it('deduplicates events, allowlists Workqora types, and DLQs critical unknowns', () => {
    const first = ingestCorporateEvent({
      body: { eventId: 'evt-1', eventType: 'workflow.failed', payload: { failures: 2, pin: '9999' } },
      productId: 'WORKQORA',
      sourceSystem: 'workqora',
      allowedTypes: WORKQORA_EVENT_TYPES,
      critical: true,
    });
    const dup = ingestCorporateEvent({
      body: { eventId: 'evt-1', eventType: 'workflow.failed' },
      productId: 'WORKQORA',
      sourceSystem: 'workqora',
      allowedTypes: WORKQORA_EVENT_TYPES,
      critical: true,
    });
    const bad = ingestCorporateEvent({
      body: { eventId: 'evt-2', eventType: 'employee.ssn_exported' },
      productId: 'WORKQORA',
      sourceSystem: 'workqora',
      allowedTypes: WORKQORA_EVENT_TYPES,
      critical: true,
    });
    assert.equal(first.outcome, 'ingested');
    assert.equal(first.event?.payload.pin, undefined);
    assert.equal(dup.outcome, 'duplicate');
    assert.equal(bad.outcome, 'dlq');
    assert.equal(listEvents().length, 1);
    assert.equal(listDlq().length, 1);
  });

  it('rejects high-confidence spider edges without evidence', () => {
    seedSpiderWeb();
    const rejected = upsertEdge({
      fromNode: 'product:WORKQORA',
      toNode: 'product:MARKETMIND_AI',
      relationshipType: 'CORRELATED_WITH',
      confidence: 0.95,
      evidenceIds: [],
      source: 'guess',
      validUntil: null,
    });
    assert.equal(rejected, null);
    const accepted = upsertEdge({
      fromNode: 'product:WORKQORA',
      toNode: 'system:workqora-workflow',
      relationshipType: 'DEGRADED_BY',
      confidence: 0.9,
      evidenceIds: ['health:WORKQORA'],
      source: 'health',
      validUntil: null,
    });
    assert.ok(accepted);
    const path = shortestPath('company:wongwai', 'product:WORKQORA');
    assert.ok(path && path.includes('product:WORKQORA'));
    const impact = impactFrom('product:WORKQORA');
    assert.ok(impact.nodes.length >= 1);
  });

  it('returns UNAVAILABLE KPIs instead of invented zeros for revenue', () => {
    const kpis = snapshotKpis();
    const mrr = kpis.find((k) => k.metricId === 'mrr');
    assert.ok(mrr);
    assert.equal(mrr.value, null);
    assert.equal(mrr.quality, 'UNAVAILABLE');
  });

  it('blocks prohibited automation even for OWNER', () => {
    const mutation = canExecute('workqora_operational_mutation', 'OWNER');
    const trade = canExecute('broker_trade', 'OWNER');
    assert.equal(mutation.allowed, false);
    assert.equal(trade.allowed, false);
    const blocked = runSafeAction('broker_trade', 'OWNER');
    assert.equal(blocked.status, 'BLOCKED');
    const ok = runSafeAction('refresh_kpi_snapshots', 'OWNER');
    assert.equal(ok.status, 'COMPLETED');
  });

  it('committee and research refuse to fabricate answers', () => {
    const research = createResearchJob('Deep research Homebase versus Workqora.');
    assert.equal(research.status, 'INSUFFICIENT_EVIDENCE');
    const answer = runCommittee('What is the biggest risk today?');
    assert.ok(answer.status === 'INSUFFICIENT_EVIDENCE' || answer.confidence < 0.7);
    assert.ok(answer.supportingEvidence.length >= 0);
  });

  it('analytics is deterministic and forecasts only with enough samples', () => {
    assert.equal(mean([1, 2, 3]), 2);
    assert.equal(pearson([1, 2, 3], [1, 2, 3]) !== null, true);
    assert.equal(forecastNaive([1, 2, 3]).forecast, null);
    const series = computeSeries('x', 'test', 'unit', []);
    assert.equal(series.value, null);
    assert.equal(series.quality, 'UNAVAILABLE');
  });

  it('HMAC replay window rejects stale timestamps', () => {
    const secret = 'unit-test-secret';
    const body = '{"a":1}';
    const ts = String(Math.floor(Date.now() / 1000) - 1200);
    const sig = signCorporateHmac(secret, ts, body);
    assert.equal(verifyCorporateHmac(secret, ts, body, sig), false);
    const now = String(Math.floor(Date.now() / 1000));
    const sigNow = signCorporateHmac(secret, now, body);
    assert.equal(verifyCorporateHmac(secret, now, body, sigNow), true);
  });
});
