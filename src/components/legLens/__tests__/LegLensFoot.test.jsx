import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LegLensFoot } from '../LegLensFoot.jsx';

const BASE_LEG = { id: 3, mode: 'foot', from: 'Trailhead', to: 'Summit', durationH: 8, distanceKm: 22, coords: [[48, 11], [48.2, 11.2]] };

describe('LegLensFoot', () => {
  it('shows loading state when no legMeta', () => {
    render(<LegLensFoot leg={BASE_LEG} onHydrate={() => {}} />);
    expect(screen.getByText(/Calculating trail intelligence/i)).toBeInTheDocument();
  });

  it('shows elevation gain when legMeta present', () => {
    const leg = { ...BASE_LEG, legMeta: { elevationProfile: { gainM: 450, lossM: 120, maxElevM: 2800, minElevM: 1200 }, permits: [], bearCountry: false, gpxFileId: null } };
    render(<LegLensFoot leg={leg} onHydrate={() => {}} />);
    expect(screen.getByText(/450/)).toBeInTheDocument();
  });

  it('shows elevation loss', () => {
    const leg = { ...BASE_LEG, legMeta: { elevationProfile: { gainM: 450, lossM: 120, maxElevM: 2800, minElevM: 1200 }, permits: [], bearCountry: false, gpxFileId: null } };
    render(<LegLensFoot leg={leg} onHydrate={() => {}} />);
    expect(screen.getByText(/120/)).toBeInTheDocument();
  });

  it('shows bear country warning when bearCountry is true', () => {
    const leg = { ...BASE_LEG, legMeta: { elevationProfile: { gainM: 0, lossM: 0, maxElevM: 0, minElevM: 0 }, permits: [], bearCountry: true, gpxFileId: null } };
    render(<LegLensFoot leg={leg} onHydrate={() => {}} />);
    expect(screen.getByText(/bear country/i)).toBeInTheDocument();
  });

  it('shows permit name when permits array has entries', () => {
    const leg = { ...BASE_LEG, legMeta: { elevationProfile: { gainM: 0, lossM: 0, maxElevM: 0, minElevM: 0 }, permits: [{ name: 'W Circuit Permit', status: 'required' }], bearCountry: false, gpxFileId: null } };
    render(<LegLensFoot leg={leg} onHydrate={() => {}} />);
    expect(screen.getByText(/W Circuit Permit/i)).toBeInTheDocument();
  });

  it('shows water waypoints', () => {
    const leg = { ...BASE_LEG, waypoints: [{ id: 'w1', category: 'water', name: 'Rio Ascencio Spring', status: 'planned' }], legMeta: { elevationProfile: { gainM: 0, lossM: 0, maxElevM: 0, minElevM: 0 }, permits: [], bearCountry: false, gpxFileId: null } };
    render(<LegLensFoot leg={leg} onHydrate={() => {}} />);
    expect(screen.getByText(/Rio Ascencio Spring/i)).toBeInTheDocument();
  });

  it('shows GPX upload CTA when gpxFileId is null', () => {
    const leg = { ...BASE_LEG, legMeta: { elevationProfile: { gainM: 0, lossM: 0, maxElevM: 0, minElevM: 0 }, permits: [], bearCountry: false, gpxFileId: null } };
    render(<LegLensFoot leg={leg} onHydrate={() => {}} />);
    expect(screen.getByText(/upload gpx/i)).toBeInTheDocument();
  });
});
