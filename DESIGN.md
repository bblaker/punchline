# Design System: Punchline

## Visual World

**Split-Flap Concourse** — Time entries as departures on a live rail station departure board. The tracker becomes a station where invoices are destinations, clients are routes, and every status change cascades visibly across the board. Dark-only; the board is always running.

## Palette

| Token | Hex | Role |
|-------|-----|------|
| `--flap-black` | `#0d0d0d` | Page background |
| `--flap-face` | `#1a1a1a` | Panel/card surfaces |
| `--flap-white` | `#f0f0f0` | Primary text |
| `--steel-frame` | `#374151` | Borders, dividers |
| `--steel-light` | `#4b5563` | Border hover state |
| `--amber` | `#f5a623` | Accent, pending states, focus |
| `--amber-dim` | `#b8860b` | Amber muted variant |
| `--red` | `#dc2626` | Overdue, danger, error |
| `--red-dim` | `#991b1b` | Void/struck states |
| `--green` | `#22c55e` | Paid, positive, success |
| `--green-dim` | `#166534` | Green muted variant |
| `--fg-2` | `#9ca3af` | Secondary text |
| `--fg-3` | `#6b7280` | Tertiary text, labels |
| `--bg-hover` | `#262626` | Row/button hover |

## Typography

| Stack | Face | Role |
|-------|------|------|
| `--display` | Roboto Condensed, system-ui | Headlines, labels, nav, buttons |
| `--mono` | JetBrains Mono, ui-monospace | Figures, dates, inputs, table cells |
| `--sans` | system-ui, -apple-system | Body text, descriptions |

### Display treatment
- All caps via `text-transform: uppercase`
- Letter spacing `0.05em` to `0.15em` depending on size
- Weight 700

### Mono treatment
- `font-variant-numeric: tabular-nums`
- Used for all currency, hours, dates

### Type scale (as built)
- Stat values: `2.5rem` / `2rem` mobile
- Section headers: `0.875rem`
- Body: `0.9375rem`
- Labels: `0.625rem` to `0.6875rem`
- Footer/hints: `0.6875rem` to `0.75rem`

## Component Patterns

### Stats Panel
Steel-framed panel (`2px solid --steel-frame`) containing flex row of stat cells. Each cell shows monospace figure at `2.5rem` with uppercase display label at `0.6875rem`. Dividers between cells. Background `--flap-face`. On mobile, stacks vertical.

### Tables (Departure Board Rows)
- `2px` steel frame border, `4px` radius
- Thead gradient `#262626` to `#1a1a1a`
- Headers: uppercase display face, `0.6875rem`, `--fg-3`
- Cells: monospace face, `0.9375rem`
- Row hover: `--bg-hover`
- Footer row: `2px` top border for totals

### Quick Entry Form
Grid layout: Date | Project | Hours | Description | Submit. Steel frame panel. Inputs use `--flap-black` background. Submit button is amber-filled (`--amber` background, `--flap-black` text).

### Status Badges
Inline-flex pill with `::before` glow lamp:
- `.paid`: green text, `rgba(34,197,94,0.15)` background, glow
- `.sent`: amber text, `rgba(245,166,35,0.15)` background, glow
- `.overdue`: red text, `rgba(220,38,38,0.15)` background, glow
- `.draft`: gray text, `--bg-hover`, no lamp
- `.void`: dim red, struck through, no lamp

### Buttons
- Base `.btn`: steel border, uppercase display face, `0.75rem`, `2px` border radius
- `.btn-primary`: amber fill, black text
- `.btn-danger`: red border and text, transparent fill
- `.edit-btn`: minimal 2rem square, icon only, appears on row hover

### Form Fields
- Inputs: `--flap-black` background, steel border, mono face
- Focus: amber border with `0 0 0 2px rgba(245,166,35,0.2)` shadow
- Labels: uppercase display face, `0.625rem`, `--fg-3`

### Client Rows
Grid layout: Name/email | Stat | Stat | Actions. Steel frame container. Row hover state.

### Toast Notifications
Fixed bottom-right. Steel border with status color. Success: green. Error: red. Uppercase display face. Slide-up animation.

### Empty States
Centered panel with uppercase title, body text, and primary button CTA.

## Browser Surface Theming

- `::selection`: amber background, black text
- `:focus-visible`: `2px solid --amber`, `2px` offset
- `::placeholder`: `--fg-3`
- Caret: amber
- Scrollbar: `--steel-frame` thumb on `--bg` track

## Responsive Rules

At `768px` breakpoint:
- Stats panel stacks vertical
- Quick entry grid becomes 2-column
- Client rows become single column
- Date/status columns hide in tables
- Form grids become single column
- Settings grid becomes single column
- Nav links shrink padding/size

## Accessibility

- Skip link to main content (hidden until focused)
- Focus rings on all interactive elements
- Sufficient contrast (white on near-black)
- Form labels explicitly associated with inputs
- Keyboard shortcuts shown with `.kbd` badge

## Named Rules

1. **Dark only** — No light mode. The split-flap board runs 24/7.
2. **Steel frames** — All panels bounded by `2px solid --steel-frame`.
3. **Uppercase display** — All labels, headers, nav, and buttons use condensed caps.
4. **Monospace figures** — All numbers (hours, currency, dates) use mono with tabular nums.
5. **Status lamps** — Paid/sent/overdue states get glowing `::before` dot.
6. **Amber accent** — Focus, active nav, primary buttons, pending states.
7. **No rounded corners** — `2px` or `4px` radius max; never pill shapes.

## Not Canonized

The direction contract specified character-by-character cascade animation on data changes; this was not implemented in the build. Horizontal navigation replaced the vertical "platform strip" sidebar described in FIRST VIEWPORT. These are noted drift, not defects to canonize.
