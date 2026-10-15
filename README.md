# ClientFlow

Agency project management with team and client access, multiple workspaces, personal projects, task boards, and client feedback.

## Stack

React 19 + Vite 7, Node.js 24 + Express 5, PostgreSQL 18, Zod validation, Lucide icons, and cookie-based sessions. Redis is deliberately optional: the current application does not need a distributed cache or background queue.

## Project structure

```text
client/src/
  app/             Application orchestration and workspace state
  components/      Reusable dialog, avatars, icons, and date helpers
  features/
    auth/          Sign-in and registration
    members/       Invitations, membership roles, permissions
    projects/      Project creation and Kanban boards
    tasks/         Task cards, lists, creation, and detail drawer
    workspace/     Overview, activity, settings
  layout/          Workspace sidebar
  lib/             API client, demo seed, role constants
  styles/          Base theme and independent component scrolling
server/
  db/              PostgreSQL schema, migration, and development seeder
  middleware/      Authentication, origin checks, errors
  routes/          HTTP routes by resource
  services/        Password/session helpers and permission checks
  tests/           API integration and authorization tests
  validation/      Request schemas
e2e/               Playwright browser tests and isolated database fixtures
scripts/           Browser installation and test runner
docs/              Architecture, permissions, seed users, tests, verification
```

## Local demo

Requires Node.js 22.12+ or Node.js 24.

```sh
npm ci
npm run dev -- --mode demo
```

Open the printed local URL. The demo uses browser localStorage, simulated identities, and sample records. It is not a shared database. The role selector is available only in demo mode.

## Live application

A local ignored `.env` has been prepared. It contains a generated development database password and the configuration for PostgreSQL on localhost:5433. Keep it private. For a new machine, copy `.env.example` to `.env`, choose your own password, and set both POSTGRES_PASSWORD and DATABASE_URL consistently.

```sh
docker compose up -d db
npm run migrate
npm run seed
npm run build
npm start
```

Open http://localhost:3001 and create your account. Registration creates an agency workspace and an owner-only personal workspace. The optional development seeder adds six sample accounts and 67 tasks without replacing existing records. Sign in with **owner@clientflow.test** and **ClientFlowDemo2026!**, or create your own account. See [all seeded users and safe reruns](docs/seeding.md).

For development against the API, run `npm start` and `npm run dev` in separate terminals. Vite forwards /api to localhost:3001.

For the complete container setup, use `docker compose up --build -d`. Production requires an HTTPS reverse proxy, APP_ORIGIN set to that exact origin, COOKIE_SECURE=true, a private database, and a persistent database volume. The supplied local Docker port uses HTTP, so COOKIE_SECURE=false is its development default.

## Checks

```sh
npm test
npm run test:postgres
npm run playwright:install
npm run build
npm run test:e2e
npm run build:demo
npm run format:check
```

The production application is built into dist/. The separate demo is built into dist/client/ for private Sites hosting. Build production before demo if you need both: the production build clears dist/.

The Windows filesystem sandbox may prevent Vite’s bundled config loader from reading ancestor directories. Use `npm run build -- --configLoader native` or the corresponding dev command with that flag; this loads the local config directly.

## Implemented workflows

- Agency and personal workspaces; workspace creation/rename and switching.
- Project creation/editing, archive and restore with preserved tasks.
- Team and private projects; explicit project access for clients.
- Owner, admin, member, viewer, and client roles.
- Task creation, editing, deletion, assignment, due dates, priorities, visibility, and labels.
- Kanban drag-and-drop and list views.
- Task detail drawer with persistent subtasks, progress, comments, and project activity.
- Overview metrics and an upcoming workload chart calculated from accessible records.
- Invitation links with seven-day expiry, email matching, and single-use acceptance. Invitations are shared manually; no email is sent.
- Activity log, member role/access management, member removal, and invitation revocation.
- Independent column, drawer, sidebar-project, and overview scrolling with fixed headers.
- Automatic data refresh and task revision conflicts that reject stale edits.
- Repeatable development seeding and desktop/mobile Playwright verification.

## Current limits

The authorization and API suite passes with both pg-mem and real PostgreSQL 18. PostgreSQL is running locally through Docker, and the Node API is available at http://localhost:3001. The PostgreSQL test runner creates and removes its own isolated temporary database.

The Sites demo build is prepared locally but is not published. Source upload was blocked by automatic approval review pending explicit authorization to send the source to the external hosting repository. Sites static hosting would serve the demo; the live Node/PostgreSQL application uses the local server or Docker. No realtime collaboration, file attachments, password recovery, email verification, task history snapshots, or automated email delivery is implemented. Task edits use revision checks; stale changes return a conflict instead of overwriting newer work. Data refreshes periodically and when the window regains focus. Login throttling is in memory per Node process; add Redis-backed throttling before deploying multiple API instances.

See [architecture](docs/architecture.md), [permissions](docs/permissions.md), [research and design references](docs/research.md), [seeded users](docs/seeding.md), [Playwright setup](docs/playwright.md), and [verification](docs/verification.md).
