# Kubernetes-first developer experience | owner-selected end state, not yet shipped

**Date and evidence:** 2026-11-20. Planner read attached ZIP 13bcd6cf and connected GitHub main through 8796daaa. Local unpushed Cursor work not inspected; executor must recheck HEAD and worktree. **State:** implementation program approved as desired outcome by owner; no code executed here. **Selection:** work/QUEUE.md remains the only active selector. Do not usurp BOOT03 or TURN02 in flight.

## Done means an actual one-command playable system

After a clone with pinned Node/pnpm, Docker engine, kind, kubectl and Tilt prerequisites installed, one ordinary application command, **pnpm dev**, must reconcile the dedicated kind-offscreen-lab cluster, deploy all real application and required infrastructure Pods, run migrations and pinned content import safely, open a stable loopback browser origin, report meaningful health, and keep Tilt watching application sources. The game at http://127.0.0.1:3000 and staff at /control must be usable with a reproducible local-only authenticated profile and a deterministic provider-free campaign. Tilt's local dashboard must expose build/resource/log state; Headlamp desktop must use the kind kubeconfig to browse, delete and observe replacement Pods and open logs/exec where supported. URL/port choices must be validated against TURN02, not hardcoded in tests without a running gateway.

We deliberately **do not** require an installed Kubernetes distribution besides kind, full Jenkins, Argo CD, production Helm release, multi-node HA, paid LLM invocation or cloud services. Docker engine remains essential to kind and image builds; removing Docker Compose does **not** mean eliminating Docker. Fast host-unit tests, lint, TS check and individual package process entrypoints remain valid; **application orchestration** becomes Kubernetes-only. No need to run separate app host watchers or manual SQL migrations to first play.

## Contract boundaries and decisions

1. The **release/acceptance lab** remains fixed at offscreen-lab / kind-offscreen-lab; never switch or delete foreign contexts, Docker volumes or unowned namespaces. DXK09 adds a distinct shared development cluster with branch/worktree-scoped logical stacks; normal dev work must not commandeer the release lab. Explicit opt-in for destructive reset. Kubernetes Pod listeners may bind 0.0.0.0 internally; published Windows/WSL endpoints stay 127.0.0.1. No NodePort or broad public interface.
2. **TURN02** remains the single owner of first real image-pinned application release: Next, Nest, Game Authority, outbox/control, Storyteller executor, migration Job, pinned S3 import, single same-origin edge. **TURN03/BOOT03/STORY03** own genuine distributed gameplay correctness. DXK packets consume their verified products, never duplicate those service manifests or forge a fake successful turn.
3. **DXK01** creates safe idempotent release-lab stack orchestration, existing-data protection, failure reporting and resource profile. **DXK02** adds Tilt/Headlamp and localhost UI workflow. **DXK03** owns authenticated playable local identity/fixture. **DXK04** sorts root scripts and specialized tools. **DXK05** migrates CI and removes old volume-presence assumptions. **DXK06** removes Compose after replacements work. **DXK07** installs the clean-clone acceptance gate. **DXK08** adds a genuinely fast development profile with Next Fast Refresh and targeted service reloads while preserving immutable release verification. **DXK09** adds branch/worktree-scoped parallel dev stacks on a shared dev cluster, with isolated ports and data tenancy. An independent final **Task** runs the finished program on the owner's approved Windows/WSL workstation.
4. **pnpm dev** is the one front door. Proposed non-watch lifecycle: pnpm stack:up reconciles existing resources and returns; pnpm stack:status diagnoses cluster/dependency/app/playable layers; pnpm stack:down stops only owned application resources and preserves data; pnpm stack:reset explicitly requests scoped destruction with exact cluster confirmation. Define managed localhost access lifecycle so stack:up never prints dead URLs; use a bounded manager or documented attach step. No silent orphan forwards. In conflict prefer a minimal reliable interface over many commands.
5. Provider-free default is not a mocked green API: the fixture must go through real Next/API/GA/SQL/S3/Temporal/publication edges and exercise a meaningful allowed action. If the current deterministic golden turn cannot do that, do not print READY. Local credentials remain inside disposable context; production auth never grants them access.
6. Clean up **active** old runtime files, modes, tests, CLI scripts, CI and docs after replacements. Historical commits, archived Change receipts and dated evidence may truthfully mention Docker Compose. This isn't a request to falsify history or grep-delete ordinary English verb "compose."

## Dependency and execution graph

Existing TURN02 T03→T04→T05→T06 enables real release; related BOOT03/STORY03/TURN03 determine what is playable. Within the new program:

