# VenturePath — Apple App Store Compliance Rules
# Apple Guidelines: 4.2 (Minimum Functionality), 4.3 (Spam), 4.1 (Copycats), 2.3.7

These rules exist because Apple actively rejects apps that look AI-generated or template-based.
Every code change you write must satisfy all checks below before being considered complete.

---

## RULE 1 — No Generic UI. Ever.

FORBIDDEN in any shipped code:
- "Lorem ipsum" in any string, placeholder, comment, or data fixture
- "Coming soon" as the only content on any rendered screen
- Button labels: "Click here", "Learn more" (standalone), "Submit", "Button"
- Default Tailwind #000/#FFF/gray-500 as primary brand colors
- shadcn/ui, MUI, or Tailwind components with zero VenturePath token overrides

REQUIRED instead:
- Every empty state has expedition-branded copy, a domain-relevant icon,
  and at least one actionable CTA specific to the feature
- Every loading state uses the LaunchSequence terminal aesthetic, not a generic spinner

---

## RULE 2 — Every View Must Have Minimum Functionality

Before marking any component/view complete, verify all of the following:

- [ ] The view has a clear, singular purpose describable in one sentence
- [ ] The view has at least two interactive elements (not counting nav/back)
- [ ] Any empty data state has a purposeful empty state with a CTA (not a blank div)
- [ ] View is navigable to and from without dead ends
- [ ] No unhandled promise rejections or console errors on load

---

## RULE 3 — Differentiation Checkpoint (Run Before Every Feature Is Logged as Done)

In your log entry, answer these three questions concretely:

1. **UNIQUENESS**: What does this implementation do that a generic travel app
   (TripIt, Google Trips, Wanderlog) could not produce without knowing VenturePath's
   expedition + squad + tactical identity?
2. **BRAND FIDELITY**: Which VenturePath tokens (Midnight #0E1012, Ember #E67E22,
   JetBrains Mono, expedition vocabulary) are visible in this implementation?
3. **FUNCTIONALITY DEPTH**: How many distinct user actions can a user take on
   this view beyond "read content"?

If you cannot answer all three concretely, the feature is not complete.

---

## RULE 4 — Template-Pattern Detection

STOP and redesign if you catch yourself writing:
- A card grid where every card has identical structure (image + title + subtitle + button)
- A tabbed interface where all tabs share identical layout with different text only
- A settings screen with only toggle switches and no feature-specific controls
- A profile screen with only: avatar + name + email + logout
- Any view whose layout could belong to a completely different app category

Flag existing instances with:
`// APPLE-RISK: Generic template pattern — needs differentiation before App Store submission`

---

## RULE 5 — App Store Metadata Readiness

Any view that becomes primary navigation must have:
- A clear human-readable page `<title>` or navigation bar label
- Content describable in ≤ 30 words (App Store screenshot caption test)
- At least one meaningful view accessible pre-auth

---

## RULE 6 — Privacy Requirements

- Location data → add comment: `// REQUIRES LOCATION USAGE DESCRIPTION IN APP STORE CONNECT`
- UGC visible to others → add comment: `// REQUIRES UGC POLICY LINK IN APP STORE METADATA`

---

## VENTUREPATH-SPECIFIC RULES

### VP-1 — Expedition Vocabulary Is the Brand Identity

These terms prevent 4.3 (spam) by making VenturePath impossible to confuse with
generic travel apps. Using generic synonyms is a compliance failure:

| ALWAYS USE | NEVER USE instead |
|---|---|
| "Architect" | "user", "creator", "author" |
| "Pioneer" | "traveler", "adventurer" generically |
| "Expedition" | "trip", "journey" in primary UI copy |
| "Leg" | "segment", "stop" |
| "Ledger Workbench" | "voting", "decisions" |
| "VentureVault" | "marketplace", "templates", "community" |
| "Pro-Path" | "template", "plan", "itinerary" |
| "Squad" | "group", "friends", "team" |
| "Tactical Mode" | "offline mode", "low-power mode" |
| "Launch Sequence" | "onboarding", "setup", "checklist" |
| "Basecamp" | "home", "starting point" |

