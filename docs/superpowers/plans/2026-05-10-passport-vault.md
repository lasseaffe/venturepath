# PassportVault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend VenturePath's existing VaultHub into a full Google Wallet-style PassportVault — boarding-pass ticket cards, barcode display, three import flows (manual/scan/email), squad sharing, time-aware surfacing, and a KanbanBoard "Documents" tab.

**Architecture:** Extend `useTripStore` with a `tickets` slice (typed, richer than the existing `vault.documents`), build shared UI components in `src/components/vault/`, surface them in three places (VAULT tab → `PassportVault`, KanbanBoard "DOCUMENTS" tab, Logistics `DocumentManifest`), and add API routes for barcode parsing and email import.

**Tech Stack:** React + JSX (existing), `useTripStore` (context/reducer), `sentinelBus` (event bus), IndexedDB via `idb` (install needed), `@zxing/browser` (install needed), `bwip-js` (install needed), Anthropic SDK (existing), Supabase (existing for file storage)

---

## File Map

**New files:**
- `src/components/vault/PassportVault.jsx` — global wallet page container
- `src/components/vault/TicketCard.jsx` — boarding-pass card, all ticket types
- `src/components/vault/TicketDetailDrawer.jsx` — slide-up detail with barcode + share
- `src/components/vault/TicketImportModal.jsx` — tabbed import: manual / scan / email
- `src/components/vault/TicketBarcodeRenderer.jsx` — renders QR/PDF417/Aztec/Code128
- `src/components/vault/DocumentManifest.jsx` — compact ticket list for Logistics panel
- `src/components/vault/DepartingSoonStrip.jsx` — dashboard widget, next 1–2 tickets
- `src/utils/ticketStore.js` — IndexedDB read/write for Tactical Mode caching
- `src/utils/sentinelBusEvents.js` — add `TICKET_ADDED`, `TICKET_SHARED` constants
- `src/pages/api/tickets/parse-barcode.js` — Claude barcode parsing endpoint
- `src/pages/api/tickets/email-import.js` — Gmail scan + Claude parse endpoint

**Modified files:**
- `src/store/useTripStore.jsx` — add `tickets: []` slice + 4 actions
- `src/components/itinerary/KanbanBoard.jsx` — add DOCUMENTS tab
- `src/components/logistics/PackingManifest.jsx` — add `DocumentManifest` collapsible section
- `src/components/dashboard/LaunchDashboard.jsx` — add `DepartingSoonStrip`
- `src/components/layout/Sidebar.jsx` — rename VAULT label to "PassportVault", update icon
- `src/pages/TripPlanner.jsx` — swap `VaultHub` → `PassportVault` for VAULT tab

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install barcode libraries**

```bash
cd /path/to/venturepath
npm install idb @zxing/browser bwip-js
```

Expected output: 3 packages added with no peer dep errors.

- [ ] **Step 2: Verify imports resolve**

```bash
node -e "require('idb'); require('bwip-js'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add idb, @zxing/browser, bwip-js for PassportVault"
```

---

## Task 2: Extend store with tickets slice

**Files:**
- Modify: `src/store/useTripStore.jsx`

- [ ] **Step 1: Add tickets to initial state**

In `useTripStore.jsx`, find the `initialState` object (around line 45) and add after the `vault` key:

```js
tickets: [],
```

- [ ] **Step 2: Add four reducer cases**

Find the `switch (action.type)` block and add these four cases before the `default`:

```js
case 'ADD_TICKET': {
  return { ...state, tickets: [...state.tickets, action.payload] };
}
case 'UPDATE_TICKET': {
  return {
    ...state,
    tickets: state.tickets.map(t =>
      t.id === action.payload.id ? { ...t, ...action.payload } : t
    ),
  };
}
case 'DELETE_TICKET': {
  return { ...state, tickets: state.tickets.filter(t => t.id !== action.payload) };
}
case 'SHARE_TICKET': {
  // payload: { ticketId, pioneerIds: string[] }
  return {
    ...state,
    tickets: state.tickets.map(t =>
      t.id === action.payload.ticketId
        ? { ...t, sharedWith: [...new Set([...(t.sharedWith ?? []), ...action.payload.pioneerIds])] }
        : t
    ),
  };
}
```

- [ ] **Step 3: Ensure tickets persists to localStorage**

Find the localStorage persist line (around line 250) that spreads `state.vault`. Confirm `tickets` is also spread:

```js
localStorage.setItem(STORAGE_KEY, JSON.stringify({
  ...state,
  vault: state.vault,
  tickets: state.tickets,   // add this line if missing
}));
```

- [ ] **Step 4: Add ticket shape JSDoc above initialState**

```js
/**
 * @typedef {Object} Ticket
 * @property {string} id - uuid
 * @property {'flight'|'transit'|'accommodation'|'access_pass'|'visa'|'document'} type
 * @property {string} title
 * @property {string} [provider]
 * @property {string} [referenceCode]
 * @property {string} [validFrom]   - ISO string
 * @property {string} [validUntil] - ISO string
 * @property {string} [barcodeData]
 * @property {'qr'|'pdf417'|'aztec'|'code128'} [barcodeType]
 * @property {string} [fileUrl]
 * @property {Object} [rawData]
 * @property {'manual'|'scan'|'email_import'} source
 * @property {boolean} isShared
 * @property {string[]} [sharedWith] - pioneer ids
 * @property {string} [expeditionId]
 * @property {string} createdAt - ISO string
 */
```

- [ ] **Step 5: Commit**

```bash
git add src/store/useTripStore.jsx
git commit -m "feat(store): add tickets slice with ADD/UPDATE/DELETE/SHARE actions"
```

---

## Task 3: IndexedDB Tactical Mode cache utility

**Files:**
- Create: `src/utils/ticketStore.js`

- [ ] **Step 1: Create the file**

```js
// src/utils/ticketStore.js
// TACTICAL-CRITICAL: this module must work offline — it is the sole data source
// for tickets in Tactical Mode when the store is unavailable.
import { openDB } from 'idb';

const DB_NAME = 'vp-passport-vault';
const STORE   = 'tickets';
const VERSION = 1;

function getDB() {
  return openDB(DB_NAME, VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    },
  });
}

/** Write tickets whose validFrom is within the next 48 hours to IndexedDB. */
export async function cacheSoonTickets(tickets) {
  const db = await getDB();
  const now = Date.now();
  const cutoff = now + 48 * 60 * 60 * 1000;
  const tx = db.transaction(STORE, 'readwrite');
  for (const ticket of tickets) {
    const ts = ticket.validFrom ? new Date(ticket.validFrom).getTime() : null;
    if (ts && ts >= now && ts <= cutoff) {
      await tx.store.put(ticket);
    }
  }
  await tx.done;
}

/** Read all cached tickets from IndexedDB (used in Tactical Mode). */
export async function getCachedTickets() {
  const db = await getDB();
  return db.getAll(STORE);
}

/** Remove a ticket from the cache (e.g. after it expires). */
export async function removeCachedTicket(id) {
  const db = await getDB();
  return db.delete(STORE, id);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/ticketStore.js
git commit -m "feat(utils): add IndexedDB ticket cache for Tactical Mode"
```

