import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddStopFlow } from '../AddStopFlow';

global.fetch = vi.fn();

afterEach(() => vi.clearAllMocks());

describe('AddStopFlow — search', () => {
  it('renders the search input', () => {
    render(<AddStopFlow dayLoopId="loop-1" homebaseCoords={[53.54, 9.98]} onAdd={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument();
  });

  it('fetches Foursquare results on input and shows them', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { fsq_id: 'fsq-1', name: 'Kunsthalle Hamburg', categories: [{ name: 'museum' }], geocodes: { main: { latitude: 53.56, longitude: 10.0 } }, distance: 1400 },
        ],
      }),
    });

    render(<AddStopFlow dayLoopId="loop-1" homebaseCoords={[53.54, 9.98]} onAdd={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Search/i), { target: { value: 'Kunsthalle' } });

    await waitFor(() => expect(screen.getByText('Kunsthalle Hamburg')).toBeInTheDocument());
  });

  it('calls onAdd with stop object when result is selected', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { fsq_id: 'fsq-1', name: 'Kunsthalle Hamburg', categories: [{ name: 'museum' }], geocodes: { main: { latitude: 53.56, longitude: 10.0 } }, distance: 1400 },
        ],
      }),
    });

    const onAdd = vi.fn();
    render(<AddStopFlow dayLoopId="loop-1" homebaseCoords={[53.54, 9.98]} onAdd={onAdd} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Search/i), { target: { value: 'Kunsthalle' } });
    await waitFor(() => screen.getByText('Kunsthalle Hamburg'));
    fireEvent.click(screen.getByText('Kunsthalle Hamburg'));
    fireEvent.click(screen.getByText(/Add to Day/i));

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
      id: 'fsq-1',
      name: 'Kunsthalle Hamburg',
      coords: [53.56, 10.0],
      category: 'museum',
    }));
  });
});
