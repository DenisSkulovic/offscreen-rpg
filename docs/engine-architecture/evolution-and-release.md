# Evolution and release architecture | today's story must survive tomorrow's engine

**Status:** design target, not deployment or migration authorization. Long-lived games are harder than short-lived web requests because **active fictional commitments, captured rules and pending Storyteller operations survive many deployments**. Use [release engineering knowledge](../../.agents/knowledge/release-and-delivery-engineering.md), [data migration knowledge](../../.agents/knowledge/data-modeling-and-migrations.md), and [Temporal guidance](https://docs.temporal.io/best-practices/worker).

## The future we must design for

A player starts a story in version 1. Three real months later:
- their character has a saved half-finished craft project and an expired-but-unresolved decision;
- the game gained actor-specific skills and a new status condition;
- D&D mechanical rules were revised or a world package was updated;
- the Temporal workflow that tracks long-term work was created by older code;
- old documents/manifests and summary indices have earlier schemas;
- one new Storyteller model/provider has been selected for newly admitted work;
- frontend/API/worker deployments are rolling out at different times.

**Requirement:** old accepted actions still settle according to their captured terms, historical truth isn't rewritten, and the application can still read old evidence. The user should experience a coherent life, not be told to delete their old world whenever a dependency is upgraded.

## Distinct version axes (do not call all of them “app version”)

| Version scope | Example | Policy |
| --- | --- | --- |
| **Rule contract** | `work-check.v1`, `item-transfer.v2` | Pin exact semantic version used at admission; old in-flight work can't gain new effects from deployment |
| **World content/package** | Vvardenfell lore v3 / microbe v2 | Immutable reference; change only through an explicit admitted update |
| **Actor/capability schema** | `actor-state.v1`, `form.v2` | Reader/writer compatibility; migration where needed |
| **Story/campaign state projection** | SQL columns + JSONB version envelope | Explicit schema version, expand/migrate/contract; don't reinterpret missing fields as free resources |
| **Causal event/receipt** | `activity.completed.v1` | Old events remain readable and correctly attributed, current projection may be rebuilt |
| **Storyteller task/prompt** | `storyteller.v16` and captured model route/recipe | Frozen inputs and dispatch/usage rules survive new prompt revisions |
| **Canonical document/manifests** | `offscreen.document.v1`, root revision/hash | Immutable objects remain verifiable and exportable |
| **Workflow definition** | `campaignActivityV1` with Temporal history | Worker versioning and replay-compatible deployment or migration |
| **Public API/DTO** | `StorySnapshot` public view contract | Reader/writer compatibility during rolling Next/Nest deployment |
| **Client feature exposure** | new UI, free-intent experiment | Explicit rollout cohort, server-backed feature authority, no client-only rule permission |

A single feature flag is not a replacement for proper state and workflow versioning.

## Four strategies with real trade-offs

| Strategy | Strength | Risk | Recommended use |
| --- | --- | --- | --- |
| **Pin forever per story** | Maximum continuity, stable old rules | Combinatorial maintenance; security bug cannot be fixed globally without a policy | Long-running accepted operations, major rule-world identities until intentional upgrade |
| **Migrate every story immediately** | Single current code path | Expensive/unsafe multi-version transition, changes earned outcomes | Only deterministic, proven compatible structural migrations |
| **Versioned readers + explicit upgrade** | Strong audit trail, controlled user impact | Requires migrations/compatibility and UX copy | **Default for actual mechanical semantic changes** |
| **Always use newest rules implicitly** | Easy implementation | Breaks fairness/canon and unreproducible receipts | **Reject** for captured operations |

**Recommendation:** pin **admitted execution semantics** through completion, expose current story/world policy separately, and permit an explicit campaign-rule/content upgrade at a safe boundary only after compatibility analysis.

## Database migration discipline (expand → migrate → contract)

1. **Expand:** add a nullable or safely defaulted new column/table/index, compatible with old and new code; avoid whole-table rewrites in a hot path.
2. **Dual-read/dual-write only when necessary:** explicitly define one authoritative source during transition, checksums/consistency checks, and end date. Do not create permanent second truth.
3. **Backfill:** use bounded idempotent batches, resumable cursor and rate limits; measure lock/wal/query impact. A backfill is a production workload, not invisible deploy startup.
4. **Switch readers/authority:** run old and new versions under a stated compatibility window; verify same semantic outcome on representative captured old campaigns.
5. **Contract:** remove obsolete fields/code after old workers/readers are gone, recovery completed, and rollback decision accepted.

A rollback **cannot** simply reverse the meaning of already committed events. If new mechanics allowed a lawful action the old rules don't understand, roll back behavior through a policy gate and **preserve** the recorded outcome.

## Workflow deployment versions: particularly important for Temporal

The current `packages/workflows/src/index.ts` has version-named workflows that may sleep and replay after restarts. A function named `campaignActivityV1` is **not by itself a safe deployment versioning strategy**. Temporal replays Workflow histories against worker code and can detect nondeterministic changes.

**Current official Temporal practice:** [Worker deployment and performance](https://docs.temporal.io/best-practices/worker) recommends Worker Versioning for safe deployments, enough workers for each supported pinned version, and using Continue-As-New to prevent long histories. Verify exact TypeScript SDK/server versions and worker-versioning availability when implementation is authorized.

**Recommended plan:**
- Define separate logical task/workflow compatibility identity and **business execution identity**.
- Capture a worker deployment/build identifier with rollout evidence.
- For a version-pinned workflow, ensure workers for that version remain available until it completes or a safe continue/migration plan exists.
- Avoid changing deterministic workflow branches without either pinning or an explicit patching/upgrade strategy.
- For months-long repeating routines, use **bounded workflow segments or Continue-As-New**; preserve stable SQL business operation identity and idempotence across run IDs.
- Test a workflow started on old code, pause during wake, deploy new workers, then finish without duplicate event or lost timer.

We do **not** need to build a complex Worker Deployment management system today, but deployment compatibility is a **foundation requirement before claiming mature hosted long-life support**.

## Permanent historical evidence vs rebuildable views

- **Do not mutate source passages/receipts** because a newer prompt/rules schema exists.
- Retain old task contracts or a trustworthy migration/decoder, not a JSON parser that assumes the latest shape.
- Derived summaries, lexical/vector indices and search cards can be rebuilt from immutable canonical evidence.
- Current state projections may migrate to new representations with source/receipt linkage.
- Stored **private** Storyteller possibility isn't player-visible canon; if its old validation schema is no longer supported, fail safely and re-admit a new candidate only under the correct version/cost permission.
- User-created world imports need pinned package identities and integrity validation; don't fetch a mutable remote URL as implicit current law.

## Feature flags and safe experiments

Potential future beta changes: custom intentions, novel travel mechanic, optional ambient art, new Storyteller retrieval recipe, group input method. These do **not** share the same safety model.

| Flag class | What can change safely | What cannot be silent |
| --- | --- | --- |
| UI presentation | Stage layout, motion, theme, contextual disclosure | Private source leakage, state misrepresentation |
| Storyteller prompt/choice style | **Next** admissible turn, within captured policy | Past publication, pending/paid generation input |
| Source retrieval recipe | A later task with captured recipe and evidence trace | Unknown in-flight model attempt |
| Rules capability | New admitted actions/stories or explicit upgrade boundary | Effects of an already captured execution |
| Autonomy | Future delegation grants or routine policies | Expanding currently authorized risks or actor control |
| Shared-party behavior | New stories/declared group policy | Existing group clock semantics mid-decision |

Feature exposure should be server-owned, cohort-assigned by stable account/story identity, observable and reversible where safe. A user should not experience A/B switching of a core mechanic every refresh. Use a **small typed flag/policy catalogue** rather than scattering `process.env.FEATURE_X` over game modules.

## Storage portability, shared CAS and retention

Current source uses a local SHA-256 CAS for immutable documents. That's excellent local engineering, but replicas require one reliable shared content-addressed store.

**Target adapter contract:**
- `put(hash/object)` verifies canonical bytes and hash, idempotent under replay;
- `get(hash)` verifies hash/schema, strict size limit, optional retry for eventual adapter failure;
- manifest root is promoted **only** via an authoritative SQL transaction after referenced objects are durable/available;
- if SQL commit fails, unreferenced objects are benign orphans to be cleaned after safe grace period;
- if store read fails after SQL commit, serve an explicit canonical unavailable state, not imaginary fallback prose;
- backup/restore treats SQL references, object versions and retention together; a DB backup without objects is incomplete;
- GC uses confirmed reachability from authoritative roots and retention/pinned story forks, not file creation age alone;
- encryption/access control/object prefixes avoid cross-tenant leakage even when hashes collide in content; **do not rely on opaque hashes as authorization**.

AWS S3 documentation states strong read-after-write consistency after a successful PUT ([source](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)). This helps deterministic object availability, but **does not provide a distributed transaction with PostgreSQL**. Design SQL-root/object-store recovery explicitly.

## Rolling deployment / release proof

1. Deploy API/worker A/B compatible with old and new schema.
2. A long story started under old rules remains active.
3. A client with cached older public DTO still receives valid error/upgrade semantics.
4. Force an accepted work-boundary event during worker rollout.
5. One exact event/receipt settles, time never exceeds captured bound, no reroll.
6. Provider failure during rollout remains uncertain under same captured cost.
7. Old and new API replicas can read same immutable source hash.
8. Roll back application code without erasing an admitted old/new event; incompatible new writes are paused.
9. After the compatibility window, deliberately retire old workflow versions and schema representations with evidence.

A passing `pnpm build` and green readiness endpoint are not a replacement for this.

## Potential first release-focused code Changes

- Add a **version compatibility manifest/check** for captured task/rules/schema versions with regression fixtures. Small but high leverage.
- Make **object-store adapter** truly shared and cross-replica testable, without changing document format.
- Introduce explicit **long-life workflow history policy** and a deterministic pinned worker rollout test.
- Build a bounded **data migration harness** before a large Character/capability schema redesign.
- Separate experimental Storyteller prompt recipe versions from game-rule versions.

**Don't start with a giant migration framework, a custom feature-flag SaaS or a hosted Kubernetes cluster.** These are bounded implementation outcomes only after owner authorization.

## Unresolved decisions

- How many old rules versions are supported simultaneously and for how long?
- Can a player voluntarily upgrade a game mechanics package mid-campaign, and at which quiescent boundary?
- Which backward-incompatible world-package edits are forbidden and which are transformed through admitted updates?
- What is the operational response when a critical bug exists in a pinned old rule?
- What is the story deletion/retention policy for shared forks and referenced object hashes?

These need explicit product/operations decisions before irreversible migration, not guesses from today's directory tree.
