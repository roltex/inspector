# Inspector — EHS Management SaaS

A mobile-first, multi-tenant Environmental Health & Safety (EHS) platform for inspections, incidents, risk, CAPA, training, permits, SDS, PPE, compliance, contractors and analytics — built as an installable PWA.

> **Stack:** Next.js 14 · TypeScript · Tailwind CSS · Drizzle ORM · PostgreSQL 16 / PGlite · Better Auth · Stripe · Resend

---

## Quick start (clone → run, with current data)

```bash
# 1. Clone
git clone https://github.com/roltex/inspector.git
cd inspector

# 2. Install
npm install

# 3. Configure environment (just copy the template — defaults work for dev)
cp .env.example .env.local

# 4. One-shot setup: create schema + load the committed data snapshot
npm run setup

# 5. Run
npm run dev
```

Open <http://localhost:3000>. Done.

> The setup step uses **PGlite** (in-process WASM Postgres) — no Docker, no
> local Postgres install needed. The committed `lib/db/snapshot.json` carries
> every workspace, member, inspection, finding and template that was on the
> author's machine when the snapshot was taken, so you land in a working
> system immediately.

### Existing test accounts

The snapshot ships with the demo workspace and a handful of accounts seeded for
testing. Sign in at `/sign-in`. If you don't know the credentials, you can:

```bash
# Promote any user to super-admin so you can reset everyone's password from /admin
npm run admin:promote -- you@example.com
```

then sign in to `/admin/sign-in` for the platform admin panel.

---

## What's running

- **13 EHS modules** — inspections, observations, incidents (5-Whys), CAPA,
  risk assessments (5×5 matrix), documents (acks), training & certifications,
  chemicals & SDS, PPE, permits-to-work, compliance, contractors, analytics.
- **Multi-tenant** with organizations, slugs, invitations, and an 8-role RBAC
  matrix.
- **Subscription billing** through Stripe Checkout & Customer Portal with
  feature gating per plan, plan definitions editable from `/admin/plans`.
- **Inspection-item templates** — save any inspection item (with all its form
  fields, sub-fields and preset rows) as a reusable template. Super-admins can
  also publish *global* templates that auto-seed every newly created
  workspace.
- **Multi-language** — full English + Georgian translations via cookie-based
  i18n.
- **PWA** — installable, offline shell, runtime caching, web push ready
  (VAPID).
- **Modern flat design** — soft neutrals, vibrant accents, rounded-2xl cards,
  dark mode, mobile bottom-tab nav.
- **Server Actions** + **Drizzle** for type-safe data access end-to-end.
- **Pluggable storage adapter** — local filesystem out of the box, swap for
  S3/R2 by changing `STORAGE_DRIVER`.

---

## Scripts

| Command                   | Description                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `npm run dev`             | Start the Next.js dev server                                                           |
| `npm run build`           | Production build                                                                       |
| `npm run start`           | Run the production build                                                               |
| `npm run typecheck`       | TypeScript type-check                                                                  |
| `npm run lint`            | ESLint                                                                                 |
| **`npm run setup`**       | **One-shot bootstrap for a fresh clone** — runs `db:migrate` then `db:restore`         |
| `npm run db:migrate`      | Apply Drizzle migrations to the configured database                                    |
| `npm run db:push`         | Push schema directly (no migration files) — useful during local schema authoring       |
| `npm run db:studio`       | Open Drizzle Studio                                                                    |
| `npm run db:seed`         | Seed a *fresh* demo organization with sample data (alternative to `db:restore`)        |
| `npm run db:snapshot`     | Dump every user table to `lib/db/snapshot.json` — commit it to ship data with the code |
| `npm run db:restore`      | Restore from `lib/db/snapshot.json` into the current database                          |
| `npm run db:backup`       | Run `pg_dump` and write a gzipped backup to `./backups/`                               |
| `npm run admin:promote`   | Promote a user (by email) to platform super-admin                                      |
| `npm run admin:migrate`   | Run only the admin-area migrations                                                     |

### Updating the committed data

Whenever you want to share your local state with the rest of the repo:

