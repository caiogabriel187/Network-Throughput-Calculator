---
name: Expo root-layout loading must not render null
description: Why returning null from the expo-router root layout during async session restore looks like a crash, and how to gate it safely.
---

# Root layout `return null` during async auth = blank white screen

In an expo-router app, the root `_layout` gating render on an async auth/session
state with `if (status === "loading") return null;` produces an **empty React
root**, which shows as a **blank white screen**. On web this reads as "the app
crashed" even though no JS exception is thrown. It is intermittent: it only
appears while the startup session check is in flight (e.g. a persisted token is
being validated against the server), so a logged-out cold start (no token,
status resolves instantly) and warm reloads look fine.

**Rule:** never render `null` for a loading/auth gate at the root. Render a
branded loading view (`flex:1`, centered, `backgroundColor: colors.background`,
an `ActivityIndicator`) instead.

**Why:** a dark, centered spinner is indistinguishable from intentional loading;
an empty root is indistinguishable from a crash. The fix is purely at the UI
boundary — the navigator still mounts right after the status resolves.

**Also bound the session-restore network call with a timeout.** If the
`/auth/me` (or equivalent) validation hangs because the API is slow/unreachable,
the loading gate would otherwise persist forever. Wrap it (e.g. 8s
`withTimeout`) and on timeout fall back to logged-out so the rest of the app
stays usable.

**Token bookkeeping on restore failure:** always clear the *in-memory* bearer
token so no stale token is attached to requests during the run. On a real auth
failure (401/invalid) also remove the persisted token. On a *timeout* keep the
persisted token so the session can recover on the next launch.

**How to apply:** anytime you add an auth/session/feature-flag gate to an
expo-router root layout (or any full-screen gate), check that the loading branch
renders a visible screen, not `null`, and that any network the gate waits on is
time-bounded.
