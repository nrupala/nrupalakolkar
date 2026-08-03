# nrupalakolkar.com

Personal site for Nrupal Akolkar, P.Eng. Deployed as a **Cloudflare Worker + Static Assets** — git is the source of truth, and **Cloudflare Workers Builds** runs `wrangler deploy` on every push to `main`.

Replaces the previous directly-deployed `nrupalakolkar-site` Worker (which embedded the pages as a hex-gzip blob with no repo). Same Worker name, so the git-driven deploy is a clean cutover.

## Structure

```
public/             static pages, served directly
  index.html        home / profile (terminal-style accordion)
  links.html        all platforms
  hiking.html       hiking journal
  photography.html  photography
  books.html        Outcome Convergence Systems -- book page + order/notify forms
  town.html         Town referral page -- showcases Milo, links to the personal Town invite
  assets/milo.jpg   Milo avatar (~15 KB, 320px) used by town.html
src/index.ts        Worker: serves assets + handles POST /contact, /api/notify, /api/book-order
apps-script/Code.gs Google Apps Script Web App (Sheet append + email) -- deploy separately
wrangler.toml       Worker + Static Assets + KV + Apps Script config
```

`html_handling` maps clean paths to files: `/` -> `index.html`, `/books` -> `books.html`, `/town` -> `town.html`, etc.

## /town — Town referral page

`/town` is served natively from `public/town.html` — a self-contained referral landing page in the site's terminal theme. It introduces Milo (Nrupal's Town assistant, avatar served same-origin from `/assets/milo.jpg`), lists what the assistant does, and links to the personal Town invite:

```
https://www.town.com/?invite=bab6b4a21870
```

A short disclosure notes the link is a personal referral (costs the visitor nothing; may credit Nrupal's account). The homepage sitemap links to it ("Town — my AI assistant"). Liveness and referral-link integrity are watched by the `devinfo-monitor` Worker (fingerprint = the invite code).

The same referral page also runs at `devinfo.dev/town`, `aimlds.org/town`, and `blog.thinkwithfinance.com/town` — but those are served by **their own Workers**, not this repo. Only `nrupalakolkar.com/town` is a native asset here.

## Form handling (email + Google Sheet, resilient)

On submit, every form (`/contact`, `/api/notify`, `/api/book-order`):
1. Is written to the **`SUBMISSIONS` KV namespace first (durable)** — nothing is ever silently lost.
2. Is then forwarded (best-effort) to a **Google Apps Script Web App** that appends a row to the linked **Google Sheet** (a tab per form type) **and emails Nrupal**.

The email + Sheet live in Apps Script (Gmail-backed), so there is no dependency on the dead free-tier MailChannels path. The forward is best-effort: until `APPSCRIPT_URL` / `APPSCRIPT_SECRET` are set (or if the forward ever fails), the submission is still safely in KV —

```
wrangler kv key list --binding SUBMISSIONS
wrangler kv key get  --binding SUBMISSIONS "order:<ref>"
```

> `nrupalakolkar.com/books` is native to this Worker. The `devinfo.dev/books` and `aimlds.org/books` pages are served by a **separate `ocs-books-preview` Worker** with its own KV-first capture (its `OCS_BOOKS` namespace), not by this repo.

## Deploy — Cloudflare Workers Builds

Deploys are git-driven: **Cloudflare Workers Builds** is connected to this repo and runs `wrangler deploy` on every push to `main`. There is **no** GitHub Actions workflow (`.github/workflows/deploy.yml` does not exist); the Cloudflare API token used for the build is held in the Workers Builds project settings, not in GitHub repo secrets.

One-time setup:

1. **KV namespace** — id is set in `wrangler.toml`:
   ```
   wrangler kv namespace create nk-submissions
   ```
2. **Google Sheet + Apps Script:**
   - Create a Google Sheet.
   - Extensions -> Apps Script, paste `apps-script/Code.gs`, set `NOTIFY_EMAIL` and a long random `SHARED_SECRET`.
   - Deploy -> New deployment -> Web app: *Execute as: Me*, *Who has access: Anyone*. Copy the `/exec` URL.
3. **Worker secrets** (set once; capture is durable in KV even before these exist):
   ```
   wrangler secret put APPSCRIPT_URL      # the Apps Script /exec URL
   wrangler secret put APPSCRIPT_SECRET   # same value as SHARED_SECRET
   ```

On push to `main`, Workers Builds runs `wrangler deploy` and the site goes live.

## Backups

The account-wide Worker backup automation (`nrupala/milo-automations`) snapshots this Worker's source + settings daily to its `backup` branch.
