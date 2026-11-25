#!/usr/bin/env python3
"""Fixture tests for infra/monitoring/install.sh plan/apply guards."""

from __future__ import annotations

import json
import os
import shutil
import signal
import stat
import subprocess
import sys
import tempfile
import textwrap
import time
import unittest
import uuid
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
INSTALL_SH = REPO_ROOT / "install.sh"
COLLECTOR_PY = REPO_ROOT / "collector.py"


def _records_from_state(state_root: Path) -> list[dict]:
    from storage import read_all_complete_records

    records: list[dict] = []
    for path in sorted(state_root.glob("*.jsonl")):
        records.extend(read_all_complete_records(path))
    return records


def _write_executable(path: Path, body: str) -> None:
    path.write_text(textwrap.dedent(body).lstrip(), encoding="utf-8")
    path.chmod(path.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)


class InstallFixtureTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory(prefix="offscreen-monitor-install-")
        self.root = Path(self._tmp.name)
        self.home = self.root / "home" / "operator"
        self.home.mkdir(parents=True)
        self.bin = self.root / "bin"
        self.bin.mkdir()
        self.proc1 = self.root / "proc1-comm"
        self.proc1.write_text("systemd", encoding="utf-8")

        self.lib_prefix = self.root / "usr" / "local" / "lib" / "offscreen-monitor"
        self.etc_prefix = self.root / "etc" / "offscreen-monitor"
        self.unit_dir = self.root / "etc" / "systemd" / "system"
        self.netdata_conf = self.root / "etc" / "netdata" / "netdata.conf"
        self.state_root = self.home / ".local" / "state" / "offscreen-monitor"

        _write_executable(
            self.bin / "python3",
            """
            #!/bin/sh
            REAL_PY="/usr/bin/python3"
            if [ ! -x "$REAL_PY" ]; then
              REAL_PY="$(command -v python3 | while read -r p; do
                case "$p" in
                  *"/bin/python3") echo "$p"; break ;;
                esac
              done)"
            fi
            exec "$REAL_PY" "$@"
            """,
        )
        _write_executable(
            self.bin / "netdata-version",
            """
            #!/bin/sh
            echo "netdata v2.1.0"
            exit 0
            """,
        )
        _write_executable(
            self.bin / "port-check",
            """
            #!/bin/sh
            if [ "$1" = "verify-loopback" ]; then
              exit 0
            fi
            # No listener in fixtures unless PORT_COLLISION=1.
            if [ "${PORT_COLLISION:-0}" = "1" ] && [ "$1" = "19999" ]; then
              exit 0
            fi
            exit 1
            """,
        )
        _write_executable(
            self.bin / "systemctl",
            """
            #!/bin/sh
            echo "systemctl $*" >>"${SYSTEMCTL_LOG:-/dev/null}"
            exit 0
            """,
        )
        _write_executable(
            self.bin / "getent",
            """
            #!/bin/sh
            if [ "$1" = "passwd" ] && [ "$2" = "operator" ]; then
              echo "operator:x:1000:1000:Operator:${HOME}:/bin/bash"
              exit 0
            fi
            if [ "$1" = "group" ] && [ "$2" = "1000" ]; then
              echo "operator:x:1000:"
              exit 0
            fi
            exit 2
            """,
        )

        self.env = os.environ.copy()
        self.env.update(
            {
                "HOME": str(self.home),
                "PATH": f"{self.bin}:{self.env.get('PATH', '')}",
                "OFFSCREEN_MONITOR_FIXTURE": "1",
                "OFFSCREEN_MONITOR_REPO_ROOT": str(REPO_ROOT),
                "OFFSCREEN_MONITOR_LIB_PREFIX": str(self.lib_prefix),
                "OFFSCREEN_MONITOR_ETC_PREFIX": str(self.etc_prefix),
                "OFFSCREEN_MONITOR_UNIT_DIR": str(self.unit_dir),
                "OFFSCREEN_MONITOR_NETDATA_CONF": str(self.netdata_conf),
                "OFFSCREEN_MONITOR_STATE_ROOT": str(self.state_root),
                "OFFSCREEN_MONITOR_PROC1_COMM_FILE": str(self.proc1),
                "OFFSCREEN_MONITOR_RUN_PYTHON": str(self.bin / "python3"),
                "OFFSCREEN_MONITOR_RUN_NETDATA_VERSION": str(self.bin / "netdata-version"),
                "OFFSCREEN_MONITOR_RUN_PORT_CHECK": str(self.bin / "port-check"),
                "OFFSCREEN_MONITOR_RUN_SYSTEMCTL": str(self.bin / "systemctl"),
                "OFFSCREEN_MONITOR_CALLER_UID": "1000",
                "OFFSCREEN_MONITOR_CALLER_USER": "operator",
                "OFFSCREEN_MONITOR_SKIP_DAEMON_RELOAD": "1",
                "SYSTEMCTL_LOG": str(self.root / "systemctl.log"),
            }
        )

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def _run(self, *args: str, extra_env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
        env = self.env.copy()
        if extra_env:
            env.update(extra_env)
        return subprocess.run(
            ["bash", str(INSTALL_SH), *args],
            cwd=REPO_ROOT,
            env=env,
            text=True,
            capture_output=True,
            check=False,
        )

    def test_plan_default_read_only(self) -> None:
        result = self._run("--plan")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("mode: plan", result.stdout)
        self.assertFalse(self.lib_prefix.exists())
        log_path = Path(self.env["SYSTEMCTL_LOG"])
        self.assertFalse(log_path.exists())

    def test_refuse_foreign_netdata_config(self) -> None:
        self.netdata_conf.parent.mkdir(parents=True, exist_ok=True)
        self.netdata_conf.write_text("[global]\n", encoding="utf-8")
        result = self._run("--plan")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("BLOCKED", result.stderr)
        self.assertIn("existing Netdata config", result.stderr)

    def test_refuse_port_collision_without_owned_listener(self) -> None:
        result = self._run("--plan", extra_env={"PORT_COLLISION": "1"})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("port 19999", result.stderr)

    def test_apply_uses_stable_absolute_paths(self) -> None:
        result = self._run("--apply", "--confirm")
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        unit = self.unit_dir / "offscreen-monitor@.service"
        self.assertTrue(unit.exists())
        unit_text = unit.read_text(encoding="utf-8")
        self.assertIn("/usr/local/lib/offscreen-monitor/collector.py", unit_text)
        self.assertIn("/etc/offscreen-monitor/%i.json", unit_text)
        self.assertNotIn("offscreen_monitor.collector", unit_text)
        self.assertIn("User=%i", unit_text)

        user_config = self.etc_prefix / "operator.json"
        self.assertTrue(user_config.exists())
        payload = json.loads(user_config.read_text(encoding="utf-8"))
        self.assertEqual(payload["stateRoot"], str(self.state_root))
        self.assertTrue(str(payload["stateRoot"]).startswith(str(self.home)))
        uuid.UUID(str(payload["installationId"]))

        self.assertTrue((self.lib_prefix / "cgroup_probe.sh").exists())
        self.assertTrue((self.lib_prefix / "collector.py").exists())

        self.assertTrue(self.netdata_conf.exists())
        self.assertIn("offscreen-monitor-managed", self.netdata_conf.read_text(encoding="utf-8"))

        self.assertTrue(self.state_root.exists())
        self.assertEqual(stat.S_IMODE(self.state_root.stat().st_mode), 0o700)

    def test_repeat_apply_preserves_installation_id(self) -> None:
        first = self._run("--apply", "--confirm")
        self.assertEqual(first.returncode, 0, first.stderr)
        user_config = self.etc_prefix / "operator.json"
        first_id = json.loads(user_config.read_text(encoding="utf-8"))["installationId"]

        second = self._run("--apply", "--confirm")
        self.assertEqual(second.returncode, 0, second.stderr)
        second_id = json.loads(user_config.read_text(encoding="utf-8"))["installationId"]
        self.assertEqual(first_id, second_id)

    def test_repeat_apply_idempotent(self) -> None:
        first = self._run("--apply", "--confirm")
        self.assertEqual(first.returncode, 0, first.stderr)
        second = self._run("--apply", "--confirm")
        self.assertEqual(second.returncode, 0, second.stderr)

        log_path = Path(self.env["SYSTEMCTL_LOG"])
        if log_path.exists():
            self.assertNotIn("start", log_path.read_text(encoding="utf-8").lower())

    def test_apply_without_confirm_refused(self) -> None:
        result = self._run("--apply")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("--confirm", result.stderr)

    def test_refuse_hostile_lib_symlink(self) -> None:
        evil = self.root / "evil-lib"
        evil.mkdir(parents=True, exist_ok=True)
        self.lib_prefix.parent.mkdir(parents=True, exist_ok=True)
        self.lib_prefix.symlink_to(evil)
        result = self._run("--plan")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("symlink", result.stderr)

    def test_refuse_foreign_file_in_lib_tree(self) -> None:
        self.lib_prefix.mkdir(parents=True)
        (self.lib_prefix / "collector.py").write_text("foreign", encoding="utf-8")
        result = self._run("--apply", "--confirm")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("foreign", result.stderr.lower())

    def test_collector_entrypoint_missing_config(self) -> None:
        missing = self.root / "missing.json"
        proc = subprocess.run(
            [sys.executable, str(COLLECTOR_PY), "--config", str(missing), "--fixture", "--max-ticks", "1"],
            cwd=REPO_ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("invalid config", proc.stderr)

    def test_collector_entrypoint_fixture_mode(self) -> None:
        self._run("--apply", "--confirm")
        user_config = self.etc_prefix / "operator.json"
        staged_collector = self.lib_prefix / "collector.py"
        proc = subprocess.run(
            [
                sys.executable,
                str(staged_collector),
                "--config",
                str(user_config),
                "--fixture",
                "--max-ticks",
                "3",
            ],
            cwd=self.lib_prefix,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(proc.returncode, 0, proc.stderr + proc.stdout)
        self.assertTrue(self.state_root.exists())

    def test_staged_installed_service_composition(self) -> None:
        self._run("--apply", "--confirm")
        user_config = self.etc_prefix / "operator.json"
        payload = json.loads(user_config.read_text(encoding="utf-8"))
        installation_id = str(payload["installationId"])
        staged_collector = self.lib_prefix / "collector.py"
        base_cmd = [
            sys.executable,
            str(staged_collector),
            "--config",
            str(user_config),
            "--fixture",
        ]

        running = subprocess.Popen(
            base_cmd,
            cwd=self.lib_prefix,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            text=True,
        )
        time.sleep(6.0)
        running.send_signal(signal.SIGTERM)
        stopped = running.wait(timeout=15)
        stderr = running.stderr.read() if running.stderr else ""
        self.assertEqual(stopped, 0, stderr)

        records_after_sigterm = _records_from_state(self.state_root)
        sessions_after_sigterm = {
            str(record["collectorSession"])
            for record in records_after_sigterm
            if record.get("collectorSession")
        }
        self.assertEqual(len(sessions_after_sigterm), 1)
        session_first = next(iter(sessions_after_sigterm))

        host_windows = [
            record
            for record in records_after_sigterm
            if record.get("kind") == "host_window" and record.get("source") == "host-fast-meminfo"
        ]
        self.assertGreater(len(host_windows), 2)
        window = host_windows[0]
        self.assertEqual(window["schemaVersion"], 1)
        self.assertTrue(window["scopeId"].startswith(f"{installation_id}:"))
        self.assertEqual(int(window.get("window", {}).get("scheduledCount", 0)), 5)
        self.assertGreaterEqual(len(window.get("samples", [])), 1)

        from storage import read_all_complete_records

        process_paths = list(self.state_root.glob("process-*.jsonl"))
        self.assertTrue(process_paths)
        process_stream = [
            record for path in process_paths for record in read_all_complete_records(path)
        ]
        self.assertGreater(len(process_stream), 0)
        coverage = process_stream[0].get("coverage", {})
        self.assertIn("counts", coverage)

        continued = subprocess.run(
            base_cmd + ["--max-ticks", "120"],
            cwd=self.lib_prefix,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(continued.returncode, 0, continued.stderr + continued.stdout)

        all_records = _records_from_state(self.state_root)
        sessions_all = {
            str(record["collectorSession"])
            for record in all_records
            if record.get("collectorSession")
        }
        self.assertIn(session_first, sessions_all)
        self.assertGreater(len(sessions_all), 1)

    def test_build_collector_from_config_fixture(self) -> None:
        if str(REPO_ROOT) not in sys.path:
            sys.path.insert(0, str(REPO_ROOT))
        from collector import CollectorConfig, build_collector_from_config

        config_path = self.root / "collector-config.json"
        installation_id = str(uuid.uuid4())
        config_path.write_text(
            json.dumps(
                {
                    "installationId": installation_id,
                    "stateRoot": str(self.state_root),
                }
            ),
            encoding="utf-8",
        )
        config = CollectorConfig.load_once(config_path)
        collector = build_collector_from_config(config, fixture=True)
        self.assertEqual(config.installation_id, installation_id)
        collector.run_until(max_ticks=2)

    def test_plan_does_not_invoke_sudo_or_daemon_start(self) -> None:
        sudo_path = self.bin / "sudo"
        _write_executable(
            sudo_path,
            """
            #!/bin/sh
            echo "sudo should not run" >&2
            exit 99
            """,
        )
        result = self._run("--plan")
        self.assertEqual(result.returncode, 0, result.stderr)
        log_path = Path(self.env["SYSTEMCTL_LOG"])
        self.assertFalse(log_path.exists())

    def test_activation_manifest_unknown_tier_not_literal_three(self) -> None:
        apply = self._run("--apply", "--confirm")
        self.assertEqual(apply.returncode, 0, apply.stderr)
        result = self._run(
            "--apply",
            "--confirm",
            "--activate",
            extra_env={"OFFSCREEN_MONITOR_NETDATA_INFO_JSON": '{"version":"v2.1.0"}'},
        )
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        manifest_path = self.state_root / "capability-manifest.json"
        self.assertTrue(manifest_path.exists())
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        self.assertIsNone(manifest["netdata"]["dbengineTiers"])


if __name__ == "__main__":
    unittest.main()