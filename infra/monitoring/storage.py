"""Bounded JSONL segment storage, retention, and writer lifecycle."""

from __future__ import annotations

import errno
import json
import os
import re
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Iterator, Optional

from records import (
    InjectableClock,
    RecordLine,
    RecordLineState,
    RecordValidationError,
    SEGMENT_NAME_RE,
    coverage_partial_line,
    encode_record,
    iter_jsonl_lines,
    new_collector_session,
    parse_record_line,
)

SEGMENT_MAX_BYTES = 16 * 1024 * 1024
FSYNC_INTERVAL_S = 5.0
RETENTION_TICK_S = 60.0
PRIVATE_DIR_MODE = 0o700
PRIVATE_FILE_MODE = 0o600

OWNED_PREFIXES = (
    "fast-raw",
    "fast-minute",
    "fast-hour",
    "process",
    "runtime",
    "events",
    "health",
)

EVENTS_BUDGET_PREFIXES = frozenset({"events", "health"})

RETENTION_LIMITS: dict[str, tuple[int, int]] = {
    "fast-raw": (384 * 1024 * 1024, 72 * 3600),
    "fast-minute": (96 * 1024 * 1024, 30 * 24 * 3600),
    "fast-hour": (32 * 1024 * 1024, 90 * 24 * 3600),
    "process": (1024 * 1024 * 1024, 7 * 24 * 3600),
    "runtime": (768 * 1024 * 1024, 72 * 3600),
    "events": (256 * 1024 * 1024, 30 * 24 * 3600),
}

# Health records count toward the events byte budget, not a separate cap.
HEALTH_RESERVED_BYTES = 32 * 1024 * 1024


class StorageError(RuntimeError):
    """Base class for storage failures."""


class StateRootError(StorageError):
    pass


class ConcurrentWriterError(StorageError):
    pass


class StorageLimitedError(StorageError):
    pass


@dataclass(frozen=True)
class SegmentIdentity:
    prefix: str
    hour_utc: str
    sequence: int

    @property
    def filename(self) -> str:
        if self.sequence == 0:
            return f"{self.prefix}-{self.hour_utc}.jsonl"
        return f"{self.prefix}-{self.hour_utc}-{self.sequence:03d}.jsonl"

    @classmethod
    def parse(cls, name: str) -> Optional["SegmentIdentity"]:
        match = SEGMENT_NAME_RE.match(name)
        if match is None:
            return None
        seq = int(match.group("seq")) if match.group("seq") else 0
        return cls(match.group("prefix"), match.group("hour"), seq)


def hour_utc_from_wall(wall_s: float) -> str:
    instant = datetime.fromtimestamp(wall_s, tz=timezone.utc)
    return instant.strftime("%Y%m%d%H")


def segment_sort_key(path: Path) -> tuple[str, str, int, str]:
    identity = SegmentIdentity.parse(path.name)
    if identity is None:
        return ("", "", 0, path.name)
    return (identity.prefix, identity.hour_utc, identity.sequence, path.name)


@dataclass
class StreamBounds:
    prefix: str
    max_bytes: int
    max_age_s: int


@dataclass
class StreamStats:
    prefix: str
    oldest: Optional[str] = None
    newest: Optional[str] = None
    segment_count: int = 0
    byte_total: int = 0
    dropped_segments: int = 0
    dropped_bytes: int = 0


@dataclass
class StorageReport:
    streams: dict[str, StreamStats] = field(default_factory=dict)
    events_budget_bytes: int = RETENTION_LIMITS["events"][0]
    events_used_bytes: int = 0
    health_reserved_bytes: int = HEALTH_RESERVED_BYTES
    health_used_bytes: int = 0
    storage_limited: bool = False
    last_error: str = ""


