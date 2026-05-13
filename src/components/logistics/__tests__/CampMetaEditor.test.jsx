import { render, screen, fireEvent } from '@testing-library/react';
import { CampMetaEditor } from '../CampMetaEditor';

const mockUpdateCampMeta = vi.fn();

vi.mock('../../../store/useTripStore', () => ({
  useTripStore: () => ({ updateCampMeta: mockUpdateCampMeta }),
}));

beforeEach(() => { mockUpdateCampMeta.mockClear(); });

const stay = { id: 'stay-1', name: 'Wild Camp', kind: 'wild', campMeta: { siteType: 'tent', bearCountry: false } };

describe('CampMetaEditor', () => {
  it('renders Camp Configuration header with stay name', () => {
    render(<CampMetaEditor stay={stay} />);
    expect(screen.getByText(/Camp Configuration — Wild Camp/)).toBeInTheDocument();
  });

  it('renders site type selector with current value', () => {
    render(<CampMetaEditor stay={stay} />);
    expect(screen.getByDisplayValue('tent')).toBeInTheDocument();
  });

  it('calls updateCampMeta when site type changes', () => {
    render(<CampMetaEditor stay={stay} />);
    fireEvent.change(screen.getByDisplayValue('tent'), { target: { value: 'hammock' } });
    expect(mockUpdateCampMeta).toHaveBeenCalledWith('stay-1', { siteType: 'hammock' });
  });

  it('Bear country toggle calls updateCampMeta with bearCountry:true when toggled on', () => {
    render(<CampMetaEditor stay={stay} />);
    // Bear country is false — toggle is aria-pressed=false; find it by aria-label
    const toggle = screen.getByLabelText('Bear country toggle');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(mockUpdateCampMeta).toHaveBeenCalledWith('stay-1', { bearCountry: true });
  });

  it('Fire toggle calls updateCampMeta with permitted:false when toggled off', () => {
    render(<CampMetaEditor stay={stay} />);
    const toggle = screen.getByLabelText('Fire permitted toggle');
    // currently permitted === true (undefined !== false), so aria-pressed=true
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(toggle);
    expect(mockUpdateCampMeta).toHaveBeenCalledWith('stay-1', { fireRules: { permitted: false } });
  });
});
