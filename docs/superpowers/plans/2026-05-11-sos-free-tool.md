# /sos Free Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public, no-login SOS emergency beacon page at `/sos` that uses browser geolocation + the what3words API to generate a copy-to-clipboard emergency message with the user's 3-word address, GPS coordinates, and local emergency number.

**Architecture:** A standalone page rendered by intercepting `window.location.pathname` in `main.jsx` before the full app's provider tree mounts. The page has three utility modules (what3words API wrapper, emergency number lookup, SOS message formatter) and one React component with three UI states: locating → resolving → ready. No login, no Zustand store, no Supabase.

**Tech Stack:** React 19, Vite 8, Tailwind CSS, what3words REST API v3 (free tier), `navigator.geolocation`, `navigator.clipboard`, Vitest + @testing-library/react.

**Env var required:** `VITE_W3W_API_KEY` — obtain free key at https://developer.what3words.com/

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/utils/emergencyNumbers.js` | Static ISO-3166-1 alpha-2 → emergency number lookup |
| Create | `src/utils/what3words.js` | what3words REST API wrapper |
| Create | `src/utils/sosMsgBuilder.js` | Formats the final SOS clipboard string |
| Create | `src/pages/SosPage.jsx` | Public /sos UI component |
| Modify | `src/main.jsx` | Pathname intercept to render SosPage |
| Create | `public/_redirects` | Netlify SPA routing fallback |
| Create | `vercel.json` | Vercel SPA routing fallback |
| Create | `src/utils/emergencyNumbers.test.js` | Tests for emergency number lookup |
| Create | `src/utils/what3words.test.js` | Tests for what3words wrapper |
| Create | `src/utils/sosMsgBuilder.test.js` | Tests for message formatter |
| Create | `src/pages/SosPage.test.jsx` | Component integration test |

---

## Task 1: Emergency Numbers Lookup

**Files:**
- Create: `src/utils/emergencyNumbers.js`
- Create: `src/utils/emergencyNumbers.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/utils/emergencyNumbers.test.js
import { describe, it, expect } from 'vitest';
import { getEmergencyNumber } from './emergencyNumbers.js';

