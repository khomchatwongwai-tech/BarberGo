import type { DataQuality, DomainCompleteness } from './types';

export interface SeriesPoint {
  t: string;
  v: number;
}

export interface MetricComputation {
  metricId: string;
  definition: string;
  source: string;
  queryPeriod: string;
  calculationVersion: string;
  freshness: string | null;
  completeness: DomainCompleteness;
  quality: DataQuality;
  value: number | null;
  extra?: Record<string, unknown>;
}

const VERSION = 'analytics-1.0.0';

function meta(partial: Omit<MetricComputation, 'calculationVersion' | 'freshness'> & { freshness?: string | null }): MetricComputation {
  return {
    ...partial,
    calculationVersion: VERSION,
    freshness: partial.freshness ?? null,
  };
}

export function mean(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function variance(values: number[]): number | null {
  const avg = mean(values);
  if (avg == null || values.length < 2) return null;
  return values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / (values.length - 1);
}

export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

export function movingAverage(values: number[], window: number): number[] | null {
  if (!values.length || window <= 0) return null;
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

export function growthRate(previous: number | null, current: number | null): number | null {
  if (previous == null || current == null || previous === 0) return null;
  return (current - previous) / previous;
}

export function pearson(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 3) return null;
  const mx = mean(x)!;
  const my = mean(y)!;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < x.length; i += 1) {
    const a = x[i] - mx;
    const b = y[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

export function detectAnomalies(values: number[], z = 3): number[] {
  const avg = mean(values);
  const v = variance(values);
  if (avg == null || v == null) return [];
  const sd = Math.sqrt(v);
  if (sd === 0) return [];
  return values
    .map((value, index) => ({ value, index }))
    .filter((item) => Math.abs(item.value - avg) / sd >= z)
    .map((item) => item.index);
}

export function computeSeries(metricId: string, definition: string, source: string, points: SeriesPoint[]): MetricComputation {
  if (!points.length) {
    return meta({
      metricId,
      definition,
      source,
      queryPeriod: 'empty',
      completeness: 'UNAVAILABLE',
      quality: 'UNAVAILABLE',
      value: null,
    });
  }
  const values = points.map((p) => p.v);
  return meta({
    metricId,
    definition,
    source,
    queryPeriod: `${points[0].t}/${points[points.length - 1].t}`,
    completeness: points.length >= 8 ? 'COMPLETE' : 'PARTIAL',
    quality: points.length >= 8 ? 'GOOD' : 'PARTIAL',
    value: mean(values),
    extra: {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      p50: percentile(values, 50),
      p95: percentile(values, 95),
      variance: variance(values),
      movingAverage3: movingAverage(values, 3),
      anomalyIndexes: detectAnomalies(values),
    },
    freshness: points[points.length - 1].t,
  });
}

export function forecastNaive(values: number[]): {
  forecast: number | null;
  confidenceInterval: [number, number] | null;
  assumptions: string[];
  historicalSample: number;
  modelVersion: string;
} {
  if (values.length < 6) {
    return {
      forecast: null,
      confidenceInterval: null,
      assumptions: ['Insufficient historical sample for a forecast.'],
      historicalSample: values.length,
      modelVersion: VERSION,
    };
  }
  const recent = values.slice(-6);
  const avg = mean(recent)!;
  const v = variance(recent) || 0;
  const sd = Math.sqrt(v);
  return {
    forecast: avg,
    confidenceInterval: [avg - 1.96 * sd, avg + 1.96 * sd],
    assumptions: ['Naive mean of the last 6 observations. Not a causal model.'],
    historicalSample: values.length,
    modelVersion: VERSION,
  };
}
