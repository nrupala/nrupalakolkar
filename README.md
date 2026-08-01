# nrupalakolkar.com

Personal site for Nrupal Akolkar, P.Eng. Deployed as a **Cloudflare Worker + Static Assets** — git is the source of truth, CI deploys on merge to `main`.

This replaces the previous directly-deployed `nrupalakolkar-site` Worker (which embedded the pages as a hex-gzip blob with no repo). Same Worker name, so merging + deploying is a clean cutover.

## Structure

```
public/            static pages, served directly (html_handling maps /books -> books.html)
  index.html       home / profile (terminal-style accordion)
  links.html       all platforms
  hiking.html      hiking journal
  photography.html photography
  books.html       Outcome Convergence Systems -- book page + order/notify forms
src/index.ts       Worker: serves assets + handles POST /contact, /api/notify, /api/book-order
wrangler.toml      Worker + Static Assets + KV + (optional) email config
```

## Form handling (resilient, no-lockout)

Every submission (`/contact`, `/api/notify`, `/api/book-order`) is written to the **`SUBMISSIONS` KV namespace first (durable)**, then an email is attempted best-effort. If email is not configured or fails, the submission is still captured in KV and never lost. This is the deliberate fix for the silent-failure bug where a deprecated free email path returned success while dropping the message.

Retrieve captured submissions any time:

```
wrangler kv key list  --binding SUBMISSIONS
wrangler kv key get   --binding SUBMISSIONS "order:<ref>"
```

## Deploy setup (one-time)

1. **Create the KV namespace** and paste its id into `wrangler.toml`:
   ```
   wrangler kv namespace create nk-submissions
   ```
2. **Repo secrets** (Settings -> Secrets -> Actions):
   - `CF_API_TOKEN` — scopes: *Workers Scripts: Edit*, *Workers Routes: Edit*, *Workers KV Storage: Edit*, *Account Settings: Read*, *User Details: Read*
   - `CF_ACCOUNT_ID` = `2edd59d09fd816187b47afbb9ea43af1`
3. **Add the deploy workflow** at `.github/workflows/deploy.yml` (provided in the seed PR — must be added by a human; the automation token cannot write workflow files).
4. **(Optional) email notifications:** enable Cloudflare Email Routing on the zone, verify a destination address, then uncomment the `[vars] NOTIFY_TO` and `[[send_email]]` blocks in `wrangler.toml`.

On merge to `main`, CI runs `wrangler deploy` and the site goes live.

## Backups

The account-wide Worker backup automation (`nrupala/milo-automations`) snapshots this Worker's source + settings daily to its `backup` branch.
