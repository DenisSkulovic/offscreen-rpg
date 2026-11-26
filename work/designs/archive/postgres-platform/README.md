# PostgreSQL platform renewal | archived design

**State: Accepted and promoted; archived by owner 2026-11-27.** Owner selected structural scope after designer pass 06, with additional independent committee review explicitly waived for this scope only. Frozen candidate `c6d3a752d01cf1ba2135f8ed277627ebb7cb0615`; native baseline integrated on main. [Canonical selected contract](../../../../docs/technical/platform/database-infrastructure.md#local-cnpg-baseline-renewal-owner-selected-2026-11-26) · [Open implementation and acceptance](../../../changes/open/postgres-native-baseline/CHANGE.md) · [Original complete dossier](https://github.com/DenisSkulovic/offscreen-rpg/tree/0a691bed6004e19010f4af29638f4823cd5a8aa5/work/designs/open/postgres-platform). No new proof or permission. Historical design and defense below are retained, not current proposals or dispatch instructions.

## Historical structural specification

[STRUCTURAL-DESIGN.md](STRUCTURAL-DESIGN.md) was the proposed authority for the structural slice; earlier architecture/specimens/defense files are research history where they conflict. [Committee pass 01](committee/pass-01.md) rejected candidate 318b5a6c; all C01–C05 accepted for closure, C06–C07 separately gated. [Committee pass 02](committee/pass-02.md) rejected eb488ab3; revised structural scope now prioritizes baseline installer consolidation and explicitly gates topology recovery. [Committee pass 03](committee/pass-03.md) is committed. The takeover revision selects concrete baseline composition, create-only recovery, strict default normalization and a single worker deadline. See [designer defense](DEFENSE-PASS-04.md) and [evidence gates](STRUCTURAL-EVIDENCE.md). Owner terminal experiments are now recorded with trusted Cluster admission specimens. See [integration contract](INTEGRATION-CONTRACT.md), [exact operator policy](OPERATOR-COMPATIBILITY.md) and [current self-defense](DEFENSE-PASS-06.md). Ready for independent structural review only.

## Intent

One understandable, reproducible PostgreSQL platform for local development and release, leveraging CloudNativePG rather than building a second database operator. Preserve independent durable tenants, scoped credentials, application schema ownership, Temporal's two stores, explicit instance/topology changes and independently owned experiment clusters. Dev and release differ in purpose and configured demand, not necessarily machinery. Keep ordinary ensure safe and repeatable, never silently scale, migrate, reset, rotate or adopt data. Local Kind is not hosted production HA.

## Design posture

Independent target thinking; no deletion of legacy source. Round 1 read boundary documentation and inventoried paths only. Defer detailed internal source analysis until a coherent target is established. Existing accepted behavior and durable identity remain constraints; current directory tree, JS abstractions and numerical tuning are not the brief. Reuse proven mechanisms where the target justifies them; reconcile existing canon explicitly if the proposed design changes an accepted contract.

## Requirements and constraints

| ID | Required outcome |
| --- | --- |
| PG-R1 | Independent Kubernetes contexts for dev and release, shared native CNPG operator and configurable Cluster declarations per context |
| PG-R2 | Shared PostgreSQL server per environment by default, distinct application databases/roles for durable dev tenants, release uses same capability as needed |
| PG-R3 | Parking preserves databases, credentials and identity; no implicit data deletion, tenant adoption or credential rotation |
| PG-R4 | Existing Temporal history/visibility databases and scoped role, credential projection and isolation contract preserved |
| PG-R5 | Explicit authorized topology changes, stable RW service and data identity; independent owned experiment clusters and safe ownership fencing |
| PG-R6 | Native resource ownership, no competing reconciler; bounded operations, honest status and capacity admission |
| PG-R7 | Resource and connection sizing derived from actual consumers, host constraints and evidence; no arbitrary limits |
| PG-R8 | Reproducible fresh installation, healthy reuse, safe migration of existing clusters; distinct backup/restore and hosted acceptance gates |

Current canonical sources: [database infrastructure](../../../../docs/technical/platform/database-infrastructure.md), [developer environments](../../../../docs/technical/platform/developer-environments.md), [Temporal infrastructure](../../../../docs/technical/platform/temporal-infrastructure.md), [PostgreSQL runbook](../../../../docs/runbooks/kubernetes-postgres.md). Current runbook still forbids Temporal on lab-pg, contradicting later accepted Temporal contract; reconcile at promotion, not by preserving stale wording. Existing local operator pin 1.30.2, PostgreSQL image 18.7-system-trixie; no automatic upgrade. Preserve live dev/release endpoint identities pending explicit migration design.

## Working rounds (adaptive)

1. Vision and boundary inventory — done.
2. Version-specific upstream research — initial pass complete, see [research](RESEARCH.md).
3. Independent target architecture — proposed, see [architecture](ARCHITECTURE.md).
4. Resource/connection budget — source model complete, measurement and final sizing gated; see [capacity](CAPACITY.md).
5. Tenant and persistence — proposed target, see [tenancy](TENANCY.md); migration and live proof gated.
6. Concrete specimens — provisional renderer and layout selected, see [specimens](SPECIMENS.md).
7. Core source gap analysis — see [gap map](GAP-ANALYSIS.md); exhaustive caller closure still required before edits.
8. Formal architecture defense — [pass 1](DEFENSE.md): REVISE AND RE-DEFEND; see [pass 2](DEFENSE-PASS-02.md). Independent committee required after self-defense.
9. Convergence, canonical promotion and execution choice only after gates.

Historical next action superseded by the recorded owner selection and integration. Remaining implementation acceptance belongs to the open Change, including lock contention, parent death, creation collision, guard failure and frozen parsed-render proof.

## Evidence discipline

Tagged source and online docs are source evidence, not runtime proof. Keep exact sources and conclusions in RESEARCH.md; later record experimental results separately if needed. Do not infer current cluster status from historic receipts. No fixed document quota. Dossier remains on its design branch until review; preserve immutable history and retire after promotion.
