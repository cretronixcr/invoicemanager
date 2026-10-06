# Dani Brothers — Invoice Management System

Full-stack invoicing app for a CCTV/security business: invoices, quotations,
customers, products, payments, reports — with A4 PDF generation.

**Stack:** Next.js 16 (App Router) · Prisma + PostgreSQL · Tailwind CSS 4 ·
React 19 · Zod · jsPDF/html2canvas

## Features

- **Auth** — login/logout, JWT session cookie (httpOnly), route + API protection
  via `proxy.ts`, bcrypt password hashing, change password, team user management
- **Invoices** — create / edit / duplicate / delete, A4 live preview, PDF
  download, print, status automation (Issued → Partially Paid → Paid / **Overdue**)
- **Payments** — record, void/delete with automatic balance + status recalculation
- **Quotations** — create / edit / status workflow (Sent / Accepted / Rejected),
  own A4 PDF, one-click convert to invoice, linked-quotation delete guard
- **Customers & Products** — CRUD, quick-create from invoice form, paginated lists
- **Numbering** — sequential, never-reusing numbers (`max + 1`) with configurable
  prefixes (`INV-`, `QT-`, `CUST-`, `PAY-`) — deletions never cause collisions
- **Reports** — date-range filters + presets, monthly billed/collected chart,
  top products & customers, Overdue KPI, CSV export (invoices/customers/products)
- **Settings** — business profile, logo upload (used on PDFs), numbering formats,
  currency (flows through the whole UI)
- **Global search** — debounced header dropdown across invoices/customers/products
- **Share** — WhatsApp / email / copy-link from the invoice page

## Getting started

```bash
npm install
npx prisma db push     # sync schema to the database in .env
npx tsx prisma/seed.ts # sample data (idempotent — safe to re-run)
npm run dev
```

Open http://localhost:3000 and sign in.

### Environment (`.env`)

| Key              | Purpose                          |
| ---------------- | -------------------------------- |
| `DATABASE_URL`   | PostgreSQL connection string     |
| `SESSION_SECRET` | JWT signing secret (login)       |

> **Deploying to Vercel:** set both variables in Project Settings → Environment
> Variables. The app refuses to start login without `SESSION_SECRET`.

## Default credentials (seed)

```
Email:    admin@danibrothers.com
Password: admin
```

Change it immediately: **Settings → Security & Users → Change Your Password**.

## Scripts

| Command             | What it does                    |
| ------------------- | ------------------------------- |
| `npm run dev`       | Dev server                      |
| `npm run build`     | Production build                |
| `npm run start`     | Start production server         |
| `npx eslint .`      | Lint (0 errors / 0 warnings)    |

## Tests (browser E2E, Edge headless)

Keep the dev server running, then in a second terminal:

```bash
node e2e/e2e-auth.cjs            # login/logout/session
node e2e-invoice-edit.cjs    # invoice edit + delete flows
node e2e/e2e-quotation.cjs       # quotation CRUD/status/PDF
node e2e/e2e-numbering.cjs       # sequential numbering after deletes
node e2e/e2e-overdue.cjs         # overdue detection + recovery
node e2e-payment-delete.cjs  # payment void + balance recalc
node e2e/e2e-reports.cjs         # reports range/chart/CSV
node e2e/e2e-extras.cjs          # logo, currency, search, share, 404
```

Each suite creates only temporary records (marker notes) and cleans them up.

## Architecture notes

- `proxy.ts` — Next.js 16 middleware: redirects unauthenticated users to
  `/login`, returns 401 JSON for APIs (optimistic check).
- `lib/dal.ts` — `requireApiSession()` guard inside every API handler
  (defense in depth; don't rely on the proxy alone).
- `lib/numbering.ts` — `max(existing) + 1` sequences; prefixes come from Settings.
- `lib/invoice-status.ts` — single source of truth for status derivation
  (incl. Overdue) + idempotent DB sync on list reads.
- `lib/prisma.ts` — client `$extends` converts every money `Decimal` to a plain
  JS `number` at the Prisma boundary (DB columns stay `Decimal` for precision).
- `lib/currency.tsx` — `useCurrency()` context; server pages read Settings directly.
