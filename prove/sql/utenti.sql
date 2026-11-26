-- ===========================================================================
--  prove/sql/utenti.sql — FIXTURE DI PROVA, non va eseguito sul sito.
--
--  Le tabelle degli account com'erano sul database del sito prima degli
--  account della beta: "User" con le colonne che le rotte leggono (sicurezza,
--  Google, versione dei token), i tentativi ("RateLimit"), le impostazioni,
--  gli inviti del pannello ("BetaAccess") e le richieste dal form
--  (beta_signups) senza le colonne nuove. prove/prova-beta.mjs lo carica in
--  un database di prova.
-- ===========================================================================

DO $$ BEGIN
  CREATE TYPE two_factor_mode AS ENUM ('none', 'totp', 'email');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE "User" (
  id                TEXT PRIMARY KEY,
  email             TEXT NOT NULL UNIQUE,
  username          TEXT UNIQUE,
  "passwordHash"    TEXT NOT NULL,
  "displayName"     TEXT,
  "emailVerified"   TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "twoFactorMode"   two_factor_mode NOT NULL DEFAULT 'none',
  "twoFactorSecret" TEXT,
  "twoFactorSince"  TIMESTAMPTZ,
  "googleSub"       TEXT,
  "tokenVersion"    INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE "RateLimit" (
  chiave      TEXT PRIMARY KEY,
  tentativi   INTEGER NOT NULL DEFAULT 1,
  "expiresAt" TIMESTAMPTZ NOT NULL
);

CREATE TABLE "AppSetting" (
  chiave      TEXT PRIMARY KEY,
  valore      TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedBy" TEXT
);
INSERT INTO "AppSetting"(chiave, valore, "updatedBy") VALUES ('beta_enabled', 'false', 'schema');

CREATE TABLE "BetaAccess" (
  email     TEXT PRIMARY KEY,
  "addedBy" TEXT NOT NULL,
  "addedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nota      TEXT
);

CREATE TABLE beta_signups (
  id         serial PRIMARY KEY,
  email      text UNIQUE NOT NULL,
  profile    text,
  created_at timestamptz NOT NULL DEFAULT now()
);
