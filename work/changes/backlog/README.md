# Change backlog | future, uncommissioned work

**Purpose:** Future independently bounded Changes that are not part of the next few days' execution. These packets preserve owner intent and architectural boundaries; they are **not** permission for Cursor to implement, spend provider money, modify cluster resources, or mutate customer data.

[Open / near-term Changes](../README.md) · [Completed archive](../archive/README.md) · [Owner minutes](../../sessions/2026-11-22.md) · [Undertaking overview](../../undertakings/storyteller-workshop/OVERVIEW.md)

## Domains

- [agent runtime](agent-runtime/README.md): 6 proposed Changes
- [experience admin](experience-admin/README.md): 4 proposed Changes
- [policy finance](policy-finance/README.md): 7 proposed Changes
- [quality evaluation](quality-evaluation/README.md): 4 proposed Changes
- [platform operations](platform-operations/README.md): 10 proposed Changes

**Lifecycle:** A proposal may stay here indefinitely if genuinely deferred, but must retain a domain owner, next prerequisite, and recognizable outcome. When the owner selects work for the upcoming execution window, ChatGPT rechecks the latest integration HEAD and dependencies, promotes the packet into `work/changes/open/`, repairs its links, and only then turns it into source-grounded executable Cursor tasks. Closed work goes via the established archive/ledger process. Avoid indefinitely parking an actually active blocker here; `open/` is for current/near-term effort.

**2026-11-22 DXK09 promotion:** The old deferred DXK09 pointer was stale; the rebuilt source-grounded packet now lives in [open/DXK09](../open/2026-11-22--dxk09-isolated-parallel-development-stacks/CHANGE.md). Its implementation readiness is explicitly planner-held on tenant provisioning/auth details; no executor should mistake promotion for dispatch permission.

**Classification:** Deferred proposals remain uncommissioned until explicitly promoted. DXK08 was promoted back to `open/` on 2026-11-22 after current-source/readiness reconciliation and owner commission.


**Deferred earlier packets (not counted among the 2026-11-22 gym proposals):** OBS04, TURN04, MA06 and MA09 remain unselected/deferred as of this classification. They are preserved in the corresponding category index and must undergo source review before promotion. Partial/in-flight DIST03, live-edge K8S11, and old WR05/WR09 umbrella reconciliation remain in `open/` until their true disposition is decided.

**2026-11-22 promotion:** HR01/HR02/HR03 were promoted together to the near-term Open set. Execution remains subject to the actual post-CL01/WR11 source gates in [the next-wave plan](../../undertakings/storyteller-workshop/NEXT-WAVE.md).
