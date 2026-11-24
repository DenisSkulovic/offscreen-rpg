#!/usr/bin/env python3
"""Exactly-once check for one fault-harness run.

Exit 0 when the log contains one APPLY line. Exit 1 when it contains any
other count. Two APPLY lines for one run id are a duplicated side effect:
the broker replayed the message, and this assertion is written to fail.
"""

import sys
from pathlib import Path


def apply_rows(text):
    rows = []
    for line in text.splitlines():
        if not line.startswith("APPLY "):
            continue
        parts = line.split()
        if len(parts) != 3 or not parts[2].startswith("redelivered="):
            raise SystemExit(f"malformed apply line: {line}")
        rows.append((parts[1], parts[2].split("=", 1)[1]))
    return rows


def main(argv):
    if len(argv) != 2:
        print("usage: assert_exactly_once.py <log>", file=sys.stderr)
        return 2
    rows = apply_rows(Path(argv[1]).read_text())
    if len(rows) == 1:
        print(f"EXACTLY-ONCE holds for {rows[0][0]}")
        return 0
    identity = rows[0][0] if rows else "none"
    print(
        f"ASSERTION-FAILED duplicated side effect: expected 1 APPLY, saw {len(rows)} for {identity}"
    )
    print("A replayed delivery is not an exactly-once effect.")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
