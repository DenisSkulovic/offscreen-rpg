# Native Redis baseline — operator failure notes

**Live proof:** NOT RUN. This page is source-only guidance. Do not run smoke or ensure against kind from this page.

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

Canonical legacy objects are not deleted by this change. Integration is held until the owner accepts that legacy refusal or authorizes a separate cutover.

## No automated receipt clear

There is no `install.mjs` subcommand that clears the receipt.