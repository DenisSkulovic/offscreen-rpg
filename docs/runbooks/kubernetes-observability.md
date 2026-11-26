# Kubernetes observability

Selected **native platform** path for optional local Prometheus, Loki, Tempo, OpenTelemetry Collector, and Grafana on dev or release Kind targets. Canonical contract: [Native observability infrastructure](../technical/platform/observability-native-infrastructure.md). This is not the game, not Compose, and not [First hosted deployment](../technical/platform/deployment-and-compatibility.md#first-hosted-deployment). Application enrollment remains unselected; no claim that live acceptance has passed.

The workstation Python observer in `infra/monitoring/` is separate. [Workstation observability](workstation-observability.md) records host-level measurement only.

## What the selected native platform is

Five independently versioned Helm releases (`obs-prometheus`, `obs-loki`, `obs-tempo`, `obs-collector`, `obs-grafana`) under `offscreen-dev-observability` or `offscreen-observability`. Vendored chart archives and frozen image digests live in `infra/platform/observability/`. Platform ensure/status uses the ordinary infra CLI; synthetic bounded proof uses an isolated query harness under `infra/verification/smoke/observability/`.

## Plan, ensure, and read-only status

```bash
pnpm infra:plan --env dev --services observability --json
pnpm infra:up --env dev --services observability --json
pnpm infra:status --env dev --services observability --json
```

Release profile substitutes `release` for `dev`. Dev is the primary target for optional structural support; release live mutation remains separately gated. Render offline manifests:

```bash
node infra/platform/common/cli.mjs render observability dev all --format yaml
```

## Authorized synthetic proof (not default verification)

Proof requires explicit authorization and a prepared target. It does not mutate the platform inventory namespace. Entrypoints:

```bash
OFFSCREEN_OBSERVABILITY_PROOF=authorized node infra/verification/smoke/observability/proof.mjs health dev kind-offscreen-dev
OFFSCREEN_OBSERVABILITY_PROOF=authorized node infra/verification/smoke/observability/proof.mjs signals dev kind-offscreen-dev
OFFSCREEN_OBSERVABILITY_PROOF=authorized node infra/verification/smoke/observability/proof.mjs resources dev kind-offscreen-dev
```

Diagnostic source checks register native inventory/install/render tests via `pnpm infra:verify --suite diagnostic --observability --json`. That is workstation source proof only, not live acceptance.

## Historical single-collector lab proof (retired runnable path)

The former single-chart collector plus two synthetic HTTP hops (`hop-a` / `hop-b`) with `install.sh`, `setup.sh`, and `smoke.sh` is **retired from the runnable tree**. Historical pins, failure semantics, and the 2026-11-19 observed run are preserved in the immutable design dossier at [observability-platform @ 7bbdb6d9](https://github.com/DenisSkulovic/offscreen-rpg/tree/7bbdb6d9a4a0cbe2ad22d74c4a335a57eb7191e3/work/designs/open/observability-platform). That slice recorded one two-hop OTLP trace and one missing-hop failure on a disposable `kind-offscreen-release` cluster; it did not instrument the game.

Do not treat a historical collector proof as coverage of the native five-release platform or of application telemetry. Live acceptance for the selected native platform remains **NOT RUN** until separately authorized and recorded.