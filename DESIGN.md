# Design direction

## Product and visual rationale

This is a mobile-first learning and event workspace for participants,
companions, judges, and organizers. Take cues from Ruangguru's welcoming
learning home: bright color near the top of the screen, friendly rounded
surfaces, clear progress, recognizable icons, and a persistent bottom
navigation on phones. Use those visual cues to make the existing LT-1 tasks
feel approachable and easy to scan. A small original LT-1 scout companion may
add character to mobile page headers; do not copy Ruangguru's mascot, logo,
artwork, or product-specific content.

Keep the LT-1 identity recognizable through its logo and original scout
companion. Use Ruangguru-inspired blue and turquoise as the main interface
colors, with violet, sunny yellow, and coral as small icon and illustration
accents. Blue (`--primary: #2c6fc2`) is the primary action and selection color;
green remains the positive-status color. Use blue-to-violet gradients in shared
mobile headers and participant welcome or progress areas, while the rest of
each page stays on white and cool near-white surfaces for legibility. Keep
positive, warning, and negative status colors semantic. Decorative shapes
should support the hierarchy and never hide task information.

Use the existing Inter/system font stack for clear Indonesian labels and
scannable operational data. Keep headings distinct from body copy, use
sentence case, and avoid reducing helper text or status labels to ornamental
microcopy. Favor generous rounded cards and controls on mobile; retain the
shared radius tokens as the baseline and use larger radii for prominent cards
and the mobile navigation dock.

## Layout and mobile behavior

- Design narrow screens as an app-like vertical home: a colorful greeting or
  page header, a prominent existing progress summary, then clear sections in
  rounded cards. Keep the main task and next action easy to spot.
- Use icon-forward cards or compact grids for existing destinations and
  categories when the content supports them. Keep labels visible; icons alone
  must not carry meaning.
- On phones, make the existing bottom navigation a clear, fixed dock with a
  strong selected state. Respect safe-area insets and leave enough page padding
  so content and focused controls are not obscured by it.
- Use flexible, content-first columns; allow forms and multi-column layouts to
  stack to one column on narrow screens. Keep dense operator, judge, and
  companion workflows focused on their data even when using the same rounded
  surface language.
- At widths up to 600 px, keep interactive targets at least 44 px high and
  wide where applicable. Give taps and selections immediate, subtle visual
  feedback without changing what an action does.
- Present training reports as compact, labeled cards on mobile rather than
  forcing horizontal table scrolling. Keep their table headers available to
  assistive technology.
- Prevent page-level horizontal overflow at 320 px. Long names and links should
  wrap or truncate intentionally, not push the layout wider.

## Color, type, and interaction

Use the shared CSS tokens in `app/globals.css` for text, surfaces, borders,
focus rings, and semantic status colors. Tailwind utilities are available for
new UI, with `brand`, `brand-strong`, `surface`, `ground`, `ink`, and `muted`
color names plus the existing font and radius tokens. The Tailwind preflight is
intentionally omitted to preserve the established global styles. Do not place
muted text on low-contrast surfaces or rely on color alone to communicate
status.

Use restrained gradients and shadows to establish hierarchy in shared mobile
headers and participant welcome or progress cards, not as decoration on every
panel. Use small, softly colored backgrounds behind familiar line icons to add
the friendly, colorful subject-icon feel from the reference while preserving
clear icon shapes and labels. Keep other role workspaces quieter so tables,
scores, schedules, and forms stay easy to read.
Scale short headings fluidly where useful, and preserve comfortable body-text
sizes and visible keyboard focus.

Keep interaction feedback quick and tactile: the current 140 ms and 200 ms
motion tokens suit hover, press, and selected-state feedback. Respect reduced
motion preferences, and never use animation to delay task completion or imply
new functionality.

## Design dials

- Energy: 4 — bright and encouraging, anchored by the LT-1 logo and scout character.
- Rhythm: 3 — clear card sections with comfortable space for scanning.
- Motion: 2 — quick feedback for taps and selections, with reduced motion
  respected.
