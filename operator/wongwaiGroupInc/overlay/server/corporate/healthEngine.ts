import { SAFETY } from './env';
import { probeUrl } from './http';
import { listProducts, updateProduct } from './productRegistry';
import { corporateStore } from './store';
import type {
  CorporateHealthReport,
  HealthColor,
  ProductHealthSnapshot,
  ProductRuntimeStatus,
  UpstreamProbe,
} from './types';

function readString(obj: Record<string, unknown> | null, keys: string[]): string | null {
  if (!obj) return null;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

function colorFromProbe(productId: string, probe: UpstreamProbe | null, extra: string[]): HealthColor {
  if (!probe) return 'UNKNOWN';
  if (probe.error === 'CIRCUIT_OPEN') return 'BLOCKED';
  if (probe.bodyKind === 'html') return 'UNKNOWN';
  if (!probe.ok) {
    if (probe.error === 'TIMEOUT' || probe.httpStatus && probe.httpStatus >= 500) return 'RED';
    if (probe.httpStatus === 401 || probe.httpStatus === 403) return 'BLOCKED';
    return 'UNKNOWN';
  }
  if (extra.length > 0) return 'YELLOW';
  if (productId === 'WORKQORA' && probe.parsed) {
    const schema = readString(probe.parsed, ['databaseSchema']);
    if (schema && schema !== 'ok' && schema !== 'healthy') return 'YELLOW';
  }
  return 'GREEN';
}

function classificationFromColor(color: HealthColor, fallback: ProductRuntimeStatus): ProductRuntimeStatus {
  if (color === 'GREEN') return 'LIVE';
  if (color === 'YELLOW') return 'PARTIAL';
  if (color === 'RED' || color === 'BLOCKED') return 'BROKEN';
  return fallback === 'UNIMPLEMENTED' ? 'UNIMPLEMENTED' : 'UNKNOWN';
}

function neverUnknownAsHealthy(color: HealthColor): HealthColor {
  return color;
}

export async function refreshCorporateHealth(): Promise<CorporateHealthReport> {
  const products = listProducts();
  const snapshots: ProductHealthSnapshot[] = [];

  for (const product of products) {
    const extra: string[] = [];
    let probe: UpstreamProbe | null = null;
    if (!product.healthUrl) {
      extra.push('healthUrl is not configured');
    } else {
      probe = await probeUrl(product.healthUrl);
      if (probe.ok && probe.parsed) {
        const sha =
          readString(probe.parsed, ['commitSha', 'sha', 'gitSha', 'version']) || null;
        updateProduct(product.productId, {
          productionSha: sha,
          lastSeenAt: probe.checkedAt,
          status: 'LIVE',
          classification: 'LIVE',
        });
      } else if (probe.bodyKind === 'html') {
        extra.push('health URL returned HTML, not a JSON health document');
      }
    }

    const parsed = probe?.parsed || null;
    const dependencyDegradation: string[] = [...extra];
    if (parsed) {
      const affected = parsed.affectedSubsystems;
      if (Array.isArray(affected)) {
        for (const item of affected) {
          if (typeof item === 'string') dependencyDegradation.push(item);
        }
      }
      const schema = readString(parsed, ['databaseSchema']);
      if (schema && schema !== 'ok' && schema !== 'healthy') {
        dependencyDegradation.push(`databaseSchema=${schema}`);
      }
    }

    const color = neverUnknownAsHealthy(colorFromProbe(product.productId, probe, extra));
    const snapshot: ProductHealthSnapshot = {
      productId: product.productId,
      color,
      availability: probe?.ok ? 'GOOD' : probe ? 'UNAVAILABLE' : 'UNAVAILABLE',
      latencyMs: probe?.latencyMs ?? null,
      mainSha: product.mainSha,
      productionSha: readString(parsed, ['commitSha', 'sha', 'gitSha']) || product.productionSha,
      databaseStatus: readString(parsed, ['databaseSchema']) || (parsed?.dependencies && typeof parsed.dependencies === 'object'
        ? JSON.stringify(parsed.dependencies)
        : null),
      aiStatus: null,
      eventPipeline: null,
      realtimeFeedStatus: null,
      lastSuccessfulHeartbeat: probe?.ok ? probe.checkedAt : product.lastSeenAt,
      dependencyDegradation,
      classification: classificationFromColor(color, product.classification),
      notes: [
        ...product.notes,
        ...(probe?.error ? [`probe.error=${probe.error}`] : []),
      ],
      probe,
    };
    snapshots.push(snapshot);
  }

  const { healthSnapshots } = corporateStore();
  healthSnapshots.length = 0;
  healthSnapshots.push(...snapshots);

  const colors = snapshots.map((item) => item.color);
  let overall: HealthColor = 'UNKNOWN';
  if (colors.includes('RED')) overall = 'RED';
  else if (colors.includes('BLOCKED')) overall = 'BLOCKED';
  else if (colors.includes('YELLOW')) overall = 'YELLOW';
  else if (colors.includes('UNKNOWN')) overall = 'UNKNOWN';
  else if (colors.every((item) => item === 'GREEN')) overall = 'GREEN';

  return {
    generatedAt: new Date().toISOString(),
    overall,
    neverUnknownAsHealthy: true,
    products: snapshots,
    safety: {
      workqoraAutonomousMutation: SAFETY.workqoraAutonomousMutation,
      marketMindLiveTradingEnabled: SAFETY.marketMindLiveTradingEnabled,
    },
    quality: overall === 'UNKNOWN' ? 'UNAVAILABLE' : overall === 'GREEN' ? 'GOOD' : 'PARTIAL',
  };
}

export function getLastHealth(): CorporateHealthReport | null {
  const { healthSnapshots } = corporateStore();
  if (healthSnapshots.length === 0) return null;
  const colors = healthSnapshots.map((item) => item.color);
  let overall: HealthColor = 'UNKNOWN';
  if (colors.includes('RED')) overall = 'RED';
  else if (colors.includes('BLOCKED')) overall = 'BLOCKED';
  else if (colors.includes('YELLOW')) overall = 'YELLOW';
  else if (colors.includes('UNKNOWN')) overall = 'UNKNOWN';
  else if (colors.every((item) => item === 'GREEN')) overall = 'GREEN';
  return {
    generatedAt: new Date().toISOString(),
    overall,
    neverUnknownAsHealthy: true,
    products: healthSnapshots,
    safety: {
      workqoraAutonomousMutation: SAFETY.workqoraAutonomousMutation,
      marketMindLiveTradingEnabled: SAFETY.marketMindLiveTradingEnabled,
    },
    quality: overall === 'UNKNOWN' ? 'UNAVAILABLE' : overall === 'GREEN' ? 'GOOD' : 'PARTIAL',
  };
}
