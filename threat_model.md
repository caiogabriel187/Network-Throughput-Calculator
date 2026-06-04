# Threat Model

## Project Overview

5G NR Calculadora is a public Replit deployment with an Expo client and a Node.js/Express API mounted at `/api`. The app performs 5G engineering calculations on-device, while the backend exposes a cloud-backed history feature for listing, creating, and deleting saved calculations. Production-reachable logic is concentrated in `artifacts/api-server/src/**`, the generated API client in `lib/api-client-react/**`, and the calculation-history mobile flows in `artifacts/mobile/app/history.tsx` and `artifacts/mobile/app/save-calculation.tsx`.

## Assets

- **Saved calculation history** — titles, summaries, optional notes, timestamps, and identifiers for user-created calculation records. These are the only server-stored user data and must not be exposed or modified by unrelated users.
- **Service availability** — the API is publicly reachable and backs the history feature. Resource exhaustion against the API directly degrades the only stateful feature in the application.
- **Application secrets and infrastructure access** — `DATABASE_URL` and any future auth tokens or API secrets used by the server or shared libraries. These are not currently surfaced by the mobile app but remain sensitive server assets.

## Trust Boundaries

- **Client / Server boundary** — the Expo app and any arbitrary internet client can call the public `/api` endpoints. The server must treat all request bodies, params, and origins as untrusted.
- **Public / Authenticated boundary** — the current application has no authentication implementation, so any server-side operation that should be user-scoped must be treated as publicly reachable until auth is added.
- **Server / In-memory storage boundary** — history data is stored in a process-wide in-memory array in `artifacts/api-server/src/routes/calculations.ts`. Any server-side authorization or quota failure affects all users because the store is shared.
- **Internal / Production boundary** — `artifacts/mockup-sandbox/**`, local build scripts, and dev-only Expo tooling are not production surfaces unless separately deployed. Public autoscale deployment visibility means the Express API is internet-reachable.

## Scan Anchors

- Production entry points: `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/*.ts`, `artifacts/mobile/app/_layout.tsx`.
- Highest-risk area: unauthenticated history endpoints in `artifacts/api-server/src/routes/calculations.ts`.
- Public surfaces: `GET /api/healthz`, `GET/POST/DELETE /api/calculations*`.
- No admin surface and no existing auth surface are present today.
- Usually ignore `artifacts/mockup-sandbox/**`, mobile build scripts, and local-only Expo tooling unless production reachability is demonstrated.

## Threat Categories

### Spoofing

Because the production API has no authentication, the server cannot distinguish one end user from another or from arbitrary external callers. Any future history or account-like feature exposed through `/api` must require a validated identity before returning or mutating user data.

### Tampering

Saved calculations are mutable through the public API, so the server must ensure callers can only create or delete records within their own authorized scope. Server-side validation must also constrain payload shape and size so untrusted clients cannot abuse shared storage.

### Information Disclosure

The history feature stores user-supplied titles, summaries, and notes in a shared server-side collection. The API must not disclose one user's saved calculations to other users or anonymous internet clients, and error responses and logs must avoid leaking secrets or internal stack traces.

### Denial of Service

The public API accepts attacker-controlled request volume and stores created records in process memory. The service must enforce authentication or quotas and bound resource consumption so anonymous clients cannot fill the shared in-memory store or degrade availability.

### Elevation of Privilege

If the application evolves to support per-user history, every read and delete path must enforce ownership server-side. The generated client and mobile UI are convenience layers only; authorization decisions must be made in the Express routes.