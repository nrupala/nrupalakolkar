# nrupalakolkar.com

Personal site for Nrupal Akolkar, P.Eng. Deployed as a **Cloudflare Worker + Static Assets** — git is the source of truth, CI deploys on merge to `main`.

Replaces the previous directly-deployed `nrupalakolkar-site` Worker (which embedded the pages as a hex-gzip blob with no repo). Same Worker name, so merge + deploy is a clean cutover.

## Structure

```
public/            static pages, served directly (html_handling maps /books -> books.html)
  index.html       home / profile (terminal-style accordion)
  links.html       all platforms
  hiking.html      hiking journal
  photography.html photography
  books.html       Outcome Convergence Systems -- book page + order/notify forms
src/index.ts       Worker: serves assets + handles POST /contact, /api/notify, /api/book-order
apps-script/Code.gs Google Apps Script Web App (Sheet append + email) -- deploy separately
wrangler.toml      Worker + Static Assets + KV + Apps Script config
```

## Form handling (email + Google Sheet, resilient)

On submit, every form (`/contact`, `/api/notify`, `/api/book-order`):
1. Is written to the **`SUBMISSIONS` KV namespace first (durable)** — nothing is ever silently lost.
2. Is forwarded to a **Google Apps Script Web App** that appends a row to the linked **Google Sheet** (a tab per form type) **and emails Nrupal**.

The email + Sheet live in Apps Script (Gmail-backed), so there is no dependency on the dead free-tier MailChannels path. If the forward ever fails, the submission is still in KV:

```
wrangler kv key list --binding SUBMISSIONS
wrangler kv key get  --binding SUBMISSIONS "order:<ref>"
```

## Deploy setup (one-time)

1. **KV namespace** — paste the id into `wrangler.toml`:
   ```
   wrangler kv namespace create nk-submissions
   ```
2. **Google Sheet + Apps Script:**
   - Create a Google Sheet.
   - Extensions -> Apps Script, paste `apps-script/Code.gs`, set `NOTIFY_EMAIL` and a long random `SHARED_SECRET`.
   - Deploy -> New deployment -> Web app: *Execute as: Me*, *Who has access: Anyone*. Copy the `/exec` URL.
3. **Worker secrets:**
   ```
   wrangler secret put APPSCRIPT_URL      # the Apps Script /exec URL
   wrangler secret put APPSCRIPT_SECRET   # same value as SHARED_SECRET
   ```
4. **Repo secrets** (Settings -> Secrets -> Actions):
   - `CF_API_TOKEN` — scopes: *Workers Scripts: Edit*, *Workers Routes: Edit*, *Workers KV Storage: Edit*, *Account Settings: Read*, *User Details: Read*
   - `CF_ACCOUNT_ID` = `2edd59d09fd816187b47afbb9ea43af1`
5. **Add the deploy workflow** at `.github/workflows/deploy.yml` (in the PR body — must be added by a human; the automation token cannot write workflow files).

On merge to `main`, CI runs `wrangler deploy` and the site goes live.

## Backups

The account-wide Worker backup automation (`nrupala/milo-automations`) snapshots this Worker's source + settings daily to its `backup` branch.