---

## Task 4: Add sentinelBus event constants

**Files:**
- Modify: `src/utils/sentinelBusEvents.js`

- [ ] **Step 1: Add two constants to the existing events file**

Open `src/utils/sentinelBusEvents.js`. At the bottom, add:

```js
export const TICKET_ADDED  = 'TICKET_ADDED';
export const TICKET_SHARED = 'TICKET_SHARED';
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/sentinelBusEvents.js
git commit -m "feat(events): add TICKET_ADDED and TICKET_SHARED bus events"
```

---

## Task 5: TicketBarcodeRenderer

**Files:**
- Create: `src/components/vault/TicketBarcodeRenderer.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/vault/TicketBarcodeRenderer.jsx
import { useEffect, useRef } from 'react';
import bwipjs from 'bwip-js';

const BCID_MAP = {
  qr:      'qrcode',
  pdf417:  'pdf417',
  aztec:   'azteccode',
  code128: 'code128',
};

/**
 * Renders a barcode/QR from raw string data onto a canvas.
 * @param {{ data: string, type: 'qr'|'pdf417'|'aztec'|'code128', className?: string }} props
 */
export default function TicketBarcodeRenderer({ data, type = 'qr', className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;
    try {
      bwipjs.toCanvas(canvasRef.current, {
        bcid:        BCID_MAP[type] ?? 'qrcode',
        text:        data,
        scale:       3,
        includetext: false,
        backgroundcolor: '0E1012',
        barcolor:        'D9C5B2',
      });
    } catch (err) {
      console.warn('TicketBarcodeRenderer: failed to render barcode', err);
    }
  }, [data, type]);

  if (!data) return null;

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ maxWidth: '100%', imageRendering: 'pixelated' }}
      aria-label="Ticket barcode"
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/vault/TicketBarcodeRenderer.jsx
git commit -m "feat(vault): add TicketBarcodeRenderer for QR/PDF417/Aztec/Code128"
```

---

## Task 6: TicketCard component

**Files:**
- Create: `src/components/vault/TicketCard.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/vault/TicketCard.jsx
import TicketBarcodeRenderer from './TicketBarcodeRenderer';

const TYPE_LAYOUTS = {
  flight:        'landscape',
  transit:       'portrait',
  accommodation: 'card',
  access_pass:   'stub',
  visa:          'minimal',
  document:      'minimal',
};

function CountdownBadge({ validFrom }) {
  if (!validFrom) return null;
  const ms = new Date(validFrom).getTime() - Date.now();
  if (ms < 0) return <span className="text-xs font-mono text-[#D9C5B2]">Departed</span>;
  const hours = Math.floor(ms / 3_600_000);
  const mins  = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 72) return null;
  return (
    <span className="text-xs font-mono text-[#E67E22]">
      {hours > 0 ? `Departs in ${hours}h` : `Departs in ${mins}m`}
    </span>
  );
}

function FlightCard({ ticket }) {
  const { rawData = {} } = ticket;
  return (
    <div className="relative flex rounded-xl overflow-hidden border border-white/10"
         style={{ background: '#0E1012', minHeight: 120 }}>
      {/* Left panel */}
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div className="flex items-center gap-2">
          <span className="font-playfair text-2xl text-white">{rawData.origin ?? '???'}</span>
          <span className="text-[#D9C5B2] text-lg">→</span>
          <span className="font-playfair text-2xl text-white">{rawData.destination ?? '???'}</span>
        </div>
        <div>
          <p className="font-mono text-xs text-[#D9C5B2]">{ticket.provider}</p>
          <CountdownBadge validFrom={ticket.validFrom} />
        </div>
      </div>
      {/* Tear-line divider */}
      <div className="w-px border-l border-dashed border-white/20 self-stretch mx-1" />
      {/* Right panel */}
      <div className="w-28 p-3 flex flex-col gap-1">
        {rawData.flightNumber && (
          <p className="font-mono text-xs text-white">{rawData.flightNumber}</p>
        )}
        {rawData.seat && (
          <p className="font-mono text-xs text-[#D9C5B2]">Seat {rawData.seat}</p>
        )}
        {rawData.gate && (
          <p className="font-mono text-xs text-[#D9C5B2]">Gate {rawData.gate}</p>
        )}
        {ticket.barcodeData && (
          <TicketBarcodeRenderer
            data={ticket.barcodeData}
            type={ticket.barcodeType ?? 'qr'}
            className="mt-auto w-full"
          />
        )}
      </div>
      {/* Shared badge */}
      {ticket.isShared && (
        <span className="absolute top-2 right-2 text-xs font-mono bg-[#E67E22]/20 text-[#E67E22] px-2 py-0.5 rounded">
          👥 {ticket.sharedWith?.length ?? 0}
        </span>
      )}
    </div>
  );
}

function TransitCard({ ticket }) {
  const { rawData = {} } = ticket;
  return (
    <div className="rounded-xl overflow-hidden border border-white/10"
         style={{ background: '#0E1012' }}>
      <div className="h-1.5" style={{ background: rawData.accentColor ?? '#E67E22' }} />
      <div className="p-4">
        <p className="font-playfair text-lg text-white">{ticket.provider}</p>
        <p className="font-mono text-sm text-[#D9C5B2] mt-1">{rawData.route ?? rawData.zone ?? '—'}</p>
        <p className="font-mono text-xs text-[#D9C5B2] mt-2">
          {ticket.validFrom ? new Date(ticket.validFrom).toLocaleDateString() : '—'}
          {ticket.validUntil ? ` → ${new Date(ticket.validUntil).toLocaleDateString()}` : ''}
        </p>
        {ticket.barcodeData && (
          <TicketBarcodeRenderer
            data={ticket.barcodeData}
            type={ticket.barcodeType ?? 'qr'}
            className="mt-3 w-full"
          />
        )}
      </div>
    </div>
  );
}

function AccommodationCard({ ticket }) {
  const { rawData = {} } = ticket;
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(ticket.referenceCode ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="rounded-xl border border-white/10 p-4" style={{ background: '#0E1012' }}>
      <p className="font-playfair text-xl text-white">{ticket.title}</p>
      <div className="flex gap-4 mt-2">
        <div>
          <p className="text-xs text-[#D9C5B2] font-mono">Check-in</p>
          <p className="text-sm text-white font-mono">
            {rawData.checkIn ? new Date(rawData.checkIn).toLocaleDateString() : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#D9C5B2] font-mono">Check-out</p>
          <p className="text-sm text-white font-mono">
            {rawData.checkOut ? new Date(rawData.checkOut).toLocaleDateString() : '—'}
          </p>
        </div>
      </div>
      {ticket.referenceCode && (
        <button
          onClick={copy}
          className="mt-3 font-mono text-xs text-[#E67E22] border border-[#E67E22]/30 rounded px-2 py-1 hover:bg-[#E67E22]/10 transition-colors"
        >
          {copied ? 'Copied!' : ticket.referenceCode}
        </button>
      )}
    </div>
  );
}

function AccessPassCard({ ticket }) {
  const { rawData = {} } = ticket;
  return (
    <div className="flex rounded-xl overflow-hidden border border-white/10"
         style={{ background: '#0E1012' }}>
      {/* Stub */}
      <div className="w-16 flex flex-col items-center justify-center bg-[#E67E22]/10 border-r border-dashed border-white/20 p-2">
        {ticket.barcodeData && (
          <TicketBarcodeRenderer
            data={ticket.barcodeData}
            type={ticket.barcodeType ?? 'qr'}
            className="w-full"
          />
        )}
      </div>
      <div className="flex-1 p-4">
        <p className="font-playfair text-lg text-white">{ticket.title}</p>
        {rawData.venue && <p className="font-mono text-xs text-[#D9C5B2]">{rawData.venue}</p>}
        {rawData.tier  && <p className="font-mono text-xs text-[#E67E22] mt-1">{rawData.tier}</p>}
        <p className="font-mono text-xs text-[#D9C5B2] mt-2">
          {ticket.validFrom ? new Date(ticket.validFrom).toLocaleDateString() : '—'}
        </p>
      </div>
    </div>
  );
}

function MinimalCard({ ticket }) {
  return (
    <div className="rounded-xl border border-white/10 p-4" style={{ background: '#0E1012' }}>
      <p className="font-playfair text-lg text-white">{ticket.title}</p>
      <p className="font-mono text-xs text-[#D9C5B2] mt-1">{ticket.provider}</p>
      {ticket.referenceCode && (
        <p className="font-mono text-xs text-[#E67E22] mt-2">{ticket.referenceCode}</p>
      )}
      <p className="font-mono text-xs text-[#D9C5B2] mt-1">
        {ticket.validFrom ? new Date(ticket.validFrom).toLocaleDateString() : '—'}
        {ticket.validUntil ? ` → ${new Date(ticket.validUntil).toLocaleDateString()}` : ''}
      </p>
    </div>
  );
}

import { useState } from 'react';

const CARD_MAP = {
  flight:        FlightCard,
  transit:       TransitCard,
  accommodation: AccommodationCard,
  access_pass:   AccessPassCard,
  visa:          MinimalCard,
  document:      MinimalCard,
};

/**
 * @param {{ ticket: Ticket, onClick?: () => void, tactical?: boolean }} props
 */
export default function TicketCard({ ticket, onClick, tactical = false }) {
  const Card = CARD_MAP[ticket.type] ?? MinimalCard;

  return (
    <div
      onClick={onClick}
      className="cursor-pointer transition-transform hover:scale-[1.01]"
      style={tactical ? { filter: 'sepia(1) hue-rotate(10deg) saturate(3)' } : {}}
    >
      <Card ticket={ticket} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/vault/TicketCard.jsx
git commit -m "feat(vault): add TicketCard with type-specific boarding-pass layouts"
```

