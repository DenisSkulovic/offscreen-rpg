#!/usr/bin/env python3
"""Bounded AMQP 0-9-1 stdlib client for native RabbitMQ verification. Prints no credentials."""

from __future__ import annotations

import json
import os
import select
import socket
import struct
import sys
import time
import urllib.error
import urllib.request
from typing import BinaryIO, Callable, Optional

MAX_BODY = 4096
MAX_QUEUE_NAME = 255
MAX_PAYLOAD = 128
OPERATION_DEADLINE_S = 20.0
HOLD_DEADLINE_S = 120.0
SMOKE_TOTAL_S = 180.0


class ProtocolFailure(Exception):
    def __init__(self, stage: str, code: int = 1):
        super().__init__(stage)
        self.stage = stage
        self.code = code


class AccessRefused(ProtocolFailure):
    def __init__(self, code: int):
        super().__init__(f"access-refused:{code}", 403)
        self.amqp_code = code


class FakeClock:
    """Monotonic clock for tests; defaults to time.monotonic."""

    @staticmethod
    def now() -> float:
        return time.monotonic()


def pack_shortstr(text: str) -> bytes:
    raw = text.encode()
    if len(raw) > 255:
        raise ProtocolFailure("shortstr-length")
    return bytes([len(raw)]) + raw


def pack_longstr(raw: bytes | str) -> bytes:
    if isinstance(raw, str):
        raw = raw.encode()
    return struct.pack(">I", len(raw)) + raw


def take_shortstr(buf: bytes, index: int) -> tuple[str, int]:
    size = buf[index]
    index += 1
    end = index + size
    if end > len(buf):
        raise ProtocolFailure("shortstr-truncated")
    return buf[index:end].decode("utf-8", "replace"), end


