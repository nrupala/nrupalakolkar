#!/usr/bin/env python3
"""Verifiability checklist — is a claim about a system actually accountable?

Usage:
    python3 verifiability_checklist.py claims.csv

claims.csv — one claim per row, header required:
    claim,evidence,verified_independently,live_system
      evidence: one of  behaviour | config-read | narrative | none
      verified_independently: yes | no   (someone other than the builder)
      live_system: yes | no              (checked against the live system,
                                          not a staging copy or a report)

A claim FAILS if any of these hold:
  - evidence is narrative or none (a report is a claim, not evidence)
  - evidence is not behaviour (config-read alone proves wiring, not working)
  - it was not verified independently of whoever built it
  - it was not checked against the live system

Exit code 0 = every claim is verifiable. 1 = at least one claim is not.
This is the gate form of one rule: if a claim cannot be verified,
it is not accountability. It is marketing.
"""
import csv
import sys

OK_EVIDENCE = {"behaviour"}


def main(argv):
    if len(argv) != 2:
        print(__doc__)
        return 2
    failures = []
    rows = 0
    with open(argv[1], newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            rows += 1
            claim = (row.get("claim") or "").strip() or f"row {rows}"
            evidence = (row.get("evidence") or "").strip().lower()
            indep = (row.get("verified_independently") or "").strip().lower()
            live = (row.get("live_system") or "").strip().lower()
            problems = []
            if evidence in ("narrative", "none", ""):
                problems.append(f"evidence is '{evidence or 'missing'}', not behaviour observed")
            elif evidence not in OK_EVIDENCE:
                problems.append(f"evidence '{evidence}' proves wiring, not working behaviour")
            if indep != "yes":
                problems.append("not verified independently of the builder")
            if live != "yes":
                problems.append("not checked against the live system")
            if problems:
                failures.append((claim, problems))
    for claim, problems in failures:
        print(f"FAIL  {claim}")
        for p in problems:
            print(f"      - {p}")
    print(f"\n{rows} claim(s), {len(failures)} not verifiable.")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