---

## Task 7: TicketDetailDrawer

**Files:**
- Create: `src/components/vault/TicketDetailDrawer.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/vault/TicketDetailDrawer.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TicketBarcodeRenderer from './TicketBarcodeRenderer';
import { useTripStore } from '../../store/useTripStore';
import sentinelBus from '../../utils/sentinelBus';
import { TICKET_SHARED } from '../../utils/sentinelBusEvents';

// Seed squad members — replace with real squad context when squad feature is wired
const MOCK_SQUAD = [
  { id: 'p1', name: 'Alex', avatar: '🧭' },
  { id: 'p2', name: 'Jordan', avatar: '🗺' },
  { id: 'p3', name: 'Morgan', avatar: '⛰' },
];

/**
 * @param {{ ticket: Ticket|null, onClose: () => void }} props
 */
export default function TicketDetailDrawer({ ticket, onClose }) {
  const { dispatch } = useTripStore();
  const [shareOpen, setShareOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const [manageOpen, setManageOpen] = useState(false);

  function handleShare() {
    if (!selected.length) return;
    dispatch({ type: 'SHARE_TICKET', payload: { ticketId: ticket.id, pioneerIds: selected } });
    sentinelBus.emit(TICKET_SHARED, { ticketId: ticket.id, pioneerIds: selected });
    setShareOpen(false);
    setSelected([]);
  }

  function handleRevoke(pioneerId) {
    const next = (ticket.sharedWith ?? []).filter(id => id !== pioneerId);
    dispatch({ type: 'UPDATE_TICKET', payload: { id: ticket.id, sharedWith: next, isShared: next.length > 0 } });
  }

  function handleRevokeAll() {
    dispatch({ type: 'UPDATE_TICKET', payload: { id: ticket.id, sharedWith: [], isShared: false } });
    setManageOpen(false);
  }

  function handleDelete() {
    dispatch({ type: 'DELETE_TICKET', payload: ticket.id });
    onClose();
  }

  return (
    <AnimatePresence>
      {ticket && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70"
            onClick={onClose}
          />
          <motion.div
            key="drawer"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl p-6 overflow-y-auto max-h-[90dvh]"
            style={{ background: '#0E1012', color: 'white' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-playfair text-xl">{ticket.title}</p>
                <p className="font-mono text-xs text-[#D9C5B2] mt-0.5">{ticket.provider}</p>
              </div>
              <button onClick={onClose} className="text-[#D9C5B2] hover:text-white text-xl leading-none">✕</button>
            </div>

            {/* Barcode */}
            {ticket.barcodeData && (
              <div className="flex justify-center my-4 bg-black/30 rounded-xl p-4">
                <TicketBarcodeRenderer
                  data={ticket.barcodeData}
                  type={ticket.barcodeType ?? 'qr'}
                  className="max-w-xs w-full"
                />
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3 mb-4 font-mono text-sm">
              {ticket.referenceCode && (
                <div>
                  <p className="text-xs text-[#D9C5B2]">Reference</p>
                  <p className="text-[#E67E22]">{ticket.referenceCode}</p>
                </div>
              )}
              {ticket.validFrom && (
                <div>
                  <p className="text-xs text-[#D9C5B2]">Valid from</p>
                  <p>{new Date(ticket.validFrom).toLocaleString()}</p>
                </div>
              )}
              {ticket.validUntil && (
                <div>
                  <p className="text-xs text-[#D9C5B2]">Valid until</p>
                  <p>{new Date(ticket.validUntil).toLocaleString()}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-[#D9C5B2]">Source</p>
                <p className="capitalize">{ticket.source}</p>
              </div>
            </div>

            {/* Share with Squad */}
            {!shareOpen && !manageOpen && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShareOpen(true)}
                  className="flex-1 py-2 rounded-lg font-mono text-sm border border-[#E67E22]/50 text-[#E67E22] hover:bg-[#E67E22]/10 transition-colors"
                >
                  Share with Squad
                </button>
                {(ticket.sharedWith?.length > 0) && (
                  <button
                    onClick={() => setManageOpen(true)}
                    className="px-3 py-2 rounded-lg font-mono text-sm border border-white/10 text-[#D9C5B2] hover:bg-white/5"
                  >
                    Manage ({ticket.sharedWith.length})
                  </button>
                )}
              </div>
            )}

            {/* Pioneer selector */}
            {shareOpen && (
              <div className="mt-4">
                <p className="font-mono text-sm text-[#D9C5B2] mb-2">Select Pioneers:</p>
                <div className="flex flex-col gap-2">
                  {MOCK_SQUAD.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelected(s => s.includes(p.id) ? s.filter(x => x !== p.id) : [...s, p.id])}
                      className={[
                        'flex items-center gap-3 px-3 py-2 rounded-lg border font-mono text-sm transition-colors',
                        selected.includes(p.id)
                          ? 'border-[#E67E22] bg-[#E67E22]/10 text-white'
                          : 'border-white/10 text-[#D9C5B2]',
                      ].join(' ')}
                    >
                      <span>{p.avatar}</span>
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleShare}
                    disabled={!selected.length}
                    className="flex-1 py-2 rounded-lg font-mono text-sm bg-[#E67E22] text-white disabled:opacity-40"
                  >
                    Confirm Share
                  </button>
                  <button
                    onClick={() => { setShareOpen(false); setSelected([]); }}
                    className="px-3 py-2 rounded-lg font-mono text-sm border border-white/10 text-[#D9C5B2]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Manage sharing */}
            {manageOpen && (
              <div className="mt-4">
                <p className="font-mono text-sm text-[#D9C5B2] mb-2">Shared with:</p>
                {(ticket.sharedWith ?? []).map(id => {
                  const p = MOCK_SQUAD.find(m => m.id === id);
                  return (
                    <div key={id} className="flex items-center justify-between py-1.5">
                      <span className="font-mono text-sm">{p?.avatar} {p?.name ?? id}</span>
                      <button onClick={() => handleRevoke(id)} className="text-xs font-mono text-red-400 hover:text-red-300">
                        Remove
                      </button>
                    </div>
                  );
                })}
                <div className="flex gap-2 mt-3">
                  <button onClick={handleRevokeAll} className="text-xs font-mono text-red-400 border border-red-400/30 px-3 py-1.5 rounded-lg hover:bg-red-400/10">
                    Revoke All
                  </button>
                  <button onClick={() => setManageOpen(false)} className="text-xs font-mono text-[#D9C5B2] border border-white/10 px-3 py-1.5 rounded-lg">
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Delete */}
            {!shareOpen && !manageOpen && (
              <button
                onClick={handleDelete}
                className="mt-4 w-full py-2 rounded-lg font-mono text-xs text-red-400 border border-red-400/20 hover:bg-red-400/10 transition-colors"
              >
                Delete Ticket
              </button>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/vault/TicketDetailDrawer.jsx
git commit -m "feat(vault): add TicketDetailDrawer with barcode, share, revoke, delete"
```

