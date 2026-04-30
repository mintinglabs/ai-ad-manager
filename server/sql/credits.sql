-- Credits system tables for Supabase
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query).
--
-- Phase 2 scope: balance + transaction ledger + plan tracking.
-- Phase 3+ will add Stripe customer/subscription IDs once payment lands.
--
-- ── Identity model ────────────────────────────────────────────────────────
-- Credits are keyed by `app_user_id`, the Supabase auth user UUID.
-- This is the stable account identity (Google sign-in via Supabase Auth)
-- and persists across page refresh / sessions / device.
--
-- We deliberately don't reference auth.users (foreign key) because the
-- app's Supabase project may not own that schema in some self-hosted
-- setups. Logical reference is enough for our needs.
--
-- ── Migration from earlier fb_user_id-based draft ─────────────────────────
-- If you ran the previous version of this file (which used fb_user_id),
-- the safe one-shot migration is:
--   ALTER TABLE user_credits        RENAME COLUMN fb_user_id TO app_user_id;
--   ALTER TABLE credit_transactions RENAME COLUMN fb_user_id TO app_user_id;
-- Then re-run the function definition below to pick up new param names.

-- ── user_credits ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_credits (
  app_user_id     text PRIMARY KEY,                    -- Supabase auth.users.id (UUID, stored as text)
  balance         integer NOT NULL DEFAULT 0,
  monthly_quota   integer NOT NULL DEFAULT 200,
  used_this_cycle integer NOT NULL DEFAULT 0,
  plan_id         text    NOT NULL DEFAULT 'free',
  billing_cycle   text    NOT NULL DEFAULT 'monthly',
  cycle_started_at timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── credit_transactions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id text NOT NULL,
  type        text NOT NULL,
  description text,
  credits     integer NOT NULL,
  balance_after integer NOT NULL,
  metadata    jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_user_created
  ON credit_transactions(app_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_tx_type
  ON credit_transactions(type);

-- ── apply_credit_delta(p_user, p_credits, p_type, p_desc, p_metadata) ─────
-- Atomic balance-mutation primitive. Inserts ledger row + updates the
-- balance in a single transaction. Rejects negative deltas that would
-- drive balance below zero (returns NULL — caller surfaces this as a 402).
-- Returns the new balance on success.
CREATE OR REPLACE FUNCTION apply_credit_delta(
  p_user      text,
  p_credits   integer,
  p_type      text,
  p_desc      text,
  p_metadata  jsonb DEFAULT '{}'::jsonb
) RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  v_new_balance integer;
BEGIN
  SELECT balance + p_credits INTO v_new_balance
    FROM user_credits
    WHERE app_user_id = p_user
    FOR UPDATE;

  IF v_new_balance IS NULL THEN
    IF p_credits < 0 THEN
      RETURN NULL;
    END IF;
    INSERT INTO user_credits(app_user_id, balance) VALUES (p_user, p_credits);
    v_new_balance := p_credits;
  ELSE
    IF v_new_balance < 0 THEN
      RETURN NULL;
    END IF;
    UPDATE user_credits
       SET balance = v_new_balance,
           used_this_cycle = used_this_cycle + (CASE WHEN p_credits < 0 THEN -p_credits ELSE 0 END),
           updated_at = now()
     WHERE app_user_id = p_user;
  END IF;

  INSERT INTO credit_transactions(app_user_id, type, description, credits, balance_after, metadata)
    VALUES (p_user, p_type, p_desc, p_credits, v_new_balance, COALESCE(p_metadata, '{}'::jsonb));

  RETURN v_new_balance;
END $$;
