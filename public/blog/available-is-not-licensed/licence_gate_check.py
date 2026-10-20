#!/usr/bin/env python3
"""Licence gate for a training corpus.

Companion artifact to "Available is not licensed: the second reader that
froze part of my training corpus" (nrupalakolkar.com/blog,
Industrial Intelligence, 2026-10-19).

Two jobs, both mechanical:

1. GATE — scan a dataset (JSONL, one row per line, each row carrying a
   "source" field) and fail loudly if any row touches a frozen source
   tag or an excluded licence class. "Available to download" is not a
   licence; a source stays frozen until a document — not an impression —
   unfreezes it.

2. REBUILD PROOF — given the pre-rebuild and post-rebuild datasets,
   prove the rebuild was removal-only: every surviving row is
   byte-identical to a row in the original, in the same order, and the
   count delta equals the number of frozen rows removed. A rebuild that
   quietly edits survivors is not a removal; it is a new dataset.

Usage:
  python3 licence_gate_check.py dataset.jsonl frozen.txt
  python3 licence_gate_check.py --rebuild-proof before.jsonl after.jsonl frozen.txt

frozen.txt format — one entry per line:
  TAG <tab or space> reason the source is frozen
Blank lines and lines starting with # are ignored.

Exit code 0 = gate clean / rebuild proven removal-only. 1 = findings.
"""
import json
import sys


def load_frozen(path):
    frozen = {}
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split(None, 1)
            frozen[parts[0]] = parts[1] if len(parts) > 1 else "frozen"
    return frozen


def row_sources(row):
    src = row.get("source", "")
    if isinstance(src, list):
        return [str(s) for s in src]
    return [str(src)] if src else []


def gate(path, frozen):
    findings = []
    total = 0
    with open(path, encoding="utf-8") as fh:
        for lineno, line in enumerate(fh, start=1):
            if not line.strip():
                continue
            total += 1
            try:
                row = json.loads(line)
            except json.JSONDecodeError as exc:
                findings.append(f"line {lineno}: not valid JSON ({exc})")
                continue
            for tag, reason in frozen.items():
                if any(tag in s for s in row_sources(row)):
                    findings.append(
                        f"line {lineno}: touches frozen source {tag!r} "
                        f"({reason})"
                    )
    return total, findings


def rebuild_proof(before_path, after_path, frozen):
    findings = []
    with open(before_path, encoding="utf-8") as fh:
        before = [ln for ln in fh if ln.strip()]
    with open(after_path, encoding="utf-8") as fh:
        after = [ln for ln in fh if ln.strip()]

    # Every survivor must appear byte-identical, in order, in `before`.
    it = iter(range(len(before)))
    pos = 0
    for i, line in enumerate(after, start=1):
        found = False
        while pos < len(before):
            if before[pos] == line:
                found = True
                pos += 1
                break
            pos += 1
        if not found:
            findings.append(
                f"after line {i}: no byte-identical match in order in "
                f"the original — the rebuild edited or added a row"
            )

    removed = len(before) - len(after)
    _, frozen_findings = gate(after_path, frozen)
    if frozen_findings:
        findings.append(
            f"rebuilt dataset still has {len(frozen_findings)} frozen "
            f"touch(es) — see gate run"
        )
    print(f"before: {len(before)} rows; after: {len(after)} rows; "
          f"removed: {removed}")
    return findings


def main(argv):
    if len(argv) == 5 and argv[1] == "--rebuild-proof":
        frozen = load_frozen(argv[4])
        findings = rebuild_proof(argv[2], argv[3], frozen)
        return report(findings)
    if len(argv) == 3:
        frozen = load_frozen(argv[2])
        total, findings = gate(argv[1], frozen)
        print(f"{total} rows scanned against {len(frozen)} frozen tag(s)")
        return report(findings)
    sys.exit(__doc__)


def report(findings):
    for f in findings:
        print(" -", f)
    print(f"{len(findings)} finding(s)" if findings else "gate clean")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
