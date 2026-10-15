# Playwright end-to-end verification

## Setup and run

Use Node.js 24, a running local PostgreSQL instance, and DATABASE_URL in .env. The database user must be allowed to create a temporary test database.

```sh
npm ci
docker compose up -d db
npm run playwright:install
npm run build
npm run test:e2e
```

The browser installer uses Playwright's official Chromium download and stores it inside the ignored .cache/ms-playwright directory.

Run one viewport or open the report:

```sh
npm run test:e2e -- --project=desktop
npm run test:e2e -- --project=mobile
npm run test:e2e:report
```

## Isolation

playwright.config.js starts e2e/support/server.js on 127.0.0.1:3010. The server creates a uniquely named clientflow_e2e_* PostgreSQL database and calls the real seed service. Each browser test gets its own cookie context and signs in through the actual UI. The suite never uses browser-local demo identities.

The teardown closes the test server and removes its temporary database. A fallback cleanup only accepts the generated database name format. Existing development users, workspaces, and tasks are not reset.

## Coverage

Desktop Chromium (1440×900) and mobile Chromium (390×844) cover:

- Sign-in, real overview metrics, workload range, and personal workspace switching.
- Task creation, persistent checklists, comments, status changes, search/list views, and deletion.
- Project editing, archive/restore, and workspace rename.
- Invitation creation and revocation.
- Client project/task isolation and client feedback.
- Viewer restrictions and keyboard navigation of task tabs.
- Independent board-column and drawer scrolling; the app header and document stay fixed.

The API suite separately verifies stale edit conflicts, access grants/removal, invitation expiry, owner/admin protection, and cross-origin write rejection.

## Results

HTML results are saved to playwright-report/. Failure traces and screenshots are saved to test-results/. These folders are ignored by Git and source packaging. The scroll test also saves desktop/mobile overview screenshots in test-results/.

Research sources: [Playwright web servers](https://playwright.dev/docs/test-webserver), [authentication](https://playwright.dev/docs/auth), [WAI modal dialogs](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), and [CSS overscroll behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overscroll-behavior).
