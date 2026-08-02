# Archived: nrupalakolkar-landing (Cloudflare Pages)

**Status:** Decommissioned / unused. Retained here as a record before the Cloudflare project is deleted.
**Date archived:** 2026-08-02

## What this was
`nrupalakolkar-landing` was a Cloudflare **Pages** project (Direct Upload) that was meant to serve a
landing page at `nrupalakolkar-landing.pages.dev`. It never received a deployment — the project had
**zero deployments** (no latest and no canonical deployment). It was an empty shell with no source
repository and no published content.

## Why it is being retired
- The live **nrupalakolkar.com** site is served by the Cloudflare **Worker** in this repository
  (see `wrangler.toml` and `src/`), not by this Pages project. The Pages project was redundant.
- Because it had no deployment, `nrupalakolkar-landing.pages.dev` returned **HTTP 522** and repeatedly
  tripped the automated Access Leak Audit in `nrupala/site-monitor`.

## Actions taken
- Classified as `DECOMMISSIONED` in `nrupala/site-monitor` so the audit stops flagging it
  (site-monitor PR #5, merged 2026-08-02). Non-destructive; no Cloudflare change.
- **Pending:** deletion of the empty `nrupalakolkar-landing` Pages project in Cloudflare
  (destructive; to be performed only on explicit go). Once the project is deleted, the
  `DECOMMISSIONED` entry in `nrupala/site-monitor` can be removed.

## Content
There is no page content to preserve — the Pages project was never populated. This README is the
archival record of the decommission.
