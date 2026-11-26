# Windows + WSL2

Initial reference: Ubuntu 24.04 x86-64 inside WSL2. Enable Docker Desktop WSL integration for this distribution; keep the checkout in the Linux filesystem. Do not install a second Docker daemon in WSL. Install Git and Bash before cloning.

From the repository root, run `bash infra/host/check.sh`. If system packages are missing, explicitly authorize `bash infra/host/setup.sh --install-system-packages`. Otherwise setup is read-only and reports missing prerequisites.

Install missing tools using their official instructions; retain compatible existing installations. Reference versions are not universal compatibility guarantees.

| Tool | Reference | Official instructions |
| --- | --- | --- |
| Node | read .node-version | https://nodejs.org/en/download |
| pnpm | read package.json packageManager | https://pnpm.io/installation |
| Kind | 0.33.0 | https://kind.sigs.k8s.io/docs/user/quick-start/ |
| kubectl | 1.37.2 | https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/ |
| Helm | 3.22.1 | https://helm.sh/docs/intro/install/ |
| Tilt | 0.35.2 | https://docs.tilt.dev/install.html |
| Docker Desktop | 29.9.3 | https://docs.docker.com/desktop/features/wsl/ |

Choose Linux amd64 binaries inside WSL, verify upstream checksums where available, install in a directory on PATH. Do not blindly replace existing version managers or pipe downloaded code into a shell. Repeat setup and resolve reported failures before proceeding. Node and pnpm pins are checked exactly; other tool versions are reported, not fully certified by the host check.
