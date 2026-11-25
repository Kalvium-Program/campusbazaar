# CampusBazaar

A small marketplace where students buy and sell used books, gadgets, cycles and furniture on campus. It is the **reference app** for the Kalvium course *AI-Powered Full Stack Web Development*: a complete, working product built only with the tools the course teaches.

> Live demo: _add URL after deploy_ · Log in with `aarav@campus.test` / `campus123`

## What you can do

- Browse, search, filter by category and price, sort and page through listings
- Sign up and log in (HttpOnly cookie)
- Post a listing with a photo, edit it, mark it sold, delete it
- **Write my listing**: an AI helper drafts a title, description and price from a few words
- Message a seller. Messages arrive live over a WebSocket

## Tech stack (and where each piece lives)

| Concern | Tool | Look here |
|---|---|---|
| Server | Node 22, Express 5, TypeScript | `api/src/app.ts` |
| Validation | Zod 4 (one error shape for every failure) | `api/src/errors.ts`, `api/src/routes/*` |
| Database | PostgreSQL + Prisma 7 | `api/prisma/schema.prisma` |
| Login | bcrypt, signed token in an HttpOnly cookie | `api/src/auth.ts`, `api/src/routes/auth.ts` |
| Roles and ownership | `requireAuth`, `requireRole`, owner-only edits | `api/src/auth.ts`, `api/src/routes/listings.ts` |
| File upload | multer, 2 MB, type checked, stored in the database | `api/src/routes/listings.ts` |
| AI feature | one `Provider` function, fake by default, validate and retry | `api/src/ai.ts` |
| Real time | `ws`, one-time ticket plus Origin check | `api/src/ws.ts` |
| Frontend | Next.js 16 (App Router), TanStack Query 5, plain CSS | `web/app`, `web/components` |
| Server components | the listing page renders on the server | `web/app/listings/[id]/page.tsx` |
| Route protection | `proxy.ts` | `web/proxy.ts` |
| Tests | Vitest + Supertest (API), Playwright (browser) | `api/tests`, `web/e2e` |
| Containers | Docker, Compose | `compose.yaml`, `*/Dockerfile` |
| CI/CD | GitHub Actions | `.github/workflows/ci.yml` |

## Architecture

```
Browser ──► Next.js (web)  ──/api/* rewrite──►  Express API  ──►  PostgreSQL
   │                                               ▲
   └──────── WebSocket (one-time ticket) ──────────┘
```

The browser only talks to the web app's own address. Next.js passes `/api/*` on to the API, so the login cookie belongs to one domain and no CORS is needed. The chat socket goes to the API directly, so it uses a short-lived ticket instead of the cookie.

## Run it on your machine

You need Node 22 and PostgreSQL 16 or newer.

```bash
# 1. API
cd api
cp .env.example .env            # then set DATABASE_URL and a JWT_SECRET (32+ chars)
npm install
npx prisma migrate dev          # creates the tables
npm run db:seed                 # 3 users, 20 listings
npm run dev                     # http://localhost:4000

# 2. Web (new terminal)
cd web
cp .env.example .env.local
npm install
npm run dev                     # http://localhost:3000
```

Or with Docker: `docker compose up --build`, then run the seed once with `docker compose exec api npx tsx prisma/seed.ts`.

Demo accounts (password `campus123`): `aarav@campus.test`, `diya@campus.test`, and `admin@campus.test` (admin).

## Tests

```bash
cd api && createdb campusbazaar_test && cp .env.example .env.test   # point DATABASE_URL at the _test database
npm run db:test:setup && npm test        # 23 API tests (refuses to run unless the database name ends in _test)
cd ../web && npx playwright install chromium
npm run test:e2e                          # 7 browser tests; needs API and web running and the seed loaded
```

## The AI helper

`AI_PROVIDER=fake` (the default) needs no key and returns a sensible draft, so the app and the tests always work. To use a real model, set `AI_PROVIDER=openai` with `AI_BASE_URL`, `AI_MODEL` and `AI_API_KEY`. Any OpenAI-compatible API works, including Ollama (`http://localhost:11434/v1`). The reply is always checked against a schema, retried once, and never saved unchecked.

## Deploy (all free tiers)

1. **Database:** create a project on Neon and copy the pooled connection string.
2. **Render:** create a Blueprint from `render.yaml`. Set the API's `DATABASE_URL` and `WEB_ORIGIN`. Migrations run on start.
3. **Web:** the same blueprint creates `campusbazaar-web` (Docker). `API_URL` and `NEXT_PUBLIC_WS_URL` are baked in at build time, so change them in `render.yaml` if your API URL differs. Then set the API's `WEB_ORIGIN` to the web service URL.
4. Run `npm run db:seed` once against the Neon database for the demo data.

Free Render services sleep after 15 minutes idle, so the first request can take about 30 seconds.

## Decisions worth knowing

- **Photos live in the database** (`bytea`, 2 MB cap). Simple and free. A real product would use object storage.
- **Someone else's listing returns 404, not 403**, so ids cannot be probed.
- **Login gives one message** for a wrong email or a wrong password.
- **Rate limiting is in memory.** Fine for one instance, not for several.
- **Tickets are in memory too**, for the same reason.

## Folders

```
api/   Express API, Prisma schema, migrations, seed, tests
web/   Next.js app, components, browser tests
```
