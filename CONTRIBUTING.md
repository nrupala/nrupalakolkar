# Contributing to nrupalakolkar.com

## Pull requests (PR-flow discipline)

- All changes land via **draft PR** — never push directly to `main`.
- PR flow: draft PR → checks green (install → typecheck) → the owner merges.
- Every PR adds a `CHANGELOG.md` entry under `## [Unreleased]` and bumps
  semver in `package.json`: patch for fixes/chores, minor for features.
- Merge commits reference the PR number. Releases are tagged `vX.Y.Z`.

## Build and test

Commands (verified against `package.json` and `.github/workflows/deploy.yml`):

```sh
npm install        # no lockfile in repo; `npm ci` would fail
npm run typecheck  # tsc --noEmit
npm run dev        # wrangler dev (local preview)
```

## Deploys

Production deploys are **CI-only** via `.github/workflows/deploy.yml`
(push to `main` → install → typecheck → `wrangler deploy` through
cloudflare/wrangler-action@v3; `workflow_dispatch` for manual re-deploys).
Requires the `CLOUDFLARE_API_TOKEN` repo secret
(Settings → Secrets and variables → Actions) — the workflow fails loudly
with setup instructions if it is missing.
`npm run deploy` runs `wrangler deploy` directly — the manual path,
superseded by CI.
