-- Site settings: one editable source of truth for company info, legal pages and
-- return policy. Replaces content that was hardcoded across Footer/SEOHead/invoices
-- and the removed knowledge_base table.
--
-- Single-row table (id is pinned to 1) so the admin form reads/writes one record.

CREATE TABLE IF NOT EXISTS site_settings (
  id                   SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),

  -- Company
  trading_name         TEXT NOT NULL DEFAULT '',
  legal_name           TEXT NOT NULL DEFAULT '',
  description          TEXT NOT NULL DEFAULT '',
  phone                TEXT NOT NULL DEFAULT '',
  whatsapp             TEXT NOT NULL DEFAULT '',
  email                TEXT NOT NULL DEFAULT '',
  address_line1        TEXT NOT NULL DEFAULT '',
  address_city         TEXT NOT NULL DEFAULT '',
  address_state        TEXT NOT NULL DEFAULT '',
  address_postcode     TEXT NOT NULL DEFAULT '',
  -- [{ "days": "Monday – Friday", "open": "9:30am", "close": "6:00pm" }]
  -- A null open/close means closed that day.
  office_hours         JSONB NOT NULL DEFAULT '[]'::jsonb,
  facebook_url         TEXT NOT NULL DEFAULT '',
  instagram_url        TEXT NOT NULL DEFAULT '',

  -- Legal pages (plain text; rendered paragraph-wise, "## " lines become headings)
  privacy_policy       TEXT NOT NULL DEFAULT '',
  terms_conditions     TEXT NOT NULL DEFAULT '',

  -- Return policy: the values the customer-facing page keys off
  return_window_days   INTEGER NOT NULL DEFAULT 7 CHECK (return_window_days >= 0),
  free_return_shipping BOOLEAN NOT NULL DEFAULT true,
  return_policy_intro  TEXT NOT NULL DEFAULT '',

  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by           TEXT
);

CREATE OR REPLACE FUNCTION touch_site_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS site_settings_touch ON site_settings;
CREATE TRIGGER site_settings_touch
  BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION touch_site_settings();

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- The footer, legal pages and SEO tags are public, so the row must be world-readable.
DROP POLICY IF EXISTS site_settings_public_read ON site_settings;
CREATE POLICY site_settings_public_read
  ON site_settings FOR SELECT
  USING (true);

-- NOTE: admin auth in this app is still client-side (localStorage), so admin writes
-- arrive on the anon key and this policy has to accept them. It is as tight as the
-- current auth model allows and no looser than the rest of the schema. Tighten to
-- `TO authenticated` once admins are real Supabase users.
DROP POLICY IF EXISTS site_settings_write ON site_settings;
CREATE POLICY site_settings_write
  ON site_settings FOR UPDATE
  USING (true) WITH CHECK (true);

INSERT INTO site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
