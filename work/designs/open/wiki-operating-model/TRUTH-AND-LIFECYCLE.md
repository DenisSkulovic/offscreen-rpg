# Wiki truth | Ratification, reality and Change reconciliation

**Status:** recommended operating contract, **not ratified** merely because this Markdown file exists. Current binding rules remain [documentation maintenance](../../../../.agents/rules/documentation.md), [work-unit standard](../../../../.agents/references/change-work-unit-standard.md) and [documentation reconciliation](../../../../.agents/skills/documentation-reconciliation/SKILL.md).

## 1. “Current truth” has two independent clocks

Do not treat the wiki as a static description of shipped code, nor as a graveyard for every design someone once imagined.

**Axis A: decision authority.** Is the claim ratified as the intended product/technical contract?

- **Selected / ratified:** current instruction for the future product or technical target, even when execution has not yet reached it. This is normative and belongs in `docs/product/` or `docs/technical/`, owned once.
- **Proposed / unresolved:** potential future policy, competing designs, or conditional approval. Belongs under `work/designs/open/<topic>/`, optionally with a brief *unaccepted* pointer from the relevant wiki owner. May be discussed in a nonnormative Change packet; not execution permission.
- **Superseded / withdrawn:** no longer current normative design. Remove obsolete normative text from wiki, preserve historically significant rationale in `docs/decisions/` and complete Change archive, or Git. Do not keep an obsolete requirements paragraph “for context.”
- **Historical observation:** a particular revision did/failed a thing. Belongs in actual dated `evidence/`, not as a present-tense contract. Maintain a current link to it only where it proves or falsifies a claim.

**Axis B: implementation evidence.** What has been demonstrated at a named source/test/run revision?

- **Unimplemented / absent**, **source-observed**, **provider-free tested**, **connected tested**, **live observed**, **human accepted**. No promotion between tiers without real new proof. Testable statements include SHA and scope. Never infer live proof from an archived Done packet or page link.

**Both axes apply simultaneously.** A selected world-neutral capability kernel can be unimplemented; SSE may be source-observed without live hosted proof; a speculative OTel recommendation is neither selected nor deployed. Do not put a “source-observed” label on a product promise as if the product is approved only once it ships.

| Example | Decision axis | Reality axis | Correct home |
| --- | --- | --- | --- |
| No accepted action means no fictional time progression | Ratified product rule | Narrow implementation plus evidence, checked separately | `docs/product/gameplay/time-and-autonomy.md`, source state in `STATUS.md` |
| Consented GM07 fallback | Proposed rule | Not general accepted behavior | Open design + proposed Change, link from accepted time rule |
| World-neutral capability kernel | Selected technical target | Current character schema still narrow | `docs/technical/engine/selected-architecture.md` plus status |
| OTel/Grafana diagnostics | **Recommendation only**, no demonstrated selection | Not installed/authorized | **Candidate move** from `docs/technical/observability/telemetry-and-diagnostics.md` to named open design |
| OBS04 capture writer | Detailed design, active Change still proposed | Not universal captured writer | Candidate open gate; if owner selected technical target, ratify first and keep in technical wiki |
| Source-observed SSE, no hosted acceptance | Ratified technical transport | Source-observed; live absent | Client contract plus `STATUS` / tests |

## 2. What a canonical wiki page should say

A page should answer a coherent *presently binding question*, with a useful negative case and a path to actual evidence where needed. Ideal top section:

- **Owns:** one decisive subject and obligation.
- **Authority:** selected product or selected technical, optionally adopted decision ID when one exists; never ambiguous “proposal-only canonical specification.”
- **Not owned:** the nearest neighboring contract; link directly to that heading.
- **Read route:** for large pages, a short question→heading map and a named “read this only if” trigger.
- **Implementation:** one brief link to `STATUS` (and source-adjacent README) *when relevant*. Avoid a long dated “W19 done, W20 planned...” paragraph in the normative body.

No universal YAML frontmatter or brittle stamp required on every tiny article. Where status is subtle, one explicit sentence is better than a synthesized header template. A short page may need only title, one-line owner and 2–3 coherent sections.

**Current selected long-term target is not to be deleted because unimplemented.** Planned *unapproved* policies must not be written as promises or mandates in normative sections. “Future options” inside selected wiki may be a one-line pointer to an open gate; do not embed the entire speculative design.

**Past behavior** stays in wiki only if it is still a compatibility guarantee, a necessary rejection case, or a currently binding rationale. Past trials, migration-step diaries, W-series chronological status and retired features that no longer constrain the system live in completed Changes/evidence/Git. Historical ADRs remain intentionally discoverable in `docs/decisions/`, marked superseded when replaced.

## 3. Admission lifecycle: from idea to wiki to code

### S0. Exploration (no product authority)

User/agent explores alternatives under `work/designs/open/<topic>/` or in the conversation. It may analyze current canon and source, but does not silently edit `docs/` or select a Change. A research writeup or independent audit is NOT a code-bearing Change.

### S1. Owner ratifies product behavior

