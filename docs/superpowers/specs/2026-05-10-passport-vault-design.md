# PassportVault — Ticket & Document Wallet
**Date:** 2026-05-10  
**Status:** Approved for implementation

---

## Overview

PassportVault is VenturePath's Google Wallet-style ticket and document management system. Pioneers store, import, and display all travel documents — flights, transit passes, accommodation confirmations, access passes, visas, and general documents — in a single wallet accessible globally and contextually within each expedition.

**Core value proposition:** The right ticket surfaces at the right time, always available offline, and shareable with the Squad in three taps.

---

## 1. Data Model

### `tickets` table

```sql
CREATE TABLE tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pioneer_id      UUID NOT NULL REFERENCES profiles(id),
  expedition_id   UUID REFERENCES expeditions(id), -- nullable for global tickets
  type            TEXT NOT NULL CHECK (type IN ('flight','transit','accommodation','access_pass','visa','document')),
  title           TEXT NOT NULL,
  provider        TEXT,
  reference_code  TEXT,
  valid_from      TIMESTAMPTZ,
  valid_until     TIMESTAMPTZ,
  barcode_data    TEXT,
  barcode_type    TEXT CHECK (barcode_type IN ('qr','pdf417','aztec','code128')),
  file_url        TEXT, -- Supabase Storage path
  raw_data        JSONB DEFAULT '{}',
  source          TEXT NOT NULL CHECK (source IN ('manual','email_import','scan')),
  is_shared       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### `ticket_shares` table

```sql
CREATE TABLE ticket_shares (
  ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  pioneer_id  UUID NOT NULL REFERENCES profiles(id),
  shared_by   UUID NOT NULL REFERENCES profiles(id),
  shared_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (ticket_id, pioneer_id)
);
```

### RLS Policies

- Pioneers can read their own tickets + any ticket shared with them via `ticket_shares`
- Pioneers can insert/update/delete only their own tickets
- `ticket_shares` readable by both the owner and the recipient; writable only by the ticket owner

### Tactical Mode caching

On app load, tickets with `valid_from` within 48h are written to IndexedDB. These are available in Tactical Mode with zero connectivity.

---

## 2. Architecture — Three Surfaces

All three surfaces read from the same `tickets` data layer.

### Surface 1 — `/vault` global route (primary)

Full-page wallet experience:

- **Upcoming strip** — top section, next 3 tickets by `valid_from`, full boarding-pass card with countdown ("Departs in 14h")
- **Category filter bar** — All / Flights / Transit / Accommodation / Access / Docs
- **Card grid** — scrollable, all tickets matching filter
- **FAB** — Ember `#E67E22`, opens `TicketImportModal`

Deep link variants:
- `/vault` — all tickets
- `/vault?expedition=:id` — pre-filtered to expedition
- `/vault/:ticketId` — opens directly to `TicketDetailDrawer`

### Surface 2 — KanbanBoard "Documents" tab (per-expedition)

- New tab injected alongside existing KanbanBoard tabs
- Filtered to `expedition_id`
- Same `TicketCard` aesthetic, tighter layout
- Tab label shows ticket count badge
- "Share with Squad" toggle per ticket
- "Add Document" button opens `TicketImportModal` with expedition pre-set

### Surface 3 — Logistics `DocumentManifest` (contextual)

- Collapsible section inside the Logistics panel, below `PackingManifest`
- Compact list: title + reference code + valid dates only
- Section header shows ticket count
- Tapping a row opens `TicketDetailDrawer` (shared component)
- "Add" action opens `TicketImportModal`

---

## 3. Shared Components

### `TicketCard`

Boarding-pass-style card. Visual language varies by type:

**Flight**
- Landscape orientation
- Left panel: origin code → arrow → destination code (Playfair Display, large)
- Right panel: flight number, date, seat, gate (JetBrains Mono)
- Bottom: full-width barcode strip
- Background: Midnight `#0E1012`, diagonal tear-line divider
- Airline name: Sandstone `#D9C5B2`

**Transit pass**
- Portrait orientation
- Provider name at top
- Route/zone center
- Valid date range below
- Barcode at bottom
- Type-colored accent band at top

**Accommodation**
- Card style (no pass aesthetic)
- Hotel name: Playfair Display
- Check-in / check-out dates prominent
- Confirmation code: JetBrains Mono + copy-to-clipboard tap

**Access pass**
- Resembles event ticket with left stub
- Venue, date, tier/section
- Perforated edge visual divider
- Barcode on stub

**Visa / document**
- Minimal: document type, issuing country, valid dates, reference number

**Shared indicator**
- Squad icon + Pioneer count badge, top-right corner

**Tactical Mode**
- All cards: Tactical Amber `#F2A900` on near-black `#0A0A0A`
- `// TACTICAL-CRITICAL: TicketCard must render from IndexedDB cache in Tactical Mode`

### `TicketDetailDrawer`

Full-screen slide-up drawer:
- Full barcode display (rendered by `TicketBarcodeRenderer`)
- All metadata fields
- File attachment viewer/download
- "Share with Squad" button → opens Pioneer selector
- "Manage Sharing" (owner only) → revocation UI
- Edit / Delete actions (owner only)

### `TicketImportModal`

Tabbed modal with three tabs:

