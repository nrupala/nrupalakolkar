#!/usr/bin/env python3
"""defined_flow_check.py — validate an agent task against a defined-flow menu.

The pattern this enforces: an agent never receives a shell or a free-form
command. It receives tasks, and every task must be one of a small set of
named flows, each with named fields. Anything else is refused before the
agent ever sees it.

Usage:
    python3 defined_flow_check.py task.json

A task file is a JSON object: {"type": "<flow name>", ...fields}.
Define your own menu by editing FLOWS below. Exit 0 = the task is a
defined flow, completely specified. Exit 1 = refused, with the reasons.
"""

import json
import sys

# Your menu. Each flow names the fields it requires — no more are allowed,
# and no field may carry a command.
FLOWS = {
    "summarize_file": {"fields": ["path"]},
    "draft_message": {"fields": ["to", "subject", "body"]},
    "file_report": {"fields": ["title", "body", "folder"]},
    "schedule_check": {"fields": ["date"]},
    "fetch_page": {"fields": ["url"]},
}

# Keys that turn a form back into a command line. A task carrying any of
# these is refused outright, whatever its declared type.
FORBIDDEN_KEYS = {"shell", "command", "cmd", "script", "exec", "eval", "run"}

# Values that smell like a shell line even inside an innocent field.
SHELL_MARKERS = ("$(", "`", "&&", "||", "sudo ", "rm -", "curl ", "wget ", "| sh", "| bash")


def check(task):
    problems = []
    if not isinstance(task, dict):
        return ["task is not a JSON object"]
    keys = {str(k).lower() for k in task}
    bad = keys & FORBIDDEN_KEYS
    if bad:
        problems.append(f"forbidden key(s) present: {', '.join(sorted(bad))} — a form is not a command line")
    t = task.get("type")
    if t not in FLOWS:
        problems.append(f"type {t!r} is not on the menu — refused, not improvised")
        return problems
    required = FLOWS[t]["fields"]
    for f in required:
        if f not in task:
            problems.append(f"missing required field: {f}")
    for k in task:
        if k != "type" and k not in required:
            problems.append(f"field {k!r} is not part of the {t} flow")
    for k, v in task.items():
        if isinstance(v, str) and any(m in v for m in SHELL_MARKERS):
            problems.append(f"field {k!r} carries a shell marker ({v[:40]!r}...)")
    return problems


def main():
    if len(sys.argv) != 2:
        print("usage: python3 defined_flow_check.py task.json")
        return 2
    with open(sys.argv[1]) as fh:
        task = json.load(fh)
    problems = check(task)
    if problems:
        for p in problems:
            print(f"REFUSED  {p}")
        return 1
    print(f"OK  {task['type']} — a defined flow, completely specified")
    return 0


if __name__ == "__main__":
    sys.exit(main())
