---
name: Spec-first API + generated client workflow
description: How API endpoints and their mobile client are wired in this monorepo
---

This project is **spec-first**. The source of truth for the API is
`lib/api-spec/openapi.yaml`.

**Flow to add/change an endpoint:**
1. Edit `lib/api-spec/openapi.yaml` (paths + component schemas).
2. Run `pnpm --filter @workspace/api-spec run codegen`.
3. This regenerates React Query hooks in `@workspace/api-client-react`
   (e.g. `useGetX`, `useCreateX`, `useDeleteX`, plus `getGetXQueryKey`) and Zod
   body schemas in `@workspace/api-zod` (e.g. `CreateXBody`).
4. Implement the matching Express route in `artifacts/api-server/src/routes/`
   and register it in `routes/index.ts`.

**Why:** keeps client types, validation, and server contract in lockstep.

**How to apply:** In the mobile app, import and use the generated hooks — do NOT
hand-write fetch layers (per the `expo` skill). The base URL is set once via
`setBaseUrl` in `app/_layout.tsx`; generated URLs target `/api/...`. Mutation
variable shapes: create → `{ data }`, delete → `{ id }`.
