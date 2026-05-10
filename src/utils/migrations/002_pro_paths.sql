-- Migration: pro_paths + pro_path_reviews tables with RLS
-- Already applied to Supabase project rhuttwfozwawcijjwpeo

CREATE TABLE IF NOT EXISTS pro_paths (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  destination       text NOT NULL,
  architect_name    text NOT NULL,
  architect_id      uuid REFERENCES auth.users(id),
  cover_image_url   text,
  description       text,
  difficulty        text CHECK (difficulty IN ('Easy','Moderate','Hard','Expert')),
  distance_km       int,
  days              int,
  squad_min         int,
  squad_max         int,
  price_usd         numeric DEFAULT 0,
  climate           text CHECK (climate IN ('alpine','tropical','subarctic','desert','temperate','arid')),
  legs              jsonb NOT NULL DEFAULT '[]',
  objectives        jsonb NOT NULL DEFAULT '[]',
  manifest_settings jsonb NOT NULL DEFAULT '{}',
  clones            int NOT NULL DEFAULT 0,
  rating            numeric NOT NULL DEFAULT 0,
  rating_count      int NOT NULL DEFAULT 0,
  is_community      boolean NOT NULL DEFAULT false,
  is_curated        boolean NOT NULL DEFAULT false,
  llm_quality_score numeric CHECK (llm_quality_score BETWEEN 0 AND 1),
  source            text CHECK (source IN ('pipeline','clone','wizard','manual')),
  forked_from       uuid REFERENCES pro_paths(id),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pro_path_reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id     uuid NOT NULL REFERENCES pro_paths(id) ON DELETE CASCADE,
  pioneer_id  uuid REFERENCES auth.users(id),
  rating      int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
