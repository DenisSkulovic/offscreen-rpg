# WIKI12 | Classify retrieved headings by real section authority and source realization

**State:** Proposed (unselected). **Kind:** implementation. **Sequence:** first: safety-critical. **Baseline:** clean snapshot `781c2fc`, source audit [navigation](../../../designs/open/wiki-discovery-coverage/NAVIGATION-AUDIT.md), [coverage](../../../designs/open/wiki-discovery-coverage/COVERAGE-GAPS.md), [target](../../../designs/open/wiki-discovery-coverage/TARGET-ARCHITECTURE.md). Inspect current HEAD, dirty paths and active Cursor Change before selection. **Current change stays none.**

## First-screen handoff for Cursor

**Why:** In WIKI-INDEX.json at 781c2fc, docs/technical/observability/identities-and-evidence.md#turn-evidence-capsule is labelled selected-technical/normative even though the section says proposed read contract and authorizes no API. route.mjs uses proposal regex on pageOpening(pageText), then inherits page authority for every heading.

**Exact primary owners:**
- [scripts/repo-tools/wiki-core/route.mjs](../../../../scripts/repo-tools/wiki-core/route.mjs)
- [scripts/repo-tools/wiki-core/route-self-test.mjs](../../../../scripts/repo-tools/wiki-core/route-self-test.mjs)
- [scripts/repo-tools/wiki-core/markdown.mjs](../../../../scripts/repo-tools/wiki-core/markdown.mjs)
- [scripts/repo-tools/wiki-find.mjs](../../../../scripts/repo-tools/wiki-find.mjs)

Implement/revise **only** the designed knowledge-system outcome below. The technical/source owners above are navigation routes; verify exact exports and selected headings at current HEAD. When a source path differs, stop and repair this plan before applying a larger diff.

## Intended work

1. Implement a conservative section-local authority determination with explicit status/selected/proposed/illustrative inheritance only when safe. Keep normative authority separate from realized implementation/proof status.
2. Preserve exact source path#heading, SHA and dirty provenance. Mixed or unknown sections must report uncertainty rather than silently become normative or disappear.
3. Add negative controls: chosen paragraph that mentions another proposal remains selected; proposal nested under selected page remains proposal; status evidence is not gameplay authority; ordinary product page with an example remains product.
4. Ensure portable WIKI-INDEX and wiki:find agree on authority metadata. If schema changes, version or migrate explicitly and update route self-tests; do not fork a second source index.

Do not invent product policy, treat proposal as selected, require external services, mass rewrite the wiki, copy another registry, or automatically select another packet. A duplicate page/link/score can be worse than a missing one.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no game product promise is altered; the query result must not confer permission | `docs/product/README.md` and relevant selected claims as noneditable authority | Before/after product meaning unchanged; explicit owner review for any exception |
| Technical | unchanged because evidence and staff technical contracts stay as written; this Change only labels how they are retrieved | `docs/technical/README.md` and governing selected/proposed headings | No inferred new runtime behavior; negative classification proof |
| Code | changed: scripts/repo-tools/wiki-core/route.mjs and route-self-test.mjs, with the existing shared Markdown parser if strictly necessary; negative: proposed capsule cannot rank as a selected grant | scripts/repo-tools/wiki-core/route.mjs and nearest existing test/maintainer module only | Real focused fixtures, no provider/DB/deploy |
| Related | changed: .agents/references/documentation-navigation-standard.md and docs/README.md only to explain section-level authority semantics when actually needed | Exact reverse contract links and relevant index/README; archive only as history | Inbound link integrity, no duplicated owner, meaningful semantic review |

## Acceptance and falsification

**Normal:** a fresh agent obtains the right governing claim, correct authority status, relevant dependent and accurate source/proof boundary with bounded reading. **Negative:** Turn Evidence Capsule or the proposed multi-day Storyteller evaluation becomes a normative result in search while the text explicitly withholds acceptance.

**Checks and evidence:** Provider-free route-self-test, portable snapshot export fixture, manual check of selected, proposal, mixed and status sections with exact expected labels. Record actual commands and results, input revision, skipped tests and novel unknowns. Run existing `pnpm wiki:change-guard --mode plan` and `--mode close` for the selected packet in the full checkout. A clean route or 'Done' label cannot substitute for semantic acceptance.

## Reconciliation ledger (fill only after real execution)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| `scripts/repo-tools/wiki-core/route.mjs` exact heading/symbol to verify | development tooling / technical documentation | pending reviewed actual delta | inspected `781c2fc` baseline only; execution SHA pending | not run: Proposed | Turn Evidence Capsule or the proposed multi-day Storyteller evaluation becomes a normative result in search while the text explicitly withholds acceptance. | pending impacted routes |

**Stop rules:** any need to enlarge source or product authority, use paid provider, migrate DB, or claim new permissions requires a separate owner decision. No self-authorization and no automatic next packet.
