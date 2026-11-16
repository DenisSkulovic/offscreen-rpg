# Code-bearing Changes | queue

**Layout (mandatory):** non-terminal packets live in [`open/`](open); Done and Cancelled/superseded packets live in [`archive/YYYY-MM/<program>/`](archive/README.md). Create new work only under `open/YYYY-MM-DD--slug/`. Closing a Change moves it to archive after the Reconciliation ledger—never leave Done folders in `open/`.

**Architecture context:** [React/Next F1–F15](../engineering/targets/react-next.md). **Standard:** [change work-unit](../../.agents/references/change-work-unit-standard.md). **Tooling:** `node scripts/repo-tools/archive-changes.mjs --dry-run|--apply`.

Current change: [DOC01 Rebuild the documentation knowledge architecture](open/2026-11-16--doc01-documentation-architecture/CHANGE.md)

**Current status:** **Selected for implementation (2026-11-16)** — isolated branch `docs/doc01-architecture` @ `0a0692f6`. P0 baseline complete; P1 content-atom inventory in progress. QA-SF01 remains **Blocked** (not current): story-resolution 8/8, admin-situation 3/3, storyteller 27/33; evidence [qa-sf01](../programs/observability/evidence/qa-sf01-storyteller-integration-2026-11-15.md).

## Open packets

| Packet | State | Outcome |
| --- | --- | --- |
| [DOC01 documentation architecture](open/2026-11-16--doc01-documentation-architecture/CHANGE.md) | **Selected** (Current) — P0 done; P1 inventory | Rebuild canonical docs by subject/authority; separate work/evidence lifecycles; comprehensive 483-file / 176-directory audit |
| [QA-SF01 storyteller fixtures](open/2026-11-15--qa-storyteller-integration-fixtures/CHANGE.md) | **Blocked** | Restore honest focused Storyteller/story-resolution suites |
| [OBS00 live provider custody](open/2026-11-15--obs00-live-provider-custody/CHANGE.md) | **Blocked** (OBS00-B) | Production/default-worker current entitlement — not local Story |
| [OBS04 finite-action E0](open/2026-11-15--obs04-finite-action-transition-evidence/CHANGE.md) | Proposed | First E0 game transition witness |
| [ENG03 short-lock context](open/2026-11-13--eng-short-lock-context/CHANGE.md) | Proposed | Full short-lock capture (partial slices already archived) |
| [GM03 standing life](open/2026-11-13--gm-standing-life/CHANGE.md) | Proposed | Bounded standing routine |
| [GM07 delegated decision](open/2026-11-13--gm-delegated-decision/CHANGE.md) | Proposed | Consented fallback after deadline |
| [SA07 evidence tools](open/2026-11-14--sa07-evidence-tools/CHANGE.md) | Proposed (conditional) | Typed read operations for missing evidence |
| [S3a continuity report](open/2026-11-11--s3a-continuity-report/CHANGE.md) | Parked | Continuity evidence in local Story report |

## Where Done work went

Durable product/technical truth lives in permanent owners (Admin, Engine, Experience, Observability, Storyteller, React target). Execution packets for landed work are under [archive/](archive/README.md), grouped by month and program (`admin`, `chamber`, `eng`, `experience`, `observability`, `storyteller`, `web`, `other`).

**November 2026 archive:** [2026-11](archive/2026-11/README.md).

## Selecting and converging

1. Read **one** selected `open/` packet’s first screen, one nearby source README, then 2–5 symbols. Do not preload the archive.
2. Owner sets `Current change` to that packet (or `none`) and authorizes code + safe verification.
3. Implement; fill Reconciliation ledger; update permanent docs; **`git mv` to `archive/YYYY-MM/<program>/`**; clear or retarget `Current change`.
4. Provider spend, DB reset and deploy remain separately authorized.

**Out of scope of this index:** [legacy game initiatives](../history/initiatives/README.md), UI art direction as a free-for-all, automatic paid Story trials.
