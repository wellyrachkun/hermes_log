-- CozyFinance Supabase Schema (PostgreSQL-compatible)
-- Run this in init.sql for PostgREST setup

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles for PostgREST
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator WITH LOGIN PASSWORD 'pg_secret_2026' NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
END
$$;
GRANT anon TO authenticator;

-- Tables (matching Supabase schema)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  avatar TEXT NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  owner TEXT NOT NULL,
  balance BIGINT NOT NULL DEFAULT 0,
  details JSONB,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  amount BIGINT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  wallet_id UUID NOT NULL,
  wallet_name TEXT NOT NULL,
  wallet_detail_id TEXT,
  wallet_detail_name TEXT,
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attachments JSONB
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  details TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  exclude_from_report BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (type, name)
);

-- Permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_wallets_owner ON wallets(owner);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
