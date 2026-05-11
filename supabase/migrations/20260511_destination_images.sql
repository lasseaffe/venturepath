-- supabase/migrations/20260511_destination_images.sql
create table if not exists destination_images (
  query_key   text primary key,
  images      jsonb not null default '[]',
  scraped_at  timestamptz not null default now()
);

comment on table destination_images is
  'Cache of CC-licensed images scraped per destination query. TTL 30 days.';
comment on column destination_images.query_key is
  'Lowercased, whitespace-collapsed destination query string';
comment on column destination_images.images is
  'Array of {url,thumb,title,author,authorUrl,photoPageUrl,license,licenseUrl,source}';
