---
name: Expo native build in pnpm monorepo
description: Why expo run:android/prebuild needs node-linker=hoisted here, and why Expo Go does not.
---

# Expo native builds (`expo run:android` / prebuild) vs pnpm isolated linker

This monorepo uses pnpm's **default isolated (symlinked) node_modules** (no
`node-linker` set in root `.npmrc`). React Native's Gradle autolinking expects
native module packages to be physically present in `node_modules`, so a fresh
`expo run:android` / `expo prebuild` can fail to link native modules under the
isolated layout.

**Fix:** set `node-linker=hoisted` and reinstall before the native build.

**Why not just set it globally:** changing the root `node-linker` re-lays-out the
entire monorepo's node_modules and forces a full reinstall — risky for the other
artifacts and the running dev workflows. So it's documented as a per-user step in
the mobile README rather than committed to the root `.npmrc`.

**Expo Go path is unaffected:** `expo start` → press `a` only bundles JS (no
native Gradle build), so it works on the Android Studio emulator without any
linker change. This is the recommended path for running the app on the emulator.

**How to apply:** when a user wants to open/run the mobile app natively in Android
Studio, prefer Expo Go first; only reach for `expo run:android` (with the hoisted
linker prerequisite) when a custom native build is actually required.
