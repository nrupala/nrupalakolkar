#!/usr/bin/env python3
"""Build public/ops-log/index.html for nrupalakolkar.com from the ops log.

The ops log's tables (~/workspace/ops-log/*.csv) are the source of truth; this
generator renders their PUBLIC layer in the same chrome as /bench (its style
block is read from public/bench/index.html so the two pages never drift).
Internal rows (owner actions, money internals, key material) never render.
Usage: python3 tools/build-ops-log-page.py [csv_dir] [out_file]
"""
import csv, html, os, sys
from datetime import datetime
from zoneinfo import ZoneInfo

CSV_DIR = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/workspace/ops-log")
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(REPO_ROOT, "public", "ops-log", "index.html")
BENCH = os.path.join(REPO_ROOT, "public", "bench", "index.html")
if not os.path.exists(BENCH):  # staging fallback outside the site repo
    BENCH = os.path.expanduser("~/workspace/ops-log/site/bench-ref.html")

def read_csv(name):
    with open(os.path.join(CSV_DIR, name), newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

# Public wording for each listing — short, defensible, no internals.
PUBLIC_NOTES = {
 ("LetsAskIt", "Official MCP Registry"): "io.github.nrupala/letsaskit, v0.4.0 — active, latest.",
 ("LetsAskIt", "Smithery"): "Live listing — scan passed; tools verified.",
 ("LetsAskIt", "Glama (Connectors directory)"): "Listed under Connectors (the hosted-server directory) — claimed, health checks passing, all 5 tools.",
 ("LetsAskIt", "MCP Rush"): "Listed and claimed.",
 ("LetsAskIt", "Claude Connectors Directory"): "Submission in review since 2026-10-14 (checked signed-in, 2026-10-22).",
 ("LetsAskIt", "Cline marketplace"): "Submission open in the Cline review queue (issue #2995).",
 ("LetsAskIt", "PulseMCP"): "PulseMCP submissions are paused on their side; pickup runs automatically from the Official MCP Registry, where this server is active.",
 ("LetsAskIt", "MCP Market (mcpmarket.com)"): "Filed 2026-10-22 — free queue, listing expected in ~4–6 weeks.",
 ("LetsAskIt", "awesome-mcp-servers (GitHub list)"): "Pull request open (punkpeye/awesome-mcp-servers#17307); listing facts confirmed with the maintainers' checker.",
 ("LetsAskIt", "GitHub MCP Registry (github.com/mcp)"): "No submission door exists; inclusion requested from GitHub directly (2026-10-22).",
 ("LetsAskIt", "Gemini CLI gallery"): "Extension repository public since 2026-10-14; the gallery is crawler-indexed — ingest pending.",
 ("LetsAskIt", "MCP Marketplace (mcp-marketplace.io)"): "Not yet filed — scheduled in the next wave.",
 ("LetsAskIt", "mcp.so"): "Paid listing — decision pending.",
 ("Conduit", "Smithery"): "Live listing (sibling product, same operator).",
 ("Conduit", "MCP Rush"): "Listed and claimed (sibling product, same operator).",
 ("codetopo", "Smithery"): "Live listing (sibling product, same operator).",
 ("codetopo", "MCP Rush"): "Listed and claimed (sibling product, same operator).",
}

def status_cell(status):
    s = status.upper()
    if s.startswith("GREEN"):
        return '<span class="ok">Live — verified</span>'
    low = status.lower()
    for kw, label, cls in [
        ("in review", "In review", "warn"), ("in queue", "Filed — in queue", "warn"),
        ("pr open", "PR open", "warn"), ("filed, open", "Filed — open", "warn"),
        ("paid", "Paid listing — decision pending", "warn"),
        ("not listed", "Not listed", "bad"), ("not indexed", "Not indexed", "bad"),
        ("not ingested", "Not ingested", "bad"), ("not filed", "Not filed", "bad")]:
        if kw in low:
            return f'<span class="{cls}">{label}</span>'
    return f'<span class="warn">{html.escape(status)}</span>'

def main():
    subs = read_csv("submissions.csv")
    rels = read_csv("releases.csv")
    bench_html = open(BENCH, encoding="utf-8").read() if os.path.exists(BENCH) else ""
    style = bench_html[bench_html.find("<style>"):bench_html.find("</style>") + 8] if "<style>" in bench_html else ""
    now = datetime.now(ZoneInfo("America/Edmonton"))
    green = sum(1 for r in subs if r["status"].upper().startswith("GREEN"))
    motion = sum(1 for r in subs if any(k in r["status"].lower() for k in ["review", "queue", "pr open", "filed, open", "paid"]))
    notyet = len(subs) - green - motion
    soaks = sum(1 for r in rels if "SOAK" in r["status"].upper())

    rows = "\n".join(
        f'<tr><td>{html.escape(r["product"])}</td><td>{html.escape(r["surface"])}</td>'
        f'<td>{status_cell(r["status"])}</td>'
        f'<td>{html.escape(PUBLIC_NOTES.get((r["product"], r["surface"]), ""))}</td>'
        f'<td>{html.escape(r["last_verified"])}</td></tr>'
        for r in subs)
    rel_rows = "\n".join(
        f'<tr><td>{html.escape(r["product"])}</td><td>{html.escape(r["batch"])}</td>'
        f'<td>{html.escape(r["gate_verdict"])}</td><td>{html.escape(r["status"])}</td>'
        f'<td>{html.escape(r["public_record"])}</td></tr>'
        for r in rels)

    page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Operations Log — Nrupal Akolkar</title>
{style}
</head>
<body>
<main>
<header>
  <div class="eyebrow">Operations visibility window</div>
  <h1>Operations Log</h1>
  <p>The one maintained log of everything: every product listing, release and billing state, kept with its evidence and its date — so the story never has to be reconstructed from memory.</p>
  <p class="meta">Generated: {now.strftime('%Y-%m-%d %H:%M')} MDT<br>
  Full-board verification: 2026-10-22 (every status below read at its source that day)</p>
</header>

<div class="callout"><strong>Read this first:</strong> this page uses records only. A status is shown <strong>Live — verified</strong> only when it was seen on the surface itself. Anything not yet verified is labelled as what it is — in review, in queue, not filed — never rounded up.</div>

<section>
<h2>The board at a glance</h2>
<div class="grid">
  <article class="card"><h3>Listings verified live</h3><span class="big ok">{green}</span><p>Seen at the source on the last full verification.</p></article>
  <article class="card"><h3>In motion</h3><span class="big warn">{motion}</span><p>Filed, in review, in queue, or awaiting a decision.</p></article>
  <article class="card"><h3>Not yet online</h3><span class="big bad">{notyet}</span><p>Named plainly, with the reason on the board below.</p></article>
  <article class="card"><h3>Releases in soak</h3><span class="big">{soaks}</span><p>Release candidates serving their one-week soak before they may be called releases.</p></article>
</div>
</section>

<section>
<h2>Listings board</h2>
<table><thead><tr><th>Product</th><th>Surface</th><th>Status</th><th>What the record shows</th><th>Last verified</th></tr></thead><tbody>
{rows}
</tbody></table>
</section>

<section>
<h2>Releases</h2>
<table><thead><tr><th>Product</th><th>Batch</th><th>Release-gate verdict</th><th>State</th><th>Public record</th></tr></thead><tbody>
{rel_rows}
</tbody></table>
</section>

<section>
<h2>How this board is kept</h2>
<ul>
  <li>A row is written <strong>the day the act happens</strong> — never after.</li>
  <li>A status changes only on <strong>live-surface verification</strong>. An email earns at most “in motion”; “live” requires the surface itself.</li>
  <li>Every row carries its <strong>last-verified date</strong>; stale rows are re-verified before they are cited anywhere.</li>
  <li>When trackers disagree, the one with the fresher direct verification wins — and the other is corrected the same day.</li>
</ul>
<p><strong>Worked example, 2026-10-22:</strong> a fleet sweep reported the Smithery listings absent and a Registry version that does not exist. Direct reads at the source the same day proved the listings live (LetsAskIt, Conduit, codetopo) and the Registry holding exactly one LetsAskIt record, v0.4.0. Every tracker was corrected that day, with the evidence attached. The log exists so that class of miss cannot hide again.</p>
</section>

<footer>
<p><strong>Sources:</strong> the operations log (submissions, releases, actions, money, decisions — maintained daily, rendered to this page from the same records as the internal workbook).</p>
<p><strong>Refresh:</strong> <code>python3 tools/build-ops-log-page.py</code> from the site repository. The generator writes <code>public/ops-log/index.html</code>.</p>
<p>Products by <strong>2351485 ALBERTA INC. (AIMLDS)</strong>.</p>
<p>This page is intentionally static and record-bound. It is not a live dashboard.</p>
</footer>
</main>
</body>
</html>
"""
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, "w", encoding="utf-8").write(page)
    print("wrote", OUT, len(page), "bytes | green:", green, "motion:", motion, "notyet:", notyet, "soaks:", soaks)

if __name__ == "__main__":
    main()
