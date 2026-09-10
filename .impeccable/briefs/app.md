# Surface Brief: Punchline App

## Scope

Full application redesign: Dashboard, Time Entry, Clients, Projects, Invoices, Payments, Settings.

## Mode

Operate — the visitor completes tasks.

## Audience & Context

Solo freelancers and independent contractors at their desktop workstation during focused work sessions. Keyboard-heavy interaction. Primary tasks: track time, manage clients/projects, generate invoices, record payments.

## Direction Contract

### THESIS

Time entries as departures on a live concourse board. The billable hours tracker becomes a station where invoices are destinations, clients are routes, and every status change cascades visibly across the board. The category default (sidebar + cards + neutral palette) is refused in favor of the split-flap grid.

### OWN-WORLD

Matte black flap faces (#1a1a1a) with white condensed sans (Roboto Condensed). Brushed steel frame borders (#374151). Amber row lamps (#f5a623) for pending/warning states. Red (#cc3333) for overdue/void. The grid is the entire composition: every element lives in ruled rows and fixed columns. Character-by-character cascade animation on data changes.

### STORY

The freelancer opens the board and sees today's work as live departures. They punch in time (entries cascade into place). They check client routes (projects organized by destination). They generate an invoice (a departure scheduled). They mark paid (arrived on time). The board always shows what needs attention: delayed invoices glow amber.

### FIRST VIEWPORT

A full-width departure board fills the viewport. The header shows PUNCHLINE in condensed caps with today's date in monospace. Below: three stat cells (Unbilled Hours, Outstanding, This Month) as monumental split-flap counters. Then the active time entries table: Date | Client | Project | Hours | Description | Status — each row as a flap row, with the active timer glowing amber. The sidebar is a vertical destination strip: Dashboard, Time, Clients, Projects, Invoices, Settings — each as a platform number.

### FORM

Split-Flap Concourse (assigned #6, seed key b5ee5df6)

### FINISH

Unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Raised Disciplines

- **From airport-wayfinding:** Sticky positioned status bands persist during scroll
- **From sneaker-archive:** Detail views hinge open with reveal interaction
- **From cyclorama:** Time periods organized as horizon bands (today, this week, this month)
- **From ascii-grid:** Strict monospace grid discipline for all tabular data

## Quality Bar

- Board: `.impeccable/reference/board.webp`
- Hero: `.impeccable/reference/hero.webp`

Build path: code-led. The ambition lives in the direction contract above.
