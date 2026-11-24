#!/usr/bin/env python3
"""One-message worker for the lab fault harness.

Reuses the RabbitMQ smoke client in the same directory. Prints no credentials.
"""

import importlib.util
import sys
import time
from pathlib import Path


def load_amqp():
    path = Path(__file__).with_name("amqp_smoke.py")
    spec = importlib.util.spec_from_file_location("amqp_smoke", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main(argv):
    mode = argv[1] if len(argv) > 1 else ""
    amqp = load_amqp()
    host, user, password = amqp.credentials()
    sock = amqp.connect(host, user, password, 20)
    if mode == "publish":
        if len(argv) != 3:
            print("publish requires a run id", file=sys.stderr)
            return 2
        run_id = argv[2]
        amqp.declare_durable_queue(sock)
        amqp.enable_confirms(sock)
        amqp.publish(sock, run_id)
        print(f"PUBLISHED {run_id}", flush=True)
        amqp.close(sock)
        return 0
    amqp.qos_one(sock)
    amqp.start_consumer(sock)
    delivery_tag, redelivered, payload = amqp.read_delivery(sock)
    print(f"APPLY {payload} redelivered={redelivered}", flush=True)
    if mode == "hold":
        time.sleep(600)
        return 0
    if mode == "drain":
        amqp.ack(sock, delivery_tag)
        print(f"DRAIN {payload} redelivered={redelivered}", flush=True)
        amqp.cancel_consumer(sock)
        amqp.close(sock)
        return 0
    print("unknown mode", file=sys.stderr)
    return 2


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv))
    except Exception as exc:
        print(f"WORKER-ERROR {type(exc).__name__}: {exc}", file=sys.stderr)
        sys.exit(1)
