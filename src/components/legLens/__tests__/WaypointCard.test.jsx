import { render, screen, fireEvent } from '@testing-library/react';
import { WaypointCard } from '../WaypointCard';

const waypoint = {
  id: 'w1',
  category: 'toll',
  name: 'A9 Gantry 3',
  kmFromStart: 47,
  estCost: 8.5,
  estDurationMin: 2,
  status: 'planned',
  bookingRef: null,
  notes: null,
};

describe('WaypointCard', () => {
  it('renders waypoint name', () => {
    render(<WaypointCard waypoint={waypoint} onConfirm={vi.fn()} onBook={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText('A9 Gantry 3')).toBeInTheDocument();
  });

  it('renders distance and cost', () => {
    render(<WaypointCard waypoint={waypoint} onConfirm={vi.fn()} onBook={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText(/47 km/)).toBeInTheDocument();
    expect(screen.getByText(/€8.50/)).toBeInTheDocument();
  });

  it('calls onConfirm with waypoint id', () => {
    const onConfirm = vi.fn();
    render(<WaypointCard waypoint={waypoint} onConfirm={onConfirm} onBook={vi.fn()} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledWith('w1');
  });

  it('calls onDismiss with waypoint id', () => {
    const onDismiss = vi.fn();
    render(<WaypointCard waypoint={waypoint} onConfirm={vi.fn()} onBook={vi.fn()} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByText('Dismiss'));
    expect(onDismiss).toHaveBeenCalledWith('w1');
  });

  it('disables Book button when bookingRef is set', () => {
    const booked = { ...waypoint, bookingRef: 'REF123' };
    render(<WaypointCard waypoint={booked} onConfirm={vi.fn()} onBook={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText('Book')).toBeDisabled();
  });

  it('calls onBook when not already booked', () => {
    const onBook = vi.fn();
    render(<WaypointCard waypoint={waypoint} onConfirm={vi.fn()} onBook={onBook} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByText('Book'));
    expect(onBook).toHaveBeenCalledWith('w1');
  });
});
