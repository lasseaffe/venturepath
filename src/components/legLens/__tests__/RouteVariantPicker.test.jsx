import { render, screen, fireEvent } from '@testing-library/react';
import { RouteVariantPicker } from '../RouteVariantPicker';

const variants = [
  { variant: 'fastest', durationH: 3.5, distanceKm: 280 },
  { variant: 'toll-free', durationH: 4.1, distanceKm: 302 },
  { variant: 'scenic', durationH: 4.8, distanceKm: 310 },
];

describe('RouteVariantPicker', () => {
  it('renders all three variants', () => {
    render(<RouteVariantPicker routeVariants={variants} activeVariant="fastest" onSelect={vi.fn()} />);
    expect(screen.getByText('Fastest')).toBeInTheDocument();
    expect(screen.getByText('Toll-free')).toBeInTheDocument();
    expect(screen.getByText('Scenic')).toBeInTheDocument();
  });

  it('marks the active variant as pressed', () => {
    render(<RouteVariantPicker routeVariants={variants} activeVariant="toll-free" onSelect={vi.fn()} />);
    expect(screen.getByText('Toll-free').closest('button')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Fastest').closest('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onSelect with the variant string when clicked', () => {
    const onSelect = vi.fn();
    render(<RouteVariantPicker routeVariants={variants} activeVariant="fastest" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Toll-free'));
    expect(onSelect).toHaveBeenCalledWith('toll-free');
  });

  it('shows delta minutes for non-fastest variants', () => {
    render(<RouteVariantPicker routeVariants={variants} activeVariant="fastest" onSelect={vi.fn()} />);
    // toll-free is 4.1 - 3.5 = 0.6h = 36 min
    expect(screen.getByText('+36 min')).toBeInTheDocument();
  });

  it('renders empty state gracefully with no variants', () => {
    const { container } = render(<RouteVariantPicker routeVariants={[]} activeVariant="fastest" onSelect={vi.fn()} />);
    expect(container.firstChild).toBeTruthy();
  });
});
