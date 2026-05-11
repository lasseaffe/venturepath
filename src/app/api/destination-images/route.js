// src/app/api/destination-images/route.js
import { NextResponse }                    from 'next/server';
import { createClient }                    from '@/lib/supabase/server';
import { scrapeImages, normalizeQueryKey } from '@/lib/images/scrapeImages';

export const runtime     = 'nodejs';
export const maxDuration = 60; // scraping can take up to ~30s on first fetch

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const rawQuery = searchParams.get('q')?.trim();
  const rawCount = parseInt(searchParams.get('count') ?? '5', 10);
  const count    = Math.min(isNaN(rawCount) ? 5 : rawCount, 8);

  if (!rawQuery) {
    return NextResponse.json({ error: 'q param required' }, { status: 400 });
  }

  const queryKey = normalizeQueryKey(rawQuery);

  // 1. Cache check
  try {
    const supabase = await createClient();
    const { data: cached } = await supabase
      .from('destination_images')
      .select('images, scraped_at')
      .eq('query_key', queryKey)
      .single();

    if (cached?.images?.length > 0) {
      const age = Date.now() - new Date(cached.scraped_at).getTime();
      if (age < CACHE_TTL_MS) {
        return NextResponse.json({ images: cached.images, cached: true });
      }
    }
  } catch {
    // Supabase unavailable — fall through to scrape
  }

  // 2. Scrape
  let images = [];
  try {
    images = await scrapeImages(rawQuery, count);
  } catch (err) {
    console.error('[destination-images] scrape failed:', err);
    return NextResponse.json({ images: [], error: 'scrape_failed' });
  }

  // 3. Cache result (fire-and-forget — a cache failure must not block the response)
  if (images.length > 0) {
    createClient()
      .then(sb => sb.from('destination_images').upsert({
        query_key:  queryKey,
        images,
        scraped_at: new Date().toISOString(),
      }, { onConflict: 'query_key' }))
      .catch(err => console.error('[destination-images] cache upsert failed:', err));
  }

  return NextResponse.json({ images, cached: false });
}
