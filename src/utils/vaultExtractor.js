// src/utils/vaultExtractor.js
// Regex-based document field extraction for VentureVault booking documents
// Patterns: confirmation numbers, IATA codes, dates, prices, carriers

const IATA = '[A-Z]{3}';
const IATA_RE = new RegExp(`(?:departs?|from|origin)[^A-Z]*?(${IATA})`, 'i');
const IATA_DEST_RE = new RegExp(`(?:arrives?|to|destination)[^A-Z]*?(${IATA})`, 'i');
const CONFIRM_RE = /confirmation[:\s#]+([A-Z0-9]{4,12})/i;
const DATE_ISO_RE = /(\d{4}-\d{2}-\d{2})/g;
const PRICE_RE = /(?:total|amount|price)[:\s]+[€$£]?([\d,]+\.?\d{0,2})/i;
const CARRIER_RE = /(?:carrier|airline|operated by)[:\s]+([A-Za-z ]{3,40})/i;

/**
 * Extract structured fields from raw vault document text.
 * Returns object with extracted fields and confidence score based on field count.
 *
 * @param {string} raw - Raw document text
 * @returns {Object} - { confirmation, origin, destination, dates, price, carrier, confidence }
 */
export function extractVaultDocument(raw) {
  const result = {
    confirmation: null,
    origin: null,
    destination: null,
    dates: { start: null, end: null },
    price: null,
    carrier: null,
    confidence: 'low',
  };

  // Extract confirmation number (e.g., "Confirmation: ABC123")
  const confirmMatch = raw.match(CONFIRM_RE);
  if (confirmMatch) result.confirmation = confirmMatch[1].toUpperCase();

  // Extract origin IATA code (e.g., "departs LIS")
  const originMatch = raw.match(IATA_RE);
  if (originMatch) result.origin = originMatch[1].toUpperCase();

  // Extract destination IATA code (e.g., "arrives BCN")
  const destMatch = raw.match(IATA_DEST_RE);
  if (destMatch) result.destination = destMatch[1].toUpperCase();

  // Extract ISO dates (e.g., "2026-11-12")
  const dates = [...raw.matchAll(DATE_ISO_RE)].map(m => m[1]);
  if (dates[0]) result.dates.start = dates[0];
  if (dates[1]) result.dates.end = dates[1];

  // Extract price (e.g., "Total: €240.50")
  const priceMatch = raw.match(PRICE_RE);
  if (priceMatch) result.price = parseFloat(priceMatch[1].replace(',', ''));

  // Extract carrier name (e.g., "Carrier: TAP Air Portugal")
  const carrierMatch = raw.match(CARRIER_RE);
  if (carrierMatch) result.carrier = carrierMatch[1].trim();

  // Calculate confidence: high if 3+ fields extracted, else low
  const fieldCount = [
    result.confirmation,
    result.origin,
    result.destination,
    result.dates.start,
    result.price,
    result.carrier,
  ].filter(Boolean).length;

  result.confidence = fieldCount >= 3 ? 'high' : 'low';

  return result;
}
