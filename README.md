# Punchline

A single-user billable hours tracker for freelancers and consultants. Track time, manage clients, generate invoices, and record payments—all in one place.

Built on Cloudflare Pages with D1 (SQLite at the edge).

## Features

- **Time Tracking** — Log hours against projects with descriptions
- **Client Management** — Store client info with default billing rates
- **Project Organization** — Group work by client with optional rate overrides
- **Invoicing** — Generate invoices from unbilled time entries
- **Payment Recording** — Track partial and full payments
- **PDF Export** — Download professional invoices as PDF

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite + TypeScript |
| Styling | Custom CSS (Split-Flap design system) |
| Backend | Cloudflare Pages Functions + Hono |
| Database | Cloudflare D1 (SQLite) |
| PDF | @react-pdf/renderer |

## Local Development

### Prerequisites

- Node.js 18+
- pnpm
- Wrangler CLI (`pnpm add -g wrangler`)

### Setup

```bash
# Install dependencies
pnpm install

# Initialize the local D1 database
pnpm db:init

# Start the dev server (frontend only, hot reload)
pnpm dev

# In another terminal, start Pages dev server (API + frontend)
pnpm dev:pages
```

The app runs at `http://localhost:8788` when using `dev:pages`.

### Database

The local D1 database persists to `.wrangler/state/`. To reset:

```bash
rm -rf .wrangler/state
pnpm db:init
```

## Project Structure

```
punchline/
├── src/                    # React frontend
│   ├── components/         # Shared components
│   ├── pages/              # Page components
│   └── lib/                # API client, utilities
├── functions/              # Cloudflare Pages Functions (API)
│   └── api/
│       ├── clients/
│       ├── projects/
│       ├── time-entries/
│       ├── invoices/
│       └── payments/
├── db/
│   └── schema.sql          # D1 database schema
└── public/                 # Static assets
```

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/clients` | List or create clients |
| GET/PUT/DELETE | `/api/clients/:id` | Client operations |
| GET/POST | `/api/projects` | List or create projects |
| GET/PUT/DELETE | `/api/projects/:id` | Project operations |
| GET/POST | `/api/time-entries` | List or create time entries |
| GET/PUT/DELETE | `/api/time-entries/:id` | Time entry operations |
| GET/POST | `/api/invoices` | List or create invoices |
| GET/PUT/DELETE | `/api/invoices/:id` | Invoice operations |
| POST | `/api/invoices/:id/send` | Mark invoice as sent |
| POST | `/api/invoices/:id/void` | Void an invoice |
| GET/POST | `/api/invoices/:id/payments` | Payment operations |
| GET | `/api/dashboard` | Summary statistics |

## Deployment

### First-time setup

1. Create a D1 database:
   ```bash
   wrangler d1 create punchline-db
   ```

2. Update `wrangler.toml` with the database ID from step 1

3. Run the schema migration:
   ```bash
   pnpm db:migrate
   ```

4. Deploy:
   ```bash
   pnpm deploy
   ```

### Subsequent deployments

```bash
pnpm deploy
```

## Authentication

This app is designed to run behind Cloudflare Zero Trust Access. Configure an Access policy for your Pages domain to restrict access to authorized users.

## License

MIT
