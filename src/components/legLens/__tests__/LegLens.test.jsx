import { render, screen, fireEvent } from '@testing-library/react';
import { LegLens } from '../LegLens';

const carLeg = {
  id: 'leg-1',
  mode: 'car',
  legMeta: {
    tolls: { totalEst: 0, byCountry: {} },
    routeVariants: [
      { variant: 'fastest', durationH: 2.0, distanceKm: 180 },
      { variant: 'toll-free', durationH: 2.5, distanceKm: 195 },
      { variant: 'scenic', durationH: 3.0, distanceKm: 210 },
    ],
    activeVariant: 'fastest',
  },
  waypoints: [],
};

const flightLeg = { id: 'leg-2', mode: 'flight', legMeta: null, waypoints: [] };

const props = {
  onVariantSelect: vi.fn(),
  onWaypointConfirm: vi.fn(),
  onWaypointBook: vi.fn(),
  onWaypointDismiss: vi.fn(),
  onHydrate: vi.fn(),
  onClose: vi.fn(),
};

describe('LegLens', () => {
  it('renders the Leg Lens header with mode label', () => {
    render(<LegLens leg={carLeg} {...props} />);
    expect(screen.getByText(/Leg Lens — Drive/)).toBeInTheDocument();
  });

  it('renders LegLensCar for car mode', () => {
    render(<LegLens leg={carLeg} {...props} />);
    // RouteVariantPicker is rendered inside LegLensCar
    expect(screen.getByText('Fastest')).toBeInTheDocument();
  });

  it('renders placeholder for non-car mode', () => {
    render(<LegLens leg={flightLeg} {...props} />);
    expect(screen.getByText(/Flight Leg Intelligence/)).toBeInTheDocument();
    expect(screen.getByText(/Mode-specific intelligence/)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<LegLens leg={carLeg} {...props} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close Leg Lens'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders nothing when leg is null', () => {
    const { container } = render(<LegLens leg={null} {...props} />);
    expect(container.firstChild).toBeNull();
  });

  it('has aria-label "Leg Lens" on the aside', () => {
    render(<LegLens leg={carLeg} {...props} />);
    expect(screen.getByRole('complementary', { name: 'Leg Lens' })).toBeInTheDocument();
  });
});
