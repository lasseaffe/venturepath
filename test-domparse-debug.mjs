import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const { window } = dom;
const parser = new window.DOMParser();

const SAMPLE_GPX = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk><trkseg>
    <trkpt lat="38.7" lon="-9.1">
      <ele>120</ele>
      <time>2026-11-12T10:00:00Z</time>
    </trkpt>
  </trkseg></trk>
</gpx>`;

console.log('Test 1: application/xml');
let doc = parser.parseFromString(SAMPLE_GPX, 'application/xml');
console.log('docElement:', doc.documentElement.tagName);
console.log('trkpt count:', doc.getElementsByTagName('trkpt').length);

console.log('\nTest 2: text/xml');
doc = parser.parseFromString(SAMPLE_GPX, 'text/xml');
console.log('docElement:', doc.documentElement.tagName);
console.log('trkpt count:', doc.getElementsByTagName('trkpt').length);

// Try accessing the root
const root = doc.documentElement;
console.log('\nRoot tag:', root.tagName);
const children = root.children;
console.log('Root children count:', children.length);
if (children.length > 0) {
  console.log('First child:', children[0].tagName);
}
