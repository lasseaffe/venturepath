import { describe, it, expect } from 'vitest';
import { extractVaultDocument } from './vaultExtractor';

describe('extractVaultDocument', () => {
  it('extracts confirmation number', () => {
    const result = extractVaultDocument('Booking Confirmation: ABC123 Thank you');
    expect(result.confirmation).toBe('ABC123');
  });

  it('extracts IATA origin and destination', () => {
    const result = extractVaultDocument('Flight departs LIS arrives BCN on 12 Nov 2026');
    expect(result.origin).toBe('LIS');
    expect(result.destination).toBe('BCN');
  });

  it('extracts ISO date', () => {
    const result = extractVaultDocument('Check-in: 2026-11-12, Check-out: 2026-11-15');
    expect(result.dates.start).toBe('2026-11-12');
    expect(result.dates.end).toBe('2026-11-15');
  });

  it('extracts price', () => {
    const result = extractVaultDocument('Total amount: €240.50');
    expect(result.price).toBe(240.5);
  });

  it('extracts carrier name', () => {
    const result = extractVaultDocument('Carrier: TAP Air Portugal');
    expect(result.carrier).toBe('TAP Air Portugal');
  });

  it('returns low confidence when fewer than 3 fields found', () => {
    const result = extractVaultDocument('Hello world nothing here');
    expect(result.confidence).toBe('low');
  });

  it('returns high confidence when 3+ fields found', () => {
    const result = extractVaultDocument(
      'Confirmation: XY789 Flight LIS to BCN Total: $180'
    );
    expect(result.confidence).toBe('high');
  });
});
