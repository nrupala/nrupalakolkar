# Codetopo Profile — nrupalakolkar.com (personal site) (nrupala/nrupalakolkar)

**What this is.** The agent-facing map of this repository, generated with
Codetopo 0.9.1 (local engine, `~/.cargo/bin/codetopo`) so an arriving agent
can see the machine — topology, trust boundaries, money surface — before it
submits or changes anything. Read this first; the graph snapshot beside it
(`snapshot.json`, `stats.json`) is the measured evidence.

- **Repo:** nrupala/nrupalakolkar
- **Commit profiled:** `9dea3676bcc927e5a10aa1289b8974b94f525ed3` (main)
- **Engine:** codetopo 0.9.1 · index run 2026-11-18
- **Graph:** 29 files walked · 0 failed · 671 nodes · 1508 edges · audit chain valid (3 entries, head `7597561b…04505`)
- **Nodes by kind:** doc 11 · external 438 · file 29 · function 120 · interface 1 · module 29 · package 1 · variable 42
- **Edges by kind:** calls 795 · contains 232 · defines 31 · imports 43 · reads 389 · writes 18

## Coverage honesty

Codetopo extracts Rust, TypeScript/JavaScript and Python, plus Markdown
as Doc nodes. The graph walks 29 files: the Worker
(`src/index.ts`), site JS (`public/assets/`, `public/selfcare/`),
blog-embedded Python check scripts (`public/blog/*/`) and build
tools (`tools/`, `scripts/`) at symbol level. The 11 Markdown files
are indexed as Doc nodes only. **Not covered:** the 116 HTML files
under `public/` (the actual pages — the bulk of the site), CSS, and
`apps-script/Code.gs` (Google Apps Script) are not parsed into the
graph; media (MP4/PNG/WebP/JPG) is binary content. Read `public/`
directly for page content.

## Topology

Personal site for Nrupal Akolkar, P.Eng. (README): Cloudflare
Worker + Static Assets, git as source of truth, deployed by GitHub
Actions (`wrangler deploy` via wrangler-action on push to `main`).

- `public/` — static pages served directly (`index.html` home,
  `links.html`, `hiking.html`, `photography.html`, `books.html` —
  book page + order/notify forms, `town.html` — Town referral page;
  clean-path mapping via `html_handling`).
- `src/index.ts` — the Worker: serves assets and handles the three
  form endpoints `POST /contact`, `POST /api/notify`,
  `POST /api/book-order` (route switch, L182–199). Every submission
  is written to the `SUBMISSIONS` KV namespace FIRST (durable —
  `notify:<ref>`, `order:<ref>`, `contact:<ref>`), then forwarded
  best-effort (see Trust).
- `apps-script/Code.gs` — separately-deployed Google Apps Script Web
  App: appends a Sheet row per form type + emails the owner.
- `scripts/deploy_signed_client.py` — signed deploy client;
  `scripts/inline_script_check.py`, `scripts/bump-version.mjs`,
  `tools/build-bench-page.py`, `tools/build-ops-log-page.py` —
  build/ops tooling. Sibling `/town`, `/books` pages on other
  domains are served by their OWN Workers, not this repo (README).

## Trust boundaries

- **Form pipeline trust:** KV-first means no submission is lost if
  the forward fails. The forward target is configured by env NAMES
  `APPSCRIPT_URL` and `APPSCRIPT_SECRET` (Worker bindings in
  `src/index.ts` L14–16; the secret is echoed to Apps Script in the
  forward body so it can verify the caller — values never in git).
- **Deploy trust:** the GitHub Actions deploy requires the repo
  secret NAME `CLOUDFLARE_API_TOKEN` and fails loudly if missing
  (README); `scripts/deploy_signed_client.py` reads the env NAME
  `DEPLOY_SIGN_TOKEN` for signed deploys.
- **Personal data:** form submissions (contact details, book
  orders) land in the `SUBMISSIONS` KV and a Google Sheet + owner
  email — handle any access as personal-data access.
- The `/town` page carries a personal referral link (README
  discloses it as such); its code is deliberately not reproduced
  here.

## Money surface

No payment processing in this repo. Greps for
`stripe|paddle|checkout|billing` over the TS/JS/Python sources
return only an incidental mention in `tools/build-ops-log-page.py`
(ops-log prose) — no payment SDK, checkout or webhook code in the
graph. The `books.html` order form (`/api/book-order`) is a
notify/order-interest capture into KV + Sheet + email (see
Topology); it takes no card details and charges nothing. Hosting
runs on the owner's Cloudflare account via the Actions deploy.

## How an agent should approach

1. Read `README.md`, then this profile, then the snapshot; read
   `public/` directly for anything page-shaped.
2. Preserve the KV-first form contract in any Worker change, and
   keep Apps Script URL/secret as bindings — never literals.
3. Deploys are git-driven via Actions; do not hand-deploy the
   Worker outside that lane. Regenerate this profile (below) at
   every material change.

## Regeneration

`docs/codetopo-profile/refresh.sh` (in this pack) re-downloads the repo
at a named ref, re-runs the index, and rewrites `snapshot.json`,
`stats.json` and the header block inputs of this profile. Regenerate at
every release / material change.
