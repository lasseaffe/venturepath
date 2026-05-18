function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PROFILE_TO_TYPE = {
  foot: 'hiking',
  cycling: 'cycling',
  mtb: 'mountain biking',
  car: 'driving',
  boat: 'sailing',
};

export function exportTrackToGpx(track) {
  const wpts = track.waypoints.map(w => {
    const p = track.points[w.idx] ?? track.points[0];
    return `  <wpt lat="${p.lat}" lon="${p.lng}">
    <name>${esc(w.name)}</name>
    <type>${esc(w.category)}</type>${w.note ? `\n    <desc>${esc(w.note)}</desc>` : ''}
  </wpt>`;
  }).join('\n');

  const trkpts = track.points.map(p => {
    const ele = p.ele != null ? `<ele>${p.ele}</ele>` : '';
    const time = p.time ? `<time>${esc(p.time)}</time>` : '';
    return `      <trkpt lat="${p.lat}" lon="${p.lng}">${ele}${time}</trkpt>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="VenturePath Studio" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${esc(track.name)}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
${wpts}
  <trk>
    <name>${esc(track.name)}</name>
    <type>${esc(PROFILE_TO_TYPE[track.profile] ?? 'hiking')}</type>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}

export function downloadTrackGpx(track) {
  const xml = exportTrackToGpx(track);
  const blob = new Blob([xml], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${track.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.gpx`;
  a.click();
  URL.revokeObjectURL(url);
}
