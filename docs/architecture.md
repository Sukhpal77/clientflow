# Architecture

ClientFlow separates the browser application from a Node API backed by PostgreSQL. The browser never connects to the database. Production Express serves the built UI and API from one origin. Vite’s development proxy preserves this arrangement.

PostgreSQL models users, sessions, workspaces, memberships, projects, explicit project membership, tasks, comments, invitations, and activity. Foreign keys enforce record relationships. Checklist items belong to their parent task and are stored as validated JSONB.

All resource operations pass through membership and project/task access checks on the server. Client task visibility is checked before returning task or comment records. Hidden projects and tasks are filtered out of bootstrap responses. Application checks enforce isolation; database row-level security is not implemented yet. It can be an additional defense when the connection role and request identity are designed for it.

Password hashing uses salted scrypt. Sessions contain a random token stored as a SHA-256 digest in PostgreSQL, with seven-day expiry. Browser cookies are HTTP-only and SameSite=Lax. COOKIE_SECURE must be enabled under HTTPS. Production rejects cross-origin browser writes. Invitations use digest-only token storage and compare the signed-in account’s email.

The role model is evaluated for each workspace. Owners and admins access every project in that workspace. Members and viewers can access team projects and explicitly assigned private projects. Clients require explicit project membership and only receive client-visible tasks. Personal workspaces contain only the owning user and cannot invite collaborators.

Redis is not required for the initial single-process API. Introduce it for shared login throttling, a background email queue, or realtime fanout once these needs exist. Cache keys must include tenant and identity scope; do not cache broad bootstrap payloads across users.

The frontend folders group workflows by feature. App.jsx coordinates state and dialogs; individual feature components render the board, overview, task details, access management, and workspace pages. Shared primitives live under components/. Base styling and the reference-inspired green theme are separate.

The private hosted demo and production API are distinct deployment targets. Sites serves dist/client/ as static assets. A conventional Node host or Docker deployment runs server/index.js with DATABASE_URL configured. Never interpret the demo’s role selector as authentication.

Task updates increment a revision and reject stale updates/deletes with HTTP 409. Project archiving preserves tasks and blocks writes until restored. Removing a member revokes workspace/project membership and unassigns their tasks transactionally. Invitations can be revoked. The browser refreshes on focus and every 30 seconds, clearing private data when a session expires.

The app shell remains fixed to the viewport. Board columns, task drawers, project navigation, and overview panels own their overflow. Headers and drawer actions remain fixed. Mobile navigation has a close button and backdrop.

Development fixtures and Playwright use the same seed service. Browser tests create and remove an isolated PostgreSQL database; normal development records are preserved. See seeding.md and playwright.md.
