#!/usr/bin/env python3
"""Minimal AMQP 0-9-1 client for the lab smoke. Stdlib only. Prints no credentials."""

import os
import socket
import struct
import sys
import time

QUEUE = "lab.durable"


class AccessRefused(Exception):
    def __init__(self, code, text):
        super().__init__(f"{code} {text}")
        self.code = code
        self.text = text


def recvn(sock, size):
    buf = b""
    while len(buf) < size:
        chunk = sock.recv(size - len(buf))
        if not chunk:
            raise EOFError("socket closed")
        buf += chunk
    return buf


def pack_shortstr(text):
    raw = text.encode()
    if len(raw) > 255:
        raise ValueError(text)
    return bytes([len(raw)]) + raw


def pack_longstr(raw):
    if isinstance(raw, str):
        raw = raw.encode()
    return struct.pack(">I", len(raw)) + raw


def take_shortstr(buf, index):
    size = buf[index]
    index += 1
    return buf[index : index + size].decode(), index + size


def send_method(sock, channel, class_id, method_id, args):
    payload = struct.pack(">HH", class_id, method_id) + args
    sock.sendall(struct.pack(">BHI", 1, channel, len(payload)) + payload + b"\xce")


def read_frame(sock):
    header = recvn(sock, 7)
    frame_type, channel, size = struct.unpack(">BHI", header)
    payload = recvn(sock, size)
    end = recvn(sock, 1)
    if end != b"\xce":
        raise RuntimeError("bad frame end")
    return frame_type, channel, payload


def read_method(sock):
    while True:
        frame_type, channel, payload = read_frame(sock)
        if frame_type == 8:
            continue
        if frame_type != 1:
            raise RuntimeError(f"expected method frame, got {frame_type}")
        class_id, method_id = struct.unpack_from(">HH", payload)
        return channel, class_id, method_id, payload[4:]


def parse_close(body):
    code = struct.unpack_from(">H", body)[0]
    text, _index = take_shortstr(body, 2)
    return code, text


def expect(sock, class_id, method_id):
    _channel, got_class, got_method, body = read_method(sock)
    if (got_class, got_method) == (10, 50):
        code, text = parse_close(body)
        raise AccessRefused(code, text)
    if (got_class, got_method) != (class_id, method_id):
        raise RuntimeError(f"expected {class_id}.{method_id}, got {got_class}.{got_method}")
    return body


def connect(host, user, password, timeout):
    sock = socket.create_connection((host, 5672), timeout)
    sock.sendall(b"AMQP\x00\x00\x09\x01")
    expect(sock, 10, 10)
    response = b"\x00" + user.encode() + b"\x00" + password.encode()
    send_method(
        sock,
        0,
        10,
        11,
        struct.pack(">I", 0) + pack_shortstr("PLAIN") + pack_longstr(response) + pack_shortstr("en_US"),
    )
    tune = expect(sock, 10, 30)
    channel_max, frame_max, _heartbeat = struct.unpack(">HIH", tune)
    send_method(sock, 0, 10, 31, struct.pack(">HIH", channel_max, frame_max, 0))
    send_method(sock, 0, 10, 40, pack_shortstr("/") + pack_shortstr("") + bytes([0]))
    expect(sock, 10, 41)
    send_method(sock, 1, 20, 10, pack_shortstr(""))
    expect(sock, 20, 11)
    return sock


def declare_durable_queue(sock):
    # passive=0, durable=1, exclusive=0, auto-delete=0, no-wait=0
    queue_type = pack_shortstr("x-queue-type") + b"S" + pack_longstr("classic")
    arguments = struct.pack(">I", len(queue_type)) + queue_type
    send_method(
        sock,
        1,
        50,
        10,
        struct.pack(">H", 0) + pack_shortstr(QUEUE) + bytes([2]) + arguments,
    )
    expect(sock, 50, 11)
    print("DECLARED lab.durable durable=1 type=classic", flush=True)


def enable_confirms(sock):
    send_method(sock, 1, 85, 10, bytes([0]))
    expect(sock, 85, 11)


def publish(sock, payload):
    body = payload.encode()
    send_method(
        sock,
        1,
        60,
        40,
        struct.pack(">H", 0) + pack_shortstr("") + pack_shortstr(QUEUE) + bytes([0]),
    )
    props = struct.pack(">H", 0x1000) + bytes([2])
    header = struct.pack(">HHQ", 60, 0, len(body)) + props
    sock.sendall(struct.pack(">BHI", 2, 1, len(header)) + header + b"\xce")
    sock.sendall(struct.pack(">BHI", 3, 1, len(body)) + body + b"\xce")
    expect(sock, 60, 80)


def qos_one(sock):
    send_method(sock, 1, 60, 10, struct.pack(">IH", 0, 1) + bytes([0]))
    expect(sock, 60, 11)


def start_consumer(sock):
    send_method(
        sock,
        1,
        60,
        20,
        struct.pack(">H", 0) + pack_shortstr(QUEUE) + pack_shortstr("lab") + bytes([0]) + struct.pack(">I", 0),
    )
    expect(sock, 60, 21)


