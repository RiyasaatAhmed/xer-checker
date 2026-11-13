# Stageshow kit

The React kit from [Stageshow](https://github.com/benjitaylor/skills/tree/main/stageshow) (MIT, see `LICENSE`), version 1.1.1. It draws the animated demo on the empty upload screen.

**Changed from the original:**

- **Left out:** `brands/` and `parts/BrandMark.*`. Their artwork is under other licenses, and the app doesn't use it.
- **One line:** an unused `useLayoutEffect` import removed from `phone.tsx`, so the type check passes.

The linter skips this folder (`.oxlintrc.json`), because it's someone else's code.