class StateRoot:
    def __init__(self, root: os.PathLike[str] | str) -> None:
        self._root = Path(root)

    @property
    def path(self) -> Path:
        return self._root

    def validate(self, *, create: bool = False) -> Path:
        if not self._root.is_absolute():
            raise StateRootError("state root must be absolute")
        resolved = self._root.resolve(strict=False)
        if resolved.is_symlink():
            raise StateRootError("state root must not be a symlink")
        if not resolved.exists():
            if not create:
                raise StateRootError("state root does not exist")
            resolved.mkdir(parents=True, mode=PRIVATE_DIR_MODE, exist_ok=True)
        if not resolved.is_dir():
            raise StateRootError("state root must be a directory")
        mode = resolved.stat().st_mode & 0o777
        if mode != PRIVATE_DIR_MODE:
            raise StateRootError(f"state root must be mode 0700, found {oct(mode)}")
        self._root = resolved
        return resolved

    def segment_path(self, identity: SegmentIdentity) -> Path:
        return self._root / identity.filename

    def writer_lock_path(self, prefix: str, process_start_key: Optional[str] = None) -> Path:
        if process_start_key:
            return self._root / f".writer-{prefix}-{process_start_key}.lock"
        return self._root / f".writer-{prefix}.lock"


class SegmentReader:
    """Read owned JSONL segments with partial-line coverage."""

    @staticmethod
    def read_segment(
        path: Path,
        *,
        scope_id: str,
        collector_session: str,
        clock: InjectableClock,
        sequence_start: int = 0,
    ) -> tuple[list[RecordLine], list[dict[str, Any]], int]:
        if not path.exists():
            return [], [], sequence_start
        data = path.read_bytes()
        raw_lines = data.splitlines(keepends=True)
        if not raw_lines and data:
            raw_lines = [data]
        lines = list(iter_jsonl_lines(raw_lines, tail_may_be_partial=True))
        coverage_records: list[dict[str, Any]] = []
        sequence = sequence_start
        for line in lines:
            if line.state == RecordLineState.PARTIAL:
                sequence += 1
                coverage_records.append(
                    coverage_partial_line(
                        scope_id=scope_id,
                        collector_session=collector_session,
                        source="storage.reader",
                        clock=clock,
                        sequence=sequence,
                        reason="truncated terminal line",
                    )
                )
        return lines, coverage_records, sequence


