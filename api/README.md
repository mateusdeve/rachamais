# RachaMais API — Python on Cloudflare Workers + D1

FastAPI running on Cloudflare's Python Workers (Pyodide/WASM), with Cloudflare D1
(SQLite) as the database. Replaces the Express + Prisma + Postgres server in
`server.ts`, keeping the HTTP contract byte-compatible with the shipped app.

```
api/
  src/
    worker.py        entrypoint (WorkerEntrypoint -> ASGI), CORS, error handlers
    db.py            D1 helpers (query / execute / batch)
    security.py      JWT HS256, PBKDF2, legacy-bcrypt bridge, Google/Apple JWKS
    balances.py      balance math + debt simplification
    money.py         integer-cents money handling
    schemas.py       request validation (pt-BR messages)
    serialize.py     response shaping (Prisma-compatible JSON)
    routes_*.py      endpoints
  schema.sql         D1 schema
  migrate/           Postgres -> D1 data migration
```

## Runtime constraints worth knowing

Python Workers run under Pyodide, so **no native modules**. Three consequences
shaped this code:

- **bcrypt cannot run here.** Existing users' passwords are bcrypt hashes, so
  `../legacy-bcrypt` (a small JS Worker) verifies them over a service binding.
  Every successful legacy login is rewritten as PBKDF2, so that worker drains
  over time and can eventually be deleted.
- **No `cryptography` module.** Apple/Google ID tokens are verified with Web
  Crypto (`RSASSA-PKCS1-v1_5`) against each provider's JWKS.
- **Python Workers are in open beta.** Hence the `python_workers` flag.

## Local development

```bash
cd api
uv sync && npm install
npx wrangler d1 execute rachamais --local --file schema.sql   # once
uv run pywrangler dev                                          # http://localhost:8787
```

Local secrets live in `.dev.vars` (untracked).

## Deploy

```bash
npx wrangler login

# 1. Legacy password verifier (needed before the API can authenticate old users)
cd legacy-bcrypt && npm install && npx wrangler deploy && cd ..

# 2. Database
cd api
npx wrangler d1 create rachamais          # copy database_id into wrangler.jsonc
npx wrangler d1 execute rachamais --remote --file schema.sql

# 3. Secrets
npx wrangler secret put JWT_SECRET               # reuse the CURRENT value —
                                                 # a new one invalidates every
                                                 # logged-in user's session
npx wrangler secret put EXPO_ACCESS_TOKEN
npx wrangler secret put GOOGLE_OAUTH_CLIENT_IDS  # comma-separated
npx wrangler secret put APPLE_BUNDLE_ID          # com.rachamais.app

# 4. Ship
uv run pywrangler deploy
```

`JWT_SECRET` must be carried over from the old server. The tokens the app is
holding right now are HS256-signed with it; changing it silently logs everyone
out.

## Data migration

```bash
cd api
uv run --with 'psycopg[binary]' migrate/export_postgres.py \
    --database-url "$DATABASE_URL" --out migrate/data.sql
npx wrangler d1 execute rachamais --remote --file migrate/data.sql
```

Money becomes integer cents, timestamps become ISO-8601 with a `Z`, and bcrypt
password hashes are carried over as-is.

## Live

`api.rachamais.com.br` is a custom domain on this Worker (Cloudflare manages the
DNS record and the certificate). The app needs no change: `EXPO_PUBLIC_API_URL`
in `eas.json` already points here, and the HTTP contract is unchanged.

The old Express stack — `server.ts`, `Dockerfile`, `Procfile`, `vercel.json`,
`prisma/` — no longer serves any traffic.

## Deliberate differences from `server.ts`

The wire format is unchanged. Behaviour differs in these places, all of which
were bugs:

| Change | Why |
|---|---|
| Membership checks on balances / expenses / members / invite / settlements | Any authenticated user could read **and write** any group by id. |
| Payer and split participants must belong to the group | Unchecked ids reached the DB and surfaced as a 500. |
| Split amounts must sum to the expense total (±1 cent/person) | Mismatched splits silently destroyed the group's balance invariant. |
| `splits: []` rejected | Divided by zero and created an expense nobody owed. |
| Leaving a group requires a settled balance | Removing a member with debt orphaned their splits and corrupted everyone else's balances. |
| Only admins can remove *other* members | Any member could remove anyone. |
| Account deletion anonymizes instead of destroying rows | Deleting a user's splits while keeping their expenses rewrote other members' balances. |
| Invite code HTML-escaped | Reflected XSS in the invite page. |
| Money in integer cents | Float math on money accumulated rounding drift. |
