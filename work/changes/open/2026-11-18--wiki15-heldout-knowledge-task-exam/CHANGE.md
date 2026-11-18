# WIKI15 | Create and actually execute a provider-free held-out wiki correctness examination

**State:** Proposed (unselected). **Kind:** implementation. **Sequence:** after WIKI12, WIKI13, WIKI14; no paid-model gate implied. **Baseline:** clean snapshot `781c2fc`, source audit [navigation](../../../designs/open/wiki-discovery-coverage/NAVIGATION-AUDIT.md), [coverage](../../../designs/open/wiki-discovery-coverage/COVERAGE-GAPS.md), [target](../../../designs/open/wiki-discovery-coverage/TARGET-ARCHITECTURE.md). Inspect current HEAD, dirty paths and active Cursor Change before selection. **Current change stays none.**

## First-screen handoff for Cursor

**Why:** DOC24 Done expressly left the cross-corpus editorial comprehension test unexecuted. Existing static reachability and retrieval tests do not establish correct section authority or contract answers.

**Exact primary owners:**
- [scripts/repo-tools/wiki-core/route-self-test.mjs](../../../../scripts/repo-tools/wiki-core/route-self-test.mjs)
- [scripts/repo-tools/wiki-core/bench.mjs](../../../../scripts/repo-tools/wiki-core/bench.mjs)
- [scripts/repo-tools/wiki-core/route.mjs](../../../../scripts/repo-tools/wiki-core/route.mjs)
- [docs/technical/lab/chamber-and-fixtures.md](../../../../docs/technical/lab/chamber-and-fixtures.md)

Implement/revise **only** the designed knowledge-system outcome below. The technical/source owners above are navigation routes; verify exact exports and selected headings at current HEAD. When a source path differs, stop and repair this plan before applying a larger diff.

## Intended work

1. Freeze 15-20 task prompts and independently reviewed gold: governing heading, selected/proposed classification, current realization source, required negative and accepted 'unknown/stop' cases.
2. Measure baseline using existing deterministic find/read behavior: owner recall@K, authority errors, negative-case misses, number of pages/section bytes opened and false confidence; report observed failures.
3. Add discriminating fixtures: proposed raw prompt access, old notification vs GET, accepted-time dependencies, unknown charged attempt, world-package pin, no-humanoid assumptions, proposal for shared consent.
4. Provide real reproducible results and a report; make no claims of human/model answer correctness unless a separately approved fresh-agent trial actually happened.

Do not invent product policy, treat proposal as selected, require external services, mass rewrite the wiki, copy another registry, or automatically select another packet. A duplicate page/link/score can be worse than a missing one.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because the accepted game promises are used to key answers, never rewritten to improve retrieval scores | `docs/product/README.md` and relevant selected claims as noneditable authority | Before/after product meaning unchanged; explicit owner review for any exception |
| Technical | unchanged because lab proof tiers stay intact; add only a small accuracy/evidence-method note if the new test reveals a distinct maintainer obligation | `docs/technical/README.md` and governing selected/proposed headings | No inferred new runtime behavior; negative classification proof |
| Code | changed: new bounded provider-free wiki evaluation fixtures/test runner under scripts/repo-tools/wiki-core/ or extension to existing benchmark; negative: answer to unratified grant must be 'proposed/blocked' | scripts/repo-tools/wiki-core/route-self-test.mjs and nearest existing test/maintainer module only | Real focused fixtures, no provider/DB/deploy |
| Related | changed: research/agent-practice/ or evidence/ only for actual dated result, question version and measured misses; no fake live agent test or alternate status registry | Exact reverse contract links and relevant index/README; archive only as history | Inbound link integrity, no duplicated owner, meaningful semantic review |

## Acceptance and falsification

**Normal:** a fresh agent obtains the right governing claim, correct authority status, relevant dependent and accurate source/proof boundary with bounded reading. **Negative:** A full 81/81 link index is labeled semantically correct despite misclassifying a prohibited staff read or inability to answer the shared-play policy.

**Checks and evidence:** Unit fixtures and actual deterministic run at recorded SHA, with unresolved items and false-positive retrieval cost separately reported. Record actual commands and results, input revision, skipped tests and novel unknowns. Run existing `pnpm wiki:change-guard --mode plan` and `--mode close` for the selected packet in the full checkout. A clean route or 'Done' label cannot substitute for semantic acceptance.

## Reconciliation ledger (fill only after real execution)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| `scripts/repo-tools/wiki-core/route-self-test.mjs` exact heading/symbol to verify | development tooling / technical documentation | pending reviewed actual delta | inspected `781c2fc` baseline only; execution SHA pending | not run: Proposed | A full 81/81 link index is labeled semantically correct despite misclassifying a prohibited staff read or inability to answer the shared-play policy. | pending impacted routes |

**Stop rules:** any need to enlarge source or product authority, use paid provider, migrate DB, or claim new permissions requires a separate owner decision. No self-authorization and no automatic next packet.
