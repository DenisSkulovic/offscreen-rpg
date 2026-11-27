#!/usr/bin/env python3
"""Offline developer-signal oracle and write-ahead metric timestamps."""

import json
import os
import stat
import time
from decimal import Decimal

PROOF_JOB = "offscreen/offscreen-developer-proof"
CONTEXT = "kind-offscreen-dev"
LOCK_NAME = "kind-offscreen-dev-observability-proof.lock"
WATERMARK_NAME = "kind-offscreen-dev-observability-proof-watermark.json"
MIN_MS = 1000
MAX_MS = 9223372036854
SCAN_WINDOWS = (
    (-9223372036854, -3000000000001),
    (-3000000000000, 2999999999999),
    (3000000000000, 9223372036854),
)
COMMON = {
    "job": PROOF_JOB,
    "deployment_environment_name": "development",
    "service_namespace": "offscreen",
    "service_name": "offscreen-developer-proof",
    "offscreen_candidate": "probe",
}
BUCKETS = (
    ("0.01", 0),
    ("0.1", 0),
    ("1", 1),
    ("10", 1),
    ("60", 1),
    ("+Inf", 1),
)


class ProbeError(Exception):
    def __init__(self, reason):
        super().__init__(reason)
        self.reason = reason


def canonical_watermark(last_ms):
    if type(last_ms) is not int or isinstance(last_ms, bool):
        raise ProbeError("watermark-type")
    if last_ms < MIN_MS or last_ms > MAX_MS:
        raise ProbeError("watermark-range")
    body = (
        '{"schema":1,"context":"kind-offscreen-dev","lastAllocatedMs":%d}\n'
        % last_ms
    )
    if len(body.encode("ascii")) > 512:
        raise ProbeError("watermark-size")
    return body


def expected_series():
    rows = []
    base = dict(COMMON)
    rows.append({**base, "__name__": "offscreen_agent_runs_total", "value": "17"})
    rows.append({**base, "__name__": "offscreen_agent_active_ratio", "value": "3"})
    rows.append(
        {**base, "__name__": "offscreen_agent_duration_seconds_sum", "value": "0.2"}
    )
    rows.append(
        {**base, "__name__": "offscreen_agent_duration_seconds_count", "value": "1"}
    )
    for le, value in BUCKETS:
        rows.append(
            {
                **base,
                "__name__": "offscreen_agent_duration_seconds_bucket",
                "le": le,
                "value": str(value),
            }
        )
    return rows


def labelset_key(row):
    labels = {key: row[key] for key in row if key != "value"}
    return tuple(sorted(labels.items()))


def assess_fresh_metrics(samples, timestamp_ms):
    """samples: list of {labels, timestamp_ms, value}. Old-only is not fresh."""
    expected = expected_series()
    expected_keys = {labelset_key(row) for row in expected}
    if len(expected_keys) != 10:
        raise ProbeError("fixture-count")
    fresh = [
        sample
        for sample in samples
        if sample.get("timestamp_ms") == timestamp_ms
        and sample.get("labels", {}).get("__name__") != "target_info"
    ]
    if not fresh:
        return {"ok": False, "reason": "old-only"}
    seen = {}
    for sample in fresh:
        labels = dict(sample.get("labels") or {})
        if labels.get("job") != PROOF_JOB:
            return {"ok": False, "reason": "wrong-job"}
        if "run" in labels or any(key.startswith("offscreen_run") for key in labels):
            return {"ok": False, "reason": "per-run-label"}
        key = tuple(sorted(labels.items()))
        if key in seen:
            return {"ok": False, "reason": "duplicate-series"}
        seen[key] = sample.get("value")
    if set(seen) != expected_keys:
        return {"ok": False, "reason": "unexpected-series"}
    for row in expected:
        key = labelset_key(row)
        if str(seen[key]) != row["value"]:
            return {"ok": False, "reason": "wrong-value"}
    return {"ok": True, "reason": None, "series": 10}


def _stat_match(fd, path):
    file_stat = os.fstat(fd)
    path_stat = os.lstat(path)
    if stat.S_ISLNK(path_stat.st_mode):
        raise ProbeError("symlink")
    if file_stat.st_dev != path_stat.st_dev or file_stat.st_ino != path_stat.st_ino:
        raise ProbeError("wrong-fd")
    if path_stat.st_nlink != 1:
        raise ProbeError("hardlink")
    if path_stat.st_uid != os.getuid():
        raise ProbeError("wrong-owner")
    if stat.S_IMODE(path_stat.st_mode) != 0o600:
        raise ProbeError("wrong-mode")
    return file_stat


