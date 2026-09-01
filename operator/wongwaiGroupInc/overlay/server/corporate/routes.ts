import type { Express, NextFunction, Request, Response } from 'express';
import { requireOwnerAuth } from '../auth';
import { computeSeries, forecastNaive, pearson } from './analytics';
import { canExecute, listPolicies, runSafeAction } from './automation';
import { CORPORATE_ENV, SAFETY } from './env';
import {
  getEvent,
  getTrace,
  ingestCorporateEvent,
  listDlq,
  listEvents,
  MARKETMIND_EVENT_TYPES,
  verifyCorporateHmac,
  WORKQORA_EVENT_TYPES,
} from './eventBus';
import { getLastHealth, refreshCorporateHealth } from './healthEngine';
import {
  alertsToIncidents,
  buildDigitalTwin,
  ceoFocus,
  createResearchJob,
  morningBrief,
  runCommittee,
  unifiedSearch,
  upsertAlert,
} from './intelligence';
import { snapshotKpis } from './kpis';
import { getProduct, listProducts, registerProduct, seedProductRegistry } from './productRegistry';
import { applyHealthToGraph, getNode, impactFrom, listGraph, shortestPath } from './spiderWeb';
import { corporateStore } from './store';
import type { CorporateRole } from './types';

function roleFromRequest(_req: Request): CorporateRole {
  return 'OWNER';
}

function rawBody(req: Request): string {
  return JSON.stringify(req.body || {});
}

function requireProductHmac(product: 'WORKQORA' | 'MARKETMIND_AI') {
  return (req: Request, res: Response, next: NextFunction) => {
    const timestamp = String(req.headers['x-timestamp'] || '');
    const signature = String(req.headers['x-signature'] || '');
    const secret = product === 'WORKQORA' ? CORPORATE_ENV.workqoraOpsSecret : CORPORATE_ENV.marketMindOpsSecret;
    if (!secret) {
      return res.status(503).json({
        error: 'SERVICE_SECRET_UNCONFIGURED',
        message: `${product} ops secret is not set. Corporate ingestion refuses hardcoded fallbacks.`,
      });
    }
    if (!verifyCorporateHmac(secret, timestamp, rawBody(req), signature)) {
      return res.status(403).json({ error: 'INVALID_HMAC_OR_REPLAY' });
    }
    return next();
  };
}

