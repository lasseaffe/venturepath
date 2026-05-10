import { deriveBearing } from './bearingEngine';

const GAP_THRESHOLD_MS  = 120 * 60 * 1000; // 2 hours
const FACT_EVERY        = 5;               // insert fact slide after every 5 photo slides

function gapMinutes(a, b) {
  return (new Date(b.timestamp) - new Date(a.timestamp)) / 60000;
}

function breadcrumbsInWindow(breadcrumbs, fromTs, toTs) {
  return breadcrumbs.filter(b => b.timestamp > fromTs && b.timestamp < toTs);
}

function makeBreadcrumbSlide(photoA, photoB, breadcrumbs) {
  const inWindow = breadcrumbsInWindow(breadcrumbs, photoA.timestamp, photoB.timestamp);
  const landmarks = inWindow.slice(0, 3).map(b => b.name ?? `${b.lat.toFixed(3)}, ${b.lng.toFixed(3)}`);
  return {
    type:        'breadcrumb',
    landmarks,
    gap_minutes: Math.round(gapMinutes(photoA, photoB)),
    from_time:   photoA.timestamp,
    to_time:     photoB.timestamp,
    coords:      inWindow[0] ? { lat: inWindow[0].lat, lng: inWindow[0].lng } : null,
  };
}

function makeFactSlide(photo, photoIndex) {
  const coords = photo.coords
    ? { lat: photo.coords[0], lng: photo.coords[1] }
    : null;
  return {
    type:      'fact',
    poi_id:    `fact_${photoIndex}`,
    poi_name:  photo.location ?? 'Nearby Point of Interest',
    coords,
    legIndex:  0,
  };
}

export function buildSlideDeck(photos, breadcrumbs = [], _legs = []) {
  if (!photos.length) return [];

  const sorted = [...photos].sort((a, b) =>
    new Date(a.timestamp) - new Date(b.timestamp)
  );

  const slides = [];
  let photoCount = 0;

  for (let i = 0; i < sorted.length; i++) {
    const photo = sorted[i];
    const prev  = sorted[i - 1];

    // Breadcrumb gap slide
    if (prev) {
      const ms = new Date(photo.timestamp) - new Date(prev.timestamp);
      if (ms > GAP_THRESHOLD_MS) {
        slides.push(makeBreadcrumbSlide(prev, photo, breadcrumbs));
      }
    }

    // Photo slide
    slides.push({
      type:    'photo',
      photo,
      bearing: deriveBearing(photo, breadcrumbs),
      coords:  photo.coords ? { lat: photo.coords[0], lng: photo.coords[1] } : null,
    });
    photoCount++;

    // Fact slide every FACT_EVERY photos
    if (photoCount % FACT_EVERY === 0) {
      slides.push(makeFactSlide(photo, photoCount));
    }
  }

  return slides;
}
