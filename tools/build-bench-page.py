#!/usr/bin/env python3
"""Build the private Bench Telemetry page from recorded telemetry sources.

The generator is deliberately record-bound: it extracts values from the
bench-telemetry baseline/spec and the byte-swimlane RUN-LOG. When a source
does not support a value, the page says "Not yet measured" instead of
filling the space with an estimate.

Default sources are the canonical workspace records. The output defaults
to this repository's public/bench/index.html, which is served as /bench.
"""

from __future__ import annotations

import argparse
import html
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo


LOCAL_TZ = ZoneInfo("America/Edmonton")


def clean(text: str) -> str:
    """Small Markdown-to-plain-text cleanup for extracted table cells."""
    text = text.replace("`", "")
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    text = text.replace("**", "").replace("__", "")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def esc(text: object) -> str:
    return html.escape(str(text), quote=True)


def section(text: str, start: str, end: str | None = None) -> str:
    i = text.find(start)
    if i < 0:
        return ""
    j = text.find(end, i + len(start)) if end else -1
    return text[i:] if j < 0 else text[i:j]


def first(pattern: str, text: str, default: str = "Not yet measured") -> str:
    m = re.search(pattern, text, flags=re.I | re.S)
    return clean(m.group(1)) if m else default


def int_first(pattern: str, text: str) -> str:
    m = re.search(pattern, text, flags=re.I | re.S)
    return m.group(1) if m else "Not yet measured"


def split_row(line: str) -> list[str]:
    return [clean(cell) for cell in line.strip().strip("|").split("|")]


def table_rows(segment: str) -> list[list[str]]:
    rows: list[list[str]] = []
    for line in segment.splitlines():
        if not line.lstrip().startswith("|"):
            continue
        cells = split_row(line)
        if not cells or all(re.fullmatch(r":?-{3,}:?", c) for c in cells):
            continue
        rows.append(cells)
    return rows


def source_stamp(path: Path) -> str:
    if not path.exists():
        return "source missing at build time"
    dt = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
    return dt.astimezone(LOCAL_TZ).strftime("%Y-%m-%d %H:%M %Z")


def parse_skills(baseline: str) -> list[tuple[str, str]]:
    seg = section(baseline, "## 2. Skill usage", "## 3. Distillation candidates")
    out: list[tuple[str, str]] = []
    for line in seg.splitlines():
        m = re.match(r"\|\s*\d+\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|", line)
        if m:
            out.append((clean(m.group(1)), m.group(2)))
    return out


def parse_distilled(baseline: str) -> list[tuple[str, str, str]]:
    seg = section(
        baseline,
        "**Already distilled (exemplars, with their founding evidence):**",
        "**Open candidates",
    )
    rows = table_rows(seg)
    out: list[tuple[str, str, str]] = []
    for row in rows[1:]:
        if len(row) >= 3:
            out.append((row[0], row[1], row[2]))
    return out


def parse_open_candidates(baseline: str) -> list[tuple[str, str]]:
    seg = section(baseline, "**Open candidates", "## 4. Six-dimension coverage")
    flat = re.sub(r"\s+", " ", seg)
    matches = list(re.finditer(r"\d+\.\s+\*\*(.+?)\*\*", flat))
    out: list[tuple[str, str]] = []
    for idx, m in enumerate(matches):
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(flat)
        chunk = flat[m.start():end]
        proposal = first(r"Proposed local form:\s*(.+?)(?=\s+\d+\.\s+\*\*|$)", chunk, "")
        if not proposal:
            proposal = clean(chunk[m.end() - m.start():])[:360]
        out.append((clean(m.group(1)), proposal))
    return out


def parse_not_measured(baseline: str) -> list[tuple[str, str, str]]:
    seg = section(baseline, "## 5. NOT-MEASURED register", "\n---")
    rows = table_rows(seg)
    out: list[tuple[str, str, str]] = []
    for row in rows[1:]:
        if len(row) >= 4:
            out.append((row[0], row[1], row[3]))
    return out


def experiment_block(runlog: str, exp: str) -> str:
    m = re.search(rf"^### {exp}\b.*?(?=^### E\d|^## |\Z)", runlog,
                  flags=re.M | re.S)
    return m.group(0) if m else ""


