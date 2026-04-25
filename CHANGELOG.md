# HolyFlex Changelog

## 2026-04-25

### Added: Discover Feed — TikTok-style Swipe Stack

- New `/discover` page with vertical swipe card stack
- `SwipeCard` component: native pointer-event gesture handling (no library), spring-snap on release, fly-off animation on commit
- Swipe right → "Amen" + save to library; swipe left → skip; double-tap → confetti burst + Amen
- 12 seeded Dirty Soda Lab recipe cards with ingredient tags, Amen/save counts, warm gradient backgrounds
- Tab strip: Soda Lab (active), Talks (coming soon), Insights (coming soon)
- Progress tracker: swiped count + saved count + remaining
- Empty state with restart button
- Added "Discover" nav link (Sparkles icon) to desktop and mobile nav in `nav.tsx`
- Design spec written to `docs/superpowers/specs/2026-04-25-discover-feed-design.md`
