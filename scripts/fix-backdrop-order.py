#!/usr/bin/env python3
"""Swap declaration order: -webkit-backdrop-filter FIRST, backdrop-filter LAST.

Why: Turbopack's Lightning CSS minifier alias-collapses `backdrop-filter` and
`-webkit-backdrop-filter` in the same rule, KEEPING ONLY THE LAST-DECLARED
form. With the standard form declared first (our old order), only the
-webkit- form survived — and Chromium (this sandbox's browser, and any
browser that dropped the legacy alias) ignores it entirely, so every
stylesheet-driven frost silently died. Tailwind's own utilities declare the
prefixed form first and the standard form last, which is why they survive.
This script re-orders every consecutive pair in our stylesheets to match
that winning order.
"""
import re
import sys

FILES = [
    "/home/z/my-project/src/app/globals.css",
    "/home/z/my-project/src/components/ui/fluted-glass.module.css",
]

# Matches a standard line followed immediately by a -webkit- line (same value).
PAIR = re.compile(
    r"(?P<indent>[ \t]*)backdrop-filter:\s*(?P<val>[^;]+);\n"
    r"(?P=indent)-webkit-backdrop-filter:\s*(?P=val);",
)

def main() -> int:
    total = 0
    for path in FILES:
        with open(path, encoding="utf-8") as fh:
            src = fh.read()
        swapped, n = PAIR.subn(
            lambda m: (
                f"{m.group('indent')}-webkit-backdrop-filter: {m.group('val')};\n"
                f"{m.group('indent')}backdrop-filter: {m.group('val')};"
            ),
            src,
        )
        if n:
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(swapped)
        print(f"{path}: {n} pair(s) re-ordered")
        total += n
    print(f"total: {total}")
    return 0 if total else 1

if __name__ == "__main__":
    sys.exit(main())