def experiment_state(runlog: str, exp: str) -> tuple[str, str]:
    block = experiment_block(runlog, exp)
    criterion = first(r"\*\*Pass \(brief §4\):\*\*\s*(.+?)(?:\n- |\n\n|\Z)", block,
                      "Criterion not found in RUN-LOG")
    # A result counts only when a dated section after the pre-registration
    # names the experiment and carries an explicit verdict line.
    after_pre = runlog.split("## 2026-", 1)[-1] if "## 2026-" in runlog else ""
    result_sections = re.findall(
        rf"^## .*?(?=^## |\Z)", after_pre, flags=re.M | re.S)
    for sec in result_sections:
        if re.search(rf"\b{exp}\b", sec):
            verdict = first(r"(?:Verdict|Result):\s*\**([A-Z][A-Z /-]+)", sec, "")
            if verdict:
                return (f"Result logged — {verdict}", criterion)
    if exp == "E4" and "GPU-BF16 arm: DEFERRED" in block:
        return ("Pre-registered — no result logged yet; GPU arm deferred in the RUN-LOG", criterion)
    return ("Pre-registered — no result logged yet", criterion)


def verdict_rows(text: str) -> list[tuple[str, str, str]]:
    """Parse a round results file's 'Verdicts at a glance' table.

    Returns (experiment name, verdict, one-line reason) per row, cleaned.
    The round results files are the swimlane's written close-outs of the
    append-only RUN-LOG, so their verdict tables are the record-bound
    source for experiment states (the RUN-LOG's free-form entries do not
    parse reliably into one-line states).
    """
    seg = section(text, "## Verdicts at a glance", "\n## ")
    rows = []
    for cells in table_rows(seg):
        if len(cells) >= 3 and cells[0].lower() not in ("experiment", "leg"):
            rows.append((cells[0], cells[1], cells[2]))
    return rows


def round_state(rounds: list[tuple[str, str]], exp: str) -> tuple[str, str]:
    """Compose one experiment's state from the round verdict tables.

    rounds is [(round label, results text), ...] in chronological order.
    Every word rendered comes from the files; nothing is paraphrased.
    """
    states, detail = [], ""
    for label, text in rounds:
        matched = [(v, r) for (name, v, r) in verdict_rows(text)
                   if re.search(rf"\b{exp}\b", name)]
        if matched:
            states.append(f"{label}: " + "; ".join(v for v, _ in matched))
            detail = " ".join(r for _, r in matched if r)
    if not states:
        return ("Pre-registered — no result logged yet", "")
    return (" · ".join(states), detail)


def swimlane_spend(rounds: list[tuple[str, str]]) -> tuple[str, str] | None:
    """Sum the 'Money spent: US$X' headers of the round results files."""
    per_round, total = [], 0.0
    for label, text in rounds:
        m = re.search(r"Money spent:\s*\**\s*US\$([\d.]+)", text)
        if m:
            per_round.append(f"{label} US${m.group(1)}")
            total += float(m.group(1))
    if not per_round:
        return None
    return (f"US${total:.2f}", " · ".join(per_round))