---

## Task 8: Barcode parse API route

**Files:**
- Create: `src/pages/api/tickets/parse-barcode.js`

- [ ] **Step 1: Create the route**

```js
// src/pages/api/tickets/parse-barcode.js
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { barcodeData, barcodeType } = req.body;
  if (!barcodeData) return res.status(400).json({ error: 'barcodeData required' });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `You are parsing a travel ticket barcode. The barcode type is "${barcodeType ?? 'unknown'}". The raw decoded string is:\n\n${barcodeData}\n\nExtract all structured fields you can identify. Return ONLY a JSON object with these fields (omit any you cannot determine):\n{\n  "type": "flight|transit|accommodation|access_pass|visa|document",\n  "title": "",\n  "provider": "",\n  "referenceCode": "",\n  "validFrom": "ISO string or null",\n  "validUntil": "ISO string or null",\n  "rawData": {}\n}\n\nFor flights, include in rawData: origin, destination, flightNumber, seat, gate.\nFor transit, include in rawData: route, zone.\nFor accommodation, include in rawData: checkIn, checkOut.\nFor access_pass, include in rawData: venue, tier.`,
      },
    ],
  });

  try {
    const text = message.content[0].text.trim();
    const json = JSON.parse(text.replace(/^```json\n?/, '').replace(/\n?```$/, ''));
    res.json({ parsed: json });
  } catch {
    res.json({ parsed: null, raw: message.content[0].text });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/api/tickets/parse-barcode.js
git commit -m "feat(api): add /api/tickets/parse-barcode Claude extraction route"
```

---

## Task 9: TicketImportModal — Manual tab

**Files:**
- Create: `src/components/vault/TicketImportModal.jsx`

- [ ] **Step 1: Create the file with Manual tab only**

```jsx
// src/components/vault/TicketImportModal.jsx
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTripStore } from '../../store/useTripStore';
import sentinelBus from '../../utils/sentinelBus';
import { TICKET_ADDED } from '../../utils/sentinelBusEvents';
import { cacheSoonTickets } from '../../utils/ticketStore';

const TABS = ['Manual', 'Scan', 'Email'];

const TYPE_OPTIONS = [
  { value: 'flight',        label: '✈ Flight' },
  { value: 'transit',       label: '🚆 Transit' },
  { value: 'accommodation', label: '🏨 Accommodation' },
  { value: 'access_pass',   label: '🎟 Access Pass' },
  { value: 'visa',          label: '📄 Visa' },
  { value: 'document',      label: '📋 Document' },
];

function ManualForm({ onSave, onClose }) {
  const [step, setStep]   = useState(1); // 1=type, 2=fields, 3=file, 4=assign
  const [type, setType]   = useState('flight');
  const [fields, setFields] = useState({});
  const [file, setFile]   = useState(null);

  function setField(key, val) {
    setFields(f => ({ ...f, [key]: val }));
  }

  function buildTicket() {
    const rawData = { ...fields };
    const id = crypto.randomUUID();
    return {
      id,
      type,
      title: fields.title ?? fields.flightNumber ?? fields.provider ?? 'Untitled',
      provider: fields.provider ?? '',
      referenceCode: fields.referenceCode ?? '',
      validFrom: fields.validFrom ?? null,
      validUntil: fields.validUntil ?? null,
      barcodeData: fields.barcodeData ?? null,
      barcodeType: fields.barcodeType ?? null,
      rawData,
      source: 'manual',
      isShared: false,
      sharedWith: [],
      expeditionId: fields.expeditionId ?? null,
      createdAt: new Date().toISOString(),
    };
  }

  const fieldsByType = {
    flight: [
      { key: 'provider',      label: 'Airline',        placeholder: 'United Airlines' },
      { key: 'flightNumber',  label: 'Flight Number',  placeholder: 'UA857' },
      { key: 'origin',        label: 'From (IATA)',     placeholder: 'SFO' },
      { key: 'destination',   label: 'To (IATA)',       placeholder: 'LHR' },
      { key: 'validFrom',     label: 'Departure',       placeholder: '', type: 'datetime-local' },
      { key: 'seat',          label: 'Seat',            placeholder: '14A' },
      { key: 'gate',          label: 'Gate',            placeholder: 'B22' },
      { key: 'referenceCode', label: 'Booking Ref',     placeholder: 'ABCD12' },
    ],
    transit: [
      { key: 'provider',   label: 'Provider',   placeholder: 'Transport for London' },
      { key: 'route',      label: 'Route/Zone', placeholder: 'Zone 1–3' },
      { key: 'validFrom',  label: 'Valid From', placeholder: '', type: 'date' },
      { key: 'validUntil', label: 'Valid Until', placeholder: '', type: 'date' },
      { key: 'referenceCode', label: 'Reference', placeholder: '' },
    ],
    accommodation: [
      { key: 'title',         label: 'Hotel Name',  placeholder: 'Hotel Marqués de Riscal' },
      { key: 'provider',      label: 'Booking via', placeholder: 'Booking.com' },
      { key: 'checkIn',       label: 'Check-in',    placeholder: '', type: 'date' },
      { key: 'checkOut',      label: 'Check-out',   placeholder: '', type: 'date' },
      { key: 'referenceCode', label: 'Conf. Number', placeholder: 'BDC-12345' },
    ],
    access_pass: [
      { key: 'title',         label: 'Event/Place', placeholder: 'Torres del Paine Permit' },
      { key: 'venue',         label: 'Venue',       placeholder: 'CONAF' },
      { key: 'tier',          label: 'Tier/Section', placeholder: 'Trek W' },
      { key: 'validFrom',     label: 'Entry Date',  placeholder: '', type: 'date' },
      { key: 'referenceCode', label: 'Reference',   placeholder: '' },
    ],
    visa: [
      { key: 'title',         label: 'Visa Type',      placeholder: 'Tourist Visa' },
      { key: 'provider',      label: 'Issuing Country', placeholder: 'Chile' },
      { key: 'referenceCode', label: 'Reference',       placeholder: '' },
      { key: 'validFrom',     label: 'Valid From',      placeholder: '', type: 'date' },
      { key: 'validUntil',    label: 'Valid Until',     placeholder: '', type: 'date' },
    ],
    document: [
      { key: 'title',         label: 'Document Name', placeholder: '' },
      { key: 'provider',      label: 'Issuer',        placeholder: '' },
      { key: 'referenceCode', label: 'Reference',     placeholder: '' },
      { key: 'validFrom',     label: 'Date',          placeholder: '', type: 'date' },
    ],
  };

  const currentFields = fieldsByType[type] ?? [];

  return (
    <div>
      {step === 1 && (
        <div>
          <p className="font-mono text-sm text-[#D9C5B2] mb-3">Select ticket type:</p>
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setType(opt.value); setStep(2); }}
                className="py-2 px-3 rounded-lg border font-mono text-sm text-left transition-colors border-white/10 text-[#D9C5B2] hover:border-[#E67E22]/50 hover:text-white"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="font-mono text-xs text-[#D9C5B2] mb-3 uppercase tracking-wider">{type.replace('_', ' ')}</p>
          <div className="flex flex-col gap-3">
            {currentFields.map(f => (
              <div key={f.key}>
                <label className="block font-mono text-xs text-[#D9C5B2] mb-1">{f.label}</label>
                <input
                  type={f.type ?? 'text'}
                  placeholder={f.placeholder}
                  value={fields[f.key] ?? ''}
                  onChange={e => setField(f.key, e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 font-mono text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#E67E22]/50"
                />
              </div>
            ))}
            <div>
              <label className="block font-mono text-xs text-[#D9C5B2] mb-1">Barcode Data (optional)</label>
              <input
                type="text"
                placeholder="Raw barcode string"
                value={fields.barcodeData ?? ''}
                onChange={e => setField('barcodeData', e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 font-mono text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#E67E22]/50"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setStep(1)} className="px-3 py-2 rounded-lg font-mono text-sm border border-white/10 text-[#D9C5B2]">Back</button>
            <button onClick={() => setStep(3)} className="flex-1 py-2 rounded-lg font-mono text-sm bg-[#E67E22]/20 text-[#E67E22] border border-[#E67E22]/30">Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <p className="font-mono text-sm text-[#D9C5B2] mb-3">Attach file (optional):</p>
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="font-mono text-sm text-[#D9C5B2] w-full"
          />
          {file && <p className="font-mono text-xs text-[#E67E22] mt-2">{file.name}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={() => setStep(2)} className="px-3 py-2 rounded-lg font-mono text-sm border border-white/10 text-[#D9C5B2]">Back</button>
            <button onClick={() => setStep(4)} className="flex-1 py-2 rounded-lg font-mono text-sm bg-[#E67E22]/20 text-[#E67E22] border border-[#E67E22]/30">Next</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <p className="font-mono text-sm text-[#D9C5B2] mb-3">Expedition (optional):</p>
          <input
            type="text"
            placeholder="Expedition ID or leave blank"
            value={fields.expeditionId ?? ''}
            onChange={e => setField('expeditionId', e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 font-mono text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#E67E22]/50"
          />
          <div className="flex gap-2 mt-4">
            <button onClick={() => setStep(3)} className="px-3 py-2 rounded-lg font-mono text-sm border border-white/10 text-[#D9C5B2]">Back</button>
            <button
              onClick={() => onSave(buildTicket())}
              className="flex-1 py-2 rounded-lg font-mono text-sm bg-[#E67E22] text-white"
            >
              Save Ticket
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Scan tab ──────────────────────────────────────────────────────────────────

function ScanTab({ onSave }) {
  const videoRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState(null);
  const codeReaderRef = useRef(null);

  async function startScan() {
    setScanning(true);
    setError(null);
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    codeReaderRef.current = new BrowserMultiFormatReader();
    try {
      await codeReaderRef.current.decodeFromVideoDevice(undefined, videoRef.current, async (result, err) => {
        if (result) {
          codeReaderRef.current.reset();
          setScanning(false);
          const raw = result.getText();
          const barcodeType = result.getBarcodeFormat().toString().toLowerCase();
          // Ask Claude to parse it
          const res = await fetch('/api/tickets/parse-barcode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barcodeData: raw, barcodeType }),
          });
          const data = await res.json();
          setParsed({ ...data.parsed, barcodeData: raw, barcodeType, source: 'scan' });
        }
      });
    } catch (e) {
      setError('Camera access denied or unavailable.');
      setScanning(false);
    }
  }

  function stopScan() {
    codeReaderRef.current?.reset();
    setScanning(false);
  }

  if (parsed) {
    return (
      <div>
        <p className="font-mono text-sm text-[#D9C5B2] mb-3">Detected — confirm fields:</p>
        <pre className="font-mono text-xs text-[#E67E22] bg-black/40 rounded p-3 overflow-auto max-h-48">
          {JSON.stringify(parsed, null, 2)}
        </pre>
        <div className="flex gap-2 mt-4">
          <button onClick={() => setParsed(null)} className="px-3 py-2 rounded-lg font-mono text-sm border border-white/10 text-[#D9C5B2]">Re-scan</button>
          <button
            onClick={() => onSave({
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              isShared: false,
              sharedWith: [],
              ...parsed,
            })}
            className="flex-1 py-2 rounded-lg font-mono text-sm bg-[#E67E22] text-white"
          >
            Save Ticket
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && <p className="font-mono text-xs text-red-400 mb-2">{error}</p>}
      <video ref={videoRef} className="w-full rounded-xl bg-black/40" style={{ minHeight: 200 }} />
      <div className="flex gap-2 mt-3">
        {scanning
          ? <button onClick={stopScan} className="flex-1 py-2 rounded-lg font-mono text-sm border border-white/10 text-[#D9C5B2]">Stop</button>
          : <button onClick={startScan} className="flex-1 py-2 rounded-lg font-mono text-sm bg-[#E67E22] text-white">Start Scan</button>
        }
      </div>
    </div>
  );
}

// ── Email tab ─────────────────────────────────────────────────────────────────

function EmailTab({ onSave }) {
  const [status, setStatus] = useState('idle'); // idle | scanning | review | done
  const [detected, setDetected] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());

  async function handleConnect() {
    setStatus('scanning');
    try {
      const res = await fetch('/api/tickets/email-import', { method: 'POST' });
      const data = await res.json();
      setDetected(data.tickets ?? []);
      setStatus('review');
    } catch {
      setStatus('idle');
    }
  }

  function confirm(ticket) {
    onSave({ ...ticket, id: crypto.randomUUID(), createdAt: new Date().toISOString(), isShared: false, sharedWith: [] });
    setDismissed(s => new Set([...s, ticket._key]));
  }

  function dismiss(key) {
    setDismissed(s => new Set([...s, key]));
  }

  const visible = detected.filter(t => !dismissed.has(t._key));

  if (status === 'idle') {
    return (
      <div className="text-center py-6">
        <p className="font-mono text-sm text-[#D9C5B2] mb-4">Connect Gmail to auto-import booking confirmations.</p>
        <button
          onClick={handleConnect}
          className="px-6 py-2 rounded-lg font-mono text-sm bg-[#E67E22] text-white"
        >
          Connect Gmail
        </button>
      </div>
    );
  }

  if (status === 'scanning') {
    return <p className="font-mono text-sm text-[#D9C5B2] text-center py-6">Scanning inbox…</p>;
  }

  if (status === 'review') {
    if (visible.length === 0) {
      return <p className="font-mono text-sm text-[#D9C5B2] text-center py-6">No booking confirmations found.</p>;
    }
    return (
      <div className="flex flex-col gap-3">
        <p className="font-mono text-xs text-[#D9C5B2] mb-1">{visible.length} ticket(s) detected:</p>
        {visible.map(t => (
          <div key={t._key} className="bg-black/30 border border-white/10 rounded-lg p-3">
            <p className="font-mono text-sm text-white">{t.title}</p>
            <p className="font-mono text-xs text-[#D9C5B2]">{t.provider} · {t.referenceCode}</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => confirm(t)} className="flex-1 py-1 rounded font-mono text-xs bg-[#E67E22]/20 text-[#E67E22] border border-[#E67E22]/30">Add</button>
              <button onClick={() => dismiss(t._key)} className="px-2 py-1 rounded font-mono text-xs border border-white/10 text-[#D9C5B2]">Skip</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

// ── Modal shell ───────────────────────────────────────────────────────────────

/**
 * @param {{ open: boolean, onClose: () => void, expeditionId?: string }} props
 */
export default function TicketImportModal({ open, onClose, expeditionId }) {
  const [activeTab, setActiveTab] = useState(0);
  const { dispatch, tickets } = useTripStore();

  function handleSave(ticket) {
    const enriched = { ...ticket, expeditionId: ticket.expeditionId ?? expeditionId ?? null };
    dispatch({ type: 'ADD_TICKET', payload: enriched });
    cacheSoonTickets([enriched]);
    sentinelBus.emit(TICKET_ADDED, { ticket: enriched });
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70"
            onClick={onClose}
          />
          <motion.div
            key="modal"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl p-6 max-h-[92dvh] overflow-y-auto"
            style={{ background: '#0E1012' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-playfair text-xl text-white">Add Ticket</p>
              <button onClick={onClose} className="text-[#D9C5B2] hover:text-white text-xl leading-none">✕</button>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 mb-5 bg-black/30 rounded-lg p-1">
              {TABS.map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(i)}
                  className={[
                    'flex-1 py-1.5 rounded font-mono text-sm transition-colors',
                    activeTab === i ? 'bg-[#E67E22] text-white' : 'text-[#D9C5B2] hover:text-white',
                  ].join(' ')}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 0 && <ManualForm onSave={handleSave} onClose={onClose} />}
            {activeTab === 1 && <ScanTab onSave={handleSave} />}
            {activeTab === 2 && <EmailTab onSave={handleSave} />}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/vault/TicketImportModal.jsx
git commit -m "feat(vault): add TicketImportModal with manual/scan/email tabs"
```

---

## Task 10: Email import API route

**Files:**
- Create: `src/pages/api/tickets/email-import.js`

- [ ] **Step 1: Create the route**

```js
// src/pages/api/tickets/email-import.js
// NOTE: This route is a stub that returns mock detected tickets.
// Production implementation requires Gmail OAuth2 token exchange.
// Wire up google-auth-library + googleapis when ready.
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// Mock booking confirmation emails for development
const MOCK_EMAILS = [
  {
    subject: 'Your booking confirmation – Hotel Marqués',
    body: 'Thank you for your booking. Confirmation number: HMR-88441. Check-in: 2026-11-10. Check-out: 2026-11-14. Total: €620.',
    from: 'no-reply@hoteles.com',
  },
  {
    subject: 'E-ticket: Santiago → Punta Arenas, LATAM LA-256',
    body: 'Flight LA-256. Departs SCL 07:40, arrives PUQ 10:55. Seat 12F. Booking ref: LATAM-99123.',
    from: 'etickets@latam.com',
  },
];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const results = [];

  for (const [i, email] of MOCK_EMAILS.entries()) {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Parse this booking confirmation email into a ticket. Return ONLY a JSON object:\n{\n  "type": "flight|transit|accommodation|access_pass|visa|document",\n  "title": "",\n  "provider": "",\n  "referenceCode": "",\n  "validFrom": "ISO or null",\n  "validUntil": "ISO or null",\n  "rawData": {}\n}\n\nSubject: ${email.subject}\nFrom: ${email.from}\nBody: ${email.body}`,
        },
      ],
    });

    try {
      const text = message.content[0].text.trim();
      const parsed = JSON.parse(text.replace(/^```json\n?/, '').replace(/\n?```$/, ''));
      results.push({ ...parsed, source: 'email_import', _key: `email-${i}` });
    } catch {
      // skip unparseable email
    }
  }

  res.json({ tickets: results });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/api/tickets/email-import.js
