import importlib.util
import json
import os
import stat
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "developer-probe.py"
SPEC = importlib.util.spec_from_file_location("developer_probe", ROOT)
probe = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(probe)


def labels_for(row):
    return {key: value for key, value in row.items() if key != "value"}


class Fixture(unittest.TestCase):
    def test_exact_ten_series_without_run_label(self):
        rows = probe.expected_series()
        self.assertEqual(len(rows), 10)
        self.assertTrue(all("run" not in row for row in rows))
        self.assertEqual(rows[0]["value"], "17")
        buckets = [row for row in rows if row["__name__"].endswith("_bucket")]
        self.assertEqual([row["le"] for row in buckets], ["0.01", "0.1", "1", "10", "60", "+Inf"])

    def test_old_only_wrong_label_bucket_and_timestamp(self):
        rows = probe.expected_series()
        samples = [
            {"labels": labels_for(row), "timestamp_ms": 10, "value": row["value"]}
            for row in rows
        ]
        self.assertEqual(probe.assess_fresh_metrics(samples, 20)["reason"], "old-only")
        wrong = [dict(sample) for sample in samples]
        wrong[0] = {
            "labels": {**wrong[0]["labels"], "run": "abc"},
            "timestamp_ms": 20,
            "value": wrong[0]["value"],
        }
        for sample in wrong[1:]:
            sample["timestamp_ms"] = 20
        self.assertEqual(probe.assess_fresh_metrics(wrong, 20)["reason"], "per-run-label")
        bad_bucket = [
            {
                "labels": labels_for(row),
                "timestamp_ms": 20,
                "value": "9" if "le" in row and row["le"] == "1" else row["value"],
            }
            for row in rows
        ]
        self.assertEqual(probe.assess_fresh_metrics(bad_bucket, 20)["reason"], "wrong-value")

    def test_fresh_control_passes(self):
        rows = probe.expected_series()
        samples = [
            {"labels": labels_for(row), "timestamp_ms": 50, "value": row["value"]}
            for row in rows
        ]
        self.assertTrue(probe.assess_fresh_metrics(samples, 50)["ok"])


def private_dir():
    path = tempfile.mkdtemp(prefix="obs-d08-")
    os.chmod(path, 0o700)
    lock = os.path.join(path, probe.LOCK_NAME)
    fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_RDWR, 0o600)
    return path, fd


class Transport:
    def __init__(self, samples=None, post=None):
        self.samples = samples or []
        self.queries = 0
        self.posts = []
        self.post = post

    def query(self, start, end):
        self.queries += 1
        chosen = [
            sample
            for sample in self.samples
            if start <= sample["timestamp_ms"] <= end
        ]
        return {"status": "success", "samples": chosen}

    def post_metric(self, timestamp_ms):
        if self.post:
            return self.post(timestamp_ms)
        self.posts.append(timestamp_ms)
        return {"known": True}


class Allocation(unittest.TestCase):
    def test_one_scan_and_seven_advancing_allocations(self):
        state, fd = private_dir()
        clock_values = iter(range(5000, 5010))
        result = probe.allocate_metrics(state, fd, Transport(), lambda: next(clock_values))
        self.assertEqual(result["scans"], 3)
        self.assertEqual(result["allocated"], list(range(5000, 5007)))
        stored = probe.read_watermark(state)
        self.assertEqual(stored["last"], 5006)
        os.close(fd)

    def test_delayed_sample_and_rollback_refuse_without_reset(self):
        state, fd = private_dir()
        transport = Transport(samples=[{"labels": {"__name__": "x"}, "timestamp_ms": 9000}])
        with self.assertRaises(probe.ProbeError) as caught:
            probe.allocate_metrics(state, fd, transport, lambda: 8000)
        self.assertEqual(caught.exception.reason, "clock-rollback")
        self.assertIsNone(probe.read_watermark(state))
        os.close(fd)

    def test_unknown_post_keeps_watermark(self):
        state, fd = private_dir()
        clock = iter([4000])

        def post(_timestamp):
            return {"known": False}

        with self.assertRaises(probe.ProbeError) as caught:
            probe.allocate_metrics(state, fd, Transport(post=post), lambda: next(clock))
        self.assertEqual(caught.exception.reason, "unknown-post")
        self.assertEqual(probe.read_watermark(state)["last"], 4000)
        os.close(fd)

    def test_wrong_fd_and_failed_write(self):
        state, fd = private_dir()
        other = tempfile.mkdtemp(prefix="obs-d08-other-")
        os.chmod(other, 0o700)
        bogus = os.open(os.path.join(other, "other.lock"), os.O_CREAT | os.O_RDWR, 0o600)
        with self.assertRaises(probe.ProbeError) as caught:
            probe.allocate_metrics(state, bogus, Transport(), lambda: 3000)
        self.assertEqual(caught.exception.reason, "wrong-fd")
        os.close(bogus)
        os.close(fd)
        os.chmod(os.path.join(state, probe.LOCK_NAME), 0o640)
        bad = os.open(os.path.join(state, probe.LOCK_NAME), os.O_RDWR)
        with self.assertRaises(probe.ProbeError):
            probe.allocate_metrics(state, bad, Transport(), lambda: 3000)
        os.close(bad)


