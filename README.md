# nrupalakolkar.com

Source of truth for the personal site at https://nrupalakolkar.com, currently served by the
Cloudflare Worker `nrupalakolkar-site` (routes `nrupalakolkar.com/*`, `www.nrupalakolkar.com/*`).

## Pages (`public/`)
- `index.html` — single-page terminal-style landing (profile, projects, contact form)
- `links.html` — `/links`
- `hiking.html` — `/hiking`
- `photography.html` — `/photography`

## Notes
- Dead infrastructure sitemap links **`ci`** and **`git`** have been removed from all pages
  (2026-08-01). The remaining infra entries (`agents`, `ai`, `dev`, `oracle`, `rag`) are kept.
- `MANIFEST.json` records the last deploy capture: mechanism, routes, and per-page SHA-256.

## Deploy (planned)
Moving to a git-driven deploy so every change is a reviewed PR and the live site is rebuilt
from this repo — Cloudflare Workers **Static Assets** (`wrangler` `[assets]`) + a GitHub Actions
deploy on merge to `main`. A daily GitHub Actions job snapshots the deployed source back into
this repo, matching how devinfo.dev is backed up.
