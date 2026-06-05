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

**Fix:** root `.npmrc` sets `node-linker=hoisted` (committed) so a fresh
`pnpm install` produces the flat layout Gradle autolinking needs. The generated
`artifacts/mobile/android/` is committed too (gitignore only excludes build
outputs), so the project opens in Android Studio without re-running prebuild.

**Why hoisted is safe to commit:** it makes node_modules flatter/more permissive,
so existing resolution keeps working. node_modules is gitignored anyway, so what
matters for a user cloning the repo is the committed `.npmrc` — that's why the
setting lives there rather than as a one-off reinstall in this environment.

**Expo Go path is unaffected:** `expo start` → press `a` only bundles JS (no
native Gradle build), so it works on the Android Studio emulator without any
linker change. This is the recommended path for running the app on the emulator.

**How to apply:** when a user wants to open/run the mobile app natively in Android
Studio, prefer Expo Go first; only reach for `expo run:android` (with the hoisted
linker prerequisite) when a custom native build is actually required.
