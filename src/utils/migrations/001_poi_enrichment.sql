CREATE TABLE IF NOT EXISTS poi_enrichment (
  poi_id        TEXT PRIMARY KEY,
  wikidata_qid  TEXT,
  description   TEXT,
  image_url     TEXT,
  instance_of   TEXT,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Allow authenticated users to read and write enrichments
ALTER TABLE poi_enrichment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read enrichments"
  ON poi_enrichment FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upsert enrichments"
  ON poi_enrichment FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update stale enrichments"
  ON poi_enrichment FOR UPDATE
  USING (auth.role() = 'authenticated');