```bash
# Stop the dev server first — PGlite is single-process
npm run db:snapshot
git add lib/db/snapshot.json
git commit -m "snapshot: refresh data"
git push
```

The next person who pulls and runs `npm run setup` (or `npm run db:restore`)
will end up with the exact same tables.

---

## Configuration

Everything is driven by environment variables — see `.env.example` for the
full list. The defaults work for local development:

```dotenv
NEXT_PUBLIC_APP_URL="http://localhost:3000"
DATABASE_URL="file:./.pglite"             # PGlite, zero-install
BETTER_AUTH_SECRET="change-me-…"          # generate with: openssl rand -base64 32
BETTER_AUTH_URL="http://localhost:3000"
STORAGE_DRIVER="local"
STORAGE_LOCAL_DIR=".uploads"
```

To run against a real Postgres instead:

```dotenv
DATABASE_URL="postgres://USER:PASS@HOST:5432/inspector"
```

The same `npm run setup` flow works against either.

### Stripe / Resend / Web Push

Stripe, Resend and Web Push are *optional* in development — just leave the
related variables blank in `.env.local` and the corresponding UI gracefully
disables itself. Fill them in when you need to test billing, transactional
email or push notifications.

---

## Architecture

```
app/
  (marketing)/              public landing, pricing, legal
  (auth)/                   sign-in, sign-up
  [orgSlug]/                tenant-scoped app: dashboard, inspections, …
  admin/                    platform super-admin panel (step-up auth)
  api/
    auth/[...all]/          Better Auth handler
    stripe/webhook/         Stripe webhook
    uploads/                file uploads
components/
  ui/                       shadcn-derived primitives (rounded-2xl flat design)
  app/                      app-shell with sidebar + mobile bottom-tabs
lib/
  auth/                     Better Auth config + session helpers, super-admin guard
  billing/                  Stripe + plan gating
  db/                       Drizzle schema, client, migrations, snapshot, seed
  i18n/                     EN + KA message catalogs and cookie-driven locale
  inspection-item-templates/  shared snapshot/clone helpers
  rbac/                     roles + permission matrix
  storage/                  pluggable storage adapter
  rate-limit.ts
  audit.ts
public/
  sw.js                     service worker (precache + runtime cache)
  manifest.webmanifest
  icons/
scripts/
  snapshot-db.mjs           dump every user table → lib/db/snapshot.json
  restore-db.mjs            replay snapshot.json into the configured DB
  promote-admin.mjs         promote a user to super-admin
  backup.mjs                pg_dump archive helper
```

---

## Plans & feature gating

Plans are managed from `/admin/plans` and persist in the `plan_definition`
table. Each plan has a feature-key matrix:

- **Free** — 5 users, Inspections + Observations
- **Starter** ($29/mo) — 25 users, +Incidents, CAPA, Documents
- **Professional** ($99/mo) — 100 users, all 13 modules + analytics + web push
- **Enterprise** — SSO, audit export, custom retention

Use `hasFeature(plan, "feature")` to gate UI; server actions additionally
check role permissions through `requirePermission()`.

---

## Security

- HTTP security headers (`X-Frame-Options`, CSP, HSTS, Referrer-Policy)
- Row-level isolation by `organizationId` enforced in every server action
- RBAC checked centrally via `requirePermission()`
- Audit log table & helper (`recordAudit`)
- Rate limiting on auth endpoints
- Stripe webhook signature verification
- Platform admin requires step-up password re-entry (`inspector.admin_auth`
  cookie) on top of regular session

---

## Deployment

The app runs anywhere a Node 20 server can:

1. Provision Postgres 16 + a Node 20 runtime.
2. Set the environment variables (see `.env.example`).
3. `npm ci && npm run build`
4. Run migrations: `npm run db:migrate`
5. **Optional**: load the committed snapshot with `npm run db:restore` (handy
   for staging / preview environments that should mirror production data).
6. Start the server: `npm run start`
7. Configure your reverse proxy to serve `/public` static assets and pass
   through `/sw.js`, `/manifest.webmanifest`.

`npm run db:backup` is provided for nightly `pg_dump` archives — schedule it
via cron or a managed scheduler.

---

## License

Proprietary — see `LICENSE` (or replace with your preferred license).
