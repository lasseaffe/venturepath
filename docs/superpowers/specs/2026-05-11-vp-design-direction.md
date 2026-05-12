# VenturePath — Design Direction Spec
> Ritual date: 2026-05-11
> Phase: /huashu-design Phase 1–6 complete · Phase 7 (sweep execution) pending

---

## Design brief in one sentence

VenturePath is a premium expedition editorial platform — dark, gallery-like, where Pro-Paths read like exhibition titles and every data point carries the weight of a serious operational decision.

---

## Locked direction: Wallpaper* × Dark Premium

**Source:** *Wallpaper** magazine (Tony Chambers era) — design/architecture/luxury travel editorial system

---

## Color system (Modern Nomad — primary mode)

| Token | Value | Use |
|---|---|---|
| `--vp-black` | `#0A0B0C` | Primary ground — darker and cooler than standard Midnight |
| `--vp-surface` | `#101214` | Secondary surface — featured panels, right columns |
| `--vp-surface-raised` | `#181A1C` | Raised cards, modals |
| `--vp-ember` | `#E67E22` | **Only** chromatic accent — interactive labels, CTAs, featured tags, data values |
| `--vp-ember-dim` | `rgba(230,126,34,0.10)` | Hover states, subtle backgrounds |
| `--vp-ember-rule` | `rgba(230,126,34,0.25)` | Tag borders, divider lines |
| `--vp-text` | `#F2EDE8` | Primary text |
| `--vp-text-muted` | `#8A8680` | Body copy, descriptions, routes |
| `--vp-text-subtle` | `#484440` | Labels, metadata, mono captions |
| `--vp-rule` | `rgba(242,237,232,0.07)` | Grid lines, row dividers |
| `--vp-rule-strong` | `rgba(242,237,232,0.15)` | Nav borders, section breaks |
| `--vp-sandstone` | `#D9C5B2` | Architect names, secondary highlights |

### Day Mode overrides (`[data-theme="day"]`)
| Token | Value |
|---|---|
| `--vp-black` | `#EDE8DF` |
| `--vp-surface` | `#E0D8CC` |
| `--vp-ember` | `#C8782A` (copper, slightly darker for light ground) |
| `--vp-text` | `#1A1614` |
| `--vp-text-muted` | `#5A4A3A` |
| `--vp-rule` | `rgba(26,22,20,0.10)` |

### Tactical Mode overrides (`[data-theme="tactical"]`)
| Token | Value |
|---|---|
| `--vp-black` | `#0A0A0A` |
| `--vp-ember` | `#F2A900` (Tactical Amber — reserved exclusively for this mode) |
| `--vp-text` | `#F0EAE0` |

---

## Typography system

| Role | Family | Weight | Style | Size | Notes |
|---|---|---|---|---|---|
| Display / vault hero | Playfair Display | 900 | Italic | 72–100px | Letter-spacing −0.03em, line-height 0.9 |
| Display subtitle | Playfair Display | 400 | Normal | 0.6em relative | Ember color, follows display line |
| Expedition / Pro-Path name | Playfair Display | 700 | Italic | 18–44px | Context-dependent |
| Index table Pro-Path names | Playfair Display | 700 | Italic | 18–22px | |
| Body / route description | Inter | 300–400 | Normal | 12–13px | |
| All labels, metadata, stats, CTAs | JetBrains Mono | 400–500 | Normal | 8–10px | Letter-spacing 0.12–0.22em, uppercase |
| Data values (countdown, counts) | JetBrains Mono | 500 | Normal | 18–24px | Ember color |

**Rule:** Playfair = expedition names and editorial titles only. JetBrains Mono = all data and structural labels. Inter = body descriptions. Never swap.

---

## Layout principles

1. **Centered logo nav** — `VenturePath` in Playfair 900 Italic at center, JetBrains Mono links flanking left and right. `+ New Expedition` is the only Ember-colored nav element.
2. **Asymmetric hero split** — display title at extreme scale (88–100px) left column (~60%), featured Pro-Path panel right column (~40%) with `--vp-surface` background.
3. **Index table as primary browse surface** — Pro-Path names in Playfair Italic, all other columns in JetBrains Mono. Type tags as Ember-rule bordered pills.
4. **Data cells use 1px grid lines** — `background: var(--vp-rule)` gap between stat cells; individual cells are `--vp-black` background. No rounded corners, no drop shadows.
5. **Ember used maximally 3 times per screen** — featured tag, primary CTA, one data value. Never as background fill, always as stroke or text.
6. **No decorative icons on section headings** — JetBrains Mono uppercase labels do all wayfinding work.

---

## Mode distinction

| Mode | Ground | Accent | Register |
|---|---|---|---|
| Modern Nomad (default) | `#0A0B0C` near-black | Ember `#E67E22` | Dark editorial premium |
| Day Mode | `#EDE8DF` sandstone | Copper `#C8782A` | Light editorial, same layout |
| Tactical | `#0A0A0A` true black | Tactical Amber `#F2A900` | Emergency console, mono-only body |

All three modes share the same layout system. Mode toggle pill lives in the nav.

---

## Stop-slop constraints

- No purple, violet, blue, or teal anywhere in any mode
- No gradient card backgrounds — `--vp-black` or `--vp-surface` only
- No icon prefixed to section headings — JetBrains Mono labels only
- No fabricated squad activity ("Sarah just joined your expedition")
- Ember is the **only** chromatic accent across all three modes (Tactical Amber is mode-scoped, not decorative)
- No identical card grid where every Pro-Path card has the same structure — index table differentiates by Playfair name scale, featured panel breaks the grid
- Expedition vocabulary enforced: never "trip", "user", "template", "group" in user-visible copy

---

## The 120% signature detail

**The 88px Playfair 900 Italic display title split across two weights** — `Discover.` in 900 Italic on one line, `Your next expedition.` in 400 Normal in Ember on the next. The weight contrast at extreme scale is the single thing no other travel planner does. Everything else is 80%.

---

## Success signal (from interview)

User answered "all" to the emotional job (prepared + capable + alive + in control) — the layout delivers this by showing active expedition status data and discovery simultaneously. The Architect is never looking at an empty screen.

---

## Source demo

- `_temp/design-demos/demo-wallpaper.html` — locked direction reference

---

## Next step

Execute VenturePath 8-phase sweep per `humble-chasing-hamster.md` plan. Phase 2 (Day Mode toggle wiring) is the critical missing piece — `data-theme` attribute not yet wired to a UI toggle in `App.jsx`.
