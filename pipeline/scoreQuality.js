export function scoreQuality(path) {
  const checks = [
    !!path.name,
    !!path.description && path.description.length > 40,
    Array.isArray(path.legs) && path.legs.length >= 2,
    !!path.difficulty,
    !!path.climate,
    !!path.cover_image_url,
    !!path.destination,
    typeof path.days === 'number' && path.days > 0,
  ];
  const score = checks.filter(Boolean).length / checks.length;
  return Math.round(score * 100) / 100;
}
