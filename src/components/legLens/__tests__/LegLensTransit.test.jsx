import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LegLensFlight } from '../LegLensFlight.jsx';
import { LegLensTrain } from '../LegLensTrain.jsx';
import { LegLensBus } from '../LegLensBus.jsx';
import { LegLensFerry } from '../LegLensFerry.jsx';
import { LegLensBoat } from '../LegLensBoat.jsx';

const flightMeta = { mode: 'flight', carrier: 'LATAM', flightNumber: 'LA800', departureTerminal: 'T2', arrivalTerminal: 'T1', seat: '24A', baggageAllowanceKg: 23, layovers: [], visaRequired: false, lastHydratedAt: '' };
const trainMeta  = { mode: 'train',  carrier: 'DB',    trainNumber: 'ICE 1234', departureStation: 'Munich Hbf', departurePlatform: '14', arrivalStation: 'Salzburg Hbf', arrivalPlatform: '2', classRef: '1st', seat: '45B', transfers: [], lastHydratedAt: '' };
const busMeta    = { mode: 'bus',    carrier: 'FlixBus', routeNumber: 'F301', departureStop: 'ZOB München', arrivalStop: 'Santiago', seat: 'Row 12', restroomBreaks: 2, lastHydratedAt: '' };
const ferryMeta  = { mode: 'ferry',  carrier: 'Navimag', vesselName: 'Evangelistas', departurePort: 'Puerto Montt', arrivalPort: 'Puerto Natales', vehicleCarried: true, customsAtPort: false, cabinRef: 'C12', tideWindow: null, lastHydratedAt: '' };
const boatMeta   = { mode: 'boat',   marina: 'Puerto Natales Marina', anchorages: ['Caleta Brecknock'], portFees: 40, weatherWindowDate: '2026-11-15', tidesUrl: null, lastHydratedAt: '' };

const baseLeg = { id: 1, waypoints: [] };

describe('LegLensFlight', () => {
  it('shows carrier name', () => {
    render(<LegLensFlight leg={{ ...baseLeg, mode: 'flight', legMeta: flightMeta }} onHydrate={() => {}} />);
    expect(screen.getByText(/LATAM/)).toBeInTheDocument();
  });
  it('shows flight number', () => {
    render(<LegLensFlight leg={{ ...baseLeg, mode: 'flight', legMeta: flightMeta }} onHydrate={() => {}} />);
    expect(screen.getByText(/LA800/)).toBeInTheDocument();
  });
  it('shows seat', () => {
    render(<LegLensFlight leg={{ ...baseLeg, mode: 'flight', legMeta: flightMeta }} onHydrate={() => {}} />);
    expect(screen.getByText(/24A/)).toBeInTheDocument();
  });
  it('shows loading when no legMeta', () => {
    render(<LegLensFlight leg={{ ...baseLeg, mode: 'flight' }} onHydrate={() => {}} />);
    expect(screen.getByText(/flight intelligence/i)).toBeInTheDocument();
  });
});

describe('LegLensTrain', () => {
  it('shows train number', () => {
    render(<LegLensTrain leg={{ ...baseLeg, mode: 'train', legMeta: trainMeta }} onHydrate={() => {}} />);
    expect(screen.getByText(/ICE 1234/)).toBeInTheDocument();
  });
  it('shows departure platform', () => {
    render(<LegLensTrain leg={{ ...baseLeg, mode: 'train', legMeta: trainMeta }} onHydrate={() => {}} />);
    expect(screen.getByText(/14/)).toBeInTheDocument();
  });
  it('shows loading when no legMeta', () => {
    render(<LegLensTrain leg={{ ...baseLeg, mode: 'train' }} onHydrate={() => {}} />);
    expect(screen.getByText(/train intelligence/i)).toBeInTheDocument();
  });
});

describe('LegLensBus', () => {
  it('shows carrier', () => {
    render(<LegLensBus leg={{ ...baseLeg, mode: 'bus', legMeta: busMeta }} onHydrate={() => {}} />);
    expect(screen.getByText(/FlixBus/)).toBeInTheDocument();
  });
  it('shows restroom break count', () => {
    render(<LegLensBus leg={{ ...baseLeg, mode: 'bus', legMeta: busMeta }} onHydrate={() => {}} />);
    expect(screen.getByText(/Restroom breaks/i)).toBeInTheDocument();
  });
  it('shows loading when no legMeta', () => {
    render(<LegLensBus leg={{ ...baseLeg, mode: 'bus' }} onHydrate={() => {}} />);
    expect(screen.getByText(/bus intelligence/i)).toBeInTheDocument();
  });
});

describe('LegLensFerry', () => {
  it('shows vessel name', () => {
    render(<LegLensFerry leg={{ ...baseLeg, mode: 'ferry', legMeta: ferryMeta }} onHydrate={() => {}} />);
    expect(screen.getByText(/Evangelistas/)).toBeInTheDocument();
  });
  it('shows vehicle carried badge when true', () => {
    render(<LegLensFerry leg={{ ...baseLeg, mode: 'ferry', legMeta: ferryMeta }} onHydrate={() => {}} />);
    expect(screen.getByText(/vehicle/i)).toBeInTheDocument();
  });
  it('shows loading when no legMeta', () => {
    render(<LegLensFerry leg={{ ...baseLeg, mode: 'ferry' }} onHydrate={() => {}} />);
    expect(screen.getByText(/ferry intelligence/i)).toBeInTheDocument();
  });
});

describe('LegLensBoat', () => {
  it('shows marina name', () => {
    render(<LegLensBoat leg={{ ...baseLeg, mode: 'boat', legMeta: boatMeta }} onHydrate={() => {}} />);
    expect(screen.getByText(/Puerto Natales Marina/)).toBeInTheDocument();
  });
  it('shows port fees', () => {
    render(<LegLensBoat leg={{ ...baseLeg, mode: 'boat', legMeta: boatMeta }} onHydrate={() => {}} />);
    expect(screen.getByText(/40/)).toBeInTheDocument();
  });
  it('shows loading when no legMeta', () => {
    render(<LegLensBoat leg={{ ...baseLeg, mode: 'boat' }} onHydrate={() => {}} />);
    expect(screen.getByText(/boat intelligence/i)).toBeInTheDocument();
  });
});