class RetentionManager:
    def __init__(
        self,
        root: StateRoot,
        clock: InjectableClock,
        *,
        active_paths: Callable[[], set[Path]],
        limits: Optional[dict[str, tuple[int, int]]] = None,
        tick_interval_s: float = RETENTION_TICK_S,
    ) -> None:
        self._root = root
        self._clock = clock
        self._active_paths = active_paths
        self._limits = limits or RETENTION_LIMITS
        self._tick_interval_s = tick_interval_s
        self._last_tick_s = 0.0
        self.report = StorageReport()

    def maybe_enforce(self, *, force: bool = False) -> StorageReport:
        now = self._clock.wall_time()
        if not force and now - self._last_tick_s < self._tick_interval_s:
            return self.report
        self._last_tick_s = now
        self._enforce_all(now)
        return self.report

    def _owned_segments(self) -> list[Path]:
        root = self._root.path
        if not root.exists():
            return []
        result: list[Path] = []
        for entry in root.iterdir():
            if entry.name.startswith("."):
                continue
            if entry.is_symlink():
                continue
            if not entry.is_file():
                continue
            if SegmentIdentity.parse(entry.name) is None:
                continue
            if (entry.stat().st_mode & 0o777) != PRIVATE_FILE_MODE:
                continue
            result.append(entry)
        return result

    def _enforce_all(self, now_s: float) -> None:
        active = self._active_paths()
        segments = self._owned_segments()
        by_prefix: dict[str, list[Path]] = {prefix: [] for prefix in OWNED_PREFIXES}
        for path in segments:
            identity = SegmentIdentity.parse(path.name)
            if identity is None:
                continue
            by_prefix.setdefault(identity.prefix, []).append(path)

        self.report = StorageReport()
        events_used = 0

        for prefix, paths in by_prefix.items():
            stats = StreamStats(prefix=prefix)
            closed = [path for path in paths if path not in active]
            ordered = sorted(closed, key=segment_sort_key)
            if ordered:
                stats.oldest = ordered[0].name
                stats.newest = ordered[-1].name
            stats.segment_count = len(paths)
            stats.byte_total = sum(path.stat().st_size for path in paths)
            if prefix in EVENTS_BUDGET_PREFIXES:
                events_used += stats.byte_total
            if prefix == "health":
                self.report.health_used_bytes = stats.byte_total
            self.report.streams[prefix] = stats

        self.report.events_used_bytes = events_used
        self._enforce_events_budget(active, by_prefix, now_s)
        for prefix, limits in self._limits.items():
            if prefix == "events":
                continue
            self._enforce_stream(prefix, limits, by_prefix.get(prefix, []), active, now_s)

    def _enforce_stream(
        self,
        prefix: str,
        limits: tuple[int, int],
        paths: list[Path],
        active: set[Path],
        now_s: float,
    ) -> None:
        max_bytes, max_age_s = limits
        closed = sorted(
            [path for path in paths if path not in active],
            key=segment_sort_key,
        )
        stats = self.report.streams.setdefault(prefix, StreamStats(prefix=prefix))

        def segment_age_s(path: Path) -> float:
            identity = SegmentIdentity.parse(path.name)
            if identity is None:
                return 0.0
            hour = datetime.strptime(identity.hour_utc, "%Y%m%d%H").replace(tzinfo=timezone.utc)
            return max(0.0, now_s - hour.timestamp())

        total_bytes = sum(path.stat().st_size for path in paths)

        while closed:
            path = closed[0]
            size = path.stat().st_size
            too_old = segment_age_s(path) > max_age_s
            over_quota = total_bytes > max_bytes
            if not too_old and not over_quota:
                break
            if path in active:
                break
            path.unlink(missing_ok=True)
            closed.pop(0)
            total_bytes -= size
            stats.dropped_segments += 1
            stats.dropped_bytes += size
            if closed:
                stats.oldest = closed[0].name
            stats.byte_total = total_bytes

    def _enforce_events_budget(
        self,
        active: set[Path],
        by_prefix: dict[str, list[Path]],
        now_s: float,
    ) -> None:
        max_bytes, max_age_s = RETENTION_LIMITS["events"]
        paths: list[Path] = []
        for prefix in sorted(EVENTS_BUDGET_PREFIXES):
            paths.extend(by_prefix.get(prefix, []))
        closed = sorted([path for path in paths if path not in active], key=segment_sort_key)
        total_bytes = sum(path.stat().st_size for path in paths)
        stats_events = self.report.streams.setdefault("events", StreamStats(prefix="events"))

        def segment_age_s(path: Path) -> float:
            identity = SegmentIdentity.parse(path.name)
            if identity is None:
                return 0.0
            hour = datetime.strptime(identity.hour_utc, "%Y%m%d%H").replace(tzinfo=timezone.utc)
            return max(0.0, now_s - hour.timestamp())

        while closed:
            path = closed[0]
            size = path.stat().st_size
            too_old = segment_age_s(path) > max_age_s
            over_quota = total_bytes > max_bytes
            if not too_old and not over_quota:
                break
            path.unlink(missing_ok=True)
            closed.pop(0)
            total_bytes -= size
            identity = SegmentIdentity.parse(path.name)
            if identity is not None:
                stream_stats = self.report.streams.setdefault(
                    identity.prefix, StreamStats(prefix=identity.prefix)
                )
                stream_stats.dropped_segments += 1
                stream_stats.dropped_bytes += size
            stats_events.dropped_segments += 1
            stats_events.dropped_bytes += size
        self.report.events_used_bytes = total_bytes