An explicit owner decision settles requirements, permissions, negative cases and tradeoffs. **Promote to the owning product wiki heading immediately**, even if no implementation is authorized now. The acceptance event is a product decision, not a code commit. Update links; keep rejected alternatives in a compact rationale/ADR only if useful. Do not leave the only approved behavior buried in a proposed Change for weeks.

### S2. Technical design is selected

After product semantics are fixed, select the technical invariants, authority boundaries, source-of-truth rules and failure semantics in `docs/technical/`. State when a selected design is a *target* rather than an implemented source. Material architectural choices receive an ADR in `docs/decisions/`, with supersession chain. Unresolved alternatives remain open and must not masquerade as accepted technical policy.

### S3. Implementation Change is planned

A bounded source/test/config delta is recorded under `work/changes/open/`. It **references existing wiki owners** and names exact clauses/negative cases. It may include unapproved *conditional* alternatives, but those are plainly gates, not a substitute for ratification.

**No forced premature wiki edit:** merely proposing a Change does not make the proposed behavior accepted, so do not write its speculative implementation plans into canonical wiki. Conversely, if planning includes a separately ratified product or architecture decision, promote that decision at S1/S2 **now** rather than waiting for code.

### S4. Change is implemented

Code, tests and documentation are **one bounded delivery**, even when commit order varies. The agent reads precise selected contract, inspects the current source and implements the approved delta. Update technical wiki only for genuinely altered selected architecture/guarantee; otherwise leave target intact and update `STATUS` / nearest source map and evidence to describe the new **realization**. A half-implemented target is *not* a new smaller product requirement.

If code reveals the selected contract is wrong, do not refactor the product requirements to flatter the code. Stop the affected step, present conflict, alternatives and minimal counterexample; return to owner ratification. Compatible incremental implementation may continue only within the already accepted scope.

### S5. Reconciliation before Done (a hard gate)

Required ledger is **claim-focused**, not “docs were touched.” For each affected authority heading:

| Field | Required evidence |
| --- | --- |
| Selected product claim | Path + heading + ratified unchanged/changed, **why** |
| Selected technical guarantee | Path + heading + unchanged/changed, **why** |
| Source reality | Named symbol/call site and inspected SHA; new behavior/absence |
| Proof | Test/run/negative case, actual command and result or explicit not-run |
| Public status | `STATUS.md` tier/absence correct; dated evidence linked |
| Navigation | Source-adjacent README/subject map updated if owner/route changed |
| Conflict | None / owner-decision blocked, with smallest counterexample |

Completing an empty table with eight “N/A” strings is not a proof. Each `unchanged` must have a defensible reason; agent checks only affected headings, **not all 74 pages**. A docs-only Change/move may use a non-code maintenance task, but actual code-bearing Changes must carry the ledger already demanded by [change skill](../../../../.agents/skills/change-workflow/SKILL.md). No content-only task is falsely dressed as a code feature.

S5 is valid if the source proves the accepted slice while the larger selected target remains unfinished, and the status correctly says so. S5 fails if code contradicts a binding product guarantee or current-sounding claims remain false. Don't require the model to rerun destructive/paid tests for documentation closure.

### S6. Archive / rollback / supersede

Archive complete Change packet unchanged under `work/changes/archive/`; preserved permanently. The current wiki remains clean: it contains today's accepted rule, not the implementation diary. If code rolls back, update `STATUS` and source maps to the new reality; the selected product/technical target remains unless the owner independently withdraws it. Superseding a selected target needs a clear decision and updated normative page; previous text is recovered through Git or a superseded ADR.

## 4. A few implementation details worth enforcing

**Don't update docs twice for no reason.** If a Change implements an existing selected target without changing its contract, writing a new “implementation now done” paragraph into 5 technical pages is usually duplication. Update source maps, `STATUS` and evidence, and in-place remove false current-state language if already present. A scope change to the *target* belongs in the normative owner.

**Don't withhold ratified design until code is ready.** That turns temporary Change dossiers into the actual product bible.

**Don't let a wiki page decide its own status by location.** A file can be under `docs/technical` and still plainly say “proposal-only,” as two current Observability pages do. That's an information-governance problem, not a reason to pretend selection.

**Don't overstate completion:** source exists ≠ connected test; connected test ≠ live proof; human demo impression ≠ robust acceptance; archived Done packet ≠ current source.

## 5. Hard acceptance examples

- GM07 proposed remains under open design and/or open Change. A coder receiving “implement the UI” may not add general automatic fallback. A user may ratify specific consented fallback before any code exists; only then is that selected rule promoted to product wiki.
- A selected Storyteller two-loop target remains in technical wiki even if ordinary tasks are currently one-shot. `STATUS` describes current one-shot and bounded tool recipe without downgrading the selected architecture.
- An experimental provider-specific endpoint gets implemented without an accepted product permission: flag scope violation, do not rewrite `docs/product` to legitimize it.
- W-series test commands after implementation must be updated in the current runbook; a `planned` claim in a procedure is stale even if all graph links resolve.

**Decision still needed:** user approval of this authority/lifecycle contract and handling of proposal-only Observability pages. WIKI06 prepares enforcement; WIKI08 handles documented content cases. Neither implicitly ratifies new gameplay.
