# Verification

Verified on 14 October 2026.

- API, seed, and frontend render suite: 18 tests passed.
- API and seed suite against real PostgreSQL 18: 13 tests passed.
- Playwright with live PostgreSQL-backed API: 14 tests passed, across desktop Chromium (1440×900) and mobile Chromium (390×844).
- Production and browser-local demo builds: passed.
- Development seeder: run successfully; six sample users, 12 projects, and 67 tasks. Existing records preserved.
- Desktop/mobile overview screenshots visually reviewed.
- Scroll tests confirm independent board-column overflow, fixed app/dialog headers, and zero document scroll.
- Task creation/editing/deletion, persisted checklists/comments, search/list views, project edit/archive/restore, workspace rename, invitation creation/revocation, viewer restrictions, client isolation, and keyboard task tabs verified in the browser.
- API coverage also checks registration/session privacy, workspace creation, access rules, member removal, stale revision conflicts, invitation expiry, and cross-origin writes.

Browser tests create and remove their own temporary PostgreSQL database. Development data is not reset. See [seeded accounts](seeding.md) and [Playwright commands](playwright.md). The browser report is generated locally under playwright-report/.

These checks cover the implemented workflows; they do not claim exhaustive testing of every browser, viewport, or optional integration. Password recovery, attachments, automatic email delivery, and realtime push remain outside this version.

Private Sites source publication was rejected by automatic approval review because uploading application source to that external repository needs explicit user authorization. No source was pushed and no hosted deployment is live. The working local app and source remain available.

The local Node app (port 3001) and rebuilt Docker app (port 3002) both return healthy status and accept the seeded owner login. Prettier formatting checks pass. The source archive excludes .env, browser caches, node_modules, and generated reports.
