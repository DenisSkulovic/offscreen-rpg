#!/usr/bin/env python3
"""Unit tests for INF47 bounded sanitized incident export."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

MONITORING_ROOT = Path(__file__).resolve().parents[1]
if str(MONITORING_ROOT) not in sys.path:
    sys.path.insert(0, str(MONITORING_ROOT))

from export import (  # noqa: E402
    EXPORT_MANIFEST_SCHEMA_VERSION,
    ExportError,
    find_repo_root,
    run_export,
    sanitize_record_for_export,
    validate_export_output_dir,
)
from host import FAST_TICK_NS, build_meminfo_text, observe_fast_window  # noqa: E402
from records import (  # noqa: E402
    InjectableClock,
    SCHEMA_VERSION,
    build_scope_id,
    encode_record,
    new_collector_session,
)
from report import QueryWindow, ReportError, resolve_query_window  # noqa: E402
from storage import PRIVATE_DIR_MODE, PRIVATE_FILE_MODE, RecordStore, hour_utc_from_wall  # noqa: E402

INSTALLATION_ID = "install-offscreen-export"
SECRET_TOKEN = "super-secret-token-xyz"


def _private_dir() -> Path:
    path = Path(tempfile.mkdtemp(prefix="offscreen-monitor-export-"))
    path.chmod(PRIVATE_DIR_MODE)
    return path


def _clock_at(wall_s: float) -> InjectableClock:
    return InjectableClock(
        boot_id="boot-export",
        wall_seconds=lambda: wall_s,
        monotonic_ns=lambda: int(wall_s * 1_000_000_000),
    )


def _host_window(wall_s: float, mem_kib: int, *, sequence: int = 1) -> dict:
    clock = _clock_at(wall_s)
    scope = build_scope_id(INSTALLATION_ID, clock.boot_id, "host")
    start = int(wall_s) * 1_000_000_000
    return observe_fast_window(
        window_start_mono_ns=start,
        clock=clock,
        scope_id=scope,
        collector_session=new_collector_session(),
        sequence=sequence,
        read_meminfo=lambda: build_meminfo_text({"MemAvailable": mem_kib}),
        tick_times_ns=[start + index * FAST_TICK_NS for index in range(5)],
    )


def _append_record(store: RecordStore, prefix: str, record: dict) -> None:
    writer = store.open_stream(prefix)
    try:
        writer.append(record)
    finally:
        writer.flush_and_close()


def _write_host_segment(root: Path, wall: float, mem_kib: int) -> None:
    window = _host_window(wall, mem_kib)
    encode_record(window)
    hour = hour_utc_from_wall(wall)
    segment = root / f"fast-raw-{hour}.jsonl"
    payload = encode_record(window)
    if segment.exists():
        with open(segment, "ab") as handle:
            handle.write(payload)
    else:
        segment.write_bytes(payload)
        segment.chmod(PRIVATE_FILE_MODE)


class ExportPathValidationTest(unittest.TestCase):
    def test_refuse_existing_output(self) -> None:
        base = _private_dir()
        out = base / "incident"
        out.mkdir()
        with self.assertRaises(ExportError):
            validate_export_output_dir(out, repo_root=None)

    def test_refuse_tracked_tree_without_ignore(self) -> None:
        repo_root = find_repo_root(MONITORING_ROOT)
        if repo_root is None:
            self.skipTest("git root not found")
        blocked = repo_root / "export-blocked-by-policy"
        with self.assertRaises(ExportError):
            validate_export_output_dir(blocked, repo_root=repo_root)

    def test_allow_absolute_outside_repo(self) -> None:
        parent = Path(tempfile.mkdtemp(prefix="offscreen-export-parent-"))
        out = parent / "incident-ok"
        validated = validate_export_output_dir(out, repo_root=MONITORING_ROOT)
        self.assertEqual(validated, out.resolve())


class ExportSanitizationTest(unittest.TestCase):
    def test_secret_redacted_not_raw(self) -> None:
        record = {
            "schemaVersion": SCHEMA_VERSION,
            "kind": "health",
            "collectorSession": new_collector_session(),
            "source": "health.collector",
            "scopeId": "install:boot:host",
            "observedAt": "2026-11-24T20:00:00.000Z",
            "monotonicNs": "1",
            "sequence": 1,
            "note": SECRET_TOKEN,
        }
        cleaned = sanitize_record_for_export(record)
        self.assertNotIn(SECRET_TOKEN, json.dumps(cleaned))
        self.assertEqual(cleaned["note"], "[redacted]")

    def test_refuse_kubeconfig_blob(self) -> None:
        with self.assertRaises(ExportError):
            sanitize_record_for_export(
                {
                    "kind": "coverage",
                    "clusters": [{"name": "kind"}],
                    "users": [{"name": "u"}],
                    "source": "health.collector",
                }
            )

    def test_refuse_raw_atop_source(self) -> None:
        with self.assertRaises(ExportError):
            sanitize_record_for_export({"kind": "coverage", "source": "atop.raw", "payload": "x"})


class ExportIntegrationTest(unittest.TestCase):
    def setUp(self) -> None:
        self.root = _private_dir()
        self.wall = 1_764_000_000.0
        self.clock = _clock_at(self.wall)
        self.scope = build_scope_id(INSTALLATION_ID, self.clock.boot_id, "host")
        self.store = RecordStore(self.root, self.scope, self.clock, create_root=True)
        _write_host_segment(self.root, self.wall, 2_000_000)
        self.window = QueryWindow(self.wall - 10, self.wall + 10)
        self.out_parent = Path(tempfile.mkdtemp(prefix="offscreen-export-out-"))
        repo_root = find_repo_root(MONITORING_ROOT)

    def tearDown(self) -> None:
        self.store.shutdown()

    def _out_dir(self, name: str) -> Path:
        return (self.out_parent / name).resolve()

    def test_successful_export_manifest(self) -> None:
        out = self._out_dir("incident-a")
        run_export(
            window=self.window,
            state_root=self.root,
            out_dir=out,
            clock=self.clock,
            repo_root=find_repo_root(MONITORING_ROOT),
        )
        manifest = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["exportSchemaVersion"], EXPORT_MANIFEST_SCHEMA_VERSION)
        self.assertEqual(manifest["netdataDashboard"]["loopbackOnly"], True)
        self.assertFalse(manifest["netdataDashboard"]["includedInExport"])
        supplemental = (out / "supplemental.jsonl").read_text(encoding="utf-8")
        self.assertNotIn(SECRET_TOKEN, supplemental)

    def test_unknown_source_reported_partial(self) -> None:
        unknown = {
            "schemaVersion": SCHEMA_VERSION,
            "kind": "coverage",
            "collectorSession": new_collector_session(),
            "source": "vendor.unlisted.probe",
            "scopeId": self.scope,
            "observedAt": self.clock.observed_at_utc(),
            "monotonicNs": str(self.clock.mono_ns()),
            "sequence": 2,
            "units": {},
            "coverage": {"probe": True},
        }
        _append_record(self.store, "events", unknown)
        out = self._out_dir("incident-unknown")
        run_export(
            window=self.window,
            state_root=self.root,
            out_dir=out,
            clock=self.clock,
            repo_root=find_repo_root(MONITORING_ROOT),
        )
        manifest = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
        self.assertIn("vendor.unlisted.probe", manifest["partialSources"]["unknownSources"])

    def test_deterministic_ordering(self) -> None:
        out_a = self._out_dir("incident-order-a")
        out_b = self._out_dir("incident-order-b")
        for out in (out_a, out_b):
            run_export(
                window=self.window,
                state_root=self.root,
                out_dir=out,
                clock=self.clock,
                repo_root=find_repo_root(MONITORING_ROOT),
            )
        lines_a = (out_a / "supplemental.jsonl").read_bytes()
        lines_b = (out_b / "supplemental.jsonl").read_bytes()
        self.assertEqual(lines_a, lines_b)

    def test_secret_fixture_in_state_redacted(self) -> None:
        leaky = {
            "schemaVersion": SCHEMA_VERSION,
            "kind": "health",
            "collectorSession": new_collector_session(),
            "source": "health.collector",
            "scopeId": self.scope,
            "observedAt": self.clock.observed_at_utc(),
            "monotonicNs": str(self.clock.mono_ns()),
            "sequence": 3,
            "units": {},
            "health": {"tokenHint": SECRET_TOKEN},
        }
        _append_record(self.store, "health", leaky)
        out = self._out_dir("incident-secret")
        run_export(
            window=self.window,
            state_root=self.root,
            out_dir=out,
            clock=self.clock,
            repo_root=find_repo_root(MONITORING_ROOT),
        )
        bundle = out.read_bytes() if out.is_file() else b"".join(
            p.read_bytes() for p in out.rglob("*") if p.is_file()
        )
        self.assertNotIn(SECRET_TOKEN.encode(), bundle)

    def test_atomic_rollback_leaves_no_output(self) -> None:
        out = self._out_dir("incident-rollback")
        with mock.patch("export.os.rename", side_effect=OSError("simulated rename failure")):
            with self.assertRaises(OSError):
                run_export(
                    window=self.window,
                    state_root=self.root,
                    out_dir=out,
                    clock=self.clock,
                    repo_root=find_repo_root(MONITORING_ROOT),
                )
        self.assertFalse(out.exists())
        leftovers = list(self.out_parent.glob(f".{out.name}.export-*"))
        self.assertEqual(leftovers, [])

    def test_size_cap_refused(self) -> None:
        out = self._out_dir("incident-huge")
        with mock.patch("export.MAX_EXPORT_BYTES", 64):
            with self.assertRaises(ExportError):
                run_export(
                    window=self.window,
                    state_root=self.root,
                    out_dir=out,
                    clock=self.clock,
                    repo_root=find_repo_root(MONITORING_ROOT),
                )
        self.assertFalse(out.exists())

    def test_no_network_during_export(self) -> None:
        out = self._out_dir("incident-nonet")
        with mock.patch("urllib.request.urlopen", side_effect=AssertionError("network used")):
            run_export(
                window=self.window,
                state_root=self.root,
                out_dir=out,
                clock=self.clock,
                repo_root=find_repo_root(MONITORING_ROOT),
            )

    def test_query_range_negative(self) -> None:
        with self.assertRaises(ReportError):
            resolve_query_window(
                last=None,
                from_iso="2020-01-01T00:00:00.000Z",
                to_iso="2021-06-01T00:00:00.000Z",
                clock=self.clock,
            )


class ExportMainTest(unittest.TestCase):
    def test_cli_refuses_missing_state_root(self) -> None:
        from export import main

        missing = _private_dir() / "no-state-here"
        out_parent = Path(tempfile.mkdtemp(prefix="offscreen-export-cli-"))
        out = out_parent / "cli-out"
        code = main(
            [
                "--state-root",
                str(missing),
                "--from",
                "2026-11-24T18:00:00.000Z",
                "--to",
                "2026-11-24T19:00:00.000Z",
                "--out",
                str(out),
            ]
        )
        self.assertEqual(code, 2)
        self.assertFalse(out.exists())


if __name__ == "__main__":
    unittest.main()