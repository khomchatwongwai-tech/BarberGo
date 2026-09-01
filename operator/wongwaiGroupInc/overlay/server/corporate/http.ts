import { CORPORATE_ENV } from './env';
import type { UpstreamProbe } from './types';

interface CircuitState {
  failures: number;
  openedAt: number | null;
}

const circuits = new Map<string, CircuitState>();
const FAILURE_THRESHOLD = 3;
const OPEN_MS = 30_000;

function circuitKey(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

export function isCircuitOpen(url: string): boolean {
  const state = circuits.get(circuitKey(url));
  if (!state?.openedAt) return false;
  if (Date.now() - state.openedAt > OPEN_MS) {
    state.openedAt = null;
    state.failures = 0;
    return false;
  }
  return true;
}

function recordSuccess(url: string) {
  circuits.set(circuitKey(url), { failures: 0, openedAt: null });
}

function recordFailure(url: string) {
  const key = circuitKey(url);
  const current = circuits.get(key) || { failures: 0, openedAt: null };
  current.failures += 1;
  if (current.failures >= FAILURE_THRESHOLD) {
    current.openedAt = Date.now();
  }
  circuits.set(key, current);
}

export async function probeUrl(url: string, timeoutMs = CORPORATE_ENV.timeoutMs): Promise<UpstreamProbe> {
  const checkedAt = new Date().toISOString();
  if (isCircuitOpen(url)) {
    return {
      url,
      ok: false,
      httpStatus: null,
      latencyMs: null,
      error: 'CIRCUIT_OPEN',
      bodyKind: 'error',
      parsed: null,
      checkedAt,
    };
  }

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { Accept: 'application/json, text/plain, */*' },
    });
    const text = await response.text();
    const latencyMs = Date.now() - started;
    const looksHtml = /^\s*</.test(text);
    let parsed: Record<string, unknown> | null = null;
    let bodyKind: UpstreamProbe['bodyKind'] = text ? 'unknown' : 'empty';
    if (looksHtml) {
      bodyKind = 'html';
    } else if (text) {
      try {
        const json = JSON.parse(text);
        if (json && typeof json === 'object' && !Array.isArray(json)) {
          parsed = json as Record<string, unknown>;
          bodyKind = 'json';
        }
      } catch {
        bodyKind = 'unknown';
      }
    }

    const probe: UpstreamProbe = {
      url,
      ok: response.ok && bodyKind === 'json',
      httpStatus: response.status,
      latencyMs,
      error: response.ok ? (bodyKind === 'json' ? null : 'NON_JSON_BODY') : `HTTP_${response.status}`,
      bodyKind,
      parsed,
      checkedAt,
    };

    if (probe.ok) recordSuccess(url);
    else recordFailure(url);
    return probe;
  } catch (error) {
    recordFailure(url);
    const message = error instanceof Error ? error.name === 'AbortError' ? 'TIMEOUT' : error.message : 'FETCH_FAILED';
    return {
      url,
      ok: false,
      httpStatus: null,
      latencyMs: Date.now() - started,
      error: message,
      bodyKind: 'error',
      parsed: null,
      checkedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  isTransient: (error: unknown) => boolean,
  attempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransient(error) || i === attempts - 1) throw error;
      const backoff = Math.min(1000 * 2 ** i, 8000) + Math.floor(Math.random() * 200);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
  throw lastError;
}

export function resetCircuitsForTests() {
  circuits.clear();
}