1. **Manual Entry** — multi-step form (type picker → type-specific fields → file upload → expedition assignment + share toggle)
2. **Scan** — camera feed with real-time barcode decode via `zxing-js`, Claude-parsed pre-fill, confirmation step
3. **Email Import** — Gmail OAuth connect, scanned confirmation list with confirm/dismiss per ticket

### `TicketBarcodeRenderer`

Renders QR, PDF417, Aztec, Code128 from `barcode_data`. Uses a barcode rendering library (e.g. `bwip-js`). Displays at maximum brightness (forces screen brightness up on mobile where API permits).

---

## 4. Import Flows

### Manual Entry (4 steps)
1. Select ticket type — determines which fields appear in step 2
2. Fill type-specific fields (flight: origin, destination, flight number, date, seat, gate; transit: provider, route/zone, valid range; accommodation: hotel, check-in, check-out, confirmation code; access pass: venue, date, tier; visa: type, country, valid range, reference)
3. Optional file upload (PDF or image → Supabase Storage)
4. Assign to expedition (optional dropdown) + squad share toggle → POST `/api/tickets`

### Barcode/QR Scan
1. `getUserMedia` camera feed in `TicketImportModal` Scan tab
2. `zxing-js` decodes barcode in real-time
3. Raw barcode string → POST `/api/tickets/parse-barcode` → Claude extracts structured fields
4. Pre-filled manual form shown for Architect confirmation
5. Fallback: if Claude parse fails, store raw barcode + let Architect fill fields manually

### Email Import
1. Gmail OAuth flow → encrypted token stored in Supabase
2. `/api/tickets/email-import` scans inbox for booking confirmation patterns (subject + sender heuristics for major providers: United, Delta, Booking.com, Airbnb, Eurostar, Trainline, etc.)
3. Detected emails → Claude parses into ticket fields
4. Architect sees review list: confirm or dismiss each ticket
5. Confirmed tickets → batch POST to `/api/tickets`

### Time-aware surfacing
- On app load: tickets with `valid_from` within 24h → dashboard banner
- Tickets within 48h → written to IndexedDB for Tactical Mode
- Dashboard "Departing Soon" strip always shows next 1-2 tickets

---

## 5. Squad Sharing

### Share flow (3 taps)
1. Open ticket → "Share with Squad" in `TicketDetailDrawer`
2. Pioneer selector (squad member avatars + checkboxes) — group bookings default to all squad pre-checked
3. Confirm → `ticket_shares` rows written + push notification to each selected Pioneer

### Recipient experience
- Shared tickets appear in `/vault` with "Shared by [Pioneer name]" badge
- Appear in expedition Documents tab if ticket has `expedition_id`
- Can view barcode and metadata
- Cannot edit, delete, or re-share

### Revocation
- Owner: "Manage Sharing" → list of current recipients → tap to remove individual or "Revoke All"
- Share rows deleted immediately
- Ticket disappears from recipient vaults on next sync

### Group booking flag
- `raw_data.group_booking: true` causes share UI to default to all squad pre-checked

---

## 6. Navigation & Entry Points

### Global nav
- "Vault" item with wallet icon
- Badge: count of tickets active today or tomorrow

### LaunchDashboard widget
- "Departing Soon" strip — next 1-2 tickets as compact cards
- Taps to `/vault`

### KanbanBoard
- "Documents" tab with ticket count badge

### Logistics panel
- `DocumentManifest` collapsible section, below `PackingManifest`

### Import entry points
- FAB on `/vault`
- "Add Document" in KanbanBoard Documents tab
- "Add" in `DocumentManifest`
- All open the same `TicketImportModal`

---

## 7. Apple Compliance Checklist

**UNIQUENESS:** PassportVault is scoped to expedition context, Squad-shareable, and Tactical Mode-aware — none of which generic wallet apps (Google Wallet, Apple Wallet) provide.

**BRAND FIDELITY:** Midnight `#0E1012` backgrounds, Ember `#E67E22` FAB, Sandstone `#D9C5B2` secondary text, Playfair Display headings, JetBrains Mono for codes and data, Tactical Amber `#F2A900` in Tactical Mode.

**FUNCTIONALITY DEPTH:** On `/vault` alone — filter by category, import via 3 methods, view barcode, share with Squad, deep-link to expedition, trigger Tactical Mode cache. Exceeds minimum functionality threshold.

---

## 8. File Structure

```
src/
  app/
    vault/
      page.tsx                    -- /vault route
      [ticketId]/
        page.tsx                  -- direct ticket deep-link
  components/
    vault/
      PassportVault.jsx           -- global vault page container
      TicketCard.jsx              -- boarding-pass card, all types
      TicketDetailDrawer.jsx      -- full-screen slide-up detail
      TicketImportModal.jsx       -- tabbed import: manual/scan/email
      TicketBarcodeRenderer.jsx   -- barcode display component
      DocumentManifest.jsx        -- compact logistics list view
      DepartingSoonStrip.jsx      -- dashboard widget
  api/
    tickets/
      route.ts                    -- GET (list) + POST (create)
      [id]/
        route.ts                  -- GET + PATCH + DELETE
      parse-barcode/
        route.ts                  -- Claude barcode parsing
      email-import/
        route.ts                  -- Gmail OAuth + email scanning
      shares/
        route.ts                  -- share + revoke endpoints
```
