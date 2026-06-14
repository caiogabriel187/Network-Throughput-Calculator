---
name: Link asChild + custom Button no-ops on web
description: expo-router <Link asChild> around the project's custom TouchableOpacity Button does not navigate on the web target; use router.push()
---

`<Link href="..." asChild><Button .../></Link>` does NOT trigger navigation on
the Expo **web** target when the child is the project's custom `Button`
(a `TouchableOpacity` with its own fixed internal `onPress`). The press fires the
Button's own handler, not the Link's injected navigation handler, so the route
never changes (silent no-op).

**Rule:** For navigation from the custom `Button`, call `router.push("/route")`
inside its `onPress` instead of wrapping it in `<Link asChild>`.

**Why:** An e2e run caught the "+ Salvar novo cálculo" button on the history
screen doing nothing on web. Native may behave differently, but web silently
no-ops, which is easy to miss without an e2e pass.

**How to apply:** Whenever you see `<Link asChild>` wrapping the custom `Button`,
prefer an explicit `router.push`/`router.replace` in `onPress`.
