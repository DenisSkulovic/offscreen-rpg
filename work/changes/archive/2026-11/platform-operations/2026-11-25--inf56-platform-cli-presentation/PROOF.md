# INF56 | proof

## Focused source suite

```bash
node --test \
  infra/environments/infra-cli.test.mjs \
  infra/environments/infra-cli-operation.test.mjs \
  infra/environments/infra-presentation.test.mjs \
  infra/environments/platform-plan.test.mjs
```

Observed on Change branch `change/inf56-platform-cli-presentation` (base main `1ee7a651`): **61 pass / 0 fail / exit 0**. Tier: pure (fake runners / clocks; no Kubernetes).

Discriminating negatives exercised in suite: `--no-color` without `--human` refuses; conflicting `--human`/`--json` refuses; malicious phase detail omitted from human text; no phase START after cluster-ensure FAIL; progress callback throw does not change operational result.

## Source-generated human samples (no live infra up)

### status --env dev --services postgres,redis --human (source fixture; cluster absent)

```text
OFFSCREEN
PLATFORM
cmd: status
env: dev
ctx: kind-offscreen-dev

scope: status
cluster: ABSENT
counts: absent 2
postgres ABSENT
redis ABSENT
observed: complete

next: node infra/environments/infra-cli.mjs status --env dev --services postgres,redis
```

### status --env release --services postgres,redis --human (source fixture; mixed readiness)

```text
OFFSCREEN
PLATFORM
cmd: status
env: release
ctx: kind-offscreen-release

scope: status
cluster: PRESENT
counts: ready 1 not ready 1
postgres READY
redis NOT READY
observed: complete

next: node infra/environments/infra-cli.mjs status --env release --services postgres,redis
```

### plan --env dev --services postgres,redis --human (source fixture)

```text
OFFSCREEN
PLATFORM
cmd: plan
env: dev
ctx: kind-offscreen-dev

preview: read-only
live: not observed
result: OK
services: postgres redis
preflight: target memory helm
phases:
cluster-ensure READONLY
cluster-verify READONLY
platform-ensure READONLY

next: node infra/environments/infra-cli.mjs status --env dev --services postgres,redis
```

### up --env dev --human success receipt (source fixture; no live ensure)

```text
OFFSCREEN
PLATFORM
cmd: up
env: dev
ctx: kind-offscreen-dev

result: OK
phase: complete
ran: cluster-ensure cluster-verify platform-ensure
skipped: cnpg

next: node infra/environments/infra-cli.mjs status --env dev --services core
```

## Explicitly NOT-RUN

- Live `infra:up` / cluster readiness against kind.
- Human operator acceptance walkthrough from the operator-experience standard.
