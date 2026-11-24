#!/usr/bin/env python3
"""Check collector debug text for the synthetic two-hop trace or the missing-hop signal."""

from __future__ import annotations

import json
import re
import sys

FORBIDDEN = re.compile(r"player|story|secret|password|bearer|api[_-]?key|\bsk-", re.I)


def windows(text, needles, radius):
    lines = text.splitlines()
    keep = set()
    for index, line in enumerate(lines):
        if any(needle and needle in line for needle in needles):
            start = max(0, index - 3)
            end = min(len(lines), index + radius)
            keep.update(range(start, end))
    return "\n".join(lines[index] for index in sorted(keep))


def require(log, items):
    missing = [item for item in items if item not in log]
    if missing:
        raise SystemExit("collector log missing: " + ", ".join(missing))


def chunks(text):
    return re.split(r"(?=Resource(?:Spans|Metrics|Log) #)", text)


def main():
    if len(sys.argv) != 3:
        raise SystemExit("usage: assert_signals.py success|failure '<json>' < log")
    mode = sys.argv[1]
    result = json.loads(sys.argv[2])
    log = sys.stdin.read()
    if mode == "success":
        if result.get("result") != "two-hop":
            raise SystemExit("hop response was not two-hop")
        require(
            log,
            [
                result["trace_id"],
                result["span_id"],
                result["child_span_id"],
                result["operation_id"],
                "synthetic.hop_a",
                "synthetic.hop_b",
            ],
        )
        if not re.search(rf"Parent ID\s+:\s+{re.escape(result['span_id'])}", log):
            raise SystemExit("hop-b span did not name the hop-a span as its parent")
        if "second_hop_missing" in log:
            raise SystemExit("success export already contained the failure signal")
        scanned = windows(log, [result["trace_id"], result["child_span_id"], result["operation_id"]], 50)
    elif mode == "failure":
        if result.get("failure") != "second_hop_missing":
            raise SystemExit("hop response was not the missing-hop failure")
        require(
            log,
            [
                result["trace_id"],
                result["span_id"],
                result["operation_id"],
                "second_hop_missing",
                "synthetic_second_hop_missing",
                "synthetic.hop_a",
                "Status code    : Error",
            ],
        )
        traced = "\n".join(part for part in chunks(log) if result["trace_id"] in part)
        if not traced:
            raise SystemExit("failure trace id was not inside a collector record")
        if "synthetic.hop_b" in traced:
            raise SystemExit("the missing-hop trace also named synthetic.hop_b")
        if result["operation_id"] not in traced:
            raise SystemExit("failure operation id was absent from the failure trace")
        metric = "\n".join(part for part in chunks(log) if "synthetic_second_hop_missing" in part)
        if "operation.id" in metric:
            raise SystemExit("the failure metric carried operation.id")
        scanned = traced + "\n" + metric
    else:
        raise SystemExit("mode must be success or failure")
    found = FORBIDDEN.search(scanned)
    if found:
        raise SystemExit(f"telemetry window contained forbidden text: {found.group(0)}")
    print(f"{mode} signal ok")


if __name__ == "__main__":
    main()