def read_watermark(state_dir):
    path = os.path.join(state_dir, WATERMARK_NAME)
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    except FileNotFoundError:
        return None
    try:
        info = _stat_match(fd, path)
        if not stat.S_ISREG(info.st_mode):
            raise ProbeError("watermark-type")
        raw = os.read(fd, 513)
    finally:
        os.close(fd)
    if len(raw) > 512:
        raise ProbeError("watermark-size")
    text = raw.decode("ascii")
    parsed = json.loads(text)
    canonical = canonical_watermark(parsed["lastAllocatedMs"])
    if text != canonical or parsed.get("context") != CONTEXT or parsed.get("schema") != 1:
        raise ProbeError("watermark-bytes")
    return {"bytes": text, "inode": info.st_ino, "last": parsed["lastAllocatedMs"]}


def commit_watermark(state_dir, last_ms, previous):
    current = read_watermark(state_dir)
    if previous is None:
        if current is not None:
            raise ProbeError("watermark-changed")
    elif current is None or current["bytes"] != previous["bytes"] or current["inode"] != previous["inode"]:
        raise ProbeError("watermark-changed")
    body = canonical_watermark(last_ms)
    tmp = os.path.join(state_dir, ".watermark-%d.tmp" % os.getpid())
    fd = os.open(tmp, os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW | os.O_WRONLY, 0o600)
    try:
        os.write(fd, body.encode("ascii"))
        os.fsync(fd)
    except OSError as error:
        os.close(fd)
        os.unlink(tmp)
        raise ProbeError("watermark-write") from error
    os.close(fd)
    os.replace(tmp, os.path.join(state_dir, WATERMARK_NAME))
    directory = os.open(state_dir, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(directory)
    finally:
        os.close(directory)
    written = read_watermark(state_dir)
    if written is None or written["last"] != last_ms:
        raise ProbeError("watermark-readback")
    return written


def verify_lock(state_dir, lock_fd):
    path = os.path.join(state_dir, LOCK_NAME)
    info = os.fstat(lock_fd)
    path_stat = os.lstat(path)
    if not stat.S_ISREG(path_stat.st_mode) or stat.S_ISLNK(path_stat.st_mode):
        raise ProbeError("wrong-fd")
    if info.st_dev != path_stat.st_dev or info.st_ino != path_stat.st_ino:
        raise ProbeError("wrong-fd")
    if path_stat.st_nlink != 1 or stat.S_IMODE(path_stat.st_mode) != 0o600:
        raise ProbeError("wrong-fd")
    directory = os.lstat(state_dir)
    if not stat.S_ISDIR(directory.st_mode) or stat.S_IMODE(directory.st_mode) != 0o700:
        raise ProbeError("wrong-dir")
    if directory.st_uid != os.getuid():
        raise ProbeError("wrong-dir")


def max_application_timestamp(samples):
    values = []
    for sample in samples:
        labels = sample.get("labels") or {}
        if labels.get("__name__") == "target_info":
            continue
        stamp = sample.get("timestamp_ms")
        if type(stamp) is not int:
            raise ProbeError("timestamp-type")
        values.append(stamp)
    return max(values) if values else None


def scan_domain(transport):
    collected = []
    for start, end in SCAN_WINDOWS:
        payload = transport.query(start, end)
        if payload.get("status") != "success" or payload.get("warnings") or payload.get("infos"):
            raise ProbeError("scan-rejected")
        collected.extend(payload.get("samples") or [])
    return max_application_timestamp(collected), len(SCAN_WINDOWS)


def allocate_metrics(state_dir, lock_fd, transport, clock, sleep=time.sleep):
    verify_lock(state_dir, lock_fd)
    watermark = read_watermark(state_dir)
    scan_max, scans = scan_domain(transport)
    allocated = []
    posts = []
    for _ in range(7):
        verify_lock(state_dir, lock_fd)
        before = read_watermark(state_dir)
        if watermark is None:
            if before is not None:
                raise ProbeError("watermark-changed")
        elif before is None or before["bytes"] != watermark["bytes"]:
            raise ProbeError("watermark-changed")
        now = clock()
        floor = scan_max if scan_max is not None else MIN_MS - 1
        if watermark is not None:
            floor = max(floor, watermark["last"])
        if now <= floor:
            if watermark is not None and now == watermark["last"] and (scan_max is None or now > scan_max):
                sleep(0.001)
                now = clock()
            else:
                raise ProbeError("clock-rollback")
        if now <= floor or now > MAX_MS:
            raise ProbeError("clock-rollback")
        try:
            watermark = commit_watermark(state_dir, now, watermark)
        except ProbeError:
            raise
        try:
            result = transport.post_metric(now)
        except ProbeError:
            raise
        posts.append(result)
        if result.get("known") is False:
            raise ProbeError("unknown-post")
        allocated.append(now)
    return {"ok": True, "scans": scans, "allocated": allocated, "posts": len(posts)}