class Signals(unittest.TestCase):
    def identity(self):
        return {
            "traceId": "ab" * 16,
            "parentSpanId": "cd" * 8,
            "childSpanId": "ef" * 8,
            "runId": "12" * 8,
            "timeUnixNano": 5_000_000_000,
            "timestampMs": 5000,
            "secondTimestampMs": 8000,
        }

    def test_envelopes_keep_linkage_and_canaries(self):
        envelopes = probe.build_envelopes(self.identity())
        spans = envelopes["traces"]["resourceSpans"][0]["scopeSpans"][0]["spans"]
        self.assertEqual([span["name"] for span in spans], ["developer.parent", "developer.child"])
        self.assertEqual(spans[1]["parentSpanId"], spans[0]["spanId"])
        self.assertIn("drop_resource_canary", json.dumps(envelopes["traces"]))
        self.assertTrue(all("run" not in row for row in probe.expected_series()))

    def test_cycle_accepts_one_post_per_signal_and_refuses_a_short_negative_window(self):
        identity = self.identity()
        rows = probe.expected_series()

        class HTTP:
            def __init__(self):
                self.posts = []

            def post(self, signal, _payload):
                self.posts.append(signal)
                return {"known": True}

            def query_trace(self, _trace_id):
                return {"batches": [{"spans": [
                    {"traceId": identity["traceId"], "name": "developer.parent"},
                    {"traceId": identity["traceId"], "name": "developer.child"},
                ]}]}

            def query_log(self, _identity):
                return {"data": {"result": [{
                    "line": "developer.completed",
                    "traceId": identity["traceId"],
                }]}}

            def query_metrics(self, _start, _end):
                return [
                    {"labels": labels_for(row), "timestamp_ms": identity["timestampMs"], "value": row["value"]}
                    for row in rows
                ] + [
                    {"labels": labels_for(row), "timestamp_ms": identity["secondTimestampMs"], "value": row["value"]}
                    for row in rows
                ]

            def negative_queries(self):
                return [("tempo", {"batches": []}), ("loki", {"data": {"result": []}})]

        http = HTTP()
        result = probe.run_signal_cycle(identity, http)
        self.assertEqual(result["posts"], ["traces", "logs"])
        self.assertEqual(http.posts, ["traces", "logs"])
        with self.assertRaises(probe.ProbeError) as caught:
            probe.run_signal_cycle(identity, http, negative_complete=False)
        self.assertEqual(caught.exception.reason, "negative-window-incomplete")

    def test_cli_rejects_a_relative_state_directory(self):
        self.assertEqual(probe.main([
            "--developer-http-port", "1",
            "--diagnostic-http-port", "2",
            "--prometheus-port", "3",
            "--loki-port", "4",
            "--tempo-port", "5",
            "--state-directory", "relative",
            "--budget-ms", "10",
        ]), 1)


if __name__ == "__main__":
    unittest.main()