@dataclass
class ActiveSegment:
    identity: SegmentIdentity
    path: Path
    fd: int
    bytes_written: int = 0


class StreamWriter:
    """Single-writer JSONL append stream with hourly segments and rotation."""

    def __init__(
        self,
        root: StateRoot,
        stream_prefix: str,
        scope_id: str,
        clock: InjectableClock,
        *,
        collector_session: Optional[str] = None,
        process_start_key: Optional[str] = None,
        segment_max_bytes: int = SEGMENT_MAX_BYTES,
        fsync_interval_s: float = FSYNC_INTERVAL_S,
        retention: Optional[RetentionManager] = None,
    ) -> None:
        if stream_prefix not in OWNED_PREFIXES:
            raise StorageError(f"unsupported stream prefix {stream_prefix}")
        self._root = root
        self._prefix = stream_prefix
        self._scope_id = scope_id
        self._clock = clock
        self._segment_max = segment_max_bytes
        self._fsync_interval_s = fsync_interval_s
        self._collector_session = collector_session or new_collector_session()
        self._process_start_key = process_start_key
        self._sequence = 0
        self._last_fsync_s = 0.0
        self._active: Optional[ActiveSegment] = None
        self._storage_limited = False
        self._last_error = ""
        self._retention = retention
        self._lock_path = self._allocate_writer_lock()

    @property
    def collector_session(self) -> str:
        return self._collector_session

    @property
    def active_path(self) -> Optional[Path]:
        if self._active is None:
            return None
        return self._active.path

    def active_paths(self) -> set[Path]:
        if self._active is None:
            return set()
        return {self._active.path}

    def _allocate_writer_lock(self) -> Path:
        lock_path = self._root.writer_lock_path(self._prefix, self._process_start_key)
        flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
        try:
            fd = os.open(str(lock_path), flags, PRIVATE_FILE_MODE)
        except FileExistsError as exc:
            raise ConcurrentWriterError(
                f"writer already active for stream {self._prefix}"
            ) from exc
        payload = {
            "collectorSession": self._collector_session,
            "stream": self._prefix,
            "processStartKey": self._process_start_key,
            "writerSessionFile": f"{self._prefix}-{self._collector_session}.session",
            "createdAt": self._clock.observed_at_utc(),
        }
        os.write(fd, json.dumps(payload).encode("utf-8"))
        os.close(fd)
        return lock_path

    def _open_segment(self, hour: str, sequence: int) -> ActiveSegment:
        identity = SegmentIdentity(self._prefix, hour, sequence)
        path = self._root.segment_path(identity)
        fd = os.open(str(path), os.O_WRONLY | os.O_CREAT | os.O_APPEND, PRIVATE_FILE_MODE)
        size = path.stat().st_size if path.exists() else 0
        return ActiveSegment(identity, path, fd, size)

    def _ensure_active_segment(self) -> ActiveSegment:
        hour = hour_utc_from_wall(self._clock.wall_time())
        if self._active is None:
            self._active = self._open_segment(hour, 0)
            return self._active
        if self._active.identity.hour_utc != hour:
            os.close(self._active.fd)
            self._active = self._open_segment(hour, 0)
            return self._active
        if self._active.bytes_written >= self._segment_max:
            next_seq = self._active.identity.sequence + 1
            os.close(self._active.fd)
            self._active = self._open_segment(hour, next_seq)
            return self._active
        return self._active

    def append(self, record: dict[str, Any]) -> int:
        if self._storage_limited:
            raise StorageLimitedError(self._last_error or "storage limited")
        self._sequence += 1
        body = dict(record)
        body.setdefault("schemaVersion", 1)
        body.setdefault("collectorSession", self._collector_session)
        body.setdefault("scopeId", self._scope_id)
        body.setdefault("observedAt", self._clock.observed_at_utc())
        body.setdefault("monotonicNs", str(self._clock.mono_ns()))
        body["sequence"] = self._sequence
        payload = encode_record(body)
        active = self._ensure_active_segment()
        try:
            written = os.write(active.fd, payload)
        except OSError as exc:
            if exc.errno in (errno.ENOSPC, errno.EDQUOT):
                self._storage_limited = True
                self._last_error = f"disk full: {exc}"
                raise StorageLimitedError(self._last_error) from exc
            raise
        active.bytes_written += written
        self._maybe_fsync()
        if self._retention is not None:
            self._retention.maybe_enforce()
        return self._sequence

    def _maybe_fsync(self, *, force: bool = False) -> None:
        if self._active is None:
            return
        now = self._clock.wall_time()
        if force or now - self._last_fsync_s >= self._fsync_interval_s:
            os.fsync(self._active.fd)
            self._last_fsync_s = now

    def flush_and_close(self) -> None:
        if self._active is not None:
            self._maybe_fsync(force=True)
            os.close(self._active.fd)
            self._active = None
        if self._lock_path.exists():
            self._lock_path.unlink(missing_ok=True)

    def storage_limited(self) -> bool:
        return self._storage_limited


