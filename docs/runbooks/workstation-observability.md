# Workstation observability | operator runbook

**Do not activate on a production workstation from this repository alone.** Source composition for [INF49](../../work/changes/archive/2026-11/platform-operations/2026-11-24--inf49-monitor-composition/CHANGE.md) is proven by staged fixture tests (real `install.sh` tree + real `collector.py --config` under unprivileged temp roots). Historical status/report/export CLIs for [INF47](../../work/changes/archive/2026-11/platform-operations/2026-11-24--inf47-historical-observability-queries/CHANGE.md) are fixture-tested against private temp state. Live native install, Netdata activation, nested runtime visibility, and live historical queries remain **separately operator-authorized**.

[Technical contract](../technical/platform/workstation-observability.md). Workstation collector independent of Kubernetes and game. No cloud connection, no raw process argv exports.

**Source acceptance (INF44–49):** `infra/monitoring/` ships the guarded installer, flat-module collector entrypoint, host cadence, and nested runtime modules (`runtime.py`, `kube.py`, `cgroup_probe.sh`). Staged fixtures demonstrate emitted JSONL (`schemaVersion=1`) including host windows, rollups, process snapshots, coverage, and health. They **do not** claim a live systemd-managed collector, live Netdata dbengine tier counts, or live Docker/Kind/cgroup visibility until an operator completes native package install and **authorized** activation.

## Prerequisites (operator)

1. Linux with **systemd as PID 1** (including WSL2 when enabled per vendor docs).
2. **Netdata Agent v2** installed from a **trusted distro or vendor package** (not curl-pipe-shell; this repository does not add package repositories).
3. **python3 ≥ 3.9** for the companion (stdlib only in later INF44 tasks).
4. Run installs as the **actual workstation user** (not root). `HOME` must be absolute and not a symlink.

If systemd, Netdata v2, or python3 is missing, `install.sh` reports **BLOCKED** with the exact prerequisite.

## Installation lifecycle

Tracked files:

| Path | Role |
|------|------|
| `infra/monitoring/config/netdata.conf` | Owned Netdata v2 dbengine tiers, loopback web bind, telemetry/cloud opt-out |
| `infra/monitoring/systemd/offscreen-monitor@.service` | Companion unit (`User=%i`, absolute config, `Restart=on-failure`, 5s backoff) |
| `infra/monitoring/install.sh` | Read-only plan and guarded apply |

### 1. Plan (read-only, default)

```sh
bash infra/monitoring/install.sh --plan
```

Prints destinations under `/usr/local/lib/offscreen-monitor`, `/etc/offscreen-monitor/<user>.json`, `~/.local/state/offscreen-monitor`, and the declared systemd unit. **No sudo, no package install, no service start.**

Refuses when:

- existing **foreign** Netdata config or `offscreen-monitor@.service` unit without `offscreen-monitor-managed` marker
- loopback **19999** held by an unowned listener
- `HOME` symlink, missing prerequisites, or Netdata v2 not detected

### 2. Apply (explicit confirmation)

```sh
bash infra/monitoring/install.sh --apply --confirm
```

Copies owned companion tree, writes per-user JSON config (absolute paths only; no credential content), installs the **declared unit only**, and installs owned Netdata config when permitted. Existing **unowned** Netdata config is **not** overwritten unless the operator used a separate backup and passes `--netdata-replace`.

Does **not** implicitly enable Docker, kubeconfig, `wsl.conf`, or privileged collectors.

### 3. Activate (separate operator authorization)

```sh
bash infra/monitoring/install.sh --apply --confirm --activate
```

Enables and starts `offscreen-monitor@$USER.service`, verifies loopback `127.0.0.1:19999` and Netdata dbengine tier support via API, and writes `~/.local/state/offscreen-monitor/capability-manifest.json`. Any missing capability reports **BLOCKED** (no silent partial install).

**Source fixture tests never use `--activate`.** Live activation is operator-only.

Native dashboard after authorized install: **http://127.0.0.1:19999** (loopback only).

## Inspection (source CLI, INF47; live data separately authorized)

```sh
pnpm infra:monitor:status
pnpm infra:monitor:report --last 30m
pnpm infra:monitor:report --from 2026-11-24T18:00:00Z --to 2026-11-24T19:00:00Z --slot dev-10 --json
pnpm infra:monitor:export --from 2026-11-24T00:00:00Z --to 2026-11-25T00:00:00Z --out /tmp/offscreen-incident
```

### Query a time range

1. Confirm companion coverage first: `pnpm infra:monitor:status` and note disabled streams, heartbeat age, and storage oldest/newest.
2. Choose an absolute UTC window (90 days maximum) with `pnpm infra:monitor:report --from ISO --to ISO [--slot dev-N] [--json]`.
3. Read `partialRange`, segment `gaps`, source timestamps, and `correlationNote` in the JSON; treat overlap as **temporal evidence only**—do not rank causes from timestamps alone.

### Identify resource consumers (no causal ranking)

| Layer | Where to look | Interpretation |
|-------|----------------|----------------|
| Host memory fast path | Report `host.MemAvailable` (mean, retained spike max) | Observed sample extrema; sub-second peaks may be absent between samples |
| Top processes | Report `process.rssTop` / `cpuTop` / `pssTop` | Per-process peaks are **not additive**; PSS is separate |
| Nested runtime | Report `runtime.docker` / `pods` / `cgroups` | Keep pod, container, and host layers separate; watch `doubleCountRisk` |
| Native metrics | Netdata dashboard **http://127.0.0.1:19999** (loopback only) | Vendor dbengine series; use CLI report for correlated supplemental evidence |

Export (`infra:monitor:export`) writes a sanitized bundle outside the tracked tree (or a verified git-ignored path): manifest, events, supplemental JSONL, and a small CSV summary. Cap 100 MiB; refuses secrets, kubeconfig bodies, raw atop, and argv/env. Missing optional streams are listed under `partialSources` without failing unless the supplemental state root itself is absent.

Read current coverage before interpretation. Min/max observed vs kernel peak, source measurement timestamp vs collection time, separate nested scopes, unknown gaps and collector cost. No live data export without user request. Service stop is not data deletion; never clear vendor DB to fix a query. Retention actual may be shorter than targets.

## Coverage notes

- Collector is intended to start on **distro boot**, but **WSL shutdown stops collection**; gaps are recorded as coverage, not zero.
- Optional atop raw logging stays **off** until explicit acknowledgement of sensitive argv retention.
- WSL distro metrics differ from Docker/Kind descendants and from Windows host RAM; do not treat Linux `MemTotal` as physical Windows RAM.

See the technical contract for retention targets, schema, and proof requirements.