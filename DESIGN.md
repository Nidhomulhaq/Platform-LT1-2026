# Design direction

## Product and visual rationale

This is an operational workspace for a scouting event, used by participants,
companions, judges, and organizers. Favor calm, task-first screens over
promotional styling: users need to identify the current task, status, and next
action quickly, including in bright outdoor conditions.

Keep the existing LT-1 identity. The established green (`--primary: #1b7a3e`)
is the primary action and selection color; white and near-white surfaces keep
forms and dense reports legible. Use the existing positive, warning, and
negative tokens for status rather than inventing per-component colors. Do not
add decorative imagery unless it communicates event or task information.

Use the existing Inter/system font stack for clear Indonesian labels and
scannable operational data. Keep headings distinct from body copy, use sentence
case, and avoid reducing helper text or status labels to ornamental microcopy.
The existing 8 px control radius and 12 px card radius provide a consistent,
quiet shape language.

## Layout and mobile behavior

- Use flexible, content-first columns; allow forms and multi-column layouts to
  stack to one column on narrow screens.
- At widths up to 600 px, keep interactive targets at least 44 px high and
  wide where applicable.
- Present training reports as compact, labeled cards on mobile rather than
  forcing horizontal table scrolling. Keep their table headers available to
  assistive technology.
- Preserve the bottom navigation's safe-area spacing and leave enough page
  padding so content is not obscured by it.
- Prevent page-level horizontal overflow at 320 px. Long names and links should
  wrap or truncate intentionally, not push the layout wider.

## Color, type, and interaction

Use the shared CSS tokens in `app/globals.css` for text, surfaces, borders,
focus rings, and semantic status colors. Do not place muted text on low-contrast
surfaces or rely on color alone to communicate status.

Keep interaction feedback restrained and fast: the current 140 ms and 200 ms
motion tokens are appropriate for small state changes, not for delaying task
completion. Preserve visible keyboard focus and clear disabled, selected, and
confirmation states.

## Design dials

- Energy: 1 — calm and operational.
- Rhythm: 2 — structured, with enough spacing to scan dense information.
- Motion: 1 — minimal feedback; no decorative movement.