class AmqpWire:
    def __init__(
        self,
        sock: socket.socket,
        *,
        operation_deadline_s: float = OPERATION_DEADLINE_S,
        clock: Callable[[], float] = FakeClock.now,
    ):
        self.sock = sock
        self.operation_deadline_s = operation_deadline_s
        self.clock = clock
        self.channel = 1
        self.frame_max = 131072
        self.frame_payload_limit = 131064
        self.heartbeat_interval = 10
        self._last_traffic = clock()
        self._negotiated_heartbeat = 10

    def _deadline_at(self) -> float:
        return self.clock() + self.operation_deadline_s

    def _touch(self) -> None:
        self._last_traffic = self.clock()

    def _check_deadline(self, deadline_at: float) -> None:
        if self.clock() >= deadline_at:
            raise ProtocolFailure("operation-deadline")

    def _check_heartbeat(self, deadline_at: float) -> None:
        if self._negotiated_heartbeat <= 0:
            return
        if self.clock() - self._last_traffic > self._negotiated_heartbeat * 2:
            raise ProtocolFailure("heartbeat-deadline")

    def _pollable(self) -> bool:
        try:
            self.sock.fileno()
        except (AttributeError, OSError, ValueError):
            return False
        return True

    def recvn(self, size: int, deadline_at: float) -> bytes:
        buf = b""
        while len(buf) < size:
            self._check_deadline(deadline_at)
            self._check_heartbeat(deadline_at)
            if self._pollable():
                ready, _, _ = select.select([self.sock], [], [], 0.2)
                if not ready:
                    continue
            chunk = self.sock.recv(size - len(buf))
            if not chunk:
                raise ProtocolFailure("eof")
            buf += chunk
            self._touch()
        return buf

    def sendall(self, data: bytes) -> None:
        self.sock.sendall(data)
        self._touch()

    def send_method(self, channel: int, class_id: int, method_id: int, args: bytes) -> None:
        payload = struct.pack(">HH", class_id, method_id) + args
        if len(payload) > self.frame_payload_limit:
            raise ProtocolFailure("frame-payload-limit")
        self.sendall(struct.pack(">BHI", 1, channel, len(payload)) + payload + b"\xce")

    def read_frame(self, deadline_at: float) -> tuple[int, int, bytes]:
        header = self.recvn(7, deadline_at)
        frame_type, channel, size = struct.unpack(">BHI", header)
        if size > self.frame_payload_limit:
            raise ProtocolFailure("frame-size")
        payload = self.recvn(size, deadline_at)
        end = self.recvn(1, deadline_at)
        if end != b"\xce":
            raise ProtocolFailure("frame-end")
        return frame_type, channel, payload

    def read_method(self, deadline_at: float, expect_channel: Optional[int] = None) -> tuple[int, int, int, bytes]:
        while True:
            frame_type, channel, payload = self.read_frame(deadline_at)
            if frame_type == 8:
                continue
            if frame_type != 1:
                raise ProtocolFailure("unexpected-frame-type")
            if expect_channel is not None and channel != expect_channel:
                raise ProtocolFailure("wrong-channel")
            class_id, method_id = struct.unpack_from(">HH", payload)
            return channel, class_id, method_id, payload[4:]

    def parse_close(self, body: bytes) -> tuple[int, str]:
        if len(body) < 2:
            raise ProtocolFailure("close-truncated")
        code = struct.unpack_from(">H", body)[0]
        text, _ = take_shortstr(body, 2)
        return code, text

    def expect(self, deadline_at: float, class_id: int, method_id: int, expect_channel: int = 1) -> bytes:
        _channel, got_class, got_method, body = self.read_method(deadline_at, expect_channel)
        if (got_class, got_method) == (10, 50):
            code, _text = self.parse_close(body)
            raise AccessRefused(code)
        if (got_class, got_method) != (class_id, method_id):
            raise ProtocolFailure("unexpected-method")
        return body

    def connect(self, host: str, user: str, password: str, vhost: str = "/") -> None:
        deadline_at = self._deadline_at()
        self.sock.connect((host, 5672))
        self.sendall(b"AMQP\x00\x00\x09\x01")
        start_body = self.expect(deadline_at, 10, 10, 0)
        # verify PLAIN and en_US are offered in start-ok fields (bounded scan)
        if b"PLAIN" not in start_body or b"en_US" not in start_body:
            raise ProtocolFailure("auth-mechanism")
        # AMQP field table: capabilities (F = nested table), boolean (t).
        capabilities = pack_shortstr("authentication_failure_close") + b"t\x01"
        properties = pack_shortstr("capabilities") + b"F" + pack_longstr(capabilities)
        client_props = pack_longstr(properties)
        response = b"\x00" + user.encode() + b"\x00" + password.encode()
        self.send_method(
            0,
            10,
            11,
            client_props + pack_shortstr("PLAIN") + pack_longstr(response) + pack_shortstr("en_US"),
        )
        try:
            tune = self.expect(deadline_at, 10, 30, 0)
        except AccessRefused as refused:
            raise refused
        channel_max, frame_max, server_heartbeat = struct.unpack(">HIH", tune)
        self.frame_max = min(max(frame_max, 4096), 131072)
        self.frame_payload_limit = self.frame_max - 8
        if server_heartbeat > 0:
            self._negotiated_heartbeat = min(server_heartbeat, 10)
        else:
            self._negotiated_heartbeat = 10
        self.send_method(
            0,
            10,
            31,
            struct.pack(
                ">HIH",
                channel_max,
                self.frame_max,
                self._negotiated_heartbeat,
            ),
        )
        self.send_method(0, 10, 40, pack_shortstr(vhost) + pack_shortstr("") + bytes([0]))
        self.expect(deadline_at, 10, 41, 0)
        self.send_method(self.channel, 20, 10, pack_shortstr(""))
        self.expect(deadline_at, 20, 11, self.channel)

    def open_channel(self, deadline_at: float) -> None:
        self.send_method(self.channel, 20, 10, pack_shortstr(""))
        self.expect(deadline_at, 20, 11, self.channel)

    def declare_exclusive_queue(self, deadline_at: float) -> str:
        queue_type = pack_shortstr("x-queue-type") + b"S" + pack_longstr("classic")
        arguments = struct.pack(">I", len(queue_type)) + queue_type
        # passive=0 durable=0 exclusive=1 auto-delete=1 no-wait=0
        self.send_method(
            self.channel,
            50,
            10,
            struct.pack(">H", 0)
            + pack_shortstr("")
            + bytes([0x0C])
            + arguments,
        )
        body = self.expect(deadline_at, 50, 11, self.channel)
        queue, index = take_shortstr(body, 0)
        if not queue or len(queue.encode()) > MAX_QUEUE_NAME:
            raise ProtocolFailure("queue-name")
        if index + 4 > len(body):
            raise ProtocolFailure("declare-ok-truncated")
        message_count, consumer_count = struct.unpack_from(">II", body, index)
        if message_count != 0 or consumer_count != 0:
            raise ProtocolFailure("declare-not-empty")
        return queue

    def declare_durable_queue(self, deadline_at: float) -> str:
        queue_type = pack_shortstr("x-queue-type") + b"S" + pack_longstr("classic")
        arguments = struct.pack(">I", len(queue_type)) + queue_type
        # durable=1 exclusive=0 auto-delete=0
        self.send_method(
            self.channel,
            50,
            10,
            struct.pack(">H", 0)
            + pack_shortstr("")
            + bytes([0x02])
            + arguments,
        )
        body = self.expect(deadline_at, 50, 11, self.channel)
        queue, index = take_shortstr(body, 0)
        if not queue or len(queue.encode()) > MAX_QUEUE_NAME:
            raise ProtocolFailure("queue-name")
        return queue

    def enable_confirms(self, deadline_at: float) -> None:
        self.send_method(self.channel, 85, 10, bytes([0]))
        self.expect(deadline_at, 85, 11, self.channel)

    def publish(
        self,
        deadline_at: float,
        routing_key: str,
        payload: str,
        *,
        mandatory: bool,
        delivery_mode: int,
    ) -> None:
        if len(payload.encode()) > MAX_PAYLOAD:
            raise ProtocolFailure("payload-length")
        body = payload.encode()
        flags = 0x02 if mandatory else 0
        self.send_method(
            self.channel,
            60,
            40,
            struct.pack(">H", 0)
            + pack_shortstr("")
            + pack_shortstr(routing_key)
            + struct.pack(">B", flags),
        )
        props = struct.pack(">H", 0x1000) + bytes([delivery_mode])
        header = struct.pack(">HHQ", 60, 0, len(body)) + props
        if len(header) > self.frame_payload_limit:
            raise ProtocolFailure("content-header-limit")
        self.sendall(struct.pack(">BHI", 2, self.channel, len(header)) + header + b"\xce")
        self.sendall(struct.pack(">BHI", 3, self.channel, len(body)) + body + b"\xce")
        self._expect_publish_confirm(deadline_at)

    def _expect_publish_confirm(self, deadline_at: float) -> None:
        while True:
            _channel, class_id, method_id, body = self.read_method(deadline_at, self.channel)
            if (class_id, method_id) == (60, 72):
                raise ProtocolFailure("basic-return-then-confirm")
            if (class_id, method_id) == (60, 71):
                if len(body) < 9:
                    raise ProtocolFailure("nack-shape")
                raise ProtocolFailure("basic-nack")
            if (class_id, method_id) != (60, 80):
                raise ProtocolFailure("unexpected-confirm-frame")
            if len(body) < 9:
                raise ProtocolFailure("ack-shape")
            delivery_tag, multiple = struct.unpack_from(">QB", body)
            if delivery_tag != 1 or multiple not in (0, 1):
                raise ProtocolFailure("ack-tag")
            return

    def basic_get(self, deadline_at: float, queue: str, no_ack: bool) -> Optional[tuple[int, int, str]]:
        self.send_method(
            self.channel,
            60,
            70,
            pack_shortstr(queue) + bytes([1 if no_ack else 0]),
        )
        _channel, class_id, method_id, body = self.read_method(deadline_at, self.channel)
        if (class_id, method_id) == (60, 71):
            return None
        if (class_id, method_id) != (60, 60):
            raise ProtocolFailure("unexpected-get-response")
        index = 0
        _consumer, index = take_shortstr(body, index)
        delivery_tag = struct.unpack_from(">Q", body, index)[0]
        index += 8
        redelivered = body[index] & 1
        index += 1
        exchange, index = take_shortstr(body, index)
        routing_key, index = take_shortstr(body, index)
        _channel, _class_id, _weight, size = self._read_content_header(deadline_at)
        message = self._read_body(deadline_at, size)
        return delivery_tag, redelivered, message.decode()

    def _read_content_header(self, deadline_at: float) -> tuple[int, int, int, int]:
        frame_type, channel, payload = self.read_frame(deadline_at)
        if frame_type != 2 or channel != self.channel:
            raise ProtocolFailure("content-header")
        if len(payload) < 12:
            raise ProtocolFailure("content-header-truncated")
        class_id, weight, size = struct.unpack_from(">HHQ", payload)
        if class_id != 60 or weight != 0 or size > MAX_BODY:
            raise ProtocolFailure("content-header-shape")
        return channel, class_id, weight, size

    def _read_body(self, deadline_at: float, size: int) -> bytes:
        message = b""
        while len(message) < size:
            frame_type, channel, payload = self.read_frame(deadline_at)
            if frame_type != 3 or channel != self.channel:
                raise ProtocolFailure("body-frame")
            message += payload
        if len(message) != size:
            raise ProtocolFailure("body-length")
        return message

    def ack(self, deadline_at: float, delivery_tag: int) -> None:
        self.send_method(self.channel, 60, 80, struct.pack(">QB", delivery_tag, 0))

    def close(self, deadline_at: float) -> None:
        self.send_method(self.channel, 20, 40, struct.pack(">H", 200) + pack_shortstr("normal") + struct.pack(">HH", 0, 0))
        self.expect(deadline_at, 20, 41, self.channel)
        self.send_method(0, 10, 50, struct.pack(">H", 200) + pack_shortstr("ok") + struct.pack(">HH", 0, 0))
        self.expect(deadline_at, 10, 51, 0)

    def service_socket(self, deadline_at: float, timeout_s: float = 0.2) -> bool:
        """Process inbound traffic (heartbeats/frames). Returns False on idle."""
        self._check_deadline(deadline_at)
        self._check_heartbeat(deadline_at)
        if self._pollable():
            ready, _, _ = select.select([self.sock], [], [], timeout_s)
            if not ready:
                return False
        frame_type, channel, payload = self.read_frame(deadline_at)
        if frame_type == 8:
            return True
        if frame_type == 1:
            class_id, method_id = struct.unpack_from(">HH", payload)
            if (class_id, method_id) == (10, 50):
                code, _ = self.parse_close(body=payload[4:])
                raise AccessRefused(code)
        raise ProtocolFailure("hold-unexpected-frame")


