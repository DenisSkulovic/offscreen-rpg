#!/usr/bin/env python3
"""Fixture tests for infra/monitoring/install.sh plan/apply guards."""

from __future__ import annotations

import json
import os
import shutil
import stat
import subprocess
import tempfile
import textwrap
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
INSTALL_SH = REPO_ROOT / "install.sh"


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

        self.env = os.environ.copy()
        self.env.update(
            {
                "HOME": str(self.home),
                "PATH": f"{self.bin}:{self.env.get('PATH', '')}",
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
        self.assertIn("/usr/local/lib/offscreen-monitor", unit_text)
        self.assertIn("/etc/offscreen-monitor/%i.json", unit_text)

        user_config = self.etc_prefix / "operator.json"
        self.assertTrue(user_config.exists())
        payload = json.loads(user_config.read_text(encoding="utf-8"))
        self.assertEqual(payload["stateRoot"], str(self.state_root))
        self.assertTrue(str(payload["stateRoot"]).startswith(str(self.home)))

        self.assertTrue(self.netdata_conf.exists())
        self.assertIn("offscreen-monitor-managed", self.netdata_conf.read_text(encoding="utf-8"))

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


if __name__ == "__main__":
    unittest.main()