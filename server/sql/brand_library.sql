-- Brand Library table for Supabase
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

CREATE TABLE IF NOT EXISTS brand_library (
  id text PRIMARY KEY,
  fb_user_id text NOT NULL,
  ad_account_id text,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'guidelines',
  content text DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_library_user ON brand_library(fb_user_id);
CREATE INDEX IF NOT EXISTS idx_brand_library_account ON brand_library(fb_user_id, ad_account_id);

-- Enable RLS (Row Level Security) - optional, service key bypasses RLS
ALTER TABLE brand_library ENABLE ROW LEVEL SECURITY;
