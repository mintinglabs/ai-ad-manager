-- Creative Sets table for Supabase
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

CREATE TABLE IF NOT EXISTS creative_sets (
  id text PRIMARY KEY,
  fb_user_id text NOT NULL,
  ad_account_id text,
  name text NOT NULL,
  description text DEFAULT '',
  items jsonb DEFAULT '[]'::jsonb,
  tags text[] DEFAULT '{}',
  campaign_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creative_sets_user ON creative_sets(fb_user_id);

ALTER TABLE creative_sets ENABLE ROW LEVEL SECURITY;
