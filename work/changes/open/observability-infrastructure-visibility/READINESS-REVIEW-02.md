# **Independent implementation-readiness review | PG01, pass 02**

# **OBS-E2-PG01**

READY

Both blocking findings are resolved at the planning-contract level. PG01 is eligible for independent implementation commission.

Critical open

# **0**

High open

# **0**

Prior findings resolved

# **2/2**

H01 · Exact ACL and effective-role isolation

Closed

H02 · Occupied qualification authority

Closed

M01 · Kubernetes inventory proof disposition

Preserved

M02 · Transaction timeout disposition

Preserved

**Repository:** [DenisSkulovic/offscreen-rpg](https://github.com/DenisSkulovic/offscreen-rpg?utm_source=chatgpt.com)\
**Branch:** `main`\
**Reviewed candidate:** [`a602bd405e1430e6c8d2905db9181af5580e856b`](https://github.com/DenisSkulovic/offscreen-rpg/commit/a602bd405e1430e6c8d2905db9181af5580e856b?utm_source=chatgpt.com)\
**Previous candidate:** `9b113bd8e877a6c957750b9ece606223dd15e5a6`\
**Review date:** 28 November 2026\
**Authority:** Read-only independent implementation-readiness review.

## **1. Review baseline**

| Verification                       | Result                |
| ---------------------------------- | --------------------- |
| Remote main HEAD                   | Verified twice        |
| Commits since previous candidate   | 1                     |
| Implementation-source drift        | None                  |
| Persisted READINESS-REVIEW-01      | Inspected             |
| Applicable repository instructions | Inspected             |
| Architecture verdict               | Carried forward       |
| Review scope                       | PG01 corrections only |

The [Git comparison](https://github.com/DenisSkulovic/offscreen-rpg/compare/9b113bd8e877a6c957750b9ece606223dd15e5a6...a602bd405e1430e6c8d2905db9181af5580e856b?utm_source=chatgpt.com) confirms that the correction consists exclusively of documentation, packet and register changes.

The review applies the current [AGENTS.md](https://github.com/DenisSkulovic/offscreen-rpg/blob/a602bd405e1430e6c8d2905db9181af5580e856b/AGENTS.md?utm_source=chatgpt.com), client instructions, workflow, planner investigation standard and [packet-readiness review standard](https://github.com/DenisSkulovic/offscreen-rpg/blob/a602bd405e1430e6c8d2905db9181af5580e856b/.agents/references/packet-readiness-review.md?utm_source=chatgpt.com).

Unaffected conclusions from review 01 remain valid.

## **2. E2-IR-H01 | Exact ACL and effective-role isolation**



CLOSED

&#x20;Previously High, blocking PG01 T01/T02.



The corrected [TASKS.md](https://github.com/DenisSkulovic/offscreen-rpg/blob/a602bd405e1430e6c8d2905db9181af5580e856b/work/changes/open/observability-infrastructure-visibility/2026-11-28--obs-e2-pg01-monitoring-access/TASKS.md?utm_source=chatgpt.com) now specifies the information, predicates, affected admission checkpoints and discriminating tests that were missing from the original packet.

### **Exact catalog projection**

| Required information   | Corrected contract             |
| ---------------------- | ------------------------------ |
| Database identity      | Actual database and owner OIDs |
| Role identity          | Actual role OID and attributes |
| ACL grantee            | Exact OID                      |
| ACL grantor            | Exact OID                      |
| Privilege type         | Exploded ACL entry             |
| Grant option           | Explicit boolean               |
| Effective connectivity | `has_database_privilege()`     |
| Transitive membership  | `pg_has_role()`                |
| Incomplete evidence    | Fail closed                    |

The fixed, single-statement catalog projection eliminates the lossy representation identified in the original review. Its output and catalog cardinality are explicitly bounded.

I verified the affected source anchors:

| Source                             | Relevant correction                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| `dev-sql-tenant-live-adapter.mjs`  | Replaces synthetic identities and lossy ACL admission                                     |
| `dev-sql-tenant-executor.mjs`      | Covers existing, fresh and peer tenant admission                                          |
| `dev-sql-tenant-reconciler.mjs`    | Preserves unrelated callers while replacing direct-only checks at affected executor sites |
| `temporal-persistence/prepare.mjs` | Extends both fresh and existing verification with the exact dev-only exception            |

[Live adapter source](https://github.com/DenisSkulovic/offscreen-rpg/blob/a602bd405e1430e6c8d2905db9181af5580e856b/tools/dev-environments/src/adapters/dev-sql-tenant-live-adapter.mjs?utm_source=chatgpt.com) · [Tenant executor source](https://github.com/DenisSkulovic/offscreen-rpg/blob/a602bd405e1430e6c8d2905db9181af5580e856b/tools/dev-environments/src/adapters/dev-sql-tenant-executor.mjs?utm_source=chatgpt.com) · [Temporal persistence source](https://github.com/DenisSkulovic/offscreen-rpg/blob/a602bd405e1430e6c8d2905db9181af5580e856b/infra/platform/postgres/temporal-persistence/prepare.mjs?utm_source=chatgpt.com)

### **Effective membership isolation**

Selected authorization contract, not yet implemented or natively proven. Application principals cannot inherit or assume the monitoring identity. Existing superuser authority is unchanged.

The conservative rejection of every non-superuser transitive membership path to the exporter is sufficient. It avoids relying on `NOINHERIT` alone, which would not establish the required role-assumption isolation.

The packet also retains the effective application and Temporal CONNECT matrix and expressly refuses elevated application identities.

### **Fresh and existing admission simulation**

| Scenario                                    | Required result                                |
| ------------------------------------------- | ---------------------------------------------- |
| Existing owner-only predecessor             | Admit                                          |
| Exact approved monitoring CONNECT           | Admit                                          |
| Monitoring grant with grant option          | Refuse                                         |
| Wrong grantor or role OID                   | Refuse                                         |
| Exporter CREATE or TEMPORARY privilege      | Refuse                                         |
| Direct or transitive membership in exporter | Refuse                                         |
| Effective cross-tenant CONNECT              | Refuse                                         |
| Monitoring grant on unapproved database     | Refuse                                         |
| Fresh database, valid exporter present      | Grant while closed, verify, then open          |
| Fresh database, exporter absent             | Preserve predecessor; monitoring remains gated |
| Unsafe exporter present                     | Refuse grant                                   |
| Release database                            | Existing owner-only contract unchanged         |

The corrected packet explicitly applies these checks at initial admission, after baseline writes, during closed database provisioning, before opening, after opening and on existing selected and peer stores.

It does not rely on the legacy parser or optional live checks to preserve fixture compatibility.

**Finding disposition:** H01 is closed. No further material authorization or catalog-projection decision is delegated to the implementation agent.

## **3. E2-IR-H02 | Occupied qualification authority**



CLOSED

&#x20;Previously High, blocking PG01 native qualification sequencing.



The corrected `CHANGE.md`, `PROOF.md`, group register and canonical database contract now distinguish intermediate observability activation from the separately authorized PostgreSQL-owner maintenance operation.

### **Corrected execution sequence**

**PG01 construction**

T01 → T02 → T03

Ready

**Archive and join Design branch**

Focused construction gate passed

**Exact clean joined SHA**

Separate owner live authorization

Permission gate

**Occupied PostgreSQL qualification**

ACL delta, isolation and native collector proof

Not run

**04 PostgreSQL metric freeze → 13**

Downstream construction and joint qualification

The authorized execution source is now precisely defined: a clean revision of `implementation/observability-infrastructure-visibility` containing the archived and joined PG01 construction, with its passing focused receipt and separate owner authorization of that SHA.

This removes the circular dependency without weakening the E2 activation fence.

### **Occupied transaction verification**

The corrected T02 contract satisfies the necessary maintenance safeguards.

| Boundary           | Required protection                              |
| ------------------ | ------------------------------------------------ |
| Target             | Fixed `kind-offscreen-dev`                       |
| Authorization      | Both maintenance variables                       |
| Concurrency        | Operator quiescence and PostgreSQL custody       |
| Database selection | Explicit finite list; verified ownership         |
| Identity           | Kubernetes UIDs, primary, DB and role OIDs       |
| Preflight          | Reobserve under custody                          |
| Transaction        | Recheck identity and exact ACLs                  |
| Mutation           | Missing approved CONNECT grants only             |
| Before commit      | Exact delta and unchanged application privileges |
| After commit       | Independent readback under custody               |
| Unknown outcome    | Refuse; no automatic retry                       |
| Repeat             | Zero mutation when already correct               |

The packet correctly treats quiescence as an additional requirement, rather than assuming `postgres.lock` protects against every possible external database writer.

The existing [`createBaselineCustody()` implementation](https://github.com/DenisSkulovic/offscreen-rpg/blob/a602bd405e1430e6c8d2905db9181af5580e856b/infra/platform/postgres/bootstrap/custody.mjs?utm_source=chatgpt.com) supports the required mutation custody, bounded subprocess execution and remaining-budget checks.

**Finding disposition:** H02 is closed. The occupied repair has a coherent execution and qualification route, without requiring premature main integration or incomplete E2 activation.

## **4. Preservation of nonblocking findings**

**E2-IR-M01**

Contract corrected

The Design acceptance matrix and permanent observability contract now use admitted Pod phase/UID and node condition/capacity families rather than excluded `kube_pod_info` and `kube_node_info`.

Unready nodes remain represented, and freshness and list/watch health remain explicit proof obligations.

Durable owner: native observability technical contract and OBS-E2-13.

**E2-IR-M02**

Contract corrected

Selected occupied-operation timeout budget

Lock

5s

Statement

20s

Transaction

45s

Subprocess

60s

Insufficient remaining custody budget refuses before mutation dispatch. The general custody default is unchanged.

Durable owner: database-infrastructure technical contract and PG01 T02.

Both Medium findings retain durable dispositions, with inexpensive corrections incorporated into the current candidate. Their implementation and native proof remain assigned to the appropriate owners.

Sources: [Design integration contract](https://github.com/DenisSkulovic/offscreen-rpg/blob/a602bd405e1430e6c8d2905db9181af5580e856b/work/designs/open/observability-infrastructure-visibility/INTEGRATION.md?utm_source=chatgpt.com) · [Database infrastructure contract](https://github.com/DenisSkulovic/offscreen-rpg/blob/a602bd405e1430e6c8d2905db9181af5580e856b/docs/technical/platform/database-infrastructure.md?utm_source=chatgpt.com) · [Native observability contract](https://github.com/DenisSkulovic/offscreen-rpg/blob/a602bd405e1430e6c8d2905db9181af5580e856b/docs/technical/platform/observability-native-infrastructure.md?utm_source=chatgpt.com).

Neither requires another review cycle.

## **5. Final PG01 release disposition**

| Review dimension               | Final disposition      |
| ------------------------------ | ---------------------- |
| Repository and authority       | Pass                   |
| Source mapping                 | Pass                   |
| Material decisions             | Pass                   |
| Bounded task context           | Pass                   |
| Dependencies and ownership     | Pass                   |
| Security and data preservation | Pass                   |
| Assigned construction proof    | Pass at planning level |
| Integration and closure        | Pass                   |

All unaffected review 01 conclusions are carried forward. No new substantive finding was identified within the targeted review scope.

**PG01 may be commissioned independently, without waiting for 01, 02, 05 or unrelated native evidence gates.**

Upon commission, execute T01 → T02 → T03 on a dedicated linked worktree using the existing Design integration branch lifecycle.

Pre-edit guard:

```
node scripts/repo-tools/change-branch-guard.mjs \
  --change OBS-E2-PG01 \
  --target implementation/observability-infrastructure-visibility \
  --design observability-infrastructure-visibility
```

The assigned focused construction proof remains:

```
node --test \
  infra/platform/postgres/tests/temporal-persistence.test.mjs \
  infra/platform/postgres/tests/monitoring-access.test.mjs \
  tools/dev-environments/test/dev-sql-tenant-executor.test.mjs

git diff --check
```

Archive PG01 before its Change-level join when the assigned construction gate passes. Transfer the outstanding native qualification obligation to the Design.

## **6. Committee receipt**

## **Final decision register**

OBS-E2-PG01 readiness

READY

E2-IR-H01

CLOSED

E2-IR-H02

CLOSED

E2-IR-M01/M02

PRESERVED

Further readiness review

NOT REQUIRED

Implementation commission

OWNER REQUIRED

Occupied live repair

NOT AUTHORIZED

Native PostgreSQL qualification

NOT RUN

Full E2 acceptance

PENDING

**Evidence limitations:** This is a committed-source and planning-contract review. No executable tests, native operations, local worktree inspection or repository mutations were performed. The verdict has been delivered but not persisted by this session. Existing native observations are reused, not independently reproduced.

The owner or authorized custodian should persist this verdict and reconcile PG01's standing in the existing packet and registers. No further packet correction is required by this review.

Remote main was reverified at the conclusion of investigation:

`a602bd405e1430e6c8d2905db9181af5580e856b`

**Final committee judgment: OBS-E2-PG01 is READY for implementation. Release it for commissioned construction. The planning blocker is removed; the separately authorized native qualification remains mandatory.**
