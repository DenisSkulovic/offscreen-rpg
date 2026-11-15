# Evidence Claims & Forensic Quality V1 | Don't confuse recorded facts with diagnostic guesses

**Status:** Wave-5 technical target, Proposed, not implemented (2026-11-15). **Source:** GitHub `main` as of merged forensic wave 4 (`7426fdb`); runtime code last changed at `7e15db3`. No running app, live provider call or data migration was involved. Applies to [typed evidence](evidence-model.md), [context provenance](context-provenance.md), [Admin read models](investigation-read-models-v1.md) and [player/Support/Developer investigations](../admin-investigation-experience.md).

Use the basic [W3C PROV-O relationships](https://www.w3.org/TR/prov-o/) (Entity, Activity, Agent, used/generated/derived) and [OpenLineage's explicit source-to-target lineage](https://openlineage.io/docs/spec/facets/job-facets/lineage/) as **conceptual discipline**, not a reason to deploy an RDF store, OpenLineage backend or another microservice.

## 1. A source-grounded diagnostic weakness

`packages/storyteller/src/providers/evidence-lineage.ts::classifyFailure` can choose `model-ignored` when a discovered memory item appeared in the final packet but the output did not declare a citation. That proves **no validated declared citation**, not that the model ignored or failed to think about the source. A model can use text without citing it; a citation can also be inaccurate.

The same fixture helper creates default `stored/eligible/discovered/exact-loaded` sets from the **final task evidence** when real stage observations are absent, and can infer “published” handles from final-packet inclusion when publication succeeds. Those are useful fixture conveniences, **not proof of production retrieval or semantic publication of a claim**.

`packages/storyteller/src/providers/operation-trace.ts` also constructs fresh random span IDs when rendering a fixture and defaults unspecified rounds to a completed-looking round for modes other than `not-run`. Such a report must not be presented as an immutable real execution trace. Existing SA01/SA05 evidence already says the tools were fixture/lab-only.

**Decision:** retain those test fixtures, but **never treat inferred fixture stages, citation absence, or synthetic render IDs as direct business evidence** in the native Admin. Future production labels require source attestation or an explicit derived/hypothesis status.

## 2. Three independent kinds of statement

| Kind | Definition | Example | Minimum proof |
| --- | --- | --- | --- |
| **Recorded observation** | An authenticated source writer or observed transport committed/returned the stated value | “Action O interrupted at gameSecond 900; no successful receipt exists under its unique operation key” | Source ID, owning stage, recorded revision/transaction, immutable hash or checked row |
| **Validated derivation** | A declared deterministic procedure applies to known inputs and outputs a result | “Publication is stale because captured source root differs from current permitted root” | Named rule/version/build, exact input source IDs, successful validation and coverage |
| **Hypothesis** | An explanation consistent with observations but not entailed by them | “A missing NPC memory may have resulted from source ranking rather than prompt instructions” | Supporting and contradicting evidence, alternatives, missing observations and explicit hypothetical label |

Do **not** use fake numeric confidence on direct facts. A source either proves a particular proposition within a scope or it doesn't. We can rank competing causes **as diagnoses**, but an estimate never becomes a historical receipt by appearing in a dashboard.

### EvidenceAssertionV1: optional read-model, not universal extra table

~~~ts
type EvidenceAssertionV1 = Readonly<{
  version: 1;
  subject: TypedRef;
  predicate: ClosedEvidencePredicate;
  value: TypedValueOrRef;
  class: 'recorded' | 'derived' | 'hypothesis';
  provenance: {
    sourceRefs: readonly TypedRefWithVersionAndHash[];
    producerId: string;
    producerBuildId: string;
    ruleVersion: string | null;
    operationId?: UUID;
    generationId?: UUID;
    attemptId?: UUID;
    eventSequence?: DecimalString; // only a committed game frontier
    observedAt?: ISOTime;
  };
  quality: {
    integrity: 'verified'|'failed'|'not-checked';
    sourceCoverage: 'complete-required-set'|'partial'|'unestablished';
    observation: 'present'|'absent-after-exhaustive-check'|
      'unknown'|'not-recorded'|'not-applicable';
    missing: readonly ClosedMissingReason[];
  };
  disclosure: ClassifiedFieldPolicy;
  diagnostic?: {
    supporting: readonly TypedRef[];
    contradicting: readonly TypedRef[];
    alternatives: readonly ClosedHypothesisCode[];
    origin: 'rule'|'staff'|'optional-model';
  };
}>;
~~~

**Most assertions can be built at read time from existing source rows.** Persist only source-specific decisions/status transitions that would otherwise be lost, such as selector ranking/omission, transport identity, validation gate and state before overwrite. Do not build another all-purpose JSONB audit table that stores duplicate game data.

## 3. Source selection and model knowledge: seven distinct stages

| Predicate | Verifiable observation | Forbidden inference |
| --- | --- | --- |
| `source.stored` | Immutable source existed at pinned root/hash | Model knew it |
| `source.eligible` | Real policy admitted it within a defined candidate set | It was retrieved |
| `source.discovered` | Specific selector enumerated it | It was selected/read |
| `source.exact-loaded` | Exact body bytes were fetched and verified for this operation | It entered final provider request |
| `source.final-packet-included` | Exact final request includes the identified segment/field | Provider necessarily received it or model understood it |
| `source.citation-declared` | Actual validated output named this packet item/source | Model's reasoning was sound or it faithfully incorporated it |
| `source.claim-published` | A **specific** validated claim or game/passage fact was committed with source/citation link | Every included source influenced the published passage |

**Do not conflate “no citation” and “not used.”** Only `source.citation-declared=false` may follow from a **fully parsed validated** citation declaration that did not include that source. Whether the model relied on the source semantically is unknown without separate claim-level evaluation. Even a citation is not proof the statement is factually correct.

**Do not conflate “generation output exists” and “game scene published.”** A valid provider candidate may fail publication source/actor/receipt fences. A source in one attempt is not necessarily in a later repair/memory round. Trace actual `attemptId/roundId/providerDispatch`, not only `inspectOpenRouterRequest(task)`.

## 4. Reproducible graph semantics

**Node kinds:** entity (passage, immutable doc, campaign config revision, task input, packet, model output, receipt, published claim), activity (selection, pack, dispatch, validate, publish, settle), agent (player, service/build, staff operator). **Edges:** `used`, `generated`, `derived-from`, `selected-by`, `fetched-by`, `omitted-by`, `validated-by`, `overridden-by`, `published-as`, `blocked-by`.

Every edge must have:
- a recorded owning producer and versioned source/target identity;
- exact scope (story, root, G, attempt/round, fictional time or transaction);
- whether it is recorded/derived/hypothesized and its coverage;
- subject/field disclosure class (a hash cannot grant content access);
- bounded reason code and lineage to original source, not opaque free text.

**No Cartesian-product invented lineage.** A task reading 10 sources and producing 3 outputs does not prove each source contributed to every output. An output claim needs its own valid edge; otherwise the UI can say only “source available in context.”

### Empty / missing are not universal absence

`absent-after-exhaustive-check` is legal only when the query checked a **closed, well-defined relevant universe** against a consistent snapshot, with confirmed source availability and permissions. A unique-key SQL lookup can prove no success receipt for known interrupted operation O. A partial search over 50 of 5,000 indexed documents **cannot** prove a note wasn't considered anywhere.

For absent OTel spans: “trace unavailable or not captured” unless instrumentation/sampling/collector coverage proves more. For unknown source handles: “not recorded”, not “didn't exist.” For provider uncertainty: “possibly dispatched” is **not** billed or unbilled until real charge evidence exists.

## 5. Diagnoses as first-class *hypotheses*, not automatic root cause

Example of a memory-related complaint:

- **Recorded:** `p12` belongs to pinned root H; exact selector queried 30 candidates; `p12` was found and loaded; bounded packing removed `p12` for `byte-limit`; final packet SHA did not include it.
- **Derived:** The model could not directly read `p12` through that packet, assuming no alternative copies of its information existed in the same request (the stronger hypothesis must say so).
- **Hypothesis:** That omission **may explain** a particular published inconsistency.
- **Disproof to seek:** Was the same relationship already stated in an included continuity note? Did a tool return an equivalent fact? Did the model output actually contradict the fact or just omit mentioning it?

A field-level provenance explorer must let developers inspect alternate places the same fact may have entered the prompt, not declare “the model forgot it” from one missing section. Conversely, repeated failures across correctly included evidence may support a stronger **model behavior** hypothesis, but that's a quality evaluation rather than a receipt.

## 6. Schema/presentation policies

- Keep a **closed evidence vocabulary** and explicit `source`/`transform`/`claim` origin; no “reason: arbitrary raw log blob”.
- Support shows human-readable “What happened”, “What is proven”, “What couldn't be verified”; does not need to display `JSON.parse` paths.
- Developer can expand each claim to source IDs, revisions, root/pack/transport hashes and decisive predicate; raw bodies are **separately granted and audited**.
- Trust/privacy can inspect **who accessed which classified evidence**, not implicitly all narratives.
- No automatic “green verified” graphic for an entire story because one row has a checksum. Integrity is scoped to one artifact/source graph/checkpoint.
- Preserve original fixture receipt format with a **versioned adapter**. Do not silently rewrite old SA05 `model-ignored` reports and claim their historical diagnostic semantics have always been different.

## 7. Acceptance: prove the weaker and stronger statements separately

1. Packet included `m3`, no citation: UI says **uncited**, not **ignored**.
2. Citation names source, but published prose contradicts it: reference integrity **valid**, semantic support **failed/uncertain**.
3. Source loaded then pruned with recorded byte budget: final model-visible **false**, exact cause known.
4. Source not enumerated in bounded selector: cannot claim explicitly rejected.
5. Source selected by a fixture's default task-derived handles: label **derived-from-final-task**, not observed retrieval.
6. G completed but publication was stale: no fabricated published claim edge.
7. Different per-round dispatch override: packet hash/reference bound to the exact round, no global G-only packet inference.
8. A non-provider scripted run: proof `not-run` only from source mode/state, not from missing span.
9. Duplicate worker delivery: one game result, independent real operational retries if observed.
10. Historic raw context expired: underlying record may remain only as lawful metadata/tombstone; never present blank prompt as original empty prompt.
11. Staff S1 request: no S3 existence/content leak via candidate counts or deep-link error differences.
12. A source was included, no contradictory result, but model did not mention it: **no failure diagnosis by default**.

## 8. Suggested bounded code correction

The immediate code-bearing candidate is [OBS05](../../../changes/archive/2026-11/observability/2026-11-15--obs05-evidence-claim-truth/CHANGE.md): refine SA05/SA01 diagnostic classification and production-facing adapters **without changing game rules, prompt content or model calls**. Genuine retrieval stage observation must still be implemented with OBS02/OBS03; an offline analysis function cannot conjure missing history.

**Release gate:** no “model ignored / used / knew / published this source” assertion in a Support/Developer production read unless the exact evidence proof above exists. Source facts may still be missing; the viewer must tell the truth about that.