def read_delivery(sock):
    _channel, class_id, method_id, body = read_method(sock)
    if (class_id, method_id) != (60, 60):
        raise RuntimeError(f"expected basic.deliver, got {class_id}.{method_id}")
    index = 0
    _consumer, index = take_shortstr(body, index)
    delivery_tag = struct.unpack_from(">Q", body, index)[0]
    index += 8
    redelivered = body[index] & 1
    frame_type, _channel, payload = read_frame(sock)
    if frame_type != 2:
        raise RuntimeError(f"expected content header, got {frame_type}")
    _class_id, _weight, size = struct.unpack_from(">HHQ", payload)
    message = b""
    while len(message) < size:
        frame_type, _channel, payload = read_frame(sock)
        if frame_type != 3:
            raise RuntimeError(f"expected body frame, got {frame_type}")
        message += payload
    return delivery_tag, redelivered, message.decode()


def ack(sock, delivery_tag):
    send_method(sock, 1, 60, 80, struct.pack(">Q", delivery_tag) + bytes([0]))


def skip_content(sock):
    frame_type, _channel, payload = read_frame(sock)
    if frame_type != 2:
        raise RuntimeError(f"expected content header, got {frame_type}")
    _class_id, _weight, size = struct.unpack_from(">HHQ", payload)
    remaining = size
    while remaining > 0:
        frame_type, _channel, payload = read_frame(sock)
        if frame_type != 3:
            raise RuntimeError(f"expected body frame, got {frame_type}")
        remaining -= len(payload)


def cancel_consumer(sock):
    send_method(sock, 1, 60, 30, pack_shortstr("lab") + bytes([0]))
    while True:
        _channel, class_id, method_id, _body = read_method(sock)
        if (class_id, method_id) == (60, 31):
            return
        if (class_id, method_id) == (60, 60):
            skip_content(sock)
            continue
        raise RuntimeError(f"expected basic.cancel-ok, got {class_id}.{method_id}")


def close(sock):
    send_method(sock, 0, 10, 50, struct.pack(">H", 200) + pack_shortstr("ok") + struct.pack(">HH", 0, 0))
    while True:
        _channel, class_id, method_id, _body = read_method(sock)
        if (class_id, method_id) == (10, 51):
            break
        if (class_id, method_id) == (60, 60):
            skip_content(sock)
            continue
        if (class_id, method_id) == (10, 50):
            send_method(sock, 0, 10, 51, b"")
            break
        raise RuntimeError(f"expected connection.close-ok, got {class_id}.{method_id}")
    sock.close()


def credentials():
    user = os.environ["AMQP_USER"]
    password = os.environ["AMQP_PASS"]
    host = os.environ.get("AMQP_HOST", "lab-broker")
    return host, user, password


def main(argv):
    mode = argv[1] if len(argv) > 1 else ""
    host, user, password = ("lab-broker", "guest", "guest") if mode == "guest-denied" else credentials()
    try:
        sock = connect(host, user, password, 20)
    except AccessRefused as refused:
        if mode == "guest-denied":
            print(f"GUEST-DENIED {refused.code}", flush=True)
            return 0
        print(f"ACCESS-REFUSED {refused.code}", file=sys.stderr)
        return 1
    except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError, EOFError):
        if mode == "guest-denied":
            print("GUEST-DENIED reset", flush=True)
            return 0
        print("CONNECTION-CLOSED", file=sys.stderr)
        return 1
    if mode == "guest-denied":
        print("GUEST-OPEN", flush=True)
        sock.close()
        return 1
    if mode == "publish":
        declare_durable_queue(sock)
        enable_confirms(sock)
        for payload in ("1", "2", "3"):
            publish(sock, payload)
            print(f"PUBLISHED {payload}", flush=True)
        close(sock)
        return 0
    qos_one(sock)
    start_consumer(sock)
    if mode == "ack-one":
        delivery_tag, redelivered, payload = read_delivery(sock)
        # Cancel while this delivery is still unacked. Prefetch is 1, so the
        # broker has not sent the next message. Acking first would deliver it
        # and mark it redelivered when this connection closes.
        cancel_consumer(sock)
        ack(sock, delivery_tag)
        print(f"ACK {payload} redelivered={redelivered}", flush=True)
        close(sock)
        return 0
    if mode == "hold":
        _delivery_tag, redelivered, payload = read_delivery(sock)
        print(f"HOLD {payload} redelivered={redelivered}", flush=True)
        time.sleep(600)
        return 0
    if mode == "drain":
        for _ in range(2):
            delivery_tag, redelivered, payload = read_delivery(sock)
            ack(sock, delivery_tag)
            print(f"DRAIN {payload} redelivered={redelivered}", flush=True)
        cancel_consumer(sock)
        close(sock)
        return 0
    print("unknown mode", file=sys.stderr)
    return 2


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv))
    except Exception as exc:
        print(f"SMOKE-ERROR {type(exc).__name__}: {exc}", file=sys.stderr)
        sys.exit(1)