- DXK01 after TURN02 T04; DXK02 after DXK01 with integration at TURN02 T05.
- DXK03 after actual auth/GA/Storyteller contract is usable and TURN03 fixture is specified; provider-free sample is mandatory for overall goal.
- DXK04 can plan independently, but changes to root dev commands land after DXK02 proves a replacement; do not break active test aliases prematurely.
- DXK05 after DXK01 and app image release; DXK06 after DXK02, DXK04 and DXK05, and only when no startup/CI consumers remain.
- DXK07 after DXK03 and DXK06; then the final independent clean-machine Task.
- Preexisting optional RabbitMQ, Redis, synthetic fault/observability demos must not automatically join the default playable profile.

**Developer-host contract:** first-target Windows 11 + WSL2 Docker Desktop integration, followed by portable Linux/macOS feasibility. A fresh clone may require documented prereq installation and pnpm install; the one command promise refers to **starting the stack after prerequisites**, not magically installing Node, Docker or WSL.

## Completion criteria (must all be evidenced, not inferred)

1. Cold clone and cold setup without existing Compose state succeeds; repeat pnpm dev is idempotent without resetting SQL/S3.
2. Live real Next+Nest+GA+separate worker Pods with measured memory within the documented WSL limit; stable same-origin browser /api and protected internal GA; deterministic campaign start/action/continuation/fork as supported by TURN03.
3. Login and staff authorization work without public OAuth setup; wrong user/anonymous denied and no dev login works outside explicitly owned loopback lab.
4. Tilt dashboard visible with source rebuild/rollback failure, log access, readiness. Headlamp configured for kind context and proven Pod inspect/log/exec (if container supports shell), delete/recreation with stable application recovery.
5. Active source has no Compose orchestrator, CLI invocation, CI service, volume-existence prerequisite, or GAME_AUTHORITY_MODE=compose value. No manual host process launches needed for app. CI uses appropriate lightweight checks plus provider-free integration where justified.
6. Safe stop preserves unrelated Docker volumes, contexts and persisted game data. A reset requires narrow explicit confirmation. Wrong kubecontext, absent Docker, insufficient RAM, occupied port, missing S3 object, migration crash and unavailable worker report accurate nonzero diagnostics without false READY.
7. Exact executed source SHA, cluster/Pod names and image digests, test commands, first-run/warm-run durations and peak memory, and negative proofs recorded. No unrun scenario is marked PASS.

## Read in this order, not all at once

[Planner source investigation](SOURCE-MAP.md) is planner-owned reference, not a mandatory child preload. [Finite Cursor wave handoff](CURSOR-HANDOFF.md) is the parent entry. Pick the selected Change's CHANGE.md then one T-ID in TASKS.md. [TURN02](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/distributed/2026-11-19--turn02-compose-real-kubernetes-application-release/CHANGE.md) is the real release integrator. The [task catalog](../../../tasks/README.md) owns independent operational proofs.

## Change catalog

| Change | Non-overlapping ownership |
| --- | --- |
| [DXK01](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/infrastructure/2026-11-20--dxk01-kubernetes-stack-lifecycle/CHANGE.md) | Kubernetes stack lifecycle |
| [DXK02](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/infrastructure/2026-11-20--dxk02-tilt-headlamp-developer-uis/CHANGE.md) | Tilt and Headlamp operator experience |
| [DXK03](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/infrastructure/2026-11-20--dxk03-local-playable-identity-and-fixture/CHANGE.md) | Done. Local GitHub sign-in and one scripted Seyda Neen action |
| [DXK04](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/infrastructure/2026-11-20--dxk04-package-command-surface/CHANGE.md) | Root package command redesign |
| [DXK05](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/infrastructure/2026-11-20--dxk05-kubernetes-ci-and-lab-guards/CHANGE.md) | Kubernetes CI and lab safety replacement |
| [DXK06](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/infrastructure/2026-11-20--dxk06-compose-retirement/CHANGE.md) | Done: Compose runtime and the retired compose mode are removed. Clean-clone proof stays DXK07 |
| [DXK07](../../../changes/open/2026-11-20--dxk07-clean-clone-acceptance/CHANGE.md) | Clean-clone readiness and regression harness |
| [DXK08](../../../changes/open/2026-11-20--dxk08-fast-kubernetes-inner-dev-loop/CHANGE.md) | Fast dev/watch loop distinct from immutable release verification |
| [DXK09](../../../changes/open/2026-11-20--dxk09-parallel-worktree-dev-stacks/CHANGE.md) | Isolated branch/worktree dev stacks for parallel Cursor chats |

Nothing here makes a change Done or permits paid provider calls, foreign-cluster changes, automatic data deletion, unsafe host binding or automatic selection of all packets.
