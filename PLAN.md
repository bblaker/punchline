# Billable Hours Tracker - Implementation Plan

## Overview
A single-user web app for tracking consultant/contractor billable hours, hosted on Cloudflare.

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React + Vite | Fast dev, excellent Cloudflare Pages support |
| Styling | Tailwind CSS | Rapid UI development, utility-first |
| Backend | Cloudflare Workers + Hono | Lightweight, great DX, native D1 support |
| Database | Cloudflare D1 (SQLite) | Serverless SQLite at edge, no external deps |
| PDF Gen | @react-pdf/renderer | Client-side PDF generation, no server load |
| Auth | Cloudflare Zero Trust | Pages Functions serve API at same domain, so Zero Trust protects both frontend and API |

## Data Model

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Clients   │──────<│  Projects   │──────<│ TimeEntries │
└─────────────┘       └─────────────┘       └─────────────┘
      │                                            │
      │                                            │
      ▼                                            ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  Invoices   │──────<│ LineItems   │       │   Periods   │
└─────────────┘       └─────────────┘       └─────────────┘
      │
      ▼
┌─────────────┐
│  Payments   │
└─────────────┘
```

### Tables

**clients**
- id, name, email, address, default_rate, notes, created_at, updated_at

**projects**
- id, client_id, name, rate (nullable, falls back to client rate), active, created_at

**time_entries**
- id, project_id, date, hours, description, billable, invoice_id (nullable), created_at

**billing_periods**
- id, name, start_date, end_date, closed_at (nullable)

**invoices**
- id, client_id, invoice_number, issue_date, due_date, status (draft/sent/paid/void), subtotal, notes, created_at

**invoice_line_items**
- id, invoice_id, time_entry_id (nullable), description, quantity, rate, amount

**payments**
- id, invoice_id, date, amount, method, reference, notes

## Project Structure

```
punchline/
├── src/
│   ├── components/          # React components
│   ├── pages/               # Page components
│   ├── hooks/               # Custom hooks
│   └── lib/                 # Utilities
│
├── functions/               # Cloudflare Pages Functions (API)
│   └── api/
│       ├── clients/
│       │   ├── index.ts     # GET /api/clients, POST /api/clients
│       │   └── [id].ts      # GET/PUT/DELETE /api/clients/:id
│       ├── projects/
│       ├── time-entries/
│       ├── invoices/
│       └── payments/
│
├── db/
│   ├── schema.sql           # D1 database schema
│   └── migrations/          # Schema migrations
│
├── wrangler.toml            # D1 binding config
├── package.json
└── vite.config.ts
```

This is a single Pages project. The `functions/` directory becomes API routes automatically—no separate Worker deployment needed.

## Core Features

### 1. Client Management
- List, create, edit, archive clients
- Set default hourly rate per client
- Store contact info for invoices

### 2. Project Management
- Projects belong to clients
- Optional rate override per project
- Active/inactive toggle

### 3. Time Tracking
- Log entries: date, hours, description, project
- Quick entry form + calendar/list view
- Mark entries as billable/non-billable
- Filter by date range, client, project

### 4. Billing Periods
- Define periods (e.g., "September 2024")
- Close periods to lock time entries
- Reopenable by explicit action

### 5. Invoicing
- Generate invoice from unbilled time entries
- Auto-populate line items from time entries
- Add manual line items
- Preview (HTML) and download (PDF)
- Track status: draft → sent → paid → void

### 6. Payment Tracking
- Record payments against invoices
- Partial payments supported
- Reconciliation dashboard showing:
  - Outstanding invoices
  - Overdue amounts
  - Payment history

## API Routes

```
GET/POST       /api/clients
GET/PUT/DELETE /api/clients/:id

GET/POST       /api/projects
GET/PUT/DELETE /api/projects/:id

GET/POST       /api/time-entries
GET/PUT/DELETE /api/time-entries/:id
POST           /api/time-entries/bulk

GET/POST       /api/billing-periods
PUT            /api/billing-periods/:id/close
PUT            /api/billing-periods/:id/reopen

GET/POST       /api/invoices
GET/PUT/DELETE /api/invoices/:id
POST           /api/invoices/:id/send
POST           /api/invoices/:id/void

GET/POST       /api/invoices/:id/payments
DELETE         /api/payments/:id

GET            /api/dashboard (summary stats)
```

## UI Pages

1. **Dashboard** - Summary: unbilled hours, outstanding invoices, recent activity
2. **Time Entry** - Primary work view with quick entry and list
3. **Clients** - Client list and detail views
4. **Projects** - Project management
5. **Invoices** - Invoice list, create/edit, preview/PDF
6. **Payments** - Payment log and reconciliation
7. **Settings** - Billing periods, app preferences

## Implementation Phases

### Phase 0: Design
- [ ] ASCII wireframes for core screens (dashboard, time entry, invoices)
- [ ] Iterate on layout and workflow
- [ ] HTML/CSS prototype for visual style validation

### Phase 1: Foundation
- [ ] Initialize Vite + React project
- [ ] Set up Tailwind CSS
- [ ] Create D1 database schema
- [ ] Set up Pages Functions structure
- [ ] Configure wrangler.toml for D1 binding
- [ ] Local dev with `wrangler pages dev`

### Phase 2: Core Data
- [ ] Clients CRUD (API + UI)
- [ ] Projects CRUD (API + UI)
- [ ] Time entries CRUD (API + UI)

### Phase 3: Billing
- [ ] Billing periods management
- [ ] Invoice generation from time entries
- [ ] Invoice preview (HTML)
- [ ] Invoice PDF generation

### Phase 4: Payments & Polish
- [ ] Payment recording
- [ ] Reconciliation view
- [ ] Dashboard with stats
- [ ] Mobile-responsive styling

### Phase 5: MCP Server
- [ ] MCP server exposing billing data to Claude
- [ ] Tools: query time entries, list clients/projects, check invoice status
- [ ] Tools: log time entry, create invoice draft
- [ ] Auth: Use Cloudflare D1 HTTP API with local API token (no Zero Trust complexity)
- [ ] Token stored in local env config (e.g., `~/.config/punchline/.env`)

## Verification

1. **Local dev**: `pnpm dev` runs both frontend and worker locally
2. **Database**: Use Wrangler to run D1 locally
3. **Deploy**: `pnpm deploy` pushes to Cloudflare Pages + Workers
4. **Test flow**: Create client → project → log time → generate invoice → record payment