git commit -m "feat(api): add /api/tickets/email-import stub with Claude parsing"
```

---

## Task 11: PassportVault global page

**Files:**
- Create: `src/components/vault/PassportVault.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/vault/PassportVault.jsx
import { useState, useEffect } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { useTheme } from '../../context/ThemeContext';
import TicketCard from './TicketCard';
import TicketDetailDrawer from './TicketDetailDrawer';
import TicketImportModal from './TicketImportModal';
import { cacheSoonTickets } from '../../utils/ticketStore';

const CATEGORIES = ['All', 'flight', 'transit', 'accommodation', 'access_pass', 'visa', 'document'];
const CAT_LABELS = {
  All: 'All', flight: 'Flights', transit: 'Transit',
  accommodation: 'Stays', access_pass: 'Access', visa: 'Visa', document: 'Docs',
};

export default function PassportVault({ expeditionFilter }) {
  const { tickets } = useTripStore();
  const { theme } = useTheme();
  const isTactical = theme === 'tactical';

  const [filter, setFilter]         = useState('All');
  const [selected, setSelected]     = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  // Cache soon tickets to IndexedDB on mount and when tickets change
  useEffect(() => {
    cacheSoonTickets(tickets);
  }, [tickets]);

  const now = Date.now();
  const upcoming = tickets
    .filter(t => t.validFrom && new Date(t.validFrom).getTime() > now)
    .sort((a, b) => new Date(a.validFrom) - new Date(b.validFrom))
    .slice(0, 3);

  const filtered = tickets.filter(t => {
    if (expeditionFilter && t.expeditionId !== expeditionFilter) return false;
    if (filter !== 'All' && t.type !== filter) return false;
    return true;
  });

  // Badge count — tickets active today or tomorrow
  const cutoff = now + 48 * 60 * 60 * 1000;
  const urgentCount = tickets.filter(t => {
    const ts = t.validFrom ? new Date(t.validFrom).getTime() : null;
    return ts && ts >= now && ts <= cutoff;
  }).length;

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-6" style={{ color: 'white' }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-playfair text-2xl">PassportVault</h2>
          {urgentCount > 0 && (
            <p className="font-mono text-xs text-[#E67E22] mt-0.5">{urgentCount} ticket{urgentCount > 1 ? 's' : ''} active soon</p>
          )}
        </div>
      </div>

      {/* Upcoming strip */}
      {upcoming.length > 0 && !expeditionFilter && (
        <div>
          <p className="font-mono text-xs text-[#D9C5B2] uppercase tracking-wider mb-3">Upcoming</p>
          <div className="flex flex-col gap-3">
            {upcoming.map(t => (
              <TicketCard key={t.id} ticket={t} onClick={() => setSelected(t)} tactical={isTactical} />
            ))}
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={[
              'px-3 py-1.5 rounded-full font-mono text-xs whitespace-nowrap border transition-colors',
              filter === cat
                ? 'bg-[#E67E22] border-[#E67E22] text-white'
                : 'border-white/10 text-[#D9C5B2] hover:border-[#E67E22]/50',
            ].join(' ')}
          >
            {CAT_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Ticket grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <span className="text-4xl">🎫</span>
          <p className="font-playfair text-lg text-[#D9C5B2]">No tickets in your Vault</p>
          <p className="font-mono text-xs text-[#D9C5B2]/60">Add flights, passes, and confirmations to keep them at your fingertips.</p>
          <button
            onClick={() => setImportOpen(true)}
            className="mt-2 px-5 py-2 rounded-lg font-mono text-sm bg-[#E67E22] text-white"
          >
            Add First Ticket
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(t => (
            <TicketCard key={t.id} ticket={t} onClick={() => setSelected(t)} tactical={isTactical} />
          ))}
        </div>
      )}

      {/* FAB */}
      {filtered.length > 0 && (
        <button
          onClick={() => setImportOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg transition-transform hover:scale-105"
          style={{ background: '#E67E22', color: 'white' }}
          aria-label="Add ticket"
        >
          +
        </button>
      )}

      {/* Detail drawer */}
      <TicketDetailDrawer ticket={selected} onClose={() => setSelected(null)} />

      {/* Import modal */}
      <TicketImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/vault/PassportVault.jsx
git commit -m "feat(vault): add PassportVault global wallet page with filter, upcoming strip, FAB"
```

---

## Task 12: Wire PassportVault into TripPlanner

**Files:**
- Modify: `src/pages/TripPlanner.jsx`

- [ ] **Step 1: Swap VaultHub import for PassportVault**

Find the import line:
```js
import VaultHub from '../components/vault/VaultHub';
```
Replace with:
```js
import PassportVault from '../components/vault/PassportVault';
```

- [ ] **Step 2: Swap the rendered component**

Find:
```jsx
{tab === 'VAULT' && <VaultHub />}
```
Replace with:
```jsx
{tab === 'VAULT' && <PassportVault />}
```

- [ ] **Step 3: Update Sidebar VAULT label**

Open `src/components/layout/Sidebar.jsx`. Find:
```js
{ id: 'VAULT', icon: '📂', label: 'Saved trips' },
```
Replace with:
```js
{ id: 'VAULT', icon: '🎫', label: 'PassportVault' },
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/TripPlanner.jsx src/components/layout/Sidebar.jsx
git commit -m "feat: wire PassportVault into TripPlanner VAULT tab, update sidebar label"
```

---

## Task 13: KanbanBoard Documents tab

**Files:**
- Modify: `src/components/itinerary/KanbanBoard.jsx`

- [ ] **Step 1: Add PassportVault import at top of KanbanBoard.jsx**

After existing imports, add:
```js
import PassportVault from '../vault/PassportVault';
```

- [ ] **Step 2: Add DOCUMENTS to the tab list**

Find the existing tab list in KanbanBoard (look for where tabs like `'OVERVIEW'`, `'ITINERARY'` etc. are defined). Add `'DOCUMENTS'` to the array. Example — if you see:

```js
const TABS = ['OVERVIEW', 'ITINERARY', ...];
```

Add `'DOCUMENTS'` at the end:
```js
const TABS = ['OVERVIEW', 'ITINERARY', 'LOGISTICS', 'DISCOVERY', 'DOCUMENTS'];
```

If tabs are defined as JSX buttons, add a button following the existing pattern:
```jsx
<button
  onClick={() => setActiveTab('DOCUMENTS')}
  className={activeTab === 'DOCUMENTS' ? activeClass : inactiveClass}
>
  Documents {tickets?.length > 0 && <span className="ml-1 text-[#E67E22]">{tickets.length}</span>}
</button>
```

You will also need `const { tickets } = useTripStore();` if not already destructured.

- [ ] **Step 3: Render PassportVault when DOCUMENTS tab is active**

Find the section where tab content is rendered (e.g. `{activeTab === 'OVERVIEW' && ...}`). Add:

```jsx
{activeTab === 'DOCUMENTS' && (
  <PassportVault expeditionFilter={expedition?.id ?? null} />
)}
```

Where `expedition` comes from `useExpedition()` (already imported at the top of KanbanBoard).

- [ ] **Step 4: Commit**

```bash
git add src/components/itinerary/KanbanBoard.jsx
git commit -m "feat(itinerary): add Documents tab to KanbanBoard using PassportVault"
```

---

## Task 14: DocumentManifest for Logistics panel

**Files:**
- Create: `src/components/vault/DocumentManifest.jsx`
- Modify: `src/components/logistics/PackingManifest.jsx`

- [ ] **Step 1: Create DocumentManifest**

```jsx
// src/components/vault/DocumentManifest.jsx
import { useState } from 'react';
import { useTripStore } from '../../store/useTripStore';
import TicketDetailDrawer from './TicketDetailDrawer';
import TicketImportModal from './TicketImportModal';

/**
 * Compact ticket list for the Logistics panel.
 * @param {{ expeditionId?: string }} props
 */
export default function DocumentManifest({ expeditionId }) {
  const { tickets } = useTripStore();
  const [open, setOpen]         = useState(true);
  const [selected, setSelected] = useState(null);
  const [importing, setImporting] = useState(false);

  const scoped = expeditionId
    ? tickets.filter(t => t.expeditionId === expeditionId)
    : tickets;

  return (
    <div className="border-t border-white/10 mt-6 pt-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full mb-3"
      >
        <span className="font-mono text-sm text-[#D9C5B2] uppercase tracking-wider">
          Documents ({scoped.length})
        </span>
        <span className="text-[#D9C5B2] text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          {scoped.length === 0 ? (
            <p className="font-mono text-xs text-[#D9C5B2]/60">No documents. Add tickets to your PassportVault.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {scoped.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className="flex items-center justify-between text-left px-3 py-2 rounded-lg border border-white/10 hover:border-[#E67E22]/30 transition-colors"
                  style={{ background: '#0E1012' }}
                >
                  <div>
                    <p className="font-mono text-sm text-white">{t.title}</p>
                    {t.referenceCode && (
                      <p className="font-mono text-xs text-[#E67E22]">{t.referenceCode}</p>
                    )}
                  </div>
                  <p className="font-mono text-xs text-[#D9C5B2]">
                    {t.validFrom ? new Date(t.validFrom).toLocaleDateString() : '—'}
                  </p>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setImporting(true)}
            className="mt-3 w-full py-2 rounded-lg font-mono text-xs border border-[#E67E22]/30 text-[#E67E22] hover:bg-[#E67E22]/10 transition-colors"
          >
            + Add Document
          </button>
        </>
      )}

      <TicketDetailDrawer ticket={selected} onClose={() => setSelected(null)} />
      <TicketImportModal open={importing} onClose={() => setImporting(false)} expeditionId={expeditionId} />
    </div>
  );
}
```

- [ ] **Step 2: Add DocumentManifest to PackingManifest**

Open `src/components/logistics/PackingManifest.jsx`. Add import at the top:
```js
import DocumentManifest from '../vault/DocumentManifest';
```

At the very end of the returned JSX (before the closing `</div>` of the root element), add:
```jsx
<DocumentManifest />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/vault/DocumentManifest.jsx src/components/logistics/PackingManifest.jsx
git commit -m "feat(logistics): add DocumentManifest collapsible section to PackingManifest"
```

---

## Task 15: DepartingSoonStrip dashboard widget

**Files:**
- Create: `src/components/vault/DepartingSoonStrip.jsx`
- Modify: `src/components/dashboard/LaunchDashboard.jsx`

- [ ] **Step 1: Create DepartingSoonStrip**

```jsx
// src/components/vault/DepartingSoonStrip.jsx
import { useTripStore } from '../../store/useTripStore';

