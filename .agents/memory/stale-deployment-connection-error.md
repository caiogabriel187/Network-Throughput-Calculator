---
name: Stale deployment looks like a "connection" error
description: A live app failing a feature that works in dev is often a stale deployment, not a client/network bug.
---

# "Verifique sua conexão" / generic connection error can be a STALE deployment

Symptom: a user reports a feature (e.g. account creation) fails on their app with
a generic connection-style error, while the same flow works perfectly in the dev
preview (verified via e2e and curl).

Root cause seen here: the **published** deployment was an old build from *before*
the feature (and before the database) was added. The live backend returned
**404** for the new route (`/api/...`), and there was **no production database**
at all yet (`getDeploymentInfo` shows isDeployed=true but the prod DB query errors
with "does not have a production Neon database").

Why it masquerades as a network problem: the mobile client's error mapper only
special-cases specific HTTP statuses (e.g. 400/401/409/429). **Any other status
(404, 500, 502…) falls through to the generic "check your connection" message.**
So a stale deployment returning 404 is indistinguishable from a real network
failure in the UI.

**How to diagnose quickly:**
1. Reproduce in dev (curl the dev API and/or run an e2e test). If dev works, the
   bug is almost certainly not in the code.
2. `curl` the **published** API URL for the failing route. A 404 / Express
   "Cannot POST ..." means the deployed build predates the route.
3. `getDeploymentInfo()` for deploy status; a read-only `executeSql({environment:
   "production"})` reveals whether a prod DB even exists.

**Fix:** republish. Do NOT hand-write prod migration scripts or deploy-build DB
hooks — Replit's Publish flow rebuilds the backend AND auto-creates/diffs the
production schema from the dev schema. One republish fixes both the stale code
and the missing tables.
