// scripts/lib/auto-detect.js
/**
 * Run quality checks on a city object freshly fetched from OTM.
 * Returns array of issue objects (without id/reportedAt — queue.js adds those).
 */

const NON_ASCII_RE = /[^\x00-\x7F]/g;
const GENERIC_DESC_RE = /^A notable (landmark|food|activity|hidden_gem|place) in .+\.$/;

export function detectIssues(cityObj) {
  const issues = [];

  // Missing hero image
  if (!cityObj.image_url || cityObj.image_url.trim() === '') {
    issues.push({
      cityId:   cityObj.id,
      cityName: cityObj.name,
      country:  cityObj.country,
      type:     'missing_image',
      poiId:    null,
      detail:   'No image_url found after Wikipedia fetch',
      source:   'auto_detect',
    });
  }

  // Too few POIs
  if (cityObj.pois.length < 4) {
    issues.push({
      cityId:   cityObj.id,
      cityName: cityObj.name,
      country:  cityObj.country,
      type:     'missing_pois',
      poiId:    null,
      detail:   `Only ${cityObj.pois.length} POIs fetched (minimum 4)`,
      source:   'auto_detect',
    });
  }

  // Per-POI checks
  for (const poi of cityObj.pois) {
    // Non-English description: strip the POI name itself before scoring so local
    // spellings (Háskóli Íslands, Schloss, Château…) don't falsely trigger.
    // Flag only when >55% of the remaining body text is non-ASCII.
    const bodyText = poi.description.replace(poi.name, '').trim();
    const nonAscii = (bodyText.match(NON_ASCII_RE) ?? []).length;
    const ratio = nonAscii / Math.max(bodyText.length, 1);
    if (ratio > 0.55) {
      issues.push({
        cityId:   cityObj.id,
        cityName: cityObj.name,
        country:  cityObj.country,
        type:     'wrong_language',
        poiId:    poi.id,
        detail:   `Description body appears non-English (${Math.round(ratio * 100)}% non-ASCII): "${poi.description.slice(0, 80)}"`,
        source:   'auto_detect',
      });
    }

    // Generic fallback description
    if (GENERIC_DESC_RE.test(poi.description.trim())) {
      issues.push({
        cityId:   cityObj.id,
        cityName: cityObj.name,
        country:  cityObj.country,
        type:     'bad_poi',
        poiId:    poi.id,
        detail:   `Generic fallback description: "${poi.description}"`,
        source:   'auto_detect',
      });
    }

    // Empty POI name
    if (!poi.name || poi.name.trim() === '') {
      issues.push({
        cityId:   cityObj.id,
        cityName: cityObj.name,
        country:  cityObj.country,
        type:     'bad_poi',
        poiId:    poi.id,
        detail:   'POI has empty name',
        source:   'auto_detect',
      });
    }
  }

  return issues;
}
