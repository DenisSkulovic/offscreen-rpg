# Change work units: independent planning standard

**Purpose:** define bounded, independently reviewable changes to the project’s authoritative specifications **or** its executable implementation. Code is downstream of accepted product and technical intent, not the admission ticket for a legitimate Change. **This standard governs the development harness, not game behavior.** Revised 2026-11-18; legacy code-bearing packets retain their historical meaning.

## Vocabulary and strict inclusion rule

| Concept                                 | Definition                                                                                        | Code delta needed?                                       | Durable home                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Initiative**                          | An outcome/program that may span many changes, investigations, tests and human decisions          | No                                                       | Authoritative product/technical topic plus a short initiative overview _only when needed_     |
| **Design / investigation**              | Resolve an unknown, review an approach, define intent or choose a technical contract              | No                                                       | Relevant permanent spec, evidence page or temporary research artifact; retire after synthesis |
| **Change**                              | One bounded, independently verifiable **documentation or implementation** outcome with an explicit intended diff | **Only for implementation Changes** | Packet under `work/changes/open/` while non-terminal; `archive/YYYY-MM/<program>/` after Done/Cancelled; no automatic selection |
| **Execution slice**                     | A smaller dependency-ordered portion of a Change with its own proof and handoff                   | Only if its parent modifies code                         | Same Change's short PLAN/checkpoint, not another duplicate dossier                            |
| **Evaluation / acceptance**             | Measure what already exists through inspection, tests, manual play or controlled live experiments | No, unless tooling/test code itself is being changed     | QA/evidence owner, not a fake implementation ticket                                           |
| **Direct minor edit**                    | Trivial spelling/link repair or uncontroversial correction with no cross-owner decision or meaningful impact | No | Update the owning page directly, validate links, do not invent a Change packet                  |

**Change kinds:** `implementation` changes executable source, tests, scripts, migrations, executable schemas or meaningful build/runtime configuration; `documentation` changes canonical product/technical specifications, authoritative agent policies, claim ownership, substantive crosslinks or document structure **without an executable diff**. A significant documentation revision with independent outcome/negative proof is a full Change. An investigation, proposed product decision, evaluation-only run or trivial spelling repair is *not* automatically a Change. If a documentation Change discovers needed code work, stop and design a separately authorized implementation Change rather than silently broadening scope.

A planned Change need not **already** have its diff. It must name exact future document and/or executable modifications with falsifiable completion criteria. “Improve memory” is an initiative. “Make the report distinguish published revisions” is an implementation Change; “separate ratified memory guarantees from unimplemented retrieval proposals in the canonical two-page contract, preserving every inbound anchor” can be a documentation Change. “Check whether recall was accurate” is an evaluation unless it also deliberately changes a maintained spec or executable test.

## The ideal planning unit

A fresh executor should be able to accept a Change packet without reconstructing a whole product program.

**One Change needs:**

1. **Outcome:** one observable, reviewable improvement in an authoritative document contract **or** implemented behavior; why this is necessary.
2. **Authority:** exact product/technical specification headings, or an approved invariant for internal refactors.
3. **Baseline:** latest verified source/revision, or a clear pre-implementation reinspection gate if stale.
4. **Scope:** exact canonical document headings and anticipated text/structure edits and/or source/test owners; excluded adjacent work.
5. **Acceptance:** a normal reading/behavior case, a discriminating negative/edge case, and smallest safe *semantic and/or executable* proof.
6. **Risks/permissions:** state, security, migrations, irreversible side effects, budget, authorized test environments.
7. **Status/next action:** one responsible executor, current step, actual checks and blockers, explicit human go-ahead if required.

**Quality of the cut:** all the editorial and/or implementation work contributes to one acceptance outcome, and it can be reviewed and reverted coherently. Split when tasks have different authorities, independent outcomes, incompatible permission requirements, or require a new major design choice. Do **not** split by arbitrary line count, hour target or token budget alone. Do **not** invent an executable delta to justify an editorial Change, or create a Change merely for an open design discussion.

