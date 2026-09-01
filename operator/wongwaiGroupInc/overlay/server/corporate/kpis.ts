import { getLastHealth } from './healthEngine';
import { listEvents } from './eventBus';
import { corporateStore } from './store';
import type { KpiRecord } from './types';

function unavailable(metricId: string, definition: string, source: string): KpiRecord {
  return {
    metricId,
    definition,
    source,
    queryPeriod: 'current',
    calculationVersion: 'kpi-1.0.0',
    freshness: null,
    completeness: 'UNAVAILABLE',
    value: null,
    quality: 'UNAVAILABLE',
  };
}

export function snapshotKpis(): KpiRecord[] {
  const health = getLastHealth();
  const events = listEvents();
  const records: KpiRecord[] = [];

  const productUptime = health
    ? {
        metricId: 'product_uptime_status',
        definition: 'Latest corporate health color per product, not a fabricated percentage.',
        source: 'corporate_health_engine',
        queryPeriod: 'current',
        calculationVersion: 'kpi-1.0.0',
        freshness: health.generatedAt,
        completeness: (health.quality === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'PARTIAL') as KpiRecord['completeness'],
        value: health.overall,
        quality: health.quality,
      }
    : unavailable('product_uptime_status', 'Latest corporate health color.', 'corporate_health_engine');
  records.push(productUptime);

  records.push({
    metricId: 'system_incidents',
    definition: 'Count of open corporate incidents.',
    source: 'corporate_incidents',
    queryPeriod: 'current',
    calculationVersion: 'kpi-1.0.0',
    freshness: new Date().toISOString(),
    completeness: 'PARTIAL',
    value: Array.from(corporateStore().incidents.values()).filter((i) => i.status !== 'RESOLVED').length,
    quality: 'PARTIAL',
  });

  records.push({
    metricId: 'ingested_events',
    definition: 'Count of corporate events retained in-memory.',
    source: 'corporate_event_bus',
    queryPeriod: 'process_lifetime',
    calculationVersion: 'kpi-1.0.0',
    freshness: events[0]?.receivedAt || null,
    completeness: events.length ? 'PARTIAL' : 'UNAVAILABLE',
    value: events.length,
    quality: events.length ? 'PARTIAL' : 'UNAVAILABLE',
  });

  const moneyMetrics = [
    'revenue',
    'mrr',
    'arr',
    'trial_conversion',
    'churn',
    'ai_costs',
    'infrastructure_costs',
    'active_customers',
    'locations',
  ];
  for (const metricId of moneyMetrics) {
    records.push(unavailable(metricId, `${metricId} requires an authorized product connector.`, metricId === 'locations' ? 'workqora' : 'billing_or_product'));
  }

  records.push({
    metricId: 'workqora_autonomous_mutation',
    definition: 'Safety gate. Must remain false until Workqora production certification.',
    source: 'env',
    queryPeriod: 'current',
    calculationVersion: 'kpi-1.0.0',
    freshness: new Date().toISOString(),
    completeness: 'COMPLETE',
    value: 0,
    quality: 'GOOD',
    unit: 'boolean_false',
  });

  records.push({
    metricId: 'marketmind_live_trading_enabled',
    definition: 'Safety gate. Must remain false until live-broker certification.',
    source: 'env',
    queryPeriod: 'current',
    calculationVersion: 'kpi-1.0.0',
    freshness: new Date().toISOString(),
    completeness: 'COMPLETE',
    value: 0,
    quality: 'GOOD',
    unit: 'boolean_false',
  });

  const { kpis } = corporateStore();
  kpis.length = 0;
  kpis.push(...records);
  return records;
}
