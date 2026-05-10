import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.DOMParser = dom.window.DOMParser;

const SAMPLE_GPX = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk><trkseg>
    <trkpt lat="38.7" lon="-9.1">
      <ele>120</ele>
      <time>2026-11-12T10:00:00Z</time>
      <extensions><gpxtpx:TrackPointExtension>
        <gpxtpx:hr>142</gpxtpx:hr>
      </gpxtpx:TrackPointExtension></extensions>
    </trkpt>
    <trkpt lat="38.8" lon="-9.2">
      <ele>200</ele>
      <time>2026-11-12T10:30:00Z</time>
    </trkpt>
  </trkseg></trk>
</gpx>`;

const parser = new DOMParser();
const doc = parser.parseFromString(SAMPLE_GPX, 'application/xml');
console.log('doc:', doc);
console.log('querySelectorAll trkpt:', doc.querySelectorAll('trkpt'));
