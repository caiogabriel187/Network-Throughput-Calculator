# 5G NR Calculadora

A mobile (Expo) app with two on-device 5G NR engineering calculators (Throughput per 3GPP TS 38.214; Link Budget — receiver sensitivity, MAPL, free-space cell radius) plus a "Histórico de cálculos salvos" feature backed by a Node.js/Express API.

## Run & Operate

- `pnpm --filter @workspace/mobile run dev` — run the Expo dev server (managed by the `artifacts/mobile: expo` workflow)
- `pnpm --filter @workspace/api-server run dev` — run the Express API (managed by the `artifacts/api-server: API Server` workflow). Dev script is `build && start` (no watch) — **restart this workflow after editing backend code**, or the bundle stays stale and routes 404.
- `pnpm --filter @workspace/api-spec run codegen` — regenerate the React Query client + Zod schemas after editing `lib/api-spec/openapi.yaml`
- `pnpm --filter @workspace/mobile run typecheck` — typecheck the mobile app
- Restart the `artifacts/mobile: expo` workflow only on dependency/Metro changes — HMR handles code edits.

## Stack

- Expo (SDK 54) + expo-router (file-based routing, stack navigation)
- React Native 0.81, TypeScript 5.9
- Inter font family (pre-loaded), @expo/vector-icons, expo-linear-gradient, expo-haptics
- Backend: Node.js + Express + Zod (in-memory store), Pino logging; mounted at `/api`
- API integration: spec-first OpenAPI → Orval-generated React Query hooks (`@workspace/api-client-react`) + Zod body schemas (`@workspace/api-zod`)

## Where things live

- `artifacts/mobile/lib/calc.ts` — all calculation logic + 3GPP N_RB lookup tables (source of truth for the math)
- `artifacts/mobile/app/index.tsx` — home screen (two calculator cards + Histórico card)
- `artifacts/mobile/app/throughput.tsx` — Throughput calculator screen (has "Salvar resultado")
- `artifacts/mobile/app/link-budget.tsx` — Link Budget calculator screen (has "Salvar resultado")
- `artifacts/mobile/app/history.tsx` — Histórico (FlatList + GET + DELETE, ActivityIndicator/Alert, pull-to-refresh)
- `artifacts/mobile/app/save-calculation.tsx` — validated form (POST), modal screen
- `artifacts/mobile/components/ui.tsx` — shared UI primitives (Card, NumberField, PillSelector, Segmented, ResultRow, TextField, Button)
- `artifacts/mobile/components/CalculationCard.tsx` — history list item
- `artifacts/mobile/constants/colors.ts` — dark telecom theme tokens
- `lib/api-spec/openapi.yaml` — API contract (source of truth; edit then run codegen)
- `artifacts/api-server/src/routes/calculations.ts` — Express routes (in-memory store + seed, Zod validation)

## Architecture decisions

- API base URL is set via `setBaseUrl` in `app/_layout.tsx` (guarded by the public domain env var); the generated client targets `/api/...`. Use the generated React Query hooks — do not hand-write fetch layers.
- API changes are spec-first: edit `openapi.yaml` → run codegen → use the generated hooks/schemas.
- App is locked to dark appearance (`userInterfaceStyle: "dark"` in app.json); the palette lives in the `light` key of colors.ts since `useColors` falls back to it.
- Throughput uses the TS 38.214 max-rate formula with N_RB tables from TS 38.101-1 (FR1) / 38.101-2 (FR2). The user-set target code rate replaces Rmax (default 948/1024 ≈ 0.9258).
- Link budget cell radius uses the free-space path loss model only (optimistic; labeled "espaço livre" in the UI).
- Dependent selectors (FR → SCS → bandwidth) self-correct to valid combinations; unsupported combos show an explicit error instead of a wrong number.

## Product

Two calculators reachable from a home screen. Inputs are pre-filled with sensible 5G defaults and results recompute instantly as inputs change. UI is in Portuguese.

## User preferences

_None recorded yet._

## Gotchas

- The first web screenshot after a restart can show missing text — that's a font-loading race in the web preview, not a bug. Native (Expo Go) is the source of truth.

## Pointers

- See the `pnpm-workspace` skill for workspace structure and the `expo` skill for mobile conventions.
