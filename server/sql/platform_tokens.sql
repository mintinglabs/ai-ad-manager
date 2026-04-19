-- Platform tokens table for Supabase
-- Stores per-user OAuth refresh tokens for non-Meta platforms (Google Ads, TikTok)
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

CREATE TABLE IF NOT EXISTS platform_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fb_user_id text NOT NULL,
  platform text NOT NULL,               -- 'google' | 'tiktok'
  refresh_token text NOT NULL,
  access_token text,
  expires_at timestamptz,
  customer_id text,                     -- selected Google Ads customer_id (or TikTok advertiser_id)
  login_customer_id text,               -- MCC root when accessing child account
  scope text,                           -- OAuth scopes granted
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (fb_user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_platform_tokens_user ON platform_tokens(fb_user_id);
CREATE INDEX IF NOT EXISTS idx_platform_tokens_user_platform ON platform_tokens(fb_user_id, platform);
