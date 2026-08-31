-- Minimal production DDL so live #279 two-step createRun can insert.
-- Live workflow_runs already has correlation_id / causation_id.
-- It lacks definition_version / workflow_version_id / state_transitions,
-- so every worker insert fails with 42703 / PGRST204 and writes 0 runs.
--
-- Paste into the Supabase SQL editor for project shcvtusszanqspkibebq
-- (Table Editor → SQL). Service role cannot DDL. Do not run claim RPCs.
--
-- This does not replace four-tier createRun; it unblocks the SHA that is
-- already on Render (ba654bf). Prefer also shipping four-tier createRun.

ALTER TABLE public.workflow_runs
  ADD COLUMN IF NOT EXISTS definition_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS workflow_version_id text,
  ADD COLUMN IF NOT EXISTS state_transitions jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS workflow_runs_version_idx
  ON public.workflow_runs (workflow_id, definition_version);