def credentials() -> tuple[str, str, str]:
    user = os.environ["AMQP_USER"]
    password = os.environ["AMQP_PASS"]
    host = os.environ.get("AMQP_HOST", "rabbitmq")
    return host, user, password


def run_smoke(sock: socket.socket) -> int:
    wire = AmqpWire(sock)
    deadline_at = wire.clock() + SMOKE_TOTAL_S
    host, user, password = credentials()
    wire.connect(host, user, password)
    op_deadline = wire.clock() + wire.operation_deadline_s
    queue = wire.declare_exclusive_queue(op_deadline)
    wire.enable_confirms(op_deadline)
    nonce = os.environ.get("OFFSCREEN_RUN_ID", "smoke-nonce")
    wire.publish(op_deadline, queue, nonce, mandatory=True, delivery_mode=1)
    print(f"SMOKE-PUBLISHED queue={queue}", flush=True)
    got = wire.basic_get(op_deadline, queue, no_ack=False)
    if got is None:
        raise ProtocolFailure("missing-message")
    tag, redelivered, payload = got
    if payload != nonce or redelivered != 0:
        raise ProtocolFailure("payload-mismatch")
    wire.ack(op_deadline, tag)
    empty = wire.basic_get(op_deadline, queue, no_ack=False)
    if empty is not None:
        raise ProtocolFailure("queue-not-empty")
    print("SMOKE-EMPTY", flush=True)
    wire.close(op_deadline)
    return 0


