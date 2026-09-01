import { CORPORATE_ENV } from './env';
import { corporateStore } from './store';
import type { CorporateProduct, ProductId } from './types';

const WORKQORA_CAPABILITIES = [
  { id: 'organizations', sourceOfTruth: true },
  { id: 'locations', sourceOfTruth: true },
  { id: 'employees', sourceOfTruth: true },
  { id: 'schedules', sourceOfTruth: true },
  { id: 'attendance', sourceOfTruth: true },
  { id: 'pto', sourceOfTruth: true },
  { id: 'shift_swaps', sourceOfTruth: true },
  { id: 'hr', sourceOfTruth: true },
  { id: 'certifications', sourceOfTruth: true },
  { id: 'training', sourceOfTruth: true },
  { id: 'inventory', sourceOfTruth: true },
  { id: 'waste', sourceOfTruth: true },
  { id: 'equipment', sourceOfTruth: true },
  { id: 'crm', sourceOfTruth: true },
  { id: 'workflow', sourceOfTruth: true },
  { id: 'automation', sourceOfTruth: true },
  { id: 'operational_analytics', sourceOfTruth: true },
];

const MARKETMIND_CAPABILITIES = [
  { id: 'market_quotes', sourceOfTruth: true },
  { id: 'bars', sourceOfTruth: true },
  { id: 'market_sessions', sourceOfTruth: true },
  { id: 'technical_indicators', sourceOfTruth: true },
  { id: 'options_chains', sourceOfTruth: true },
  { id: 'options_flow', sourceOfTruth: true },
  { id: 'money_flow', sourceOfTruth: true },
  { id: 'market_regime', sourceOfTruth: true },
  { id: 'macro', sourceOfTruth: true },
  { id: 'news', sourceOfTruth: true },
  { id: 'earnings', sourceOfTruth: true },
  { id: 'strategies', sourceOfTruth: true },
  { id: 'risk', sourceOfTruth: true },
  { id: 'paper_positions', sourceOfTruth: true },
  { id: 'market_ai_analysis', sourceOfTruth: true },
];

const WONGWAI_CAPABILITIES = [
  { id: 'corporate_product_registry', sourceOfTruth: true },
  { id: 'corporate_health', sourceOfTruth: true },
  { id: 'corporate_events', sourceOfTruth: true },
  { id: 'corporate_alerts', sourceOfTruth: true },
  { id: 'cross_product_spider_web', sourceOfTruth: true },
  { id: 'executive_kpi_snapshots', sourceOfTruth: true },
  { id: 'research_reports', sourceOfTruth: true },
  { id: 'corporate_ai_conclusions', sourceOfTruth: true },
  { id: 'automation_control_state', sourceOfTruth: true },
  { id: 'audit_traces', sourceOfTruth: true },
  { id: 'incidents', sourceOfTruth: true },
  { id: 'executive_dashboards', sourceOfTruth: true },
];

export function seedProductRegistry(): CorporateProduct[] {
  const seeded: CorporateProduct[] = [
    {
      productId: 'WORKQORA',
      name: 'Workqora',
      domain: CORPORATE_ENV.workqoraDomain,
      repository: CORPORATE_ENV.githubWorkqora,
      environment: 'production',
      productionSha: null,
      mainSha: null,
      healthUrl: CORPORATE_ENV.workqoraHealthUrl,
      readyUrl: CORPORATE_ENV.workqoraReadyUrl,
      apiBaseUrl: CORPORATE_ENV.workqoraApiBaseUrl,
      realtimeUrl: CORPORATE_ENV.workqoraRealtimeUrl,
      status: 'UNKNOWN',
      lastSeenAt: null,
      capabilities: WORKQORA_CAPABILITIES,
      dependencies: ['supabase', 'firebase', 'workflow'],
      certificationStatus: 'PARTIAL',
      classification: 'UNKNOWN',
      notes: [
        'Workqora remains source of truth for workforce and operations data.',
        'Wongwai may ingest aggregates and authorized operational events only.',
      ],
    },
    {
      productId: 'MARKETMIND_AI',
      name: 'MarketMind AI',
      domain: CORPORATE_ENV.marketMindDomain,
      repository: CORPORATE_ENV.githubMarketMind,
      environment: CORPORATE_ENV.marketMindHealthUrl ? 'unknown' : 'unknown',
      productionSha: null,
      mainSha: null,
      healthUrl: CORPORATE_ENV.marketMindHealthUrl,
      readyUrl: CORPORATE_ENV.marketMindReadyUrl,
      apiBaseUrl: CORPORATE_ENV.marketMindApiBaseUrl,
      realtimeUrl: CORPORATE_ENV.marketMindRealtimeUrl,
      status: 'UNKNOWN',
      lastSeenAt: null,
      capabilities: MARKETMIND_CAPABILITIES,
      dependencies: ['market_data_provider', 'ai_gateway'],
      certificationStatus: 'UNCERTIFIED',
      classification: CORPORATE_ENV.marketMindHealthUrl ? 'UNKNOWN' : 'UNIMPLEMENTED',
      notes: [
        'Public site marketmind-ai.com currently serves a marketing SPA, not JSON /api/health.',
        'Set MARKETMIND_HEALTH_URL to the trading engine health endpoint before claiming LIVE.',
      ],
    },
    {
      productId: 'WONGWAI_GROUP',
      name: 'Wongwai Group Inc',
      domain: CORPORATE_ENV.wongwaiDomain,
      repository: CORPORATE_ENV.githubWongwai,
      environment: CORPORATE_ENV.appMode === 'production' ? 'production' : 'development',
      productionSha: null,
      mainSha: null,
      healthUrl: CORPORATE_ENV.wongwaiHealthUrl,
      readyUrl: `${CORPORATE_ENV.wongwaiDomain.replace(/\/$/, '')}/api/ready`,
      apiBaseUrl: CORPORATE_ENV.wongwaiDomain,
      realtimeUrl: null,
      status: 'UNKNOWN',
      lastSeenAt: null,
      capabilities: WONGWAI_CAPABILITIES,
      dependencies: ['WORKQORA', 'MARKETMIND_AI'],
      certificationStatus: 'UNCERTIFIED',
      classification: 'PARTIAL',
      notes: [
        'Corporate OS owns registry, health aggregation, research, and executive views.',
        'Does not replicate Workqora or MarketMind tenant databases.',
      ],
    },
  ];

  const { products } = corporateStore();
  for (const product of seeded) {
    products.set(product.productId, product);
  }
  return seeded;
}

export function listProducts(): CorporateProduct[] {
  const { products } = corporateStore();
  if (products.size === 0) seedProductRegistry();
  return Array.from(products.values());
}

export function getProduct(productId: ProductId): CorporateProduct | null {
  const { products } = corporateStore();
  if (products.size === 0) seedProductRegistry();
  return products.get(productId) || null;
}

export function registerProduct(product: CorporateProduct): CorporateProduct {
  const { products } = corporateStore();
  if (products.size === 0) seedProductRegistry();
  products.set(product.productId, product);
  return product;
}

export function updateProduct(productId: ProductId, patch: Partial<CorporateProduct>): CorporateProduct | null {
  const existing = getProduct(productId);
  if (!existing) return null;
  const next = { ...existing, ...patch, productId: existing.productId };
  corporateStore().products.set(existing.productId, next);
  return next;
}
