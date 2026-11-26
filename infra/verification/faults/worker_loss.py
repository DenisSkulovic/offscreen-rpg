#!/usr/bin/env python3
"""Compatibility shim; implementation lives in smoke/rabbitmq/worker_loss.py."""

import importlib.util
import sys
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "smoke" / "rabbitmq" / "worker_loss.py"
spec = importlib.util.spec_from_file_location("worker_loss", path)
if spec is None or spec.loader is None:
    raise SystemExit(f"cannot load {path}")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
sys.exit(module.main(sys.argv))