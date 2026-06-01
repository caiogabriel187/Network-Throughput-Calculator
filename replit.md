# 5G NR Calculadora

A mobile (Expo) app with two on-device 5G NR engineering calculators: a Throughput calculator (3GPP TS 38.214 peak data rate) and a Link Budget calculator (receiver sensitivity, MAPL, free-space cell radius).

## Run & Operate

- `pnpm --filter @workspace/mobile run dev` — run the Expo dev server (managed by the `artifacts/mobile: expo` workflow)
- `pnpm run typecheck` — full typecheck across all packages
- Restart the `artifacts/mobile: expo` workflow only on dependency/Metro changes — HMR handles code edits.

## Stack

- Expo (SDK 54) + expo-router (file-based routing, stack navigation)
- React Native 0.81, TypeScript 5.9
- Inter font family (pre-loaded), @expo/vector-icons, expo-linear-gradient, expo-haptics
- Frontend-only: all calculations run on-device, no backend or database

## Where things live

- `artifacts/mobile/lib/calc.ts` — all calculation logic + 3GPP N_RB lookup tables (source of truth for the math)
- `artifacts/mobile/app/index.tsx` — home screen with the two calculator cards
- `artifacts/mobile/app/throughput.tsx` — Throughput calculator screen
- `artifacts/mobile/app/link-budget.tsx` — Link Budget calculator screen
- `artifacts/mobile/components/ui.tsx` — shared UI primitives (Card, NumberField, PillSelector, Segmented, ResultRow)
- `artifacts/mobile/constants/colors.ts` — dark telecom theme tokens

## Architecture decisions

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
