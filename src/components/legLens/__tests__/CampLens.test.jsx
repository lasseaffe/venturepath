// src/components/legLens/__tests__/CampLens.test.jsx
import { render, screen } from '@testing-library/react';
import { CampLens } from '../CampLens';

const stay = { id: 'stay-1', name: 'Chiemsee Süd', kind: 'camp' };

const campMeta = {
  siteType: 'tent',
  bearCountry: true,
  bearStorage: 'canister-required',
  fireRules: { permitted: false, stoveOnly: true },
  waterSource: { type: 'stream', treatRequired: true, distanceM: 200 },
  sanitation: 'pack-out',
  permits: [{ name: 'NPS backcountry' }],
  alternates: ['alt-stay-1'],
};

describe('CampLens', () => {
  it('renders camp name in header', () => {
    render(<CampLens stay={stay} campMeta={campMeta} />);
    expect(screen.getByText(/Chiemsee Süd/)).toBeInTheDocument();
  });

  it('shows fire ban stove-only text', () => {
    render(<CampLens stay={stay} campMeta={campMeta} />);
    expect(screen.getByText('Stove only')).toBeInTheDocument();
  });

  it('shows water source with treat required', () => {
    render(<CampLens stay={stay} campMeta={campMeta} />);
    expect(screen.getByText(/treat required/)).toBeInTheDocument();
  });

  it('shows bear country warning', () => {
    render(<CampLens stay={stay} campMeta={campMeta} />);
    expect(screen.getByText(/canister-required/)).toBeInTheDocument();
  });

  it('shows permit name', () => {
    render(<CampLens stay={stay} campMeta={campMeta} />);
    expect(screen.getByText(/NPS backcountry/)).toBeInTheDocument();
  });

  it('shows Wild Pitch badge for wild kind', () => {
    render(<CampLens stay={{ ...stay, kind: 'wild' }} campMeta={campMeta} />);
    expect(screen.getByText('Wild Pitch')).toBeInTheDocument();
  });

  it('renders gracefully with empty campMeta', () => {
    render(<CampLens stay={stay} campMeta={{}} />);
    expect(screen.getByText(/Chiemsee Süd/)).toBeInTheDocument();
    expect(screen.getByText('None required')).toBeInTheDocument();
  });
});
