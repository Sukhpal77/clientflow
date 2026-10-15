# Research and visual references

Reviewed on 14 October 2026.

- [Vite getting started](https://vite.dev/guide/): development/build tooling and supported Node versions.
- [Atlassian board basics](https://support.atlassian.com/trello/docs/creating-a-new-board/): boards, workflow lists, and task cards inform the Kanban structure.
- [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html): relational access controls and additional database isolation options. The current implementation uses server-side checks, not RLS.
- [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): deny by default and validate access per request.
- [Redis documentation](https://redis.io/docs/latest/): optional future use for distributed throttling, queues, and caching.
- [Node crypto](https://nodejs.org/api/crypto.html): salted password hashing and random session/invitation tokens.
- [Task Management Dashboard by Outcrowd](https://dribbble.com/shots/27397107-Task-Management-Dashboard): compact task property rows, a right-side task panel, progress, and checklist/comment tabs.
- [logictry dashboard by Sk Raju Hossin](https://dribbble.com/shots/27281704-logictry-Task-Management-Dashboard): neutral sidebar, forest-green highlighted metric, clear dashboard hierarchy, workload panel, task table, and profile/activity column.

The reference images are used for layout inspiration. ClientFlow’s UI is implemented in React/CSS with its own branding and real application data; the reference artwork is not distributed as a UI asset.

- [Playwright web servers](https://playwright.dev/docs/test-webserver) and [API testing](https://playwright.dev/docs/api-testing): actual browser workflows backed by an isolated live API.
- [WAI modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): heading focus, keyboard trapping, Escape, and restored focus.
- [MDN overscroll behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overscroll-behavior): prevent inner scroll regions from moving the app shell.
- [MDN scrollbar gutter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scrollbar-gutter): preserve layout when overflowing panels need scrollbars.
