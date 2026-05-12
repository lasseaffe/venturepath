import { render, screen, fireEvent } from '@testing-library/react';
import { CascadeConfirmSheet } from '../CascadeConfirmSheet';

const createMockPreviews = () => ({
  budget:    { label: '💰 Budget',    value: '+€3.80', apply: vi.fn() },
  packing:   { label: '🎒 Packing',   value: '2 items', apply: vi.fn() },
  map:       { label: '🗺️ Route',     value: '2.8 km',  apply: vi.fn() },
  elevation: { label: '⛰️ Elevation', value: 'Updating', apply: vi.fn() },
  transit:   { label: '🚌 Transit',   value: 'Fetching', apply: vi.fn() },
  tactical:  { label: '🛡️ Tactical',  value: 'Caching',  apply: vi.fn() },
  squad:     { label: '👥 Squad',     value: 'Notifying', apply: vi.fn() },
  ledger:    { label: '⚖️ Ledger',    value: 'Checking',  apply: vi.fn() },
});

describe('CascadeConfirmSheet', () => {
  it('renders all 8 tool preview cards', () => {
    const mockPreviews = createMockPreviews();
    render(<CascadeConfirmSheet previews={mockPreviews} stopName="Kunsthalle" onApply={vi.fn()} onDiscard={vi.fn()} dispatch={vi.fn()} />);
    expect(screen.getByText('+€3.80')).toBeInTheDocument();
    expect(screen.getByText('2 items')).toBeInTheDocument();
    expect(screen.getByText('2.8 km')).toBeInTheDocument();
  });

  it('calls apply() for all previews and onApply() when Apply all clicked', () => {
    const mockPreviews = createMockPreviews();
    const onApply = vi.fn();
    const dispatch = vi.fn();
    render(<CascadeConfirmSheet previews={mockPreviews} stopName="Kunsthalle" onApply={onApply} onDiscard={vi.fn()} dispatch={dispatch} />);
    fireEvent.click(screen.getByText('Apply all changes'));
    Object.values(mockPreviews).forEach(p => expect(p.apply).toHaveBeenCalledWith(dispatch));
    expect(onApply).toHaveBeenCalledOnce();
  });

  it('calls onDiscard when Discard is clicked without calling apply', () => {
    const mockPreviews = createMockPreviews();
    const onDiscard = vi.fn();
    render(<CascadeConfirmSheet previews={mockPreviews} stopName="Kunsthalle" onApply={vi.fn()} onDiscard={onDiscard} dispatch={vi.fn()} />);
    fireEvent.click(screen.getByText('Discard'));
    expect(onDiscard).toHaveBeenCalledOnce();
    Object.values(mockPreviews).forEach(p => expect(p.apply).not.toHaveBeenCalled());
  });
});
