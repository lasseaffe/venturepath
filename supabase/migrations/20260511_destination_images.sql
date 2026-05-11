-- Destination image cache for Playwright-scraped CC-licensed photos
-- Run this in Supabase SQL editor or via: npx supabase db push

create table if not exists destination_images (
  query_key   text primary key,
  images      jsonb not null default '[]',
  scraped_at  timestamptz not null default now()
);

-- Auto-expire index (optional — actual TTL enforced in app code)
create index if not exists destination_images_scraped_at_idx
  on destination_images (scraped_at);