class RecordStore:
    """Facade for writer lifecycle, reads, and retention reporting."""

    def __init__(
        self,
        root: os.PathLike[str] | str,
        scope_id: str,
        clock: InjectableClock,
        *,
        create_root: bool = False,
    ) -> None:
        self.state_root = StateRoot(root)
        self.state_root.validate(create=create_root)
        self.scope_id = scope_id
        self.clock = clock
        self._writers: list[StreamWriter] = []
        self._retention = RetentionManager(
            self.state_root,
            clock,
            active_paths=self._collect_active_paths,
        )
        self._append_lock = threading.Lock()
        self.dropped_append_coverage: int = 0

    def append_locked(self, writer: StreamWriter, record: dict[str, Any]) -> int:
        """Serialize appends; never hold this lock across probe I/O in callers."""
        with self._append_lock:
            try:
                return writer.append(record)
            except StorageLimitedError:
                self.dropped_append_coverage += 1
                raise

    def _collect_active_paths(self) -> set[Path]:
        paths: set[Path] = set()
        for writer in self._writers:
            paths.update(writer.active_paths())
        return paths

    def open_stream(
        self,
        stream_prefix: str,
        *,
        collector_session: Optional[str] = None,
        process_start_key: Optional[str] = None,
        segment_max_bytes: int = SEGMENT_MAX_BYTES,
    ) -> StreamWriter:
        writer = StreamWriter(
            self.state_root,
            stream_prefix,
            self.scope_id,
            self.clock,
            collector_session=collector_session,
            process_start_key=process_start_key,
            segment_max_bytes=segment_max_bytes,
            retention=self._retention,
        )
        self._writers.append(writer)
        return writer

    def enforce_retention(self, *, force: bool = False) -> StorageReport:
        return self._retention.maybe_enforce(force=force)

    def read_segment_lines(self, path: Path) -> list[RecordLine]:
        lines, _, _ = SegmentReader.read_segment(
            path,
            scope_id=self.scope_id,
            collector_session="read-only",
            clock=self.clock,
        )
        return lines

    def shutdown(self) -> None:
        with self._append_lock:
            for writer in self._writers:
                writer.flush_and_close()
            self._writers.clear()


def read_all_complete_records(path: Path) -> Iterator[dict[str, Any]]:
    data = path.read_bytes()
    raw_lines = data.splitlines(keepends=True)
    if not raw_lines and data:
        raw_lines = [data]
    last_index = len(raw_lines) - 1
    for index, raw in enumerate(raw_lines):
        parsed = parse_record_line(raw, index, partial_eof=index == last_index)
        if parsed.state == RecordLineState.COMPLETE and parsed.record is not None:
            yield parsed.record