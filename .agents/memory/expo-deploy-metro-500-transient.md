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

If both succeed locally, the deploy 500 was a **transient/resource failure** in the
build container (Metro crashed/OOM'd mid-bundle) — the fix is simply to retry the
publish. The build is memory-heavy (bundles iOS+Android plus all @expo-google-fonts
Inter weights). If it recurs, harden the build (e.g. raise Node heap via
NODE_OPTIONS=--max-old-space-size in the mobile artifact's build env).
