#!/usr/bin/env python3
"""Deterministic AMQP wire negatives with a fake socket."""

import io
import os
import struct
import sys
import unittest
from contextlib import redirect_stderr, redirect_stdout
from unittest import mock

ROOT = os.path.dirname(os.path.abspath(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import amqp_smoke


def frame(method_channel, class_id, method_id, args=b"", frame_type=1):
    payload = struct.pack(">HH", class_id, method_id) + args
    return struct.pack(">BHI", frame_type, method_channel, len(payload)) + payload + b"\xce"


def shortstr(text: str) -> bytes:
    raw = text.encode()
    return bytes([len(raw)]) + raw


class BufferSocket:
    def __init__(self, chunks):
        self._buf = io.BytesIO(b"".join(chunks))
        self.sent = []

    def connect(self, _addr):
        return None

    def recv(self, size):
        return self._buf.read(size)

    def sendall(self, data):
        self.sent.append(data)


class AmqpSmokeTests(unittest.TestCase):
    def test_start_ok_exact_wire_encoding(self):
        sock = BufferSocket([
            frame(0, 10, 10, b"PLAIN en_US"),
            frame(0, 10, 30, struct.pack(">HIH", 2047, 131072, 60)),
            frame(0, 10, 41, b"\x00"),
            frame(1, 20, 11, b"\x00\x00\x00\x00"),
        ])
        amqp_smoke.AmqpWire(sock).connect("broker", "user", "pass")
        expected = (
            b"\x00\x00\x00\x31"
            b"\x0ccapabilitiesF\x00\x00\x00\x1f"
            b"\x1cauthentication_failure_closet\x01"
            b"\x05PLAIN\x00\x00\x00\x0a\x00user\x00pass"
            b"\x05en_US"
        )
        self.assertEqual(sock.sent[1], frame(0, 10, 11, expected))

    def test_basic_publish_and_get_exact_wire(self):
        payload = b"nonce"
        header = struct.pack(">HHQH", 60, 0, len(payload), 0)
        def content_frame(kind, body):
            return struct.pack(">BHI", kind, 1, len(body)) + body + b"\xce"
        get_ok = struct.pack(">QB", 7, 0) + b"\x00\x01q" + struct.pack(">I", 0)
        sock = BufferSocket([
            frame(1, 60, 80, struct.pack(">QB", 1, 0)),
            frame(1, 60, 71, get_ok),
            content_frame(2, header),
            content_frame(3, payload),
            frame(1, 60, 72, b"\x00"),
        ])
        wire = amqp_smoke.AmqpWire(sock)
        deadline = wire.clock() + 1
        wire.publish(deadline, "q", "nonce", mandatory=True, delivery_mode=1)
        self.assertEqual(sock.sent[0], frame(1, 60, 40, b"\x00\x00\x00\x01q\x01"))
        self.assertEqual(wire.basic_get(deadline, "q", False), (7, 0, "nonce"))
        self.assertEqual(sock.sent[3], frame(1, 60, 70, b"\x00\x00\x01q\x00"))
        self.assertIsNone(wire.basic_get(deadline, "q", False))

    def test_connection_close_on_channel_zero_during_channel_operation(self):
        sock = BufferSocket([frame(0, 10, 50, struct.pack(">H", 503) + shortstr("private peer text") + struct.pack(">HH", 60, 70))])
        wire = amqp_smoke.AmqpWire(sock)
        with self.assertRaises(amqp_smoke.ProtocolFailure) as ctx:
            wire.read_method(wire.clock() + 1, 1)
        self.assertEqual(ctx.exception.stage, "connection-close:503")

    def test_rabbitmq_metrics_after_runtime_prefix(self):
        prefix = b"erlang_vm_memory_bytes 42\n" * 300
        self.assertGreater(len(prefix), 4096)
        self.assertTrue(amqp_smoke.has_rabbitmq_metric(prefix + b"rabbitmq_connections 1\n"))
        self.assertFalse(amqp_smoke.has_rabbitmq_metric(prefix + b"# HELP rabbitmq_connections comment\n"))
        self.assertFalse(amqp_smoke.has_rabbitmq_metric(b"<html>rabbitmq</html>"))

    def test_declare_mode_cannot_publish(self):
        self.assertTrue(amqp_smoke.declare_has_publish_path("declare", ["x", "declare", "publish"]))

    def test_truncated_frame_fails(self):
        sock = BufferSocket([struct.pack(">BHI", 1, 1, 8)])
        wire = amqp_smoke.AmqpWire(sock)
        with self.assertRaises(amqp_smoke.ProtocolFailure):
            wire.read_frame(wire.clock() + 1)

    def test_wrong_channel_fails(self):
        body = frame(2, 20, 11)
        sock = BufferSocket([body])
        wire = amqp_smoke.AmqpWire(sock)
        with self.assertRaises(amqp_smoke.ProtocolFailure):
            wire.read_method(wire.clock() + 1, expect_channel=1)

    def test_return_then_ack_fails_confirm(self):
        sock = BufferSocket([])
        wire = amqp_smoke.AmqpWire(sock)
        state = {"step": 0}

        def fake_read(_deadline, expect_channel=None):
            if state["step"] == 0:
                state["step"] = 1
                return 1, 60, 50, b""
            return 1, 60, 80, struct.pack(">QB", 1, 0)

        wire.read_method = fake_read  # type: ignore[method-assign]
        with self.assertRaises(amqp_smoke.ProtocolFailure) as ctx:
            wire._expect_publish_confirm(wire.clock() + 1)
        self.assertEqual(ctx.exception.stage, "basic-return-then-confirm")

    def test_nack_fails_confirm(self):
        sock = BufferSocket([])
        wire = amqp_smoke.AmqpWire(sock)

        def fake_read(_deadline, expect_channel=None):
            return 1, 60, 120, struct.pack(">QB", 1, 0)

        wire.read_method = fake_read  # type: ignore[method-assign]
        with self.assertRaises(amqp_smoke.ProtocolFailure):
            wire._expect_publish_confirm(wire.clock() + 1)

    def test_eof_during_auth_is_not_denial(self):
        sock = BufferSocket([b""])
        buf = io.StringIO()
        with mock.patch.dict(
            os.environ,
            {"AMQP_USER": "user", "AMQP_PASS": "pass", "AMQP_HOST": "broker"},
            clear=False,
        ):
            with redirect_stdout(buf), redirect_stderr(buf):
                code = amqp_smoke.run_wrong_password(sock)
        self.assertEqual(code, 1)
        self.assertIn("AUTH-INCONCLUSIVE", buf.getvalue())

    def test_explicit_403_during_auth_passes(self):
        close_args = struct.pack(">H", 403) + shortstr("denied") + struct.pack(">HH", 0, 0)
        start_body = shortstr("0.9.1") + shortstr("PLAIN") + shortstr("en_US") + b"\x00\x00\x00\x00"
        chunks = [
            frame(0, 10, 10, start_body),
            frame(0, 10, 50, close_args),
        ]
        sock = BufferSocket(chunks)
        with mock.patch.dict(
            os.environ,
            {"AMQP_USER": "user", "AMQP_PASS": "pass", "AMQP_HOST": "broker"},
            clear=False,
        ):
            code = amqp_smoke.run_wrong_password(sock)
        self.assertEqual(code, 0)

    def test_403_after_open_fails(self):
        sock = BufferSocket([])
        wire = amqp_smoke.AmqpWire(sock)

        def fake_expect(_deadline, class_id, method_id, expect_channel=1):
            if (class_id, method_id) == (20, 11):
                raise amqp_smoke.AccessRefused(403)
            return b""

        wire.expect = fake_expect  # type: ignore[method-assign]
        with mock.patch.object(wire, "sendall"):
            with self.assertRaises(amqp_smoke.AccessRefused):
                wire.open_channel(wire.clock() + 1)

    def test_stdout_contains_no_credentials(self):
        env = {"AMQP_USER": "secret-user", "AMQP_PASS": "secret-pass", "AMQP_HOST": "broker"}
        sock = BufferSocket([b""])
        buf = io.StringIO()
        with mock.patch.dict(os.environ, env, clear=False):
            with redirect_stdout(buf), redirect_stderr(buf):
                amqp_smoke.run_wrong_password(sock)
        output = buf.getvalue()
        self.assertNotIn("secret-user", output)
        self.assertNotIn("secret-pass", output)

    def test_publish_json_exact_shape(self):
        queue, run_id = amqp_smoke.parse_publish_args(["", "publish", '["q-name","run-1"]'])
        self.assertEqual(queue, "q-name")
        self.assertEqual(run_id, "run-1")


if __name__ == "__main__":
    unittest.main()