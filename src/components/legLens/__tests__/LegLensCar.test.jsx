import { render, screen, fireEvent } from '@testing-library/react';
import { LegLensCar } from '../LegLensCar';

const legWithMeta = {
  id: 'leg-1',
  mode: 'car',
  legMeta: {
    tolls: { totalEst: 18.5, byCountry: { DE: 0, AT: 18.5 } },
    routeVariants: [
      { variant: 'fastest', durationH: 3.5, distanceKm: 280 },
      { variant: 'toll-free', durationH: 4.1, distanceKm: 302 },
      { variant: 'scenic', durationH: 4.8, distanceKm: 310 },
    ],
    activeVariant: 'fastest',
  },
  waypoints: [
    { id: 'w1', category: 'toll', name: 'A8 Gantry', kmFromStart: 50, estCost: 8.5, status: 'planned', bookingRef: null, notes: null },
  ],
};

const legNoMeta = { id: 'leg-2', mode: 'car', legMeta: null, waypoints: [] };

describe('LegLensCar', () => {
  it('renders route variant picker when legMeta present', () => {
    render(<LegLensCar leg={legWithMeta} onVariantSelect={vi.fn()} onWaypointConfirm={vi.fn()} onWaypointBook={vi.fn()} onWaypointDismiss={vi.fn()} onHydrate={vi.fn()} />);
    expect(screen.getByText('Fastest')).toBeInTheDocument();
    expect(screen.getByText('Toll-free')).toBeInTheDocument();
  });

  it('renders toll total when tolls present', () => {
    render(<LegLensCar leg={legWithMeta} onVariantSelect={vi.fn()} onWaypointConfirm={vi.fn()} onWaypointBook={vi.fn()} onWaypointDismiss={vi.fn()} onHydrate={vi.fn()} />);
    expect(screen.getByText(/Total:.*€18.50/)).toBeInTheDocument();
  });

  it('renders waypoint cards', () => {
    render(<LegLensCar leg={legWithMeta} onVariantSelect={vi.fn()} onWaypointConfirm={vi.fn()} onWaypointBook={vi.fn()} onWaypointDismiss={vi.fn()} onHydrate={vi.fn()} />);
    expect(screen.getByText('A8 Gantry')).toBeInTheDocument();
  });

  it('calls onHydrate when legMeta is null', () => {
    const onHydrate = vi.fn();
    render(<LegLensCar leg={legNoMeta} onVariantSelect={vi.fn()} onWaypointConfirm={vi.fn()} onWaypointBook={vi.fn()} onWaypointDismiss={vi.fn()} onHydrate={onHydrate} />);
    expect(onHydrate).toHaveBeenCalledWith('leg-2');
  });

  it('shows loading state when legMeta is null', () => {
    render(<LegLensCar leg={legNoMeta} onVariantSelect={vi.fn()} onWaypointConfirm={vi.fn()} onWaypointBook={vi.fn()} onWaypointDismiss={vi.fn()} onHydrate={vi.fn()} />);
    expect(screen.getByText(/Calculating route intelligence/)).toBeInTheDocument();
  });

  it('calls onVariantSelect with legId and variant', () => {
    const onVariantSelect = vi.fn();
    render(<LegLensCar leg={legWithMeta} onVariantSelect={onVariantSelect} onWaypointConfirm={vi.fn()} onWaypointBook={vi.fn()} onWaypointDismiss={vi.fn()} onHydrate={vi.fn()} />);
    fireEvent.click(screen.getByText('Toll-free'));
    expect(onVariantSelect).toHaveBeenCalledWith('leg-1', 'toll-free');
  });

  it('renders CampLens when nextStay.kind is wild', () => {
    const nextStay = { id: 'stay-w1', name: 'Wild Pitch Site', kind: 'wild', campMeta: { bearCountry: true } };
    render(<LegLensCar leg={legWithMeta} nextStay={nextStay} onVariantSelect={vi.fn()} onWaypointConfirm={vi.fn()} onWaypointBook={vi.fn()} onWaypointDismiss={vi.fn()} onHydrate={vi.fn()} />);
    expect(screen.getByText(/Wild Pitch Site/)).toBeInTheDocument();
  });

  it('does NOT render CampLens when nextStay.kind is hotel', () => {
    const nextStay = { id: 'stay-h1', name: 'Hotel Hafen', kind: 'hotel' };
    render(<LegLensCar leg={legWithMeta} nextStay={nextStay} onVariantSelect={vi.fn()} onWaypointConfirm={vi.fn()} onWaypointBook={vi.fn()} onWaypointDismiss={vi.fn()} onHydrate={vi.fn()} />);
    expect(screen.queryByText('Hotel Hafen')).not.toBeInTheDocument();
  });
});