export function mountCorporateRoutes(app: Express) {
  seedProductRegistry();

  app.get('/api/corporate/products', requireOwnerAuth, (_req, res) => {
    res.json({ products: listProducts() });
  });

  app.get('/api/corporate/products/:id', requireOwnerAuth, (req, res) => {
    const product = getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: 'PRODUCT_NOT_FOUND' });
    return res.json({ product });
  });

  app.post('/api/corporate/products', requireOwnerAuth, (req, res) => {
    const body = req.body || {};
    if (!body.productId || !body.name) {
      return res.status(400).json({ error: 'productId and name are required' });
    }
    const product = registerProduct({
      productId: String(body.productId),
      name: String(body.name),
      domain: body.domain || null,
      repository: body.repository || null,
      environment: body.environment || 'unknown',
      productionSha: null,
      mainSha: null,
      healthUrl: body.healthUrl || null,
      readyUrl: body.readyUrl || null,
      apiBaseUrl: body.apiBaseUrl || null,
      realtimeUrl: body.realtimeUrl || null,
      status: 'UNKNOWN',
      lastSeenAt: null,
      capabilities: body.capabilities || [],
      dependencies: body.dependencies || [],
      certificationStatus: 'UNCERTIFIED',
      classification: 'UNKNOWN',
      notes: body.notes || ['Registered via corporate API. Status starts UNKNOWN.'],
    });
    return res.status(201).json({ product });
  });

  app.get('/api/corporate/health', requireOwnerAuth, async (_req, res) => {
    const report = await refreshCorporateHealth();
    for (const product of report.products) {
      if (product.dependencyDegradation.length) {
        applyHealthToGraph(product.productId, product.dependencyDegradation);
        upsertAlert({
          priority: product.color === 'RED' ? 'P0' : 'P1',
          category: 'SYSTEM',
          title: `${product.productId} health ${product.color}`,
          summary: product.dependencyDegradation.join(', '),
          productId: product.productId,
          status: 'OPEN',
          fingerprint: `health:${product.productId}:${product.color}`,
        });
      }
    }
    alertsToIncidents();
    res.json(report);
  });

  app.get('/api/corporate/events', requireOwnerAuth, (_req, res) => {
    res.json({ events: listEvents(), dlq: listDlq() });
  });

  app.get('/api/corporate/events/:eventId', requireOwnerAuth, (req, res) => {
    const event = getEvent(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'EVENT_NOT_FOUND' });
    return res.json({ event });
  });

  app.post('/api/corporate/events/workqora', requireProductHmac('WORKQORA'), (req, res) => {
    const result = ingestCorporateEvent({
      body: req.body || {},
      productId: 'WORKQORA',
      sourceSystem: 'workqora',
      allowedTypes: WORKQORA_EVENT_TYPES,
      critical: true,
    });
    const status = result.outcome === 'ingested' ? 201 : result.outcome === 'duplicate' ? 200 : result.outcome === 'rejected' ? 400 : 202;
    return res.status(status).json(result);
  });

  app.post('/api/corporate/events/marketmind', requireProductHmac('MARKETMIND_AI'), (req, res) => {
    const result = ingestCorporateEvent({
      body: req.body || {},
      productId: 'MARKETMIND_AI',
      sourceSystem: 'marketmind',
      allowedTypes: MARKETMIND_EVENT_TYPES,
      critical: true,
    });
    const status = result.outcome === 'ingested' ? 201 : result.outcome === 'duplicate' ? 200 : result.outcome === 'rejected' ? 400 : 202;
    return res.status(status).json(result);
  });

  app.get('/api/corporate/spider-web', requireOwnerAuth, (req, res) => {
    res.json(listGraph({
      productId: typeof req.query.productId === 'string' ? req.query.productId : undefined,
      relationshipType: typeof req.query.relationshipType === 'string' ? req.query.relationshipType : undefined,
    }));
  });

  app.get('/api/corporate/spider-web/node/:id', requireOwnerAuth, (req, res) => {
    const node = getNode(req.params.id);
    if (!node) return res.status(404).json({ error: 'NODE_NOT_FOUND' });
    return res.json(node);
  });

  app.get('/api/corporate/spider-web/path', requireOwnerAuth, (req, res) => {
    const from = String(req.query.from || '');
    const to = String(req.query.to || '');
    if (!from || !to) return res.status(400).json({ error: 'from and to are required' });
    return res.json({ from, to, path: shortestPath(from, to) });
  });

  app.get('/api/corporate/spider-web/impact/:id', requireOwnerAuth, (req, res) => {
    res.json(impactFrom(req.params.id));
  });

  app.get('/api/corporate/twin', requireOwnerAuth, (_req, res) => {
    res.json(buildDigitalTwin());
  });

  app.get('/api/corporate/kpis', requireOwnerAuth, (_req, res) => {
    res.json({ kpis: snapshotKpis() });
  });

  app.post('/api/corporate/analytics/compute', requireOwnerAuth, (req, res) => {
    const points = Array.isArray(req.body?.points) ? req.body.points : [];
    const metricId = String(req.body?.metricId || 'adhoc');
    const result = computeSeries(metricId, String(req.body?.definition || metricId), String(req.body?.source || 'adhoc'), points);
    const forecast = forecastNaive(points.map((p: { v: number }) => Number(p.v)).filter((n: number) => Number.isFinite(n)));
    let correlation = null;
    if (Array.isArray(req.body?.compare) && req.body.compare.length === points.length) {
      correlation = pearson(
        points.map((p: { v: number }) => Number(p.v)),
        req.body.compare.map((v: number) => Number(v))
      );
    }
    res.json({ result, forecast, correlation });
  });

  app.get('/api/corporate/research', requireOwnerAuth, (_req, res) => {
    res.json({ jobs: Array.from(corporateStore().researchJobs.values()) });
  });

  app.post('/api/corporate/research', requireOwnerAuth, (req, res) => {
    const question = String(req.body?.question || '').trim();
    if (!question) return res.status(400).json({ error: 'question is required' });
    return res.status(201).json({ job: createResearchJob(question) });
  });

  app.post('/api/corporate/ai/committee', requireOwnerAuth, (req, res) => {
    const question = String(req.body?.question || '').trim();
    if (!question) return res.status(400).json({ error: 'question is required' });
    return res.json(runCommittee(question));
  });

  app.get('/api/corporate/brief/morning', requireOwnerAuth, (_req, res) => {
    res.json(morningBrief());
  });

  app.get('/api/corporate/focus', requireOwnerAuth, (_req, res) => {
    res.json(ceoFocus());
  });

  app.get('/api/corporate/automation/policy', requireOwnerAuth, (_req, res) => {
    res.json({ policies: listPolicies(), safety: { workqoraAutonomousMutation: false, marketMindLiveTradingEnabled: false } });
  });

  app.post('/api/corporate/automation/run', requireOwnerAuth, (req, res) => {
    const actionType = String(req.body?.actionType || '');
    const result = runSafeAction(actionType, roleFromRequest(req));
    res.status(result.status === 'COMPLETED' ? 200 : 403).json(result);
  });

  app.get('/api/corporate/automation/runs', requireOwnerAuth, (_req, res) => {
    res.json({ runs: corporateStore().automationRuns, dlq: listDlq() });
  });

  app.get('/api/corporate/alerts', requireOwnerAuth, (_req, res) => {
    res.json({ alerts: Array.from(corporateStore().alerts.values()) });
  });

  app.post('/api/corporate/alerts/:id/ack', requireOwnerAuth, (req, res) => {
    const alert = corporateStore().alerts.get(req.params.id);
    if (!alert) return res.status(404).json({ error: 'ALERT_NOT_FOUND' });
    alert.status = 'ACKNOWLEDGED';
    return res.json({ alert });
  });

  app.get('/api/corporate/incidents', requireOwnerAuth, (_req, res) => {
    res.json({ incidents: Array.from(corporateStore().incidents.values()) });
  });

  app.get('/api/corporate/search', requireOwnerAuth, (req, res) => {
    const query = String(req.query.q || '');
    res.json(unifiedSearch(query));
  });

  app.get('/api/corporate/trace/:traceId', requireOwnerAuth, (req, res) => {
    res.json(getTrace(req.params.traceId));
  });

  app.get('/api/corporate/audit', requireOwnerAuth, (_req, res) => {
    res.json({ audit: corporateStore().auditLog.slice(0, 200) });
  });

  app.get('/api/corporate/safety', requireOwnerAuth, (_req, res) => {
    res.json({
      WORKQORA_AUTONOMOUS_MUTATION: SAFETY.workqoraAutonomousMutation,
      MARKETMIND_LIVE_TRADING_ENABLED: SAFETY.marketMindLiveTradingEnabled,
      envObserved: {
        WORKQORA_AUTONOMOUS_MUTATION: process.env.WORKQORA_AUTONOMOUS_MUTATION || 'unset',
        MARKETMIND_LIVE_TRADING_ENABLED: process.env.MARKETMIND_LIVE_TRADING_ENABLED || 'unset',
      },
      prohibitedIfEnabled: {
        workqoraMutationStillGated: canExecute('workqora_operational_mutation', 'OWNER'),
        brokerStillGated: canExecute('broker_trade', 'OWNER'),
      },
    });
  });
}
