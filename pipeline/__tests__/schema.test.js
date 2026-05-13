import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATION_PATH = resolve(
  __dirname,
  '../../supabase/migrations/20260513_curated_expeditions_foundation.sql'
);

describe('20260513_curated_expeditions_foundation migration', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8').toLowerCase();

  it('adds the slug column with backfill and uniqueness', () => {
    expect(sql).toMatch(/add column if not exists slug text/);
    expect(sql).toMatch(/update pro_paths[\s\S]+slug = lower/);
    expect(sql).toMatch(/alter column slug set not null/);
    expect(sql).toMatch(/pro_paths_slug_unique/);
  });

  it('adds the new pro_paths columns', () => {
    for (const col of [
      'gpx_storage_path text',
      'theme_category text',
      'tags text[]',
      'provenance jsonb',
      'safety_meta jsonb',
      'narrative_blocks jsonb',
    ]) {
      expect(sql).toContain(col);
    }
  });

  it('constrains theme_category to the five locked values', () => {
    expect(sql).toMatch(
      /theme_category in \(\s*'movie'\s*,\s*'historical'\s*,\s*'thematic'\s*,\s*'city'\s*,\s*'geographical'\s*\)/
    );
  });

  it('creates pro_path_waypoints and pro_path_attempts tables', () => {
    expect(sql).toMatch(/create table if not exists pro_path_waypoints/);
    expect(sql).toMatch(/create table if not exists pro_path_attempts/);
  });

  it('enables RLS on all three tables', () => {
    expect(sql).toMatch(/alter table pro_paths enable row level security/);
    expect(sql).toMatch(
      /alter table pro_path_waypoints enable row level security/
    );
    expect(sql).toMatch(
      /alter table pro_path_attempts enable row level security/
    );
  });

  it('creates the four expected pro_paths policies', () => {
    for (const policy of [
      'pro_paths_public_read_curated',
      'pro_paths_architect_read_own',
      'pro_paths_architect_write',
      'pro_paths_architect_update',
    ]) {
      expect(sql).toContain(policy);
    }
  });

  it('creates supporting indexes for theme browse and tag filter', () => {
    expect(sql).toMatch(/pro_paths_theme_curated_idx/);
    expect(sql).toMatch(/pro_paths_tags_gin_idx/);
  });
});
