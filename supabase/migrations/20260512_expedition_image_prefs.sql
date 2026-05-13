-- supabase/migrations/20260512_expedition_image_prefs.sql

CREATE TABLE IF NOT EXISTS expedition_image_prefs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expedition_id text NOT NULL,
  image_url     text NOT NULL,
  x             float8 NOT NULL DEFAULT 50,
  y             float8 NOT NULL DEFAULT 40,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, expedition_id, image_url)
);

CREATE INDEX IF NOT EXISTS expedition_image_prefs_lookup_idx
  ON expedition_image_prefs (user_id, expedition_id);

ALTER TABLE expedition_image_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own expedition_image_prefs"
  ON expedition_image_prefs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own expedition_image_prefs"
  ON expedition_image_prefs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own expedition_image_prefs"
  ON expedition_image_prefs FOR UPDATE
  USING (auth.uid() = user_id);
