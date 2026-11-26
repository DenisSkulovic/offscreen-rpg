# Native Redis baseline — operator failure notes

**Live proof:** isolated dev/release lifecycle, repeat ensure, fault recovery and measured preservation passed on recorded candidates. Final cleanup correction is source-tested only. See Change acceptance observations. Live mutation requires separate authorization.

## Pending receipt and lock paths

| Context | Pending file | Lock file |
| --- | --- | --- |
| `kind-offscreen-dev` | `~/.local/state/offscreen-rpg/platform-locks/kind-offscreen-dev-redis.pending` | `~/.local/state/offscreen-rpg/platform-locks/kind-offscreen-dev-redis.lock` |
| `kind-offscreen-release` | `~/.local/state/offscreen-rpg/platform-locks/kind-offscreen-release-redis.pending` | `~/.local/state/offscreen-rpg/platform-locks/kind-offscreen-release-redis.lock` |

## Unclear Helm or kubectl outcome

When a Helm or kubectl step returns an unclear result, the pending file remains. A later ensure or smoke in that context refuses while the pending file exists.

## Before cleanup

Record namespace, namespace UID, operation id, and the receipt detail before any cleanup. Do not delete the pending file as the first step.

## Disposable smoke namespace cleanup only

Cleanup of a generated smoke namespace is allowed only when the name matches `offscreen-redis-proof-` plus exactly 32 hexadecimal characters, and only with that namespace UID and `resourceVersion`. Never delete `lab-a`, `offscreen-dev-redis`, or any other namespace from this procedure.

## Legacy objects and integration

Canonical legacy objects are not deleted by this change. Owner accepted interim legacy refusal for structural integration. Canonical cutover remains separately gated.

## No automated receipt clear

There is no `install.mjs` subcommand that clears the receipt.

## Smoke-failure (expected install fault)

With `OFFSCREEN_REDIS_SMOKE_DISPOSABLE=confirmed`, run the disposable smoke-failure selector (for example via `infra/verification/smoke/redis/smoke.sh failure <dev|release>`), which invokes `node infra/platform/redis/install.mjs smoke-failure <profile> <exact-context>`. This uses an internally generated `offscreen-redis-proof-…` namespace and a fault-only chart copy with the zero digest image; ordinary ensure/smoke never accept that pin.

When Helm/kubectl failure is the expected outcome, the generated namespace and pending receipt are **retained** (no automatic cleanup). The receipt records target, nonce, namespace UID when known, operation ID, and redacted fault evidence. The next ordinary `ensure` or `smoke` in the same context refuses before any write while that pending file exists.

There is still no receipt-clear or recovery subcommand on `install.mjs`. Operator recovery after an authorized review of the retained receipt and namespace remains manual and is not scripted from this runbook.