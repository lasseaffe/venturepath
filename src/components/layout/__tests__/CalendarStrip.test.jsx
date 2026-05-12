import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarStrip } from '../CalendarStrip';

const trip = { startDate: '2026-05-14', endDate: '2026-05-17' };
const dayLoops = [
  { id: 'loop-1', date: '2026-05-14', homebaseStayId: 'stay-1', stopIds: [] },
  { id: 'loop-2', date: '2026-05-15', homebaseStayId: 'stay-1', stopIds: ['poi-1', 'poi-2'] },
  { id: 'loop-3', date: '2026-05-16', homebaseStayId: 'stay-1', stopIds: ['poi-3'] },
];
const stays = [{ id: 'stay-1', checkin: '2026-05-14', checkout: '2026-05-17', isHomebase: true }];

describe('CalendarStrip', () => {
  it('renders an ALL chip and one chip per trip day', () => {
    render(<CalendarStrip trip={trip} dayLoops={dayLoops} stays={stays} selectedDate={null} onSelectDate={vi.fn()} />);
    expect(screen.getByText('ALL')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('16')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
  });

  it('shows stop count on days that have stops', () => {
    render(<CalendarStrip trip={trip} dayLoops={dayLoops} stays={stays} selectedDate={null} onSelectDate={vi.fn()} />);
    expect(screen.getByText('2 stops')).toBeInTheDocument();
    expect(screen.getByText('1 stop')).toBeInTheDocument();
  });

  it('calls onSelectDate with the ISO date when a day chip is clicked', () => {
    const onSelectDate = vi.fn();
    render(<CalendarStrip trip={trip} dayLoops={dayLoops} stays={stays} selectedDate={null} onSelectDate={onSelectDate} />);
    fireEvent.click(screen.getByText('15'));
    expect(onSelectDate).toHaveBeenCalledWith('2026-05-15');
  });

  it('calls onSelectDate with null when ALL is clicked', () => {
    const onSelectDate = vi.fn();
    render(<CalendarStrip trip={trip} dayLoops={dayLoops} stays={stays} selectedDate='2026-05-15' onSelectDate={onSelectDate} />);
    fireEvent.click(screen.getByText('ALL'));
    expect(onSelectDate).toHaveBeenCalledWith(null);
  });
});
