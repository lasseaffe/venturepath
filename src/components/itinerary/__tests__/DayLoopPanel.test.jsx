import { render, screen, fireEvent } from '@testing-library/react';
import { DayLoopPanel } from '../DayLoopPanel';

const dayLoop = {
  id: 'loop-1',
  date: '2026-05-16',
  homebaseStayId: 'stay-1',
  stopIds: ['poi-1', 'poi-2'],
  autoLegIds: ['leg-r1'],
  planningMode: 'semi',
};
const stay = { id: 'stay-1', name: 'Hotel Hafen', coords: [53.54, 9.98], isHomebase: true };
const pois = [
  { id: 'poi-1', name: 'Kunsthalle', category: 'museum' },
  { id: 'poi-2', name: 'Speicherstadt', category: 'district' },
];

describe('DayLoopPanel', () => {
  it('renders homebase as first item', () => {
    render(<DayLoopPanel dayLoop={dayLoop} stay={stay} pois={pois} onAddStop={vi.fn()} />);
    expect(screen.getByText('Hotel Hafen')).toBeInTheDocument();
  });

  it('renders each stop in order', () => {
    render(<DayLoopPanel dayLoop={dayLoop} stay={stay} pois={pois} onAddStop={vi.fn()} />);
    const items = screen.getAllByRole('listitem');
    expect(items[1]).toHaveTextContent('Kunsthalle');
    expect(items[2]).toHaveTextContent('Speicherstadt');
  });

  it('renders auto-return as last item', () => {
    render(<DayLoopPanel dayLoop={dayLoop} stay={stay} pois={pois} onAddStop={vi.fn()} />);
    expect(screen.getByText('Return to Hotel Hafen')).toBeInTheDocument();
  });

  it('calls onAddStop when Add Stop button is clicked', () => {
    const onAddStop = vi.fn();
    render(<DayLoopPanel dayLoop={dayLoop} stay={stay} pois={pois} onAddStop={onAddStop} />);
    fireEvent.click(screen.getByText(/Add Stop/));
    expect(onAddStop).toHaveBeenCalledOnce();
  });
});
