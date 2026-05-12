
## [15:35] Task 3 — DayColumnHeaderImage height taller strips

- Updated `DayColumnHeaderImage` function in KanbanBoard.jsx
- Changed three `height: 48` values to `height: 90`:
  1. Loading skeleton style
  2. Empty fallback gradient div
  3. Image container wrapper
- All three changes target the day column destination image strips
- Commit: `feat(itinerary): taller day-column destination image strips (48→90px)`

**Files changed:**
- `src/components/itinerary/KanbanBoard.jsx` (3 insertions)
