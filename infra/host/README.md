# Host preparation

Run from a fresh clone, before requiring Node or pnpm:

```bash
bash infra/host/check.sh
bash infra/host/setup.sh
```

Supported setup: [Windows + WSL2 Ubuntu 24.04 x86-64](windows-wsl/README.md).
[Native Linux](linux/README.md) and [macOS](macos/README.md) are explicitly NOT IMPLEMENTED.

Setup does not install Docker Desktop, download arbitrary executables or modify Windows settings. Optional system packages require explicit --install-system-packages. A missing CLI is a blocker with a documented official installation route. Check success is host prerequisite observation, not a guarantee of complete infrastructure compatibility.
