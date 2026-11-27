import importlib.util
import pathlib
import tempfile
import unittest
from pathlib import Path

_PROBE_PATH = Path(__file__).resolve().parents[1] / "signal-probe.py"
_SPEC = importlib.util.spec_from_file_location("signal_probe", _PROBE_PATH)
assert _SPEC and _SPEC.loader
probe = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(probe)


class FakeClock:
    def __init__(self, start: float = 1_000.0):
        self.value = start

    def monotonic(self) -> float:
        return self.value

    def advance(self, delta: float) -> None:
        self.value += delta


class SignalProbeNegativeTests(unittest.TestCase):
    def test_query_transport_error_is_not_absence(self) -> None:
        def http_call(*_args, **_kwargs):
            raise OSError("transport down")

        with self.assertRaises(OSError):
            probe.tempo_absent(http_call, "http://tempo", "abc", timeout_s=1.0)

    def test_negative_window_cannot_finish_before_timeout(self) -> None:
        clock = FakeClock()
        sleeps: list[float] = []

        def sleep(delta: float) -> None:
            sleeps.append(delta)
            clock.advance(delta)

        def http_call(*_args, **_kwargs):
            return {"status": "success", "data": {"result": []}}

        queries = [
            {
                "kind": "prom",
                "base": "http://prom",
                "path": "/api/v1/query",
                "params": {"query": "up"},
                "label": "absent-metric",
            }
        ]
        with self.assertRaises(RuntimeError) as error:
            probe.observe_negative_queries(
                queries=queries,
                http_call=http_call,
                monotonic=clock.monotonic,
                sleep=sleep,
                min_window_s=60,
                max_window_s=10,
            )
        self.assertEqual(str(error.exception), "negative-window-incomplete")
        self.assertLess(clock.monotonic() - 1_000.0, 60)

    def test_invalid_allowed_key_payload_is_not_positive(self) -> None:
        run = "a" * 16
        trace, payloads = probe.build_invalid_allowed_key_submission(run)
        self.assertFalse(
            probe.metrics_check({"data": {"resultType": "matrix", "result": []}}, run, 1)
        )
        env_attrs = payloads["traces"]["resourceSpans"][0]["resource"]["attributes"]
        env = next(
            attribute
            for attribute in env_attrs
            if attribute["key"] == "deployment.environment.name"
        )
        self.assertEqual(env["value"]["stringValue"], probe.INVALID_ENV)
        self.assertNotEqual(env["value"]["stringValue"], "synthetic")
        self.assertTrue(trace)


class SignalProbeQueryErrorTest(unittest.TestCase):
    def test_positive_query_records_error_without_pass(self) -> None:
        clock = FakeClock()
        with tempfile.TemporaryDirectory() as tmp:
            out = pathlib.Path(tmp)

            def http_call(*_args, **_kwargs):
                raise RuntimeError("HTTP 500 /api/traces/x")

            checks = {
                "trace": (
                    "http://tempo",
                    "/api/traces/deadbeef",
                    None,
                    probe.trace_check,
                    {"trace": "deadbeef", "parent": "aaaa", "child": "bbbb"},
                )
            }
            pending = probe.observe_positive_queries(
                checks=checks,
                out=out,
                http_call=http_call,
                monotonic=clock.monotonic,
                deadline=clock.monotonic() + 5,
                sleep=lambda _delta: clock.advance(1),
            )
            self.assertIn("trace", pending)
            self.assertTrue((out / "trace.error.txt").read_text().startswith("HTTP 500"))


if __name__ == "__main__":
    unittest.main()