def run_declare(sock: socket.socket, run_id: str) -> int:
    wire = AmqpWire(sock)
    host, user, password = credentials()
    wire.connect(host, user, password)
    op_deadline = wire.clock() + wire.operation_deadline_s
    queue = wire.declare_durable_queue(op_deadline)
    record = {"record": "DECLARED", "runId": run_id, "queue": queue}
    print(f"DECLARED {json.dumps(record, separators=(',', ':'))}", flush=True)
    wire.close(op_deadline)
    return 0


def run_publish(sock: socket.socket, queue: str, run_id: str) -> int:
    wire = AmqpWire(sock)
    host, user, password = credentials()
    wire.connect(host, user, password)
    op_deadline = wire.clock() + wire.operation_deadline_s
    wire.enable_confirms(op_deadline)
    wire.publish(op_deadline, queue, run_id, mandatory=True, delivery_mode=2)
    record = {"record": "PUBLISHED", "runId": run_id, "queue": queue}
    print(f"PUBLISHED {json.dumps(record, separators=(',', ':'))}", flush=True)
    wire.close(op_deadline)
    return 0


def run_wrong_password(sock: socket.socket) -> int:
    wire = AmqpWire(sock)
    host, user, _password = credentials()
    wrong = os.environ.get("AMQP_WRONG_PASS", "definitely-wrong-password")
    try:
        wire.connect(host, user, wrong)
    except AccessRefused as refused:
        if refused.amqp_code == 403:
            print("AUTH-REFUSED 403", flush=True)
            return 0
        print(f"AUTH-REFUSED {refused.amqp_code}", file=sys.stderr)
        return 1
    except ProtocolFailure as failure:
        if failure.stage == "eof":
            print("AUTH-INCONCLUSIVE eof", file=sys.stderr)
            return 1
        print(f"AUTH-INCONCLUSIVE {failure.stage}", file=sys.stderr)
        return 1
    except OSError:
        print("AUTH-INCONCLUSIVE eof", file=sys.stderr)
        return 1
    print("AUTH-INCONCLUSIVE unexpected-success", file=sys.stderr)
    return 1