def render(args: argparse.Namespace) -> str:
    baseline_path = Path(args.baseline).expanduser()
    spec_path = Path(args.spec).expanduser()
    runlog_path = Path(args.run_log).expanduser()

    baseline = baseline_path.read_text(encoding="utf-8") if baseline_path.exists() else ""
    spec = spec_path.read_text(encoding="utf-8") if spec_path.exists() else ""
    runlog = runlog_path.read_text(encoding="utf-8") if runlog_path.exists() else ""

    now_local = datetime.now(LOCAL_TZ)
    generated = now_local.strftime("%Y-%m-%d %H:%M %Z")
    generated_utc = now_local.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    counting_window = first(
        r"Counting window:\s*(.+?);\s*the\s+instrumented era", baseline,
        "Not stated in the baseline")
    gate_folders = int_first(r"(\d+) run folders dated", baseline)
    verdict_files = int_first(r"(\d+) contain a `verdict\.md`", baseline)
    blocked = int_first(r"\|\s*BLOCKED\s*\|\s*(\d+)\s*\|", baseline)
    findings = int_first(r"\|\s*PASS WITH FINDINGS\s*\|\s*(\d+)\s*\|", baseline)
    passes = int_first(r"\|\s*PASS\s*\|\s*(\d+)\s*\|", baseline)
    no_verdict = int_first(r"\|\s*No verdict\.md in folder.*?(\d+) folders\s*\|", baseline)
    escapes = int_first(r"\|\s*\*\*Total\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|", baseline)
    steering = first(r"Verified floor:\s*(≥ \d+)", baseline)
    skill_rows = parse_skills(baseline)
    distilled = parse_distilled(baseline)
    open_candidates = parse_open_candidates(baseline)
    not_measured = parse_not_measured(baseline)

    custom_dirs = int_first(r"Custom skill dirs.*?(\d+)", baseline)
    system_dirs = int_first(r"System skill dirs.*?(\d+)", baseline)
    total_dirs = int_first(r"Skill dirs on this VM, both roots \| (\d+)", baseline)
    zero_named = int_first(r"\*\*(\d+) of 30 custom skills have zero name-mentions", baseline)
    gate_count = int_first(r"\| Checklist gates \| (\d+)", baseline)
    checklist_chars = int_first(r"\| `wright-checklists\.md` \| [^|]*?/ ([\d,]+) chars", baseline)
    agents_chars = int_first(r"\| `~/AGENTS\.md` \| [^|]*?/ ([\d,]+) chars", baseline)
    memory_chars = int_first(r"\| `~/MEMORY\.md` \| [^|]*?/ ([\d,]+) chars", baseline)

    skill_table = "\n".join(
        f"<tr><td>{i}</td><td><code>{esc(name)}</code></td><td>{esc(count)}</td></tr>"
        for i, (name, count) in enumerate(skill_rows, 1)
    ) or "<tr><td colspan='3'>Not yet measured — the baseline names no skill table.</td></tr>"

    distilled_rows = "\n".join(
        f"<tr><td>{esc(action)}</td><td><code>{esc(local)}</code></td><td>{esc(evidence)}</td></tr>"
        for action, local, evidence in distilled
    ) or "<tr><td colspan='3'>Not yet measured in the baseline.</td></tr>"

    candidate_items = "\n".join(
        f"<li><strong>{esc(title)}</strong> Proposed local form: {esc(proposal)}</li>"
        for title, proposal in open_candidates
    ) or "<li>Not yet measured in the baseline.</li>"

    not_rows = "\n".join(
        f"<tr><td>{esc(num)}</td><td>{esc(item)}</td><td>{esc(capture)}</td></tr>"
        for num, item, capture in not_measured
    ) or "<tr><td colspan='3'>Not yet measured — no register was found in the baseline.</td></tr>"

    rounds = []
    for rp in args.round_results:
        rpath = Path(rp).expanduser()
        if rpath.exists():
            m = re.search(r"ROUND-(\d+)-RESULTS", rpath.name)
            rounds.append((f"Round {m.group(1)}" if m else rpath.stem,
                           rpath.read_text(encoding="utf-8")))

    experiments = []
    for exp, label in [
        ("E1", "E1 — byte model vs token parent"),
        ("E4", "E4 — CPU/GPU route probe"),
        ("E7", "E7 — substrate micro-benchmark"),
    ]:
        _, criterion = experiment_state(runlog, exp)
        state, detail = round_state(rounds, exp)
        detail_html = f"<p>{esc(detail)}</p>" if detail else ""
        experiments.append(
            f"<article class='card'><h3>{esc(label)}</h3>"
            f"<p><span class='status'>{esc(state)}</span></p>"
            f"{detail_html}"
            f"<p><strong>Pre-registered pass test:</strong> {esc(criterion)}</p></article>"
        )
    experiment_cards = "\n".join(experiments)

    spend = swimlane_spend(rounds)
    if spend:
        spend_total, spend_detail = spend
        money_card = (
            f"<article class=\"card\"><h3>Money spent</h3>"
            f"<p><span class=\"status\">Swimlane spend to date: {esc(spend_total)}</span></p>"
            f"<p>{esc(spend_detail)}. The telemetry baseline carries no wider "
            f"monetary cost series for the bench itself.</p></article>"
        )
    else:
        money_card = (
            "<article class=\"card\"><h3>Money spent</h3>"
            "<p><span class=\"status\">Not yet measured</span></p>"
            "<p>The telemetry baseline does not carry a monetary cost series.</p></article>"
        )

    spec_status = "Spec only — no daemon, hook, or telemetry writer is built yet." \
        if "SPEC ONLY" in spec.upper() else "Telemetry spec status not stated in the source."

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Bench Telemetry — Nrupal Akolkar</title>
<style>
:root {{ --bg:#0c0c0c; --surface:#141414; --border:#2a2a2a; --green:#00ff88; --cyan:#00d4ff; --amber:#ffb800; --red:#ff6b6b; --text:#c8c8c8; --dim:#929292; --bright:#eeeeee; --mono:'JetBrains Mono','Cascadia Code','Fira Code',monospace; }}
* {{ box-sizing:border-box; }}
body {{ margin:0; background:var(--bg); color:var(--text); font-family:var(--mono); line-height:1.55; }}
main {{ width:min(1120px, calc(100% - 32px)); margin:0 auto; padding:40px 0 64px; }}
header {{ border-bottom:1px solid var(--border); padding-bottom:24px; margin-bottom:28px; }}
.eyebrow {{ color:var(--green); text-transform:uppercase; letter-spacing:.12em; font-size:.78rem; }}
h1 {{ color:var(--bright); font-size:clamp(2rem,5vw,3.4rem); line-height:1.05; margin:.35rem 0 .7rem; }}
h2 {{ color:var(--bright); border-bottom:1px solid var(--border); padding-bottom:.45rem; margin-top:2.4rem; }}
h3 {{ color:var(--bright); margin-top:0; }}
a {{ color:var(--cyan); }}
code {{ color:var(--green); overflow-wrap:anywhere; }}
.meta, .note {{ color:var(--dim); }}
.callout {{ border:1px solid var(--amber); background:rgba(255,184,0,.06); padding:16px 18px; margin:20px 0; }}
.grid {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px; }}
.card {{ background:var(--surface); border:1px solid var(--border); padding:16px; }}
.big {{ display:block; color:var(--bright); font-size:2rem; line-height:1.1; margin:.2rem 0; }}
.status {{ color:var(--amber); font-weight:700; }}
.ok {{ color:var(--green); }} .warn {{ color:var(--amber); }} .bad {{ color:var(--red); }}
table {{ width:100%; border-collapse:collapse; margin:14px 0 22px; font-size:.92rem; }}
th, td {{ border:1px solid var(--border); padding:9px 10px; text-align:left; vertical-align:top; }}
th {{ color:var(--bright); background:#1a1a1a; }}
.small {{ font-size:.88rem; }}
footer {{ border-top:1px solid var(--border); margin-top:40px; padding-top:18px; color:var(--dim); font-size:.88rem; }}
@media (max-width:640px) {{ table {{ font-size:.82rem; }} th, td {{ padding:7px; }} }}
</style>
</head>
<body>
<main>
<header>
  <div class="eyebrow">Private visibility window · Access-gated</div>
  <h1>Bench Telemetry</h1>
  <p>The recorded state of the Wright bench: what ran, what it used, what the experiments show, what it cost, and what is not measured yet.</p>
  <p class="meta">Generated: {esc(generated)} ({esc(generated_utc)})<br>
  Baseline data as of: {esc(source_stamp(baseline_path))}<br>
  Telemetry spec as of: {esc(source_stamp(spec_path))}<br>
  Experiment RUN-LOG as of: {esc(source_stamp(runlog_path))}</p>
</header>

<div class="callout"><strong>Read this first:</strong> this page uses records only. A value that has not been measured is labelled <strong>Not yet measured</strong>. It is never replaced with an estimate. {esc(spec_status)}</div>

<section>
<h2>Bench health</h2>
<p><strong>Record window:</strong> {esc(counting_window)}. The record does not provide a live “running now” feed, so current activity is <strong>Not yet measured</strong>.</p>
<div class="grid">
  <article class="card"><h3>Release-gate packs found</h3><span class="big">{esc(gate_folders)}</span><p>{esc(verdict_files)} folders contain a verdict file; {esc(no_verdict)} do not.</p></article>
  <article class="card"><h3>Blocked verdicts</h3><span class="big bad">{esc(blocked)}</span><p>Recorded in the baseline’s verdict extraction.</p></article>
  <article class="card"><h3>Pass with findings</h3><span class="big warn">{esc(findings)}</span><p>Clean passes recorded: {esc(passes)}.</p></article>
  <article class="card"><h3>Recorded escapes</h3><span class="big bad">{esc(escapes)}</span><p>No post-conversion recurrence is recorded in the ledger window. Escapes nobody caught cannot appear in a self-written ledger; zero later rows is silence, not proof.</p></article>
</div>
<h3>What ran</h3>
<ul>
  <li>Release-gate evidence exists for {esc(gate_folders)} run folders in the recorded window.</li>
  <li>The escape ledger records {esc(escapes)} escapes across 2026-10-15, 2026-10-17, and 2026-10-19.</li>
  <li>Owner steering recorded as a floor: <strong>{esc(steering)}</strong> resolved approval cards in about 26 hours (2026-10-21 to 2026-10-22). This is a floor, not a weekly series.</li>
</ul>
<h3>What is running now</h3>
<p><strong>Not yet measured.</strong> Telemetry v1 is a baseline and a log specification, not a live writer or dashboard feed.</p>
<h3>What failed or blocked</h3>
<ul>
  <li>{esc(blocked)} release-gate verdicts were BLOCKED.</li>
  <li>{esc(findings)} passed only with findings.</li>
  <li>One context-overflow event is confirmed; a per-thread series is not measured.</li>
</ul>
</section>

<section>
<h2>Skill usage and local distillations</h2>
<p>The counts below are <strong>log lines naming a skill</strong>, not true invocation counts. They are a floor with a naming bias. True skill invocation is Not yet measured (register item N2).</p>
<table><thead><tr><th>Rank</th><th>Custom skill</th><th>Log lines naming it</th></tr></thead><tbody>{skill_table}</tbody></table>
<ul>
  <li>Skill directories on this VM: <strong>{esc(total_dirs)}</strong> total — {esc(custom_dirs)} custom and {esc(system_dirs)} system.</li>
  <li><strong>{esc(zero_named)}</strong> of 30 custom skills have zero name-mentions in the counting window. The record cannot separate “never invoked” from “invoked but never named.”</li>
  <li>The separate 200-skill MyMilo/Switchboard catalogue is a different surface and is not joined into a growth curve.</li>
</ul>
<h3>Already distilled to a local form</h3>
<table><thead><tr><th>Repeated action</th><th>Local form</th><th>Founding record</th></tr></thead><tbody>{distilled_rows}</tbody></table>
<h3>Open distillation candidates</h3>
<ol>{candidate_items}</ol>
</section>

<section>
<h2>Experiment verdicts</h2>
<p>Experiment outcomes are taken from the swimlane round results — the written close-outs of the append-only RUN-LOG, where every number traces to a dated log entry. Data files alone are not a verdict.</p>
<div class="grid">{experiment_cards}</div>
</section>

<section>
<h2>Costs and bench load</h2>
<div class="grid">
  {money_card}
  <article class="card"><h3>Tokens and wall time</h3><p><span class="status">Not yet measured</span></p><p>Per-run cost is register item N1 — the baseline calls it the biggest gap.</p></article>
  <article class="card"><h3>Owner steering</h3><span class="big">{esc(steering)}</span><p>Resolved approval cards in about 26 hours. A floor only; a weekly series is not measured.</p></article>
  <article class="card"><h3>Harness footprint</h3><p><strong>{esc(gate_count)}</strong> checklist gates</p><p>Checklists: {esc(checklist_chars)} chars<br>AGENTS.md: {esc(agents_chars)} chars<br>MEMORY.md: {esc(memory_chars)} chars</p></article>
</div>
<p>The log specification sets future caps — not actual costs: rows no larger than 1 KB, raw log growth no more than 5 MB/month, and capture effort no more than 30 seconds per run.</p>
</section>

<section>
<h2>NOT-MEASURED register</h2>
<p>These gaps stay on the page until a record closes them.</p>
<table><thead><tr><th>#</th><th>Not measured</th><th>Captured going forward by</th></tr></thead><tbody>{not_rows}</tbody></table>
<p>The baseline also names three dimensions today’s records cannot answer systematically: <strong>composition</strong> (which layer actually decided a task), <strong>performance cost/duration</strong>, and <strong>organization context state</strong> (what was loaded for a run).</p>
</section>

<footer>
<p><strong>Sources:</strong> <code>~/workspace/bench-telemetry/TELEMETRY-BASELINE-2026-10-22.md</code>; <code>~/workspace/bench-telemetry/TELEMETRY-LOG-SPEC.md</code>; <code>~/workspace/byte-swimlane/RUN-LOG.md</code>; <code>~/workspace/byte-swimlane/ROUND-1-RESULTS.md</code>; <code>~/workspace/byte-swimlane/ROUND-2-RESULTS.md</code>.</p>
<p><strong>Refresh:</strong> <code>python3 tools/build-bench-page.py</code> from the site repository. The generator writes <code>public/bench/index.html</code>.</p>
<p>Products by <strong>2351485 ALBERTA INC. (AIMLDS)</strong>.</p>
<p>This page is intentionally static and record-bound. It is not a live dashboard.</p>
</footer>
</main>
</body>
</html>
"""


def main() -> int:
    home = Path.home()
    repo_root = Path(__file__).resolve().parents[1]
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--baseline", default=str(home / "workspace/bench-telemetry/TELEMETRY-BASELINE-2026-10-22.md"))
    p.add_argument("--spec", default=str(home / "workspace/bench-telemetry/TELEMETRY-LOG-SPEC.md"))
    p.add_argument("--run-log", default=str(home / "workspace/byte-swimlane/RUN-LOG.md"))
    p.add_argument("--round-results", nargs="*", default=[
        str(home / "workspace/byte-swimlane/ROUND-1-RESULTS.md"),
        str(home / "workspace/byte-swimlane/ROUND-2-RESULTS.md"),
    ])
    p.add_argument("--output", default=str(repo_root / "public/bench/index.html"))
    args = p.parse_args()

    output = Path(args.output).expanduser()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(render(args), encoding="utf-8")
    print(f"wrote {output} ({output.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
