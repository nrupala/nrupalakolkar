#!/usr/bin/env python3
"""Judgment Differential checklist runner.

Companion artifact to "Testing the judge: what my own hands found in Verdict"
(nrupalakolkar.com/blog, Trust Rails, 2026-10-18).

Purpose: for any product whose output is a verdict, score, or recommendation,
run ONE corpus through EVERY public surface and fail loudly when:
  - the class is wrong,
  - the class is right but the cited reason is wrong (a FAIL, not a pass),
  - a benign twin does not stay clean,
  - two surfaces disagree on the same input.

Corpus format (CSV, header required):
  input,surface,expected_class,expected_reason_keyword,twin_input,twin_expected
  - expected_class "*" means "any class, but the reason keyword must match"
    (use for semantic-direction pairs where the wording is the point).
  - expected_reason_keyword "" means "do not check the reason".

You supply how to call your product: implement `judge()` below for your
surface (HTTP call, CLI, MCP tool, import) and return (class, reason_text).
The shipped `judge()` is a stub that raises — wire it to your product first.

Usage:
  python3 judgment_differential_checklist.py corpus.csv
Exit code 0 = corpus clean on every surface. 1 = at least one differential.
"""
import csv
import sys
from collections import defaultdict


def judge(surface: str, text: str) -> tuple[str, str]:
    """Return (verdict_class, reason_text) for `text` via `surface`.

    Replace this stub with your product's real call, e.g. an HTTP POST to
    your check endpoint or an MCP tool invocation. Never fake it: a stub
    that always passes makes this checklist evidence of nothing.
    """
    raise NotImplementedError(
        f"Wire judge() to your product first (surface={surface!r})"
    )


def check_corpus(path: str) -> int:
    findings: list[str] = []
    by_input: dict[str, dict[str, str]] = defaultdict(dict)

    with open(path, newline="", encoding="utf-8") as fh:
        for lineno, row in enumerate(csv.DictReader(fh), start=2):
            text = (row.get("input") or "").strip()
            surface = (row.get("surface") or "").strip()
            expected = (row.get("expected_class") or "").strip()
            reason_kw = (row.get("expected_reason_keyword") or "").strip()
            twin = (row.get("twin_input") or "").strip()
            twin_expected = (row.get("twin_expected") or "").strip()
            if not text or not surface:
                continue

            got_class, got_reason = judge(surface, text)
            by_input[text][surface] = got_class

            if expected != "*" and got_class != expected:
                findings.append(
                    f"line {lineno} [{surface}] CLASS wrong for {text!r}: "
                    f"got {got_class}, expected {expected}"
                )
            elif reason_kw and reason_kw.lower() not in got_reason.lower():
                findings.append(
                    f"line {lineno} [{surface}] REASON wrong for {text!r}: "
                    f"class {got_class} but reason lacks {reason_kw!r} "
                    f"(reason: {got_reason!r}) — right class, wrong reason = FAIL"
                )

            if twin:
                twin_class, _ = judge(surface, twin)
                if twin_class != twin_expected:
                    findings.append(
                        f"line {lineno} [{surface}] TWIN not clean for "
                        f"{twin!r}: got {twin_class}, expected {twin_expected}"
                    )

    for text, surfaces in by_input.items():
        if len(set(surfaces.values())) > 1:
            findings.append(
                f"SURFACE DISAGREEMENT for {text!r}: {dict(surfaces)}"
            )

    for f in findings:
        print(" -", f)
    print(f"{len(findings)} differential(s)" if findings else "corpus clean")
    return 1 if findings else 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: judgment_differential_checklist.py corpus.csv")
    sys.exit(check_corpus(sys.argv[1]))