def run_hold(sock: socket.socket, queue: str, run_id: str) -> int:
    wire = AmqpWire(sock)
    host, user, password = credentials()
    wire.connect(host, user, password)
    op_deadline = wire.clock() + wire.operation_deadline_s
    got = wire.basic_get(op_deadline, queue, no_ack=False)
    if got is None:
        raise ProtocolFailure("hold-no-message")
    _tag, redelivered, payload = got
    if payload != run_id or redelivered != 0:
        raise ProtocolFailure("hold-payload")
    print(f"APPLY {run_id} redelivered={redelivered}", flush=True)
    hold_deadline = wire.clock() + HOLD_DEADLINE_S
    seq = 0
    next_emit = wire.clock()
    try:
        while wire.clock() < hold_deadline:
            wire.service_socket(hold_deadline, timeout_s=0.2)
            seq += 1
            if seq == 1 or wire.clock() >= next_emit:
                print(f"HOLD_LIVE seq={seq}", flush=True)
                next_emit = wire.clock() + 2.0
    except (ProtocolFailure, AccessRefused) as failure:
        reason = failure.stage
        print(f"HOLD_FAILED reason={reason}", flush=True)
        return 1
    print("HOLD_FAILED reason=hold-deadline", flush=True)
    return 1


def run_replacement(sock: socket.socket, queue: str, run_id: str) -> int:
    wire = AmqpWire(sock)
    host, user, password = credentials()
    wire.connect(host, user, password)
    op_deadline = wire.clock() + wire.operation_deadline_s
    got = wire.basic_get(op_deadline, queue, no_ack=False)
    if got is None:
        raise ProtocolFailure("replacement-empty")
    tag, redelivered, payload = got
    if payload != run_id or redelivered != 1:
        raise ProtocolFailure("replacement-redelivery")
    print(f"APPLY {run_id} redelivered={redelivered}", flush=True)
    wire.ack(op_deadline, tag)
    empty = wire.basic_get(op_deadline, queue, no_ack=False)
    if empty is not None:
        raise ProtocolFailure("replacement-not-empty")
    print("REPLACEMENT-EMPTY", flush=True)
    wire.close(op_deadline)
    return 0


