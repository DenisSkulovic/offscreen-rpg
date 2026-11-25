"""Bounded sanitized incident export for workstation observability (INF47 T02)."""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import shutil
import subprocess
import sys
import uuid
from pathlib import Path
from typing import Any, Mapping, Optional, Sequence

from processes import FORBIDDEN_PERSISTENCE_KEYS, assert_safe_record_fields
from records import SCHEMA_VERSION
from report import (
    REPORT_OUTPUT_SCHEMA_VERSION,
    QueryWindow,
    ReportError,
    build_storage_status,
    companion_service_state,
    list_owned_segments,
    load_records_in_window,
    parse_observed_at,
    resolve_query_window,
    resolve_state_root,
)
from storage import OWNED_PREFIXES, RETENTION_LIMITS, SegmentIdentity

EXPORT_MANIFEST_SCHEMA_VERSION = 1
MAX_EXPORT_BYTES = 100 * 1024 * 1024
PRIVATE_DIR_MODE = 0o700
PRIVATE_FILE_MODE = 0o600

_KNOWN_SOURCES = frozenset(
    {
        "collector.heartbeat",
        "collector.host",
        "collector.process",
        "collector.runtime",
        "collector.runtime.docker",
        "runtime.kube.summary",
        "runtime.kube.pods",
        "runtime.kube.events",
        "runtime.cgroup",
        "process-pss-top",
        "operation-event.mjs",
        "health.collector",
    }
)

_RAW_ATOP_MARKERS = ("atop.raw", "atop_raw", "raw-atop")
_KUBECONFIG_OBJECT_KEYS = frozenset({"clusters", "users", "contexts", "current-context"})

_SECRET_PATTERN = re.compile(
    r"(?:password|passwd|secret|token|api[_-]?key|bearer|authorization|credential|"
    r"private[_-]?key|BEGIN\s+(?:RSA|OPENSSH)\s+PRIVATE)",
    re.IGNORECASE,
)

_ARGV_ENV_MARKERS = re.compile(r"(?:^|[\s/])(?:argv|environ|environment|cmdline)(?:=|:|\[)", re.IGNORECASE)


class ExportError(ValueError):
    """Invalid export path, bounds, or unsafe payload."""


def find_repo_root(start: Path) -> Optional[Path]:
    """Locate repo root; linked worktrees use a `.git` file, not only a directory."""
    resolved = start.resolve()
    for candidate in (resolved, *resolved.parents):
        git_entry = candidate / ".git"
        if git_entry.is_dir() or git_entry.is_file():
            return candidate
    return None


def _path_has_symlink_component(path: Path) -> bool:
    current = path
    parts: list[Path] = []
    while True:
        parts.append(current)
        if current == current.parent:
            break
        current = current.parent
    for part in reversed(parts):
        if part.is_symlink():
            return True
    return False


def path_is_gitignored(repo_root: Path, target: Path) -> bool:
    try:
        relative = target.resolve().relative_to(repo_root.resolve())
    except ValueError:
        return False
    result = subprocess.run(
        ["git", "-C", str(repo_root), "check-ignore", "-q", "--", str(relative)],
        capture_output=True,
        check=False,
    )
    return result.returncode == 0


def validate_export_output_dir(out: Path, *, repo_root: Optional[Path]) -> Path:
    if not out.is_absolute():
        raise ExportError("export output directory must be an absolute path")
    if out.exists():
        raise ExportError("export output path must not exist")
    if out.name in {"", ".", ".."}:
        raise ExportError("invalid export directory name")
    parent = out.parent
    if not parent.exists() or not parent.is_dir():
        raise ExportError("export output parent directory must exist")
    if _path_has_symlink_component(out) or _path_has_symlink_component(parent):
        raise ExportError("refusing export path with symlink component")
    resolved = out.resolve()
    parent_resolved = parent.resolve()
    try:
        resolved.relative_to(parent_resolved)
    except ValueError as exc:
        raise ExportError("path escape refused") from exc
    if repo_root is not None:
        try:
            resolved.relative_to(repo_root.resolve())
        except ValueError:
            # Outside the repository tree — allowed.
            pass
        else:
            if not path_is_gitignored(repo_root, resolved):
                raise ExportError("export path must be outside the tracked tree or git-ignored")
    return resolved


def looks_like_secret(value: str) -> bool:
    text = value.strip()
    if not text:
        return False
    if len(text) > 256:
        return True
    if _SECRET_PATTERN.search(text):
        return True
    if re.match(r"^Bearer\s+", text, re.IGNORECASE):
        return True
    if "=" in text and len(text) > 48 and re.fullmatch(r"[A-Za-z0-9+/=_-]+", text):
        return True
    return False


