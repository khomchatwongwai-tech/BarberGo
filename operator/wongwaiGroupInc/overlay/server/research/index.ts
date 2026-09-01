/**
 * Research planner stub.
 * Jobs are allowed to run autonomously as READ_ONLY.
 * They must not mutate Workqora or MarketMind production systems.
 */
export const RESEARCH_SOURCE_CATEGORIES = [
  'official_company_sites',
  'sec_filings',
  'government_data',
  'federal_reserve',
  'bls',
  'bea',
  'eia',
  'company_earnings',
  'investor_relations',
  'peer_reviewed',
  'licensed_market_providers',
  'trusted_news',
  'internal_product_data',
] as const;