/**
 * Shows the next 1–2 upcoming tickets on the LaunchDashboard.
 * @param {{ onOpenVault: () => void }} props
 */
export default function DepartingSoonStrip({ onOpenVault }) {
  const { tickets } = useTripStore();
  const now = Date.now();

  const upcoming = tickets
    .filter(t => t.validFrom && new Date(t.validFrom).getTime() > now)
    .sort((a, b) => new Date(a.validFrom) - new Date(b.validFrom))
    .slice(0, 2);

  if (upcoming.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-xs text-[#D9C5B2] uppercase tracking-wider">Departing Soon</p>
        <button onClick={onOpenVault} className="font-mono text-xs text-[#E67E22] hover:underline">
          View all →
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {upcoming.map(t => {
          const ms    = new Date(t.validFrom).getTime() - now;
          const hours = Math.floor(ms / 3_600_000);
          const label = hours < 24 ? `in ${hours}h` : new Date(t.validFrom).toLocaleDateString();
          return (
            <button
              key={t.id}
              onClick={onOpenVault}
              className="flex items-center justify-between px-3 py-2 rounded-lg border border-white/10 hover:border-[#E67E22]/30 transition-colors text-left"
              style={{ background: '#0E1012' }}
            >
              <div>
                <p className="font-mono text-sm text-white">{t.title}</p>
                <p className="font-mono text-xs text-[#D9C5B2]">{t.provider}</p>
              </div>
              <p className="font-mono text-xs text-[#E67E22]">{label}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add DepartingSoonStrip to LaunchDashboard**

Open `src/components/dashboard/LaunchDashboard.jsx`. Add import:
```js
import DepartingSoonStrip from '../vault/DepartingSoonStrip';
```

Find a logical place near the top of the dashboard content (after any hero/header section) and add:
```jsx
<DepartingSoonStrip onOpenVault={() => onTabChange?.('VAULT')} />
```

`onTabChange` should already be a prop passed to `LaunchDashboard`. If it isn't, add it to the component's props and thread it through from `TripPlanner.jsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/vault/DepartingSoonStrip.jsx src/components/dashboard/LaunchDashboard.jsx
git commit -m "feat(dashboard): add DepartingSoonStrip widget for upcoming tickets"
```

---

## Task 16: Tactical Mode integration

**Files:**
- Modify: `src/components/vault/PassportVault.jsx`

- [ ] **Step 1: Add getCachedTickets fallback in PassportVault**

In `PassportVault.jsx`, add a `useEffect` that reads from IndexedDB when the store has no tickets but we're in Tactical Mode. Find the top of the component where state is declared and add:

```js
const [tacticalTickets, setTacticalTickets] = useState([]);

useEffect(() => {
  if (isTactical && tickets.length === 0) {
    import('../../utils/ticketStore').then(({ getCachedTickets }) => {
      getCachedTickets().then(setTacticalTickets);
    });
  }
}, [isTactical, tickets.length]);
```

Then in the `filtered` computation, replace `tickets` with:
```js
const source = isTactical && tickets.length === 0 ? tacticalTickets : tickets;
// use source everywhere tickets was used below
```

Apply the same replacement to the `upcoming` and `urgentCount` computations.

- [ ] **Step 2: Commit**

```bash
git add src/components/vault/PassportVault.jsx
git commit -m "feat(vault): add Tactical Mode offline fallback via IndexedDB cache"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Data model (Task 2 store + typedef)
- ✅ Three surfaces: `/vault` (Task 11–12), KanbanBoard tab (Task 13), Logistics (Task 14)
- ✅ TicketCard all types (Task 6)
- ✅ TicketDetailDrawer with barcode + share + revoke + delete (Task 7)
- ✅ Manual import (Task 9)
- ✅ Scan import with zxing + Claude (Tasks 1, 8, 9)
- ✅ Email import (Tasks 9, 10)
- ✅ Squad sharing (Task 7)
- ✅ Time-aware surfacing + dashboard widget (Task 15)
- ✅ Tactical Mode IndexedDB (Tasks 3, 16)
- ✅ TicketBarcodeRenderer (Task 5)
- ✅ Sidebar label update (Task 12)
- ✅ sentinelBus events (Task 4)