DO NOT use "user" in any user-visible copy. An Architect is always an Architect.

### VP-2 — Squad Model Is the Core Value Proposition

VenturePath is not a solo planner. Solo planning is a saturated, thin category.
The squad collaboration model is what makes this app substantive (4.2):
- Squad features must always be richer than solo equivalents
- Ledger Workbench (nomination + vote + rejection) must appear whenever a decision
  involves multiple Pioneers — do not simplify it to a shared list
- Squad Gear (weight sharing, drag-between-members) must be the default
  PackingManifest view when squad size > 1
- The "Vetoed by Squad" rejection animation is a unique UX differentiator — preserve it

### VP-3 — Tactical Mode Must Function as a Standalone Emergency Tool

Tactical Mode is what separates VenturePath from web-clip thin apps (4.2):
- Must always show: cached itinerary + emergency contacts + SOS message generator
  + last known coordinates — even with zero connectivity
- SOS beacon must produce location-specific emergency text, not a generic "I need help" message
- Color scheme MUST be Tactical Amber (#F2A900) on near-black (#0A0A0A) in Tactical Mode
  — this visual break signals emergency context to the user
- Add `// TACTICAL-CRITICAL: this component must work offline` before modifying
  any Tactical Mode component's data dependencies

### VP-4 — VentureVault Must Demonstrate Real Creator Economy

A marketplace with empty listings is worse than no marketplace (signals template to reviewers):
- VentureVault must always display ≥ 3 substantively different Pro-Paths in any seed state
- Each Pro-Path listing must show: route preview + leg count + difficulty rating +
  Architect profile + clone count + reviews widget (even at 0, show the widget)
- Clone flow must complete within 3 taps and produce a usable, modified expedition
  in TripPlanner — not just a "clone successful" toast
- Architect earnings must show real numbers — "$0.00 lifetime earnings" signals an incomplete feature

### VP-5 — Design Token Contract

Use these tokens. Never use raw Tailwind defaults:

```
#0E1012  Midnight — background
#E67E22  Ember — primary interactive color
#F2C94C  Golden Hour — Elite Pioneer badge only
#D9C5B2  Sandstone — secondary text / subtle backgrounds
#F2A900  Tactical Amber — Tactical Mode only (not used elsewhere)
```

Typography contract:
- Headings: Playfair Display (editorial authority)
- Code/data/status: JetBrains Mono (tactical precision)
- Body: Inter (legibility)

Any component using Tailwind defaults without these overrides gets:
`// APPLE-RISK: missing brand tokens`

### VP-6 — AR Ghost Tours Must Be Substantively Implemented

If AR Ghost Tours is stubbed or placeholder, add at the top of its file:
`// APPLE-RISK: AR feature is a key differentiator — stub state will fail 4.2 minimum functionality review`

When implemented:
- Content must be location-anchored (GPS coordinates), not floating generic overlays
- Each ghost tour entry: historical context + GPS anchor + narrative text + visual representation
- Do NOT ship as a camera permission request that opens to an empty scene

### VP-7 — Minimum Functionality Per View

```
LaunchDashboard    → World map + active expedition summary + squad status +
                     VentureVault CTA + Architect profile link
TripPlanner        → All 4 tabs functional (OVERVIEW, ITINERARY, LOGISTICS, DISCOVERY)
                     + squad context when squad size > 1
LedgerWorkbench    → Dual-column dnd-kit + nomination + vote + rejection animation
                     + vote history
VentureVault       → Search/filter + listing cards with real data + clone flow
ArchitectProfile   → Stats grid + revenue + published paths list + earnings balance
TacticalMode       → Offline-first cached data + SOS generator + coordinates display
PackingManifest    → Squad mode + weight totals + climate-driven suggestions + category filter
AR view            → Location-anchored content (not an empty camera feed)
```

Any view missing its minimums gets:
`// APPLE-RISK: BELOW MINIMUM FUNCTIONALITY` at the top of its component file.
