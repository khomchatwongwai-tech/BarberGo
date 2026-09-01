-- Corporate control plane tables. Do not replicate Workqora or MarketMind tenant databases.
-- Apply in the Wongwai Group Supabase project only.

CREATE TABLE IF NOT EXISTS corporate_products (
  product_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT,
  repository TEXT,
  environment TEXT,
  production_sha TEXT,
  main_sha TEXT,
  health_url TEXT,
  ready_url TEXT,
  api_base_url TEXT,
  realtime_url TEXT,
  status TEXT NOT NULL DEFAULT 'UNKNOWN',
  last_seen_at TIMESTAMPTZ,
  capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
  certification_status TEXT NOT NULL DEFAULT 'UNCERTIFIED',
  notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS corporate_health_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  overall TEXT NOT NULL,
  payload JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS corporate_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  product_id TEXT NOT NULL,
  source_system TEXT NOT NULL,
  correlation_id TEXT,
  trace_id TEXT,
  occurred_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  severity TEXT,
  quality TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  schema_version TEXT NOT NULL DEFAULT '1.0.0',
  idempotency_key TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS corporate_event_dlq (
  dlq_id TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS corporate_alerts (
  alert_id TEXT PRIMARY KEY,
  priority TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  product_id TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS corporate_incidents (
  incident_id TEXT PRIMARY KEY,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS corporate_kpis (
  metric_id TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  value JSONB,
  quality TEXT NOT NULL,
  payload JSONB NOT NULL,
  PRIMARY KEY (metric_id, captured_at)
);

CREATE TABLE IF NOT EXISTS corporate_spider_nodes (
  node_id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS corporate_spider_edges (
  edge_id TEXT PRIMARY KEY,
  from_node TEXT NOT NULL,
  to_node TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  evidence_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT,
  valid_until TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS corporate_research_jobs (
  research_id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  status TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS corporate_research_sources (
  evidence_id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  url TEXT,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS corporate_research_claims (
  claim_id TEXT PRIMARY KEY,
  statement TEXT NOT NULL,
  status TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS corporate_ai_analyses (
  analysis_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS corporate_automations (
  action_type TEXT PRIMARY KEY,
  policy JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS corporate_automation_runs (
  run_id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL,
  result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS corporate_approvals (
  approval_id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS corporate_audit_log (
  audit_id TEXT PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  details TEXT
);

ALTER TABLE corporate_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_event_dlq ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_spider_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_spider_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_research_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_research_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_research_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_audit_log ENABLE ROW LEVEL SECURITY;