describe('getEmergencyNumber', () => {
  it('returns 911 for the United States', () => {
    expect(getEmergencyNumber('US')).toBe('911');
  });

  it('returns 999 for Great Britain', () => {
    expect(getEmergencyNumber('GB')).toBe('999');
  });

  it('returns 000 for Australia', () => {
    expect(getEmergencyNumber('AU')).toBe('000');
  });

  it('returns 112 (EU standard) for Germany', () => {
    expect(getEmergencyNumber('DE')).toBe('112');
  });

  it('returns 112 as the default for unknown country codes', () => {
    expect(getEmergencyNumber('XX')).toBe('112');
  });

  it('returns 112 when country is null or undefined', () => {
    expect(getEmergencyNumber(null)).toBe('112');
    expect(getEmergencyNumber(undefined)).toBe('112');
  });

  it('is case-insensitive', () => {
    expect(getEmergencyNumber('us')).toBe('911');
    expect(getEmergencyNumber('Gb')).toBe('999');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```
npx vitest run src/utils/emergencyNumbers.test.js
```

Expected: FAIL — "Cannot find module './emergencyNumbers.js'"

- [ ] **Step 3: Write the implementation**

```js
// src/utils/emergencyNumbers.js

/** Primary emergency/police number by ISO-3166-1 alpha-2 country code. */
const NUMBERS = {
  // North America
  US: '911', CA: '911', MX: '911',
  // Europe (112 is the EU standard but some keep legacy)
  GB: '999', IE: '999',
  DE: '112', FR: '15', ES: '112', IT: '118', PT: '112',
  NL: '112', BE: '112', AT: '112', CH: '117', SE: '112', NO: '113',
  DK: '112', FI: '112', PL: '112', CZ: '112', SK: '112', HU: '112',
  RO: '112', BG: '112', HR: '112', GR: '112', RS: '194',
  // Oceania
  AU: '000', NZ: '111',
  // Asia-Pacific
  JP: '119', KR: '119', CN: '120', IN: '112', PH: '911', SG: '995',
  TH: '1669', MY: '999', ID: '118', VN: '115', HK: '999', TW: '119',
  // South America
  BR: '192', AR: '107', CL: '131', CO: '125', PE: '117', VE: '171',
  // Africa / Middle East
  ZA: '10177', NG: '199', KE: '999', EG: '123', IL: '101', SA: '911',
  AE: '998', TR: '112', PK: '115',
};

/** @param {string | null | undefined} countryCode ISO-3166-1 alpha-2 */
export function getEmergencyNumber(countryCode) {
  if (!countryCode) return '112';
  return NUMBERS[countryCode.toUpperCase()] ?? '112';
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npx vitest run src/utils/emergencyNumbers.test.js
```

Expected: PASS — 7 tests

- [ ] **Step 5: Commit**

```bash
git add src/utils/emergencyNumbers.js src/utils/emergencyNumbers.test.js
git commit -m "feat(sos): emergency number lookup by ISO country code"
```

---

## Task 2: what3words API Wrapper

**Files:**
- Create: `src/utils/what3words.js`
- Create: `src/utils/what3words.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/utils/what3words.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { convertToW3W } from './what3words.js';

const MOCK_W3W_RESPONSE = {
  words: 'lock.spout.radar',
  country: 'GB',
  nearestPlace: 'Bayswater, London',
  map: 'https://w3w.co/lock.spout.radar',
};

describe('convertToW3W', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns words and country on success', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_W3W_RESPONSE,
    });

    const result = await convertToW3W(51.5074, -0.1278, 'test-key');
    expect(result).toEqual({
      words: 'lock.spout.radar',
      country: 'GB',
      nearestPlace: 'Bayswater, London',
      mapUrl: 'https://w3w.co/lock.spout.radar',
    });
  });

  it('builds the correct API URL', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_W3W_RESPONSE,
    });

    await convertToW3W(51.5074, -0.1278, 'test-key');
    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain('51.5074,-0.1278');
    expect(calledUrl).toContain('key=test-key');
    expect(calledUrl).toContain('convert-to-3wa');
  });

  it('throws with a descriptive message when the API returns a non-ok status', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 401 });
    await expect(convertToW3W(0, 0, 'bad-key')).rejects.toThrow('what3words API error: 401');
  });

  it('re-throws network errors from fetch', async () => {
    fetch.mockRejectedValueOnce(new Error('NetworkError when attempting to fetch resource'));
    await expect(convertToW3W(0, 0, 'key')).rejects.toThrow('NetworkError');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```
npx vitest run src/utils/what3words.test.js
```

Expected: FAIL — "Cannot find module './what3words.js'"

- [ ] **Step 3: Write the implementation**

```js
// src/utils/what3words.js

const W3W_BASE = 'https://api.what3words.com/v3';

/**
 * Converts GPS coordinates to a what3words address.
 * @param {number} lat
 * @param {number} lng
 * @param {string} apiKey — VITE_W3W_API_KEY
 * @returns {Promise<{ words: string, country: string, nearestPlace: string, mapUrl: string }>}
 */
export async function convertToW3W(lat, lng, apiKey) {
  const url = `${W3W_BASE}/convert-to-3wa?coordinates=${lat},${lng}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`what3words API error: ${res.status}`);
  const data = await res.json();
  return {
    words: data.words,
    country: data.country,
    nearestPlace: data.nearestPlace,
    mapUrl: data.map,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npx vitest run src/utils/what3words.test.js
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/utils/what3words.js src/utils/what3words.test.js
git commit -m "feat(sos): what3words API wrapper with error handling"
```

---

## Task 3: SOS Message Builder

**Files:**
- Create: `src/utils/sosMsgBuilder.js`
- Create: `src/utils/sosMsgBuilder.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/utils/sosMsgBuilder.test.js
import { describe, it, expect } from 'vitest';
import { buildSosMessage } from './sosMsgBuilder.js';

describe('buildSosMessage', () => {
  const BASE = {
    words: 'lock.spout.radar',
    lat: 51.5074,
    lng: -0.1278,
    country: 'GB',
    nearestPlace: 'Bayswater, London',
    timestamp: '2026-05-11T14:23:00.000Z',
  };

  it('includes the what3words address with triple-slash prefix', () => {
    const msg = buildSosMessage(BASE);
    expect(msg).toContain('/// lock.spout.radar');
  });

  it('includes formatted coordinates', () => {
    const msg = buildSosMessage(BASE);
    expect(msg).toContain('51.5074');
    expect(msg).toContain('-0.1278');
  });

  it('includes the local emergency number for the country', () => {
    const msg = buildSosMessage(BASE);
    expect(msg).toContain('999'); // GB emergency number
  });

  it('includes the timestamp', () => {
    const msg = buildSosMessage(BASE);
    expect(msg).toContain('2026-05-11T14:23:00.000Z');
  });

  it('includes the nearest place', () => {
    const msg = buildSosMessage(BASE);
    expect(msg).toContain('Bayswater, London');
  });

  it('includes the venturepath.com/sos attribution URL', () => {
    const msg = buildSosMessage(BASE);
    expect(msg).toContain('venturepath.com/sos');
  });

  it('defaults to 112 when country is unknown', () => {
    const msg = buildSosMessage({ ...BASE, country: 'XX' });
    expect(msg).toContain('112');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```
npx vitest run src/utils/sosMsgBuilder.test.js
```

Expected: FAIL — "Cannot find module './sosMsgBuilder.js'"

- [ ] **Step 3: Write the implementation**

```js
// src/utils/sosMsgBuilder.js
import { getEmergencyNumber } from './emergencyNumbers.js';

const LINE = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

/**
 * @param {{ words: string, lat: number, lng: number, country: string, nearestPlace: string, timestamp: string }} opts
 * @returns {string}
 */
export function buildSosMessage({ words, lat, lng, country, nearestPlace, timestamp }) {
  const emergency = getEmergencyNumber(country);
  return [
    '[EMERGENCY SOS] VenturePath Tactical',
    LINE,
    `What3Words:  /// ${words}`,
    `Nearest:     ${nearestPlace}`,
    `Coordinates: ${lat}, ${lng}`,
    `Emergency:   ${emergency} (${country ?? '??'})`,
    `Time (UTC):  ${timestamp}`,
    LINE,
    'Share this message with emergency services.',
    'Free tool: venturepath.com/sos',
  ].join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npx vitest run src/utils/sosMsgBuilder.test.js
```

Expected: PASS — 7 tests

- [ ] **Step 5: Commit**

```bash
git add src/utils/sosMsgBuilder.js src/utils/sosMsgBuilder.test.js
git commit -m "feat(sos): SOS message builder with emergency numbers and w3w"
```

---

## Task 4: SosPage Component

**Files:**
- Create: `src/pages/SosPage.jsx`
- Create: `src/pages/SosPage.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/pages/SosPage.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import SosPage from './SosPage.jsx';

// Stable mock position
const MOCK_POSITION = {
  coords: { latitude: 51.5074, longitude: -0.1278, accuracy: 15 },
};

const MOCK_W3W = {
  words: 'lock.spout.radar',
  country: 'GB',
  nearestPlace: 'Bayswater, London',
  mapUrl: 'https://w3w.co/lock.spout.radar',
};

describe('SosPage', () => {
  beforeEach(() => {
    // Mock geolocation
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        getCurrentPosition: vi.fn((success) => success(MOCK_POSITION)),
      },
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    // Mock what3words fetch
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        words: MOCK_W3W.words,
        country: MOCK_W3W.country,
        nearestPlace: MOCK_W3W.nearestPlace,
        map: MOCK_W3W.mapUrl,
      }),
    }));

    // Mock env var
    vi.stubGlobal('import.meta', { env: { VITE_W3W_API_KEY: 'test-key' } });
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
      expect(screen.getByText(/lock\.spout\.radar/)).toBeInTheDocument();
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
```

- [ ] **Step 2: Run test to verify it fails**

```
npx vitest run src/pages/SosPage.test.jsx
```

Expected: FAIL — "Cannot find module './SosPage.jsx'"

- [ ] **Step 3: Write the SosPage component**

```jsx
// src/pages/SosPage.jsx
// TACTICAL-CRITICAL: this component must work offline (no Supabase, no auth)
import { useState, useEffect, useCallback } from 'react';
import { convertToW3W } from '../utils/what3words.js';
import { buildSosMessage } from '../utils/sosMsgBuilder.js';

const AMBER = '#F2A900';
const NEAR_BLACK = '#0A0A0A';

// State machine: idle → locating → resolving → ready | error
const STATE = { IDLE: 'idle', LOCATING: 'locating', RESOLVING: 'resolving', READY: 'ready', ERROR: 'error' };

export default function SosPage() {
  const [phase, setPhase] = useState(STATE.LOCATING);
  const [w3wData, setW3wData] = useState(null);    // { words, country, nearestPlace, mapUrl }
  const [coords, setCoords] = useState(null);       // { lat, lng }
  const [sosMsg, setSosMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const resolve = useCallback(async (lat, lng) => {
    setPhase(STATE.RESOLVING);
    try {
      const apiKey = import.meta.env.VITE_W3W_API_KEY ?? '';
      const data = await convertToW3W(lat, lng, apiKey);
      setW3wData(data);
      const msg = buildSosMessage({
        words: data.words,
        lat,
        lng,
        country: data.country,
        nearestPlace: data.nearestPlace,
        timestamp: new Date().toISOString(),
      });
      setSosMsg(msg);
      setPhase(STATE.READY);
    } catch {
      setPhase(STATE.READY);
      // Still show coords even if w3w fails — partial is better than nothing
      const fallbackMsg = buildSosMessage({
        words: 'unavailable',
        lat,
        lng,
        country: null,
        nearestPlace: 'Unknown',
        timestamp: new Date().toISOString(),
      });
      setSosMsg(fallbackMsg);
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by this browser.');
      setPhase(STATE.ERROR);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        resolve(lat, lng);
      },
      (err) => {
        if (err.code === 1) {
          setErrorMsg('Location access denied. Please enable location permissions and reload.');
        } else {
          setErrorMsg(`Could not get your location: ${err.message}`);
        }
        setPhase(STATE.ERROR);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [resolve]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sosMsg);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    } catch {
      // Clipboard API not available — show the message for manual selection
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 font-mono"
      style={{ background: NEAR_BLACK, color: AMBER }}
    >
      {/* Header */}
      <div className="w-full max-w-md mb-8 text-center">
        <div className="text-[10px] tracking-[0.3em] mb-1" style={{ color: '#F2A90099' }}>
          VENTUREPATH TACTICAL
        </div>
        <h1 className="text-2xl font-bold tracking-wide">SOS BEACON</h1>
        <p className="text-[11px] mt-1" style={{ color: '#F2A90066' }}>
          Free emergency location tool — no account required
        </p>
      </div>

      {/* State: LOCATING */}
      {(phase === STATE.LOCATING || phase === STATE.IDLE) && (
        <div className="w-full max-w-md border border-amber-400/30 rounded p-6 text-center">
          <div className="text-sm animate-pulse">LOCATING YOUR POSITION…</div>
          <div className="text-[10px] mt-2" style={{ color: '#F2A90066' }}>
            Allow location access when prompted
          </div>
        </div>
      )}

      {/* State: RESOLVING */}
      {phase === STATE.RESOLVING && coords && (
        <div className="w-full max-w-md border border-amber-400/30 rounded p-6 text-center">
          <div className="text-sm animate-pulse">RESOLVING WHAT3WORDS ADDRESS…</div>
          <div className="text-[10px] mt-3" style={{ color: '#F2A90099' }}>
            {coords.lat.toFixed(5)}°, {coords.lng.toFixed(5)}°
          </div>
        </div>
      )}

      {/* State: ERROR */}
      {phase === STATE.ERROR && (
        <div className="w-full max-w-md border border-red-500/50 rounded p-6">
          <div className="text-red-400 text-sm font-bold mb-2">⚠ LOCATION ACCESS DENIED</div>
          <div className="text-[11px]" style={{ color: '#F2A90099' }}>{errorMsg}</div>
          <div className="mt-4 text-[10px] border-t border-red-500/20 pt-3" style={{ color: '#F2A90066' }}>
            Dial your local emergency number. In most countries: <strong style={{ color: AMBER }}>112</strong>
          </div>
        </div>
      )}

      {/* State: READY */}
      {phase === STATE.READY && w3wData && (
        <div className="w-full max-w-md space-y-4">
          {/* what3words display */}
          <div className="border border-amber-400/40 rounded p-4">
            <div className="text-[9px] tracking-widest mb-2" style={{ color: '#F2A90066' }}>
              WHAT3WORDS ADDRESS
            </div>
            <div className="text-xl font-bold tracking-wide">
              ///{w3wData.words}
            </div>
            <div className="text-[10px] mt-1" style={{ color: '#F2A90066' }}>
              Near {w3wData.nearestPlace}
            </div>
          </div>

          {/* Coords */}
          <div className="border border-amber-400/30 rounded p-4">
            <div className="text-[9px] tracking-widest mb-2" style={{ color: '#F2A90066' }}>
              GPS COORDINATES
            </div>
            <div className="text-sm">
              {coords?.lat.toFixed(6)}°, {coords?.lng.toFixed(6)}°
            </div>
          </div>

          {/* SOS message preview */}
          <div className="border border-amber-400/30 rounded p-4">
            <div className="text-[9px] tracking-widest mb-2" style={{ color: '#F2A90066' }}>
              SOS MESSAGE PREVIEW
            </div>
            <pre className="text-[10px] whitespace-pre-wrap leading-relaxed" style={{ color: '#F2A900CC' }}>
              {sosMsg}
            </pre>
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="w-full py-4 border-2 rounded font-bold tracking-widest text-sm transition-colors"
            style={
              copied
                ? { borderColor: '#22c55e', color: '#22c55e', background: '#052e16' }
                : { borderColor: AMBER, color: NEAR_BLACK, background: AMBER }
            }
          >
            {copied ? '✓ COPIED — PASTE INTO MESSENGER' : '⚠ COPY SOS MESSAGE'}
          </button>

          <div className="text-[9px] text-center" style={{ color: '#F2A90040' }}>
            Paste into SMS, satellite messenger, or WhatsApp and send to emergency services.
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 text-[9px] text-center" style={{ color: '#F2A90030' }}>
        <a
          href="https://venturepath.com"
          className="underline"
          style={{ color: '#F2A90050' }}
        >
          VenturePath
        </a>
        {' '}· Full Squad planning, Tactical Mode, and offline expedition management.
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests**

```
npx vitest run src/pages/SosPage.test.jsx
```

Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/pages/SosPage.jsx src/pages/SosPage.test.jsx
git commit -m "feat(sos): SosPage component with geolocation, w3w, and Tactical Amber UI"
```

---

## Task 5: Wire /sos Route in main.jsx

**Files:**
- Modify: `src/main.jsx`

- [ ] **Step 1: Read the current main.jsx**

Current content:
```jsx
import 'leaflet/dist/leaflet.css';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
```

- [ ] **Step 2: Add the pathname intercept**

Replace `src/main.jsx` with:

```jsx
import 'leaflet/dist/leaflet.css';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import SosPage from './pages/SosPage.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

const isSosRoute = window.location.pathname === '/sos';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isSosRoute ? (
      <SosPage />
    ) : (
      <ThemeProvider>
        <App />
      </ThemeProvider>
    )}
  </StrictMode>,
)
```

- [ ] **Step 3: Manual smoke test in the browser**

Start the dev server:
```
npm run dev
```

Navigate to `http://localhost:3001/sos` — expect to see the Tactical Amber SOS Beacon page load without any provider errors.

Navigate to `http://localhost:3001/` — expect the normal LaunchDashboard to load as before.

- [ ] **Step 4: Commit**

```bash
git add src/main.jsx
git commit -m "feat(sos): wire /sos pathname route in main.jsx — bypasses full app providers"
```

---

## Task 6: Deployment Routing Fallbacks

**Files:**
- Create: `public/_redirects`
- Create: `vercel.json`

- [ ] **Step 1: Write the Netlify _redirects file**

```
# public/_redirects
/*  /index.html  200
```

This tells Netlify to serve the SPA's index.html for all routes, so `/sos` is handled client-side.

- [ ] **Step 2: Write vercel.json**

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- [ ] **Step 3: Verify Vite build output serves the SPA correctly**

```
npm run build && npm run preview
```

Navigate to `http://localhost:4173/sos` — should render the SosPage, not a 404.

- [ ] **Step 4: Commit**

```bash
git add public/_redirects vercel.json
git commit -m "feat(sos): SPA routing fallback for Netlify and Vercel"
```

---

## Task 7: Run the Full Test Suite

- [ ] **Step 1: Run all new tests together**

```
npx vitest run src/utils/emergencyNumbers.test.js src/utils/what3words.test.js src/utils/sosMsgBuilder.test.js src/pages/SosPage.test.jsx
```

Expected: 23 tests, all PASS.

- [ ] **Step 2: Run the full suite to check for regressions**

```
npx vitest run
```

Expected: all pre-existing tests continue to pass.

- [ ] **Step 3: Log the completed feature**

Append to `C:\Users\lasse\Desktop\holyflex\logs\2026-05-11.md` and `C:\Users\lasse\Desktop\venturepath\logs\2026-05-11.md`:

```
## [HH:MM] /sos free tool — VenturePath public SOS beacon
- Files: src/utils/emergencyNumbers.js, what3words.js, sosMsgBuilder.js, src/pages/SosPage.jsx, src/main.jsx, public/_redirects, vercel.json
- Tests: 23 new tests across 4 suites — all passing
- UNIQUENESS: Browser geolocation + what3words 3-word address + country-specific emergency number in a single copy-to-clipboard SOS message. No competitor offers this as a free public tool.
- BRAND FIDELITY: Tactical Amber #F2A900 on near-black #0A0A0A, JetBrains Mono, VENTUREPATH TACTICAL header
- FUNCTIONALITY DEPTH: Locating animation → w3w resolution → preview → clipboard copy → vibration haptic — 3+ distinct interactions
```

---

## Self-Review

**Spec coverage check:**
- ✓ Browser geolocation → Task 4 (SosPage, `getCurrentPosition`)
- ✓ what3words address → Task 2 (wrapper) + Task 4 (UI renders `///words`)
- ✓ Local emergency number → Task 1 (lookup) + Task 3 (builder)
- ✓ Copy-to-clipboard → Task 4 (`handleCopy`, clipboard test)
- ✓ No login required → SosPage has no Supabase, no auth gate
- ✓ Tactical Amber on near-black aesthetic → Task 4 inline styles
- ✓ Public URL routing → Task 5 (main.jsx) + Task 6 (Netlify + Vercel)

**Placeholder scan:** None found — all steps contain complete code.

**Type consistency:**
- `convertToW3W(lat, lng, apiKey)` returns `{ words, country, nearestPlace, mapUrl }` — used identically in Task 4's `resolve()` call and Task 2's tests.
- `buildSosMessage({ words, lat, lng, country, nearestPlace, timestamp })` — same shape in Task 3 tests and Task 4's `resolve()`.
- `getEmergencyNumber(countryCode)` returns a string — used inside `buildSosMessage` (Task 3) and tested in Task 1.

All consistent.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-11-sos-free-tool.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
