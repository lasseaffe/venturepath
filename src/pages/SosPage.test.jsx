// src/pages/SosPage.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SosPage from './SosPage.jsx';

const MOCK_POSITION = {
  coords: { latitude: 51.5074, longitude: -0.1278, accuracy: 15 },
};

const MOCK_W3W_API_RESPONSE = {
  words: 'lock.spout.radar',
  country: 'GB',
  nearestPlace: 'Bayswater, London',
  map: 'https://w3w.co/lock.spout.radar',
};

describe('SosPage', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn((success) => success(MOCK_POSITION)),
      },
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      vibrate: undefined,
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_W3W_API_RESPONSE,
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows LOCATING state on first render', () => {
    render(<SosPage />);
    expect(screen.getByText(/LOCATING/i)).toBeInTheDocument();
  });

  it('shows the what3words address after resolving', async () => {
    render(<SosPage />);
    await waitFor(() => {
      // words appear in both the w3w panel and the pre preview — use getAllByText
      expect(screen.getAllByText(/lock\.spout\.radar/).length).toBeGreaterThan(0);
    });
  });

  it('renders the COPY SOS MESSAGE button when ready', async () => {
    render(<SosPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy sos message/i })).toBeInTheDocument();
    });
  });

  it('copies message to clipboard when button is clicked', async () => {
    render(<SosPage />);
    await waitFor(() => screen.getByRole('button', { name: /copy sos message/i }));
    fireEvent.click(screen.getByRole('button', { name: /copy sos message/i }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledOnce();
      const copied = navigator.clipboard.writeText.mock.calls[0][0];
      expect(copied).toContain('/// lock.spout.radar');
      expect(copied).toContain('999'); // GB number
    });
  });

  it('shows an error message when geolocation is denied', async () => {
    navigator.geolocation.getCurrentPosition = vi.fn((_, err) =>
      err({ code: 1, message: 'User denied geolocation' })
    );
    render(<SosPage />);
    await waitFor(() => {
      expect(screen.getByText(/location access denied/i)).toBeInTheDocument();
    });
  });
});