def run_durable_get(sock: socket.socket, queue: str, run_id: str) -> int:
    wire = AmqpWire(sock)
    host, user, password = credentials()
    wire.connect(host, user, password)
    op_deadline = wire.clock() + wire.operation_deadline_s
    got = wire.basic_get(op_deadline, queue, no_ack=False)
    if got is None:
        raise ProtocolFailure("durable-empty")
    tag, redelivered, payload = got
    if payload != run_id:
        raise ProtocolFailure("durable-payload")
    wire.ack(op_deadline, tag)
    empty = wire.basic_get(op_deadline, queue, no_ack=False)
    if empty is not None:
        raise ProtocolFailure("durable-not-empty")
    print(f"DURABLE-DRAIN redelivered={redelivered}", flush=True)
    wire.close(op_deadline)
    return 0


def probe_management() -> int:
    host = os.environ.get("AMQP_HOST", "rabbitmq")
    user = os.environ["AMQP_USER"]
    password = os.environ["AMQP_PASS"]
    auth_handler = urllib.request.HTTPPasswordMgrWithDefaultRealm()
    auth_handler.add_password(None, f"http://{host}", user, password)
    opener = urllib.request.build_opener(urllib.request.HTTPBasicAuthHandler(auth_handler))
    opener.addheaders = [("Accept", "application/json")]
    try:
        with opener.open(f"http://{host}:15672/api/overview", timeout=10) as response:
            if response.status != 200:
                print("MGMT-STATUS-FAIL", file=sys.stderr)
                return 1
        with opener.open(f"http://{host}:15692/metrics", timeout=10) as response:
            body = response.read(4096)
            if b"rabbitmq" not in body:
                print("METRICS-PREFIX-FAIL", file=sys.stderr)
                return 1
    except (urllib.error.URLError, TimeoutError, ValueError):
        print("MGMT-PROBE-FAIL", file=sys.stderr)
        return 1
    print("MGMT-OK", flush=True)
    return 0


def parse_publish_args(argv: list[str]) -> tuple[str, str]:
    if len(argv) < 3:
        raise ProtocolFailure("publish-args")
    parsed = json.loads(argv[2])
    if not isinstance(parsed, list) or len(parsed) != 2:
        raise ProtocolFailure("publish-json-shape")
    queue, run_id = parsed
    if not isinstance(queue, str) or not isinstance(run_id, str):
        raise ProtocolFailure("publish-json-types")
    return queue, run_id


def declare_has_publish_path(mode: str, argv: list[str]) -> bool:
    return mode == "declare" and any(token == "publish" for token in argv[2:])


def main(argv: list[str]) -> int:
    mode = argv[1] if len(argv) > 1 else ""
    if declare_has_publish_path(mode, argv):
        print("DECLARE-PUBLISH-REFUSED", file=sys.stderr)
        return 2
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        if mode == "smoke":
            status = run_smoke(sock)
            probe = probe_management()
            return status if status != 0 else probe
        if mode == "declare":
            run_id = os.environ.get("OFFSCREEN_RUN_ID", "declare-run")
            return run_declare(sock, run_id)
        if mode == "publish":
            queue, run_id = parse_publish_args(argv)
            return run_publish(sock, queue, run_id)
        if mode == "wrong-password":
            return run_wrong_password(sock)
        if mode == "hold":
            queue, run_id = parse_publish_args(argv)
            return run_hold(sock, queue, run_id)
        if mode == "replacement":
            queue, run_id = parse_publish_args(argv)
            return run_replacement(sock, queue, run_id)
        if mode == "durable-get":
            queue, run_id = parse_publish_args(argv)
            return run_durable_get(sock, queue, run_id)
        print("unknown mode", file=sys.stderr)
        return 2
    except ProtocolFailure as failure:
        print(f"SMOKE-ERROR stage={failure.stage}", file=sys.stderr)
        return failure.code if failure.code != 403 else 1
    except AccessRefused as refused:
        print(f"SMOKE-ERROR stage=access-refused:{refused.amqp_code}", file=sys.stderr)
        return 1
    finally:
        try:
            sock.close()
        except OSError:
            pass


if __name__ == "__main__":
    sys.exit(main(sys.argv))