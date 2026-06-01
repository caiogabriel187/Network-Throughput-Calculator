---
name: api-server dev needs restart after edits
description: Why backend route changes 404 until the api-server workflow is restarted
---

The `@workspace/api-server` dev script is `build && start` — it bundles once with
esbuild and runs the bundle. There is no watch/HMR.

**Rule:** After editing any backend source (routes, app wiring), restart the
`artifacts/api-server: API Server` workflow before testing.

**Why:** A stale bundle keeps serving the previously-built routes, so newly added
endpoints (and even pre-existing ones if the file moved) return Express 404
("Cannot GET /api/...") even though the source is correct. This wasted a debug
cycle — the source was right; only the running bundle was old.

**How to apply:** curl-test against `https://$REPLIT_DEV_DOMAIN/api/...` only
after a restart. The api-server is exposed at path `/api` (artifact.toml
`paths = ["/api"]`); note no `python3` in the shell — use `node` to parse JSON.
