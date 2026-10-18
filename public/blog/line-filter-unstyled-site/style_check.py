#!/usr/bin/env python3
# style_check.py
# Structural probe for key pages: asserts the stylesheet is present and
# balanced, no third-party font hosts appear in the bytes, and the served
# size is above a floor that catches truncation. A page can serve
# HTTP 200 and still be unstyled -- this catches that.
# From: https://nrupalakolkar.com/blog/line-filter-unstyled-site
# Usage: python3 style_check.py
"""Assert that key pages are structurally whole, not just served."""
import subprocess, sys

PAGES = [
    ("https://example.com/",          20000),
    ("https://example.com/blog/",      8000),
    ("https://example.com/card/",      3000),
    ("https://example.com/consulting", 8000),
]

def fetch(url):
    out = subprocess.run(
        ["curl", "-sS", "--max-time", "30", "-w", "\n%{http_code}", url],
        capture_output=True, text=True)
    body, _, code = out.stdout.rpartition("\n")
    return int(code), body

findings = []
for url, floor in PAGES:
    code, body = fetch(url)
    if code != 200:
        findings.append(f"{url}: HTTP {code}")
        continue
    opens, closes = body.count("<style"), body.count("</style>")
    if opens < 1 or opens != closes:
        findings.append(f"{url}: style tags unbalanced "
                        f"(opens={opens}, closes={closes})")
    if "fonts.googleapis" in body or "fonts.gstatic" in body:
        findings.append(f"{url}: third-party font host present")
    if len(body) < floor:
        findings.append(f"{url}: {len(body)}B, below floor {floor}B")

for f in findings:
    print(" -", f)
sys.exit(1 if findings else 0)