def _refuse_kubeconfig_blob(value: Any) -> None:
    if not isinstance(value, Mapping):
        return
    keys = set(value.keys())
    if len(_KUBECONFIG_OBJECT_KEYS & keys) >= 2:
        raise ExportError("refusing kubeconfig content in export payload")
    for child in value.values():
        if isinstance(child, Mapping):
            _refuse_kubeconfig_blob(child)
        elif isinstance(child, list):
            for item in child:
                if isinstance(item, Mapping):
                    _refuse_kubeconfig_blob(item)


def _refuse_raw_atop(record: Mapping[str, Any]) -> None:
    source = str(record.get("source", "")).lower()
    for marker in _RAW_ATOP_MARKERS:
        if marker in source:
            raise ExportError("refusing raw atop content")
    if record.get("atopRaw") or record.get("atopRawHistory") == "enabled":
        payload = record.get("atop") or record.get("rawAtop")
        if payload:
            raise ExportError("refusing raw atop content")


def _redact_string(value: str) -> str:
    if looks_like_secret(value):
        return "[redacted]"
    if _ARGV_ENV_MARKERS.search(value):
        raise ExportError("refusing argv/env/cmdline text in export")
    if "KUBECONFIG" in value and len(value) > 80:
        raise ExportError("refusing kubeconfig material in export")
    return value


def sanitize_record_for_export(record: Mapping[str, Any]) -> dict[str, Any]:
    _refuse_raw_atop(record)
    _refuse_kubeconfig_blob(record)
    try:
        assert_safe_record_fields(record)
    except ValueError as exc:
        raise ExportError(str(exc)) from exc

    def _walk(value: Any) -> Any:
        if isinstance(value, Mapping):
            cleaned: dict[str, Any] = {}
            for key, item in value.items():
                if key in FORBIDDEN_PERSISTENCE_KEYS:
                    continue
                if key in ("kubeconfig", "kubeconfigBody", "rawLog", "sourceLog"):
                    raise ExportError(f"refusing forbidden export field {key}")
                cleaned[key] = _walk(item)
            return cleaned
        if isinstance(value, list):
            return [_walk(item) for item in value]
        if isinstance(value, str):
            return _redact_string(value)
        return value

    return _walk(dict(record))  # type: ignore[arg-type]


def _record_sort_key(record: Mapping[str, Any]) -> tuple[float, str, int, str]:
    observed = parse_observed_at(str(record.get("observedAt", ""))) or 0.0
    kind = str(record.get("kind", ""))
    sequence = int(record.get("sequence", 0))
    scope = str(record.get("scopeId", ""))
    return (observed, kind, sequence, scope)


def collect_scope_ids(records: Sequence[Mapping[str, Any]]) -> list[str]:
    ids = sorted({str(record.get("scopeId", "")) for record in records if record.get("scopeId")})
    return ids


def collect_unknown_sources(records: Sequence[Mapping[str, Any]]) -> list[str]:
    unknown = sorted(
        {
            str(record.get("source", ""))
            for record in records
            if record.get("source") and str(record.get("source")) not in _KNOWN_SOURCES
        }
    )
    return unknown


def stream_coverage_in_window(root: Path, window: QueryWindow) -> dict[str, Any]:
    segments = list_owned_segments(root, window)
    by_prefix: dict[str, int] = {prefix: 0 for prefix in OWNED_PREFIXES}
    for path in segments:
        identity = SegmentIdentity.parse(path.name)
        if identity is not None:
            by_prefix[identity.prefix] = by_prefix.get(identity.prefix, 0) + 1
    partial = [prefix for prefix, count in sorted(by_prefix.items()) if count == 0]
    present = [prefix for prefix, count in sorted(by_prefix.items()) if count > 0]
    return {
        "segmentsByPrefix": by_prefix,
        "presentPrefixes": present,
        "absentPrefixes": partial,
    }


def build_retention_summary(storage: Mapping[str, Any]) -> dict[str, Any]:
    streams = storage.get("streams")
    if not isinstance(streams, Mapping):
        return {"targets": RETENTION_LIMITS, "actual": {}}
    actual: dict[str, Any] = {}
    for prefix, block in streams.items():
        if isinstance(block, Mapping):
            actual[prefix] = {
                "oldest": block.get("oldest"),
                "newest": block.get("newest"),
                "segmentCount": block.get("segmentCount"),
                "byteTotal": block.get("byteTotal"),
                "retentionBytes": block.get("retentionBytes"),
                "retentionAgeSeconds": block.get("retentionAgeSeconds"),
            }
    return {"targets": RETENTION_LIMITS, "actual": actual}


