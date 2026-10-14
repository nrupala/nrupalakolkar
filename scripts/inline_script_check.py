#!/usr/bin/env python3
"""Inline-script parse check (stdlib only).

Prevents the 2026-09-26 swallow incident: in Cloudflare Worker (and other
server-side) JavaScript that builds HTML inside string/template literals,
writing an escaped `<\\/script>` emits the literal bytes `<\\/script>` into
the served page. Browsers do NOT recognise that as a script end tag, so the
first inline script swallows the rest of the document -- page bodies and
footers vanish and the script itself never runs. Worker/server JS files are
never parsed as HTML, so the correct source form is a plain `</script>`
inside the string.

Checks
------
1. Source scan (.js/.ts/.mjs/.cjs/.jsx/.tsx/.html): flag `<\\/script>`
   occurring inside a string or template literal (tracked with a small
   lexer, so occurrences in comments or plain code are not flagged).
2. HTML inline-script parse (.html/.htm): extract each inline <script>
   block (no src=) and syntax-check its content with `node --check`.
   If node is unavailable this sub-check reports NOT RUN -- never a
   silent PASS -- and the run exits 3 unless findings already force 2.

Exit codes: 0 = clean, 2 = findings, 3 = could not run (missing path,
no scannable files, or a required sub-check could not run).

Usage:
  python3 inline_script_check.py [FILE_OR_DIR ...]
  python3 inline_script_check.py --self-test
  python3 inline_script_check.py --json [FILE_OR_DIR ...]
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

JS_EXTS = {".js", ".ts", ".mjs", ".cjs", ".jsx", ".tsx"}
HTML_EXTS = {".html", ".htm"}
SCAN_EXTS = JS_EXTS | HTML_EXTS
SKIP_DIRS = {".git", "node_modules", ".wrangler", "__pycache__"}
SWALLOW = "<\\/script>"  # the literal 10-char sequence: < \ / s c r i p t >

EXIT_CLEAN = 0
EXIT_FINDINGS = 2
EXIT_COULD_NOT_RUN = 3


# --------------------------------------------------------------------------
# Check 1: swallow pattern inside string/template literals
# --------------------------------------------------------------------------

def find_swallow_in_js(text, path):
    """Return findings for SWALLOW inside string/template literals.

    Small lexer: tracks single/double/template strings, ${ } nesting in
    templates, and line/block comments. Occurrences in comments or in
    normal code are ignored, per the check's definition.
    """
    findings = []
    i, n = 0, len(text)
    line = 1
    # state stack entries: ('sq',), ('dq',), ('tpl',), ('code', brace_depth, from_tpl)
    state = "code"
    tpl_expr_depth = 0  # brace depth while inside a ${ } in a template
    stack = []
    lower = text.lower()
    while i < n:
        ch = text[i]
        if ch == "\n":
            line += 1
            if state == "line_comment":
                state = stack.pop() if stack else "code"
            i += 1
            continue
        if state == "line_comment" or state == "block_comment":
            if state == "block_comment" and text.startswith("*/", i):
                state = stack.pop() if stack else "code"
                i += 2
            else:
                i += 1
            continue
        if state in ("sq", "dq", "tpl"):
            quote = {"sq": "'", "dq": '"', "tpl": "`"}[state]
            if lower.startswith(SWALLOW, i):
                findings.append({
                    "file": path,
                    "line": line,
                    "kind": "escaped-script-close-in-string",
                    "detail": ("`<\\/script>` inside a string/template literal "
                               "is emitted literally and is NOT a script end "
                               "tag to a browser; the inline script will "
                               "swallow the rest of the document. Use a plain "
                               "`</script>` in server-side JS source."),
                })
                i += len(SWALLOW)
                continue
            if ch == "\\":
                i += 2
                continue
            if state == "tpl" and text.startswith("${", i):
                stack.append("tpl")
                state = "code"
                tpl_expr_depth = 0
                i += 2
                continue
            if ch == quote:
                state = stack.pop() if stack else "code"
                i += 1
                continue
            i += 1
            continue
        # state == "code"
        if text.startswith("//", i):
            stack.append(state)
            state = "line_comment"
            i += 2
            continue
        if text.startswith("/*", i):
            stack.append(state)
            state = "block_comment"
            i += 2
            continue
        if ch == "'":
            stack.append(state)
            state = "sq"
            i += 1
            continue
        if ch == '"':
            stack.append(state)
            state = "dq"
            i += 1
            continue
        if ch == "`":
            stack.append(state)
            state = "tpl"
            i += 1
            continue
        if stack and stack[-1] == "tpl":
            # inside a ${ } expression of a template literal
            if ch == "{":
                tpl_expr_depth += 1
            elif ch == "}":
                if tpl_expr_depth == 0:
                    stack.pop()
                    state = "tpl"
                else:
                    tpl_expr_depth -= 1
            i += 1
            continue
        i += 1
    return findings


# --------------------------------------------------------------------------
# Check 2: inline <script> blocks in HTML must parse
# --------------------------------------------------------------------------

SCRIPT_RE = re.compile(r"<script\b([^>]*)>(.*?)</script\s*>",
                       re.IGNORECASE | re.DOTALL)
SRC_RE = re.compile(r"\bsrc\s*=", re.IGNORECASE)
TYPE_RE = re.compile(r"\btype\s*=\s*[\"']?([^\"'\s>]+)", re.IGNORECASE)
# Only these script types contain JavaScript. Others (application/ld+json,
# application/json, importmap, text/plain, ...) are data blocks and must
# never be fed to a JS parser -- doing so false-positives on valid JSON-LD.
JS_TYPES = {"", "text/javascript", "application/javascript", "module",
            "text/ecmascript", "application/ecmascript", "text/jscript"}


def check_html_file(path, text, node):
    """Return (findings, not_run_notes) for one HTML file."""
    findings, not_run = [], []
    for m in SCRIPT_RE.finditer(text):
        attrs, body = m.group(1), m.group(2)
        if SRC_RE.search(attrs):
            continue
        tm = TYPE_RE.search(attrs)
        if tm and tm.group(1).lower() not in JS_TYPES:
            continue  # data block (JSON-LD, JSON, importmap, ...), not JS
        if not body.strip():
            continue
        start_line = text.count("\n", 0, m.start()) + 1
        if node is None:
            not_run.append({
                "file": path, "line": start_line,
                "kind": "inline-script-parse",
                "detail": "NOT RUN: node not available to syntax-check "
                          "this inline <script> block",
            })
            continue
        suffix = ".mjs" if re.search(r"^\s*(import|export)\b", body, re.M) else ".js"
        tmp = None
        try:
            with tempfile.NamedTemporaryFile(
                    "w", suffix=suffix, delete=False, encoding="utf-8") as f:
                f.write(body)
                tmp = f.name
            proc = subprocess.run([node, "--check", tmp],
                                  capture_output=True, text=True, timeout=30)
            if proc.returncode != 0:
                err = (proc.stderr or proc.stdout).strip().splitlines()
                findings.append({
                    "file": path, "line": start_line,
                    "kind": "inline-script-parse-error",
                    "detail": "inline <script> block fails `node --check`: "
                              + (err[1] if len(err) > 1 else (err[0] if err else "syntax error")),
                })
        except Exception as exc:  # node failed to run at all
            not_run.append({
                "file": path, "line": start_line,
                "kind": "inline-script-parse",
                "detail": f"NOT RUN: node --check failed to execute ({exc})",
            })
        finally:
            if tmp and os.path.exists(tmp):
                os.unlink(tmp)
    return findings, not_run


# --------------------------------------------------------------------------
# Scan driver
# --------------------------------------------------------------------------

def collect_files(paths):
    files, missing = [], []
    for p in paths:
        if os.path.isfile(p):
            if os.path.splitext(p)[1].lower() in SCAN_EXTS:
                files.append(p)
        elif os.path.isdir(p):
            for root, dirs, names in os.walk(p):
                dirs[:] = sorted(d for d in dirs if d not in SKIP_DIRS)
                for name in sorted(names):
                    if os.path.splitext(name)[1].lower() in SCAN_EXTS:
                        files.append(os.path.join(root, name))
        else:
            missing.append(p)
    return sorted(files), missing


def scan(paths):
    files, missing = collect_files(paths)
    findings, not_run = [], []
    node = shutil.which("node")
    for path in files:
        try:
            with open(path, encoding="utf-8", errors="replace") as f:
                text = f.read()
        except OSError as exc:
            not_run.append({"file": path, "line": 0,
                            "kind": "read-error", "detail": f"NOT RUN: {exc}"})
            continue
        ext = os.path.splitext(path)[1].lower()
        if ext in JS_EXTS:
            findings.extend(find_swallow_in_js(text, path))
        # HTML files: the swallow matters in inline scripts there too, and
        # their inline blocks also get the node parse check.
        if ext in HTML_EXTS:
            findings.extend(find_swallow_in_js(text, path))
            f2, n2 = check_html_file(path, text, node)
            findings.extend(f2)
            not_run.extend(n2)
    return {"files_scanned": files, "findings": findings,
            "not_run": not_run, "missing": missing, "node": node}


def exit_code_for(result):
    if result["findings"]:
        return EXIT_FINDINGS
    if result["missing"] or result["not_run"] or not result["files_scanned"]:
        return EXIT_COULD_NOT_RUN
    return EXIT_CLEAN


def report(result, as_json):
    if as_json:
        print(json.dumps({
            "files_scanned": len(result["files_scanned"]),
            "node": result["node"],
            "findings": result["findings"],
            "not_run": result["not_run"],
            "missing_paths": result["missing"],
            "exit_code": exit_code_for(result),
        }, indent=2))
        return
    for f in result["findings"]:
        print(f"FINDING {f['file']}:{f['line']} [{f['kind']}] {f['detail']}")
    for f in result["not_run"]:
        print(f"NOT RUN {f['file']}:{f['line']} [{f['kind']}] {f['detail']}")
    for p in result["missing"]:
        print(f"NOT RUN: path not found: {p}")
    print(f"SUMMARY scanned={len(result['files_scanned'])} "
          f"findings={len(result['findings'])} not_run={len(result['not_run'])} "
          f"node={result['node'] or 'unavailable'} "
          f"exit={exit_code_for(result)}")


# --------------------------------------------------------------------------
# Self-test
# --------------------------------------------------------------------------

BAD_SAMPLE = """\
// BAD sample: Worker-style JS emitting a page. The escaped close tag in the
// template literal below is emitted literally and swallows the document.
export default {
  async fetch() {
    const html = `<!doctype html><html><body>
      <script>console.log("hello")<\\/script>
      <main>Page body that would vanish</main>
      </body></html>`;
    return new Response(html, { headers: { "content-type": "text/html" } });
  },
};
"""

GOOD_SAMPLE = """\
// GOOD sample: same Worker with a plain close tag -- the correct source form.
export default {
  async fetch() {
    const html = `<!doctype html><html><body>
      <script>console.log("hello")</script>
      <main>Page body</main>
      </body></html>`;
    return new Response(html, { headers: { "content-type": "text/html" } });
  },
};
"""


def self_test():
    ok = True
    with tempfile.TemporaryDirectory() as td:
        bad = os.path.join(td, "bad-worker.js")
        good = os.path.join(td, "good-worker.js")
        with open(bad, "w", encoding="utf-8") as f:
            f.write(BAD_SAMPLE)
        with open(good, "w", encoding="utf-8") as f:
            f.write(GOOD_SAMPLE)
        bad_result = scan([bad])
        good_result = scan([good])
        bad_code = exit_code_for(bad_result)
        good_code = exit_code_for(good_result)
        print(f"SELF-TEST bad sample  ({bad}): exit={bad_code} (expected 2)")
        for f in bad_result["findings"]:
            print(f"  FINDING {f['file']}:{f['line']} [{f['kind']}]")
        print(f"SELF-TEST good sample ({good}): exit={good_code} (expected 0)")
        if bad_code != EXIT_FINDINGS:
            print("SELF-TEST FAIL: bad sample did not exit 2")
            ok = False
        if good_code != EXIT_CLEAN:
            print("SELF-TEST FAIL: good sample did not exit 0")
            ok = False
    print("SELF-TEST " + ("PASS" if ok else "FAIL"))
    return EXIT_CLEAN if ok else EXIT_COULD_NOT_RUN


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    as_json = "--json" in argv
    if "--self-test" in argv:
        return self_test()
    if "--help" in argv or "-h" in argv:
        print(__doc__)
        return EXIT_CLEAN
    if not args:
        print(__doc__)
        print("ERROR: no paths given")
        return EXIT_COULD_NOT_RUN
    result = scan(args)
    report(result, as_json)
    return exit_code_for(result)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
