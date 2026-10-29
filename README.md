# Mariox Partners (SaaS)

Multi-partner version of the Mariox partner portal, built with Next.js 15 (App Router), MongoDB (Mongoose) and TypeScript.

Each partner has their own login and sees only their own leads, projects, commissions and requests. Mariox admins see and manage everything. Your main website creates partner accounts through one API call.

## Run locally

```bash
cp .env.example .env.local     # then set MONGODB_URI, JWT_SECRET, MAIN_SITE_API_KEY
npm install
npm run seed                   # admin + demo partner + sample data (or: npm run seed -- --admin-only)
npm run dev                    # http://localhost:3000
```

Seeded logins:

| Role    | Email                    | Password     |
|---------|--------------------------|--------------|
| Admin   | admin@mariox.in          | Admin@12345  |
| Partner | rohit@sharmadigital.in   | Partner@123  |

## Creating users from the main website

```http
POST /api/v1/users
x-api-key: <MAIN_SITE_API_KEY>
content-type: application/json

{ "name": "Priya Shah", "email": "priya@agency.in", "phone": "+91 98…", "company": "Shah Digital", "city": "Pune" }
```

Optional fields: `password` (account is active immediately), `industries`, `externalId` (your main site's user id), `commissionRate` (0–1).

Response `201`:

```json
{
  "user": { "id": "…", "partnerCode": "MXP-0143", "status": "invited", "...": "…" },
  "setPasswordUrl": "https://partners.mariox.in/set-password?token=…"
}
```

Email `setPasswordUrl` to the partner. It works once and expires in 7 days. Errors: `401` wrong API key, `409` email already exists, `400` invalid input.

**Call this from your main site's backend, not from browser JavaScript**, because the API key must stay secret. `MAIN_SITE_ORIGIN` only controls CORS.

```js
// main website backend (Node)
const res = await fetch(`${PARTNERS_URL}/api/v1/users`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-api-key': process.env.MARIOX_PARTNERS_KEY },
  body: JSON.stringify({ name, email, phone, company }),
});
const { user, setPasswordUrl } = await res.json();
```

## How it fits together

```
src/
  models/            Mongoose schemas: User, Lead, Project, Requests (Scope/Booking/TechRequest/Ticket), Content (Resource/Setting)
  lib/
    api.ts           handle() wrapper: DB connect + error→JSON; session()/admin() guards; scope() for per-partner filtering
    jwt.ts           session token sign/verify (edge-safe, used by middleware)
    schemas.ts       zod validation for every write
    users.ts         createPartner(), shared by /api/v1/users and the admin panel
    requests.ts      registry that powers /api/requests/[kind] for all four request types
    metrics.ts       pure commission + pipeline calculations (server and client)
  middleware.ts      redirects for signed-out users and non-admins
  app/api/…          REST endpoints
  app/(portal)/…     partner pages
  app/admin/…        admin pages
  components/ui/     Button, Input/Select/Textarea, Card, StatCard, Badge, DataTable, Modal, Tabs, Toast
  components/…       feature components reused by partner and admin pages (LeadDetail, ProjectCard, RequestsView, …)
  hooks/             useApi (load + reload), useForm (values, binding, submit/busy/error)
```

**Multi-tenancy:** every partner-owned document has an `owner` field. All partner queries go through `scope(session)`, which adds `{ owner: <user id> }` for partners and nothing for admins. A partner asking for another partner's record gets `404`.

**Adding a new request type:** add a model in `models/Requests.ts`, a create schema in `lib/schemas.ts`, an entry in `lib/requests.ts` and `components/requests/config.tsx`. The API routes, list and review screens come for free.

## API summary

| Method & path | Who | Purpose |
|---|---|---|
| `POST /api/v1/users` | main site (API key) | create partner |
| `POST /api/auth/login` · `logout` · `set-password` | public | session cookie |
| `GET/PATCH /api/me` | any | own profile |
| `GET/POST /api/leads`, `GET/PATCH/DELETE /api/leads/:id` | partner (own) · admin (all) | CRM; PATCH also adds tasks/activities |
| `GET /api/projects`, `GET /api/projects/:id` | partner (own) · admin | delivery + payments |
| `POST/PATCH/DELETE /api/projects…` | admin | manage projects, payouts |
| `GET/POST /api/requests/:kind` | partner (own) · admin | kind = scope, booking, tech, ticket |
| `PATCH /api/requests/:kind/:id` | admin | review / assign / reply |
| `GET /api/resources`, `POST/PATCH/DELETE` | all · admin | sales kit |
| `GET/PUT /api/settings` | all · admin | announcement, contacts |
| `GET/POST /api/admin/users`, `PATCH /api/admin/users/:id` | admin | partner accounts |

## Deploy

### On a server (EC2 / any VPS) with PM2

**Never run `npm run dev` on a server.** Dev mode compiles each page on first visit, uses several
times the CPU and RAM, and is what makes pages hang on "loading" and PM2 restart the app.

```bash
# one time: Node 20+, and MongoDB reachable from the server (local mongod or Atlas)
git pull                           # or copy the project
cp .env.example .env.local         # fill in the values below
npm ci
npm run seed -- --admin-only       # first deploy only: creates the admin login
npm run build
pm2 delete my-app                  # remove an old dev-mode process if there is one
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup            # restart on reboot
```

After every code update: `git pull && npm ci && npm run build && pm2 reload mariox-partners`.

`.env.local` on the server:

| Variable | Value |
|---|---|
| `MONGODB_URI` | e.g. `mongodb://127.0.0.1:27017/mariox` or your Atlas URI (allow the server IP in Atlas) |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `MAIN_SITE_API_KEY` | secret shared with the main website |
| `APP_URL` | the public URL, e.g. `http://13.x.x.x:3000` or `https://partners.mariox.in` |
| `COOKIE_SECURE` | optional; defaults to `true` only when `APP_URL` starts with `https://` |

**Check it:** open `APP_URL/api/health`. You should see `"ok":true,"db":"up"`. If it says
`"db":"down"`, MongoDB is not reachable with that `MONGODB_URI`; anything `false` is a missing setting.

Logs: `pm2 logs mariox-partners`.

### Elsewhere

Works on Vercel, Netlify (Next.js runtime) or any Node host. Set the same variables in the host's environment settings.