def write_jsonl(path: Path, records: Sequence[Mapping[str, Any]]) -> int:
    total = 0
    ordered = sorted(records, key=_record_sort_key)
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        for record in ordered:
            line = json.dumps(record, sort_keys=True, separators=(",", ":")) + "\n"
            encoded = line.encode("utf-8")
            total += len(encoded)
            handle.write(line)
    path.chmod(PRIVATE_FILE_MODE)
    return total


def write_metrics_csv(path: Path, records: Sequence[Mapping[str, Any]]) -> int:
    rows: list[dict[str, Any]] = []
    for record in records:
        if record.get("kind") not in ("host_window", "host_rollup"):
            continue
        metrics = record.get("metrics")
        if not isinstance(metrics, Mapping):
            continue
        mem = metrics.get("MemAvailable")
        if not isinstance(mem, Mapping):
            continue
        rows.append(
            {
                "observedAt": record.get("observedAt"),
                "kind": record.get("kind"),
                "scopeId": record.get("scopeId"),
                "MemAvailable_min": mem.get("min"),
                "MemAvailable_max": mem.get("max"),
                "MemAvailable_mean": mem.get("mean"),
                "MemAvailable_count": mem.get("count"),
            }
        )
    rows.sort(key=lambda item: (str(item.get("observedAt")), str(item.get("scopeId"))))
    fieldnames = [
        "observedAt",
        "kind",
        "scopeId",
        "MemAvailable_min",
        "MemAvailable_max",
        "MemAvailable_mean",
        "MemAvailable_count",
    ]
    with open(path, "w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
    path.chmod(PRIVATE_FILE_MODE)
    return path.stat().st_size


def directory_byte_total(directory: Path) -> int:
    total = 0
    for entry in directory.iterdir():
        if entry.is_file():
            total += entry.stat().st_size
    return total


def _scan_json_values(value: Any) -> None:
    if isinstance(value, Mapping):
        for item in value.values():
            _scan_json_values(item)
        return
    if isinstance(value, list):
        for item in value:
            _scan_json_values(item)
        return
    if isinstance(value, str):
        if value == "[redacted]":
            return
        if looks_like_secret(value):
            raise ExportError("refusing secret-like content in export output")


def scan_export_tree(directory: Path) -> None:
    for entry in directory.rglob("*"):
        if not entry.is_file():
            continue
        if entry.suffix == ".atop" or ".atop." in entry.name:
            raise ExportError("refusing raw atop files in export tree")
        data = entry.read_bytes()
        if b"\x00" in data and entry.suffix == ".jsonl":
            raise ExportError("refusing binary argv-like content in export")
        if entry.suffix in {".json", ".jsonl"}:
            text = data.decode("utf-8", errors="replace")
            if entry.suffix == ".jsonl":
                for line in text.splitlines():
                    if not line.strip():
                        continue
                    _scan_json_values(json.loads(line))
            else:
                _scan_json_values(json.loads(text))
        elif entry.suffix == ".csv":
            text = data.decode("utf-8", errors="replace")
            for line in text.splitlines()[1:]:
                for cell in line.split(","):
                    if cell and looks_like_secret(cell):
                        raise ExportError("refusing secret-like content in export output")


def build_manifest(
    *,
    window: QueryWindow,
    state_root: Path,
    records: Sequence[Mapping[str, Any]],
    gaps: Sequence[Mapping[str, Any]],
    storage: Mapping[str, Any],
    companion: Mapping[str, Any],
    stream_coverage: Mapping[str, Any],
    unknown_sources: Sequence[str],
    generated_at: str,
) -> dict[str, Any]:
    manifest: dict[str, Any] = {
        "exportSchemaVersion": EXPORT_MANIFEST_SCHEMA_VERSION,
        "supplementalSchemaVersion": SCHEMA_VERSION,
        "reportSchemaVersion": REPORT_OUTPUT_SCHEMA_VERSION,
        "command": "export",
        "generatedAt": generated_at,
        "window": {
            "from": window.start_iso,
            "to": window.end_iso,
            "spanSeconds": window.span_s,
            "requestedEqualsActual": True,
        },
        "stateRoot": str(state_root),
        "coverage": {
            "recordCount": len(records),
            "segmentGaps": list(gaps),
            "streams": stream_coverage,
        },
        "retention": build_retention_summary(storage),
        "resolutionNote": "export uses stored supplemental cadence; no live Netdata series",
        "netdataDashboard": {
            "url": "http://127.0.0.1:19999",
            "loopbackOnly": True,
            "includedInExport": False,
        },
        "companion": dict(companion),
        "scopeIds": collect_scope_ids(records),
        "partialSources": {
            "absentPrefixes": stream_coverage.get("absentPrefixes", []),
            "unknownSources": list(unknown_sources),
        },
        "correlationNote": "temporal evidence only; no automatic causality",
        "files": [
            "manifest.json",
            "events.jsonl",
            "supplemental.jsonl",
            "metrics_summary.csv",
        ],
    }
    if storage.get("disabledStreams"):
        manifest["disabledStreams"] = list(storage["disabledStreams"])
    return manifest


def populate_export_tree(
    temp_dir: Path,
    *,
    window: QueryWindow,
    state_root: Path,
    records: list[dict[str, Any]],
    gaps: list[dict[str, Any]],
    storage: dict[str, Any],
    companion: dict[str, Any],
    generated_at: str,
) -> int:
    temp_dir.mkdir(mode=PRIVATE_DIR_MODE, exist_ok=True)
    sanitized: list[dict[str, Any]] = []
    for record in records:
        sanitized.append(sanitize_record_for_export(record))

    event_kinds = {"operation", "health", "coverage"}
    events = [item for item in sanitized if item.get("kind") in event_kinds]

    stream_coverage = stream_coverage_in_window(state_root, window)
    unknown_sources = collect_unknown_sources(sanitized)

    manifest = build_manifest(
        window=window,
        state_root=state_root,
        records=sanitized,
        gaps=gaps,
        storage=storage,
        companion=companion,
        stream_coverage=stream_coverage,
        unknown_sources=unknown_sources,
        generated_at=generated_at,
    )

    manifest_path = temp_dir / "manifest.json"
    manifest_bytes = json.dumps(manifest, indent=2, sort_keys=True).encode("utf-8")
    manifest_path.write_bytes(manifest_bytes)
    manifest_path.chmod(PRIVATE_FILE_MODE)

    total = len(manifest_bytes)
    total += write_jsonl(temp_dir / "events.jsonl", events)
    total += write_jsonl(temp_dir / "supplemental.jsonl", sanitized)
    total += write_metrics_csv(temp_dir / "metrics_summary.csv", sanitized)

    scan_export_tree(temp_dir)
    on_disk = directory_byte_total(temp_dir)
    if on_disk > MAX_EXPORT_BYTES:
        raise ExportError("export exceeds 100MiB cap")
    return on_disk


def run_export(
    *,
    window: QueryWindow,
    state_root: Path,
    out_dir: Path,
    clock,
    repo_root: Optional[Path],
) -> Path:
    validate_export_output_dir(out_dir, repo_root=repo_root)
    if not state_root.exists():
        raise ExportError("required supplemental state source is absent")
    records, gaps = load_records_in_window(state_root, window, clock=clock)
    storage = build_storage_status(state_root, clock)
    companion = companion_service_state(state_root, clock=clock, records=records)

    parent = out_dir.parent
    temp_name = f".{out_dir.name}.export-{os.getpid()}-{uuid.uuid4().hex[:8]}"
    temp_dir = parent / temp_name
    if temp_dir.exists():
        raise ExportError("temporary export directory already exists")
    try:
        populate_export_tree(
            temp_dir,
            window=window,
            state_root=state_root,
            records=records,
            gaps=gaps,
            storage=storage,
            companion=companion,
            generated_at=clock.observed_at_utc(),
        )
        os.rename(temp_dir, out_dir)
        out_dir.chmod(PRIVATE_DIR_MODE)
    except Exception:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise
    return out_dir


def _build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Bounded sanitized incident export (no network)")
    parser.add_argument("--state-root", help="Override supplemental state root")
    parser.add_argument("--from", dest="from_iso", required=True, help="UTC ISO export start")
    parser.add_argument("--to", dest="to_iso", required=True, help="UTC ISO export end")
    parser.add_argument(
        "--out",
        required=True,
        help="Absolute path to a new directory outside the tracked tree (or git-ignored)",
    )
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = _build_arg_parser()
    args = parser.parse_args(argv)
    from records import InjectableClock

    clock = InjectableClock()
    state_root = resolve_state_root(args.state_root)
    repo_root = find_repo_root(Path(__file__).resolve())
    try:
        window = resolve_query_window(
            last=None,
            from_iso=args.from_iso,
            to_iso=args.to_iso,
            clock=clock,
        )
        out_dir = Path(args.out).expanduser()
        written = run_export(
            window=window,
            state_root=state_root,
            out_dir=out_dir,
            clock=clock,
            repo_root=repo_root,
        )
    except ReportError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    except ExportError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    except OSError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    print(str(written.resolve()))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())