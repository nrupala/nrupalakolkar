#!/usr/bin/env python3
"""Deploy-touch check — is anything being called 'done' too early?

Two checks in one small tool:

1. COMPLETENESS — read a surfaces.csv listing every surface a release
   owes its users. A release may only be called complete when every
   applicable row is `verified` (seen live, working) or `waived`
   (deliberately set aside by the owner, in writing). A row that is
   `missing` or `unverified` blocks the word "complete" — not the
   work, just the claim.

2. TOUCH LOG — read a touches.csv listing changes made through a
   settings/dashboard screen. Every touch on a production surface
   must carry a declaration recorded BEFORE the touch and a
   certificate recorded AFTER it. A touch without both is flagged,
   however small the change looked — a settings save can promote
   work that was uploaded earlier and never went live.

Usage:
    python3 deploy_touch_check.py surfaces.csv touches.csv
    (either file may be given as "-" to skip that check)

surfaces.csv header:
    surface,applicable,status,waived_by
      applicable: yes | no
      status:     verified | waived | missing | unverified
      waived_by:  required (non-empty) when status is waived

touches.csv header:
    touch,production,declared_before,certified_after
      production:        yes | no
      declared_before:   yes | no
      certified_after:   yes | no

Exit code 0 = the completeness claim is clean and every production
touch was declared and certified. 1 = at least one problem.
"""
import csv
import sys


def check_surfaces(path):
    problems = []
    rows = 0
    with open(path, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            if (row.get("applicable") or "").strip().lower() != "yes":
                continue
            rows += 1
            name = (row.get("surface") or "").strip() or f"row {rows}"
            status = (row.get("status") or "").strip().lower()
            if status == "verified":
                continue
            if status == "waived" and (row.get("waived_by") or "").strip():
                continue
            if status == "waived":
                problems.append(f"{name}: waived but no waived_by recorded")
            elif status in ("missing", "unverified", ""):
                problems.append(f"{name}: status is '{status or 'blank'}' — not verified, not waived")
            else:
                problems.append(f"{name}: unknown status '{status}'")
    return rows, problems


def check_touches(path):
    problems = []
    rows = 0
    with open(path, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            rows += 1
            name = (row.get("touch") or "").strip() or f"row {rows}"
            if (row.get("production") or "").strip().lower() != "yes":
                continue
            if (row.get("declared_before") or "").strip().lower() != "yes":
                problems.append(f"{name}: production touch with no declaration before it")
            if (row.get("certified_after") or "").strip().lower() != "yes":
                problems.append(f"{name}: production touch with no certificate after it")
    return rows, problems


def main(argv):
    if len(argv) != 3:
        print(__doc__)
        return 2
    total_problems = []
    if argv[1] != "-":
        n, p = check_surfaces(argv[1])
        print(f"surfaces: {n} applicable row(s), {len(p)} blocking the word 'complete'")
        total_problems += p
    if argv[2] != "-":
        n, p = check_touches(argv[2])
        print(f"touches:  {n} row(s), {len(p)} touch problem(s)")
        total_problems += p
    for problem in total_problems:
        print(f"FAIL  {problem}")
    if total_problems:
        print("\nNot complete / not clean. Fix the rows, or waive them on the record.")
        return 1
    print("\nClean: every applicable surface is verified or waived, "
          "and every production touch was declared and certified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
