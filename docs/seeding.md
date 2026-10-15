# Development seed data and sample users

Run from the ClientFlow project folder. The seeder writes to DATABASE_URL in your ignored .env file.

```sh
docker compose up -d db
npm run migrate
npm run seed
npm run build
npm start
```

Sign in at http://localhost:3001. The container app may be available at http://localhost:3002 during verification; both connect to the same local development database.

## Sample credentials

Default development password for every account: **ClientFlowDemo2026!**

| Email                        | Name        | Role in Forma Studio |
| ---------------------------- | ----------- | -------------------- |
| owner@clientflow.test        | Maya Chen   | Owner                |
| admin@clientflow.test        | Priya Shah  | Admin                |
| member@clientflow.test       | Alex Morgan | Member               |
| viewer@clientflow.test       | Sam Rivera  | Viewer               |
| client.acme@clientflow.test  | Jordan Lee  | Client for Acme      |
| client.orbit@clientflow.test | Taylor Park | Client for Orbit     |

These are reserved test addresses; the seeder never sends email. Set SEED_PASSWORD in .env before the first seed if you want a different sample password. Re-running the seeder preserves the passwords of existing sample accounts. The default password is intended only for local sample workspaces. The CLI refuses NODE_ENV=production.

## What gets created

- Six users covering owner, admin, member, viewer, and two separate client accounts.
- Forma Studio and North Studio agency workspaces.
- One owner-only personal workspace and private My plans project for each user.
- Brand & website (Acme), Fall campaign (Orbit), Product launch (Lumina), Studio operations, Social content (Acme), and Website redesign (Atlas) agency projects.
- 67 tasks, with workflow stages, priorities, due dates, checklists, comments, and activity examples. The larger board deliberately includes enough tasks to verify independent column scrolling.

Acme sees only Brand & website and Social content, and only client-shared tasks within them. Orbit sees only Fall campaign. Neither client can access North Studio or another user's personal workspace. Members and viewers see team projects; private projects require explicit access. Owners and admins manage the agency projects.

## Safe re-runs

The seed uses deterministic clientflow-seed-* IDs and a transaction. Existing rows and edits are preserved; missing fixture records and associations are recreated. Other user accounts and projects are not changed. If a seed email already belongs to a non-seed account, the transaction is refused rather than overwriting it. There is no destructive reset command.

## Automated tests

The seeder is tested for idempotence, preservation of edited records, role isolation, and personal workspace privacy.

```sh
npm test
npm run test:postgres
npm run playwright:install
npm run build
npm run test:e2e
```

Playwright uses its own temporary PostgreSQL database, seeds the same sample dataset, runs on port 3010, and deletes only that temporary database afterward. It does not run against your normal development records. See [Playwright testing](playwright.md).