### Optional planning depth

- **Small Change:** one concise `CHANGE.md`, no additional PLAN; the accepted contract and proof are sufficient.
- **Significant Change:** `CHANGE.md` plus `PLAN.md` only when dependencies, editorial migrations, implementation slices or resumable checkpoints justify it.
- **Large initiative:** retain an overview and pointers to selected Change packets. Do not hand the initiative's entire 30–70 KB dossier to Cursor as an executable instruction.

The selected route is `work/changes/README.md` (hot queue). Create new packets under `work/changes/open/YYYY-MM-DD--slug/`. A small selected Change needs only `CHANGE.md`; `PLAN.md` is optional for a resumable execution checkpoint. On **Done** or **Cancelled/superseded**, after the Reconciliation ledger, `git mv` the leaf into `work/changes/archive/YYYY-MM/<program>/` (month from the date prefix; program from slug: admin, chamber, eng, experience, observability, storyteller, web, other) and repair inbound links—do not leave terminal packets in `open/`.

## Documentation-only Change admission and proof

A docs-only packet is a **Change** when it has one bounded canonical-text outcome (for example, making selected vs illustrative first-playable acceptance unambiguous), exact affected headings, a before/after claim map, identified dependents, and a falsifying counterexample. It is **not** a Change for exploratory brainstorming, a pure benchmark run, a trivial typo or an unratified product-policy choice. When a proposed new requirement is found, preserve it as Proposed and ask for owner ratification rather than inserting it into selected canon.

The same `planned-impact.v1` table uses **Product, Technical, Code, Related** rows; `Code | unchanged because no executable modifications are in scope; negative: ...` is legitimate and *required* for documentation Changes. A docs-only Change may have Product changed and Technical unchanged, vice versa, or both changed; each unaffected plane names its concrete reason. Reconciliation rows use **document revision and inspected source SHA or “no source behavior changed”**. Run link/heading health, semantic before/after counterexamples, and independent review of normative meaning. Code-oriented integration tests are optional and must not be invented to make the packet look complete.

**Compatibility requirement:** before selecting the first documentation Change, validate the **existing** `pnpm wiki:change-guard --mode plan` and `--mode close` against a docs-only fixture, including a changed canonical doc and a reasoned unchanged Code row. If the guard rejects it, address that narrow tooling defect separately; do not downgrade the new docs Change standard or mask a failing gate. Old code-bearing Change packets remain valid historical records.

## Lifecycle and permissions

| State                      | Meaning                                                                                                 | May an agent edit code?              |
| -------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Proposed**               | Candidate documentary or executable outcome; missing agreement, source audit or ratification            | No executable edits                  |
| **Ready**                  | Accepted exact scope and owners, negative case, reviewed `planned-impact.v1` four-plane plan, and explicit authorization for this kind of work; legacy Ready packets upgrade on selection | Only for an authorized implementation kind |
| **Implementing**           | One owner is executing the approved bounded documentation or code delta                                  | Only for authorized implementation kind |
| **Verifying**              | Intended edit exists; semantic proof, source check or owner review is incomplete                          | Only within approved kind/scope      |
| **Blocked**                | Cannot continue without named decision, dependency, environment or safety approval                      | Not beyond approved diagnostic scope |
| **Done**                   | Desired authoritative docs and/or executable change landed, stated evidence recorded and **Reconciliation ledger** completed for impacted claims; remaining limitations explicit | No; retire only after the ledger |
| **Cancelled / superseded** | No longer worth implementing or replaced by a different accepted plan                                   | No                                   |

**Parked** is a scheduling label, not proof that an unreviewed design became approved. Legacy recorded approval describes historical owner communication, not automatic perpetual permission for any future model, deployment, provider spend or newly selected architecture. A newly resumed workstream must recheck source and any changed product/technical decision. The current user can always choose to pause code work without changing the historical specification.

## Execution and evidence contracts

