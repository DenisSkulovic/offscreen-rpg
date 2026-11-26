#!/usr/bin/env python3
"""Worker-loss pod roles backed by amqp_smoke.py. Prints no credentials."""

import importlib.util
import sys
from pathlib import Path


def load_main():
    path = Path(__file__).with_name("amqp_smoke.py")
    spec = importlib.util.spec_from_file_location("amqp_smoke", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.main


def main(argv):
    mode = argv[1] if len(argv) > 1 else ""
    if mode in ("hold", "replacement", "publish"):
        return load_main()(argv)
    print("unknown mode", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))