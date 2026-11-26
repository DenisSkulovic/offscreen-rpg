# Change backlog | future, uncommissioned work

**Purpose:** Future independently bounded Changes that are not part of the next few days' execution. These packets preserve owner intent and architectural boundaries; they are **not** permission for Cursor to implement, spend provider money, modify cluster resources, or mutate customer data.

[Open / near-term Changes](../README.md) · [Completed archive](../archive/README.md) · [Owner minutes](../../sessions/2026-11-22.md) · [Undertaking overview](../../undertakings/storyteller-workshop/OVERVIEW.md)

**2026-11-23 newly recorded:** [SEM01 semantic-debt and architectural comprehensibility inventory](quality-evaluation/2026-11-23--sem01-semantic-debt-and-codebase-inventory/CHANGE.md) is proposed and **not** a Cursor refactor commission. Inspect current source and de-duplicate against existing code-health and INF plans before promotion.

## Domains

- [agent runtime](agent-runtime/README.md): 6 proposed Changes
- [experience admin](experience-admin/README.md): 4 proposed Changes
- [policy finance](policy-finance/README.md): 7 proposed Changes
- [quality evaluation](quality-evaluation/README.md): 4 proposed Changes
- [platform operations](platform-operations/README.md): 15 proposed Changes (including INF01–INF05)

**Lifecycle:** A proposal may stay here indefinitely if genuinely deferred, but must retain a domain owner, next prerequisite, and recognizable outcome. When the owner selects work for the upcoming execution window, ChatGPT rechecks the latest integration HEAD and dependencies, promotes the packet into `work/changes/open/`, repairs its links, and only then turns it into source-grounded executable Cursor tasks. Closed work goes via the established archive/ledger process. Avoid indefinitely parking an actually active blocker here; `open/` is for current/near-term effort.

**2026-11-26:** DXK09 superseded and archived; INF38 deferred to platform operations, not commissioned.

**Classification:** Deferred proposals remain uncommissioned until explicitly promoted. DXK08 was promoted back to `open/` on 2026-11-22 after current-source/readiness reconciliation and owner commission.


**Deferred earlier packets (not counted among the 2026-11-22 gym proposals):** OBS04, TURN04, MA06 and MA09 remain unselected/deferred as of this classification. They are preserved in the corresponding category index and must undergo source review before promotion. Partial/in-flight DIST03, live-edge K8S11, and old WR05/WR09 umbrella reconciliation remain in `open/` until their true disposition is decided.

**2026-11-22 promotion:** HR01/HR02/HR03 were promoted together to the near-term Open set. Execution remains subject to the actual post-CL01/WR11 source gates in [the next-wave plan](../../undertakings/storyteller-workshop/NEXT-WAVE.md).

**2026-11-26:** VER04 deferred to [platform operations](platform-operations/2026-11-25--ver04-db-transaction-migration-recovery-programme/CHANGE.md); outstanding DB10 proof retained, execution commission withdrawn.

**2026-11-26:** VER05 deferred alongside VER04 to [platform operations](platform-operations/2026-11-25--ver05-db-replicated-topology-programme/CHANGE.md); replication/failover and resource isolation requirements retained, execution commission withdrawn.

**2026-11-26:** VER07 deferred to [platform operations](platform-operations/2026-11-25--ver07-cache-mechanism-programme/CHANGE.md); all cache runtime proof retained, execution commission withdrawn.

**2026-11-26:** VER08 deferred alongside VER07 to [platform operations](platform-operations/2026-11-25--ver08-cache-sql-origin-programme/CHANGE.md); SQL-origin and Story snapshot security/correctness proof retained, commission withdrawn.
