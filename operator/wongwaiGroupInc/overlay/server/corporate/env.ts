function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === '') return fallback;
  return value.trim().toLowerCase() === 'true';
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const SAFETY = {
  get workqoraAutonomousMutation(): boolean {
    return parseBool(process.env.WORKQORA_AUTONOMOUS_MUTATION, false);
  },
  get marketMindLiveTradingEnabled(): boolean {
    return parseBool(process.env.MARKETMIND_LIVE_TRADING_ENABLED, false);
  },
} as const;

export const CORPORATE_ENV = {
  timeoutMs: Number(process.env.CORPORATE_UPSTREAM_TIMEOUT_MS || 4000),
  appMode: (process.env.APP_MODE || 'demo') as 'demo' | 'production',
  nodeEnv: process.env.NODE_ENV || 'development',
  workqoraHealthUrl: emptyToNull(process.env.WORKQORA_HEALTH_URL) || 'https://www.workqora.com/api/health',
  workqoraReadyUrl: emptyToNull(process.env.WORKQORA_READY_URL),
  workqoraApiBaseUrl: emptyToNull(process.env.WORKQORA_API_BASE_URL) || 'https://www.workqora.com',
  workqoraRealtimeUrl: emptyToNull(process.env.WORKQORA_REALTIME_URL),
  workqoraDomain: emptyToNull(process.env.WORKQORA_DOMAIN) || 'https://www.workqora.com',
  workqoraOpsSecret: emptyToNull(process.env.WORKQORA_OPS_SECRET),
  workqoraServiceToken: emptyToNull(process.env.WORKQORA_CORPORATE_SERVICE_TOKEN),
  marketMindHealthUrl: emptyToNull(process.env.MARKETMIND_HEALTH_URL),
  marketMindReadyUrl: emptyToNull(process.env.MARKETMIND_READY_URL),
  marketMindApiBaseUrl: emptyToNull(process.env.MARKETMIND_API_BASE_URL),
  marketMindRealtimeUrl: emptyToNull(process.env.MARKETMIND_REALTIME_URL),
  marketMindDomain: emptyToNull(process.env.MARKETMIND_DOMAIN),
  marketMindOpsSecret: emptyToNull(process.env.MARKETMIND_OPS_SECRET),
  wongwaiDomain: emptyToNull(process.env.APP_URL) || 'https://wongwaigroupinc.com',
  wongwaiHealthUrl: emptyToNull(process.env.WONGWAI_HEALTH_URL) || 'https://wongwaigroupinc.com/api/health',
  githubWorkqora: 'https://github.com/khomchatwongwai-tech/workqora',
  githubMarketMind: 'https://github.com/khomchatwongwai-tech/MarketMind-AI',
  githubWongwai: 'https://github.com/khomchatwongwai-tech/wongwaiGroupInc',
};

export function assertMutationGates(): {
  workqoraAutonomousMutation: boolean;
  marketMindLiveTradingEnabled: boolean;
} {
  return {
    workqoraAutonomousMutation: SAFETY.workqoraAutonomousMutation,
    marketMindLiveTradingEnabled: SAFETY.marketMindLiveTradingEnabled,
  };
}

export function isProductionLike(): boolean {
  return CORPORATE_ENV.appMode === 'production' || CORPORATE_ENV.nodeEnv === 'production';
}