**Preparation:** establish selected product/technical authority and proposals → inspect exact owners and evidence → choose reviewable doc/implementation outcome → challenge alternatives and risks → **one bounded Change**. For documentation-only Changes, the source text, historical evidence and affected links are the primary inputs; product decisions remain owner-controlled.

**Execution:** owner/agent receives only the current Change, relevant headings, source anchors and verification instructions. For `documentation` kind, edit canonical pages and necessary inbound links **only**; do not modify executable files, run paid providers or create new product policies. The agent cannot expand scope because a parent initiative contains tempting unfinished phases.

**Exit:** compare actual document/source diff with the planned P/T/C/Related dispositions and known claim dependents; identify the checks actually run; complete the Change **Reconciliation ledger** for every changed authority heading and every known dependent (each `unchanged` with why, or `updated` with owner path + delta). A documentation-only packet's code row explicitly says **unchanged because no executable behavior is authorized**; changed markdown owner plus negative semantic review is the proof, not a fake code test. A blanket "docs unaffected" row does not cover the impact set. Run [documentation-reconciliation](../skills/documentation-reconciliation/SKILL.md) for every `updated`/drift hit. **Product documentation is the product bible; technical docs are second; code is the artifact—permanent docs must not remain more stale than the landed code.** Close/retire the packet only after that ledger is filled—do not leave a completed active FEATURE/PLAN as a permanent source of truth. Historical Git versions preserve old research.

**Audit cadence:** when planning paths become confusing, classify each as active code work, program, proposal, evaluation, or completed history. Never delete a dossier merely because its checkpoint is old or large. Confirm unique decisions have a canonical home and inbound links are repaired before retirement.

## Current repository routing, November 2026

- **`work/changes/` is canonical** for bounded implementation **and** substantive documentation packets: **`open/`** = non-terminal only; **`archive/YYYY-MM/<program>/`** = Done/Cancelled history. The index declares exactly one `Current change:` value: `none` or a relative link to a selected `CHANGE.md` under `open/` (or briefly under `archive/` only if documenting a Blocked reopen—prefer moving back to `open/` when resuming). The empty selection is deliberate and legitimate during design, evaluation and documentation work.
- **`docs/history/initiatives/` is frozen legacy initiative/history context.** Its old `FEATURE.md` and `PLAN.md` documents, including previous permissions, must never be treated as ready implementation Changes. The explicitly owner-retained canon policy remains intact.
- **No active Change** means no default executor task. `pnpm repo:brief` reports `none` and `--checkpoint` reports no active checkpoint. A selected `CHANGE.md` may optionally have `PLAN.md`; when absent, the brief uses the Change's handoff section.
- The [owner's engineering portfolio roadmap](../../ROADMAP.md) supersedes historical product-build sequence as the near-term development priority. Actual implementation permission is still task-specific; an index link isn't authorization.
- `pnpm repo:docs-health` reviews only existing Change PLAN checkpoints. The old feature dossiers are intentionally excluded from the active checkpoint queue.

## Independent industry references

- [GitHub Spec Kit](https://github.github.com/spec-kit/): specify → plan → tasks → implement → converge; bug fixing and idea assessment are distinct entrypoints, not compulsory feature phases.
- [Spec Kit: persisting specifications](https://github.github.com/spec-kit/how-to/persisting-specs.html): teams choose whether to retain active/completed plan artifacts; no single mandatory archival pattern.
- [OpenAI Harness Engineering](https://openai.com/index/harness-engineering/): small persistent entrypoint, structured knowledge and active/completed execution plans with maintenance.
- [Anthropic AI-native SDLC playbook](https://claude.com/resources/articles/the-ai-native-sdlc-playbook): approved bounded plans specify likely files, tests, risk and checkable scope before implementation.

**Local process decision (2026-11-18):** documentation-only Changes are first-class because product/technical documentation owns intended truth, while code realizes it. The original code-only boundary remains historically valid for archived packets but no longer governs new material editorial changes. Evaluate on actual Change sessions, including semantic preservation and dependent-claim coverage, rather than assuming more paperwork improves quality.
