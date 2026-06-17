---
name: Expo publish fails with Metro HTTP 500 mid-bundle
description: How to tell a transient deploy-build bundling failure from a real code error in the Expo static build.
---

# Expo publish: Metro "Download failed: HTTP 500" during the mobile build

Symptom: Publish fails in the **build phase** on the mobile artifact. Build log
shows Metro bundling progressing then `iOS Bundling failed … Download failed:
HTTP 500` and `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL @workspace/mobile build`. Often
accompanied by `Security scan skipped: connection lost`.

Key gotcha: the mobile build script (`artifacts/mobile/scripts/build.js`) starts
`expo start --no-dev --minify` and fetches the `.bundle` URL, but on a non-200 it
throws `HTTP <status>` **before reading the response body** — so Metro's actual
error (which a 500 carries in its body) never appears in the deploy log. Don't
expect the root cause to be in the build log.

**How to tell transient vs. real code error — reproduce the production bundle locally:**
1. `pnpm exec expo export --platform ios --output-dir /tmp/x` (canonical prod bundler).
2. And/or replicate the script's path: `expo start --no-dev --minify --localhost
   --port <free>` then GET
   `http://localhost:<port>/artifacts/mobile/node_modules/expo-router/entry.bundle?platform=ios&dev=false&hot=false&lazy=false&minify=true`
   and read the body if it's 500.
   - Metro's server root is the **workspace root**, so the bundle path is
     `artifacts/mobile/node_modules/...`, not `node_modules/...`.
   - Port 8081 is taken locally by the mockup-sandbox vite server; use a different port.

**Local success does NOT mean the deploy failure is transient.** The dev/local
container has more RAM than the deploy build container, so the prod bundle builds
fine locally while OOMing in the deploy. The decisive tell: if the deploy fails at
the **exact same module count / percentage every time** (here: iOS 80.4%, 720/803,
~17s), it is **deterministic memory pressure**, not a random hiccup — do NOT just
"retry and hope."

Root cause here: `app.json` has `experiments.reactCompiler: true`, which runs a heavy
Babel plugin on every module, multiplying per-worker transform memory. Metro spawns
one worker per CPU; the build container reports many CPUs but limited RAM, so peak
memory blows past the cgroup limit and a worker dies → Metro answers the `.bundle`
GET with HTTP 500.

**Fix (in `artifacts/mobile/scripts/build.js`, the Metro spawn):**
- Add `--max-workers 2` to the `expo start` args — the main lever; caps concurrent
  transform memory.
- Add `NODE_OPTIONS=--max-old-space-size=4096` to the spawn env — raises the heap
  ceiling for the serializer/transform processes.
Validate by re-running the local repro WITH the flags (expect HTTP 200). Then republish.
