# DOC01 | Target documentation architecture

**Status:** Proposed target for owner review and Cursor implementation; not a report that migration has happened. **Baseline:** `main@8cec56e1262e5493020d9da2ba163264398ad667`, inspected 2026-11-16. **Authority:** the owner's product-first, technical-second, code-as-artifact rule is preserved without compromise. This design intentionally supersedes the existing *location* taxonomy in `.agents/references/documentation-navigation-standard.md`, not that rule's epistemic hierarchy.

## 1. Design object: knowledge, not folders

The unit of optimization is a **maintained knowledge claim** that answers a consequential question. Its attributes are: (1) subject and primary maintainer; (2) normative status, including who accepted it; (3) behavioral or technical boundary; (4) revision trigger; (5) links to dependent contracts; and (6) evidence route, if one is required. A file is a container for a cohesive set of claims, not a fossil of which chat or implementation wave created them.

A directory earns existence only when at least one of these falsifiable conditions is met:

- **D1, distinct authority:** its members have the same authority class and cannot safely share a parent with a different class.
- **D2, distinct subject owner:** they address a stable domain with its own vocabulary and independent reasons to change.
- **D3, distinct lifecycle / retention:** they are mutated, promoted, expired or audited under a genuinely different protocol.
- **D4, meaningful retrieval improvement:** a concrete question has a shorter and less ambiguous route through the directory than through a flat parent; validate with a cold-reader task, not intuition.
- **D5, executable locality:** the material must sit beside code/tests/fixtures to remain runnable or discoverable.

A folder does **not** qualify merely because it has many files, corresponds to a sprint, was created by a particular agent, or makes a move script easy. Five adjacent documents with one owner may remain five files in one flat folder. A 60 KB cohesive contract is not automatically an error; a 5 KB handoff falsely treated as permanent authority is.

### Hard invariants

1. Exactly **one active normative owner** for each product behavior and technical invariant. Companion docs may summarize a consequence and link, not independently maintain the same rule.
2. **Product intent > accepted technical contract > source implementation.** Source and tests establish observed behavior, not permission to rewrite product purpose.
3. Planned, selected, implemented, fixture-verified, live-observed and human-validated are different claims. A page cannot promote one to another by silently changing its heading.
4. Dated observations are never authoritative design. Design rationale is not an implementation receipt. A handoff is not a specification.
5. Accepted specification survives removal of an execution packet. A work packet should be disposable without losing durable knowledge.
6. Navigation indexes route by **question and owner**, not by chronological wave.
7. No permanent document is obliged to keep a sequence of daily status banners. Current deployment/implementation status has a single reporting home.
8. No migration silently changes mechanics, access policy, spending authority, or product approval. Rewriting structure is not consent to change behavior.

## 2. Desired repository topology

The following is a **logical target**, not an instruction to create empty scaffolding. File names are proposed canonical owners; Cursor should refine the exact split against the content-atom inventory. Keep most directories shallow. Only instantiate a leaf when its owner has genuine content.

```text
README.md                           # one-page project entrance
ROADMAP.md                          # owner-selected strategy (from TODO.md)
STATUS.md                           # one dated implemented/evidenced boundary (from docs/progress.md)
AGENTS.md                           # small agent bootstrap, not yesterday's trial handoff

docs/
  README.md                         # short subject/authority router, no execution log
  product/
    README.md                       # product owner map
    foundations/                    # premise, vocabulary, platform promise
      vision.md
      concepts.md
    gameplay/                       # player-facing game semantics, mechanics, time, consequence
      rules.md
      actions-and-commitments.md
      time-and-autonomy.md
      continuity.md
      worlds-and-characters.md
      acceptance-scenarios.md
    experience/                     # player-facing journeys, UI semantics, perception
      principles.md
      entry-and-onboarding.md
      play-and-decisions.md
      return-and-journal.md
      navigation-and-stories.md
      settings-and-accessibility.md
      presentation.md
      collaboration.md
      replay.md
    storyteller/                     # narrative expectations, creative controls, autonomy constraints
      behavior-and-quality.md
      profiles-and-settings.md
      memory-and-continuity.md
    admin/                           # staff product, NOT the runtime engine
      charter-and-personas.md
      authority-and-governance.md
      player-360-and-support.md
      commercial-and-trust.md
      gameplay-and-liveops.md
      ai-engineering-and-investigation.md
      command-center-and-insights.md
      operator-workflows.md

  technical/
    README.md                       # technical owner map
    platform/                       # cross-domain identity, data, release, infrastructure
      topology.md
      identities-and-access.md
      data-and-persistence.md
      execution-and-delivery.md
      spending-and-entitlements.md
      deployment-and-compatibility.md
    engine/                         # game truth: authority, rules, time, transition, world
      authority-and-transitions.md
      mechanics-and-capabilities.md
      chronology-and-activities.md
      lifecycle-and-compatibility.md
      concurrency-and-recovery.md
    storyteller/                     # in-game LLM generation, memory, inference and dispatch
      operation-and-controller.md
      prompts-and-tools.md
      context-and-memory.md
      generation-and-publication.md
      provider-boundary.md
    client/                          # React/Next, frontend state, UI delivery and presentation
      architecture.md
      state-and-server-boundary.md
      interaction-contracts.md
      presentation-runtime.md
      accessibility-and-performance.md
    admin/                           # staff principal/grants/control-plane technical contracts
      topology-and-authorization.md
      investigation-and-privacy.md
      commands-and-audit.md
      console-and-read-models.md
    observability/                   # evidence capture, correlation, reconstruction, retention
      identities-and-evidence.md
      capture-and-provenance.md
      investigation-and-reconstruction.md
      retention-and-access.md
      telemetry-and-diagnostics.md
    lab/                             # developer-only Chamber/controlled experiment infrastructure
      chamber-and-fixtures.md
      experiment-protocol.md

  decisions/
    README.md                       # durable, *accepted* choice records with supersession
    D-0001--<topic>.md              # flat, ID-based; no sprint/program/date subtrees

  runbooks/
    README.md                       # concise operational, human-executable procedures
    local-development.md
    verification.md
    incident-and-investigation.md   # only if a repeatable process is actually required

work/                               # noncanonical work, outside docs
  README.md
  changes/
    README.md                       # active selection, queue and compact completion register
    open/YYYY-MM-DD--slug/
      CHANGE.md
      PLAN.md                        # optional; short, disposable checkpoint
    ledger/YYYY-MM.md               # terminal Change digests + original Git commit refs
  designs/
    README.md                       # unaccepted design wave; must have owner/gate/expiry
    open/YYYY-MM-DD--slug/
  sessions/
    YYYY-MM-DD.md                   # short rolling continuity, promoted or expired

evidence/                           # revision-bound *observations*, outside docs
  README.md
  inspections/YYYY-MM-DD--topic.md  # source audits/reviews with inspected SHA and limits
  runs/YYYY-MM-DD--trial/
    MANIFEST.md                     # reproducible test IDs, environment, hashes, claims
    ...                             # only essential small reproducibility artefacts

research/                           # optional curated non-normative theory, outside docs
  README.md
  storyteller/...
  development-agents/...

.agents/                            # agent-only rules, procedural skills, reference knowledge
apps/**/README.md                   # source-adjacent implemented owner maps
packages/**/README.md               # source-adjacent implemented owner maps
tests/**/                            # runnable scenarios, snapshots and fixtures
```

**No permanent `docs/programs/`, `docs/engineering/`, `docs/history/`, `work/changes/`, `docs/questions.md` or `docs/progress.md`.** These are current categories/lifecycles, not enduring domains of product knowledge. Their valuable *contents* must be promoted before their containers disappear. A current design program, when truly unfinished, lives temporarily in `work/designs/open/`, not beside the product bible.

## 3. Proof obligations for every surviving directory

| Directory | Existence criterion | Exact positive owner | Prohibited occupant / counterexample |
| --- | --- | --- | --- |
| `docs/` | D1 | Maintained product/technical knowledge | Session log, handoff, old trial |
| `docs/product/` | D1 | Accepted user/staff outcomes and rules | SQL schema, implementation checklist |
| `docs/product/foundations/` | D2 | Unified promise and vocabulary shared by all users | A second Admin-specific glossary |
| `docs/product/gameplay/` | D2 | Player agency, rules, time, world and consequence | How Postgres persists a tick |
| `docs/product/experience/` | D2 | What player UI expresses, independent of Next components | React hook architecture |
| `docs/product/storyteller/` | D2 | Creative behavior, narrative quality, settings and permitted interpretation | Exact model API call chain |
| `docs/product/admin/` | D2 | Staff jobs, permitted access as product policy, workspace semantics | JWT verifier code paths |
| `docs/technical/` | D1 | Accepted correctness architecture beneath product | Pure design inspiration or dated tests |
| `docs/technical/platform/` | D2 | Shared substrate when no domain owns it (identity, storage, delivery) | Game consequence selection |
| `docs/technical/engine/` | D2 | Authoritative world state, timing, mechanics and concurrency | LLM free-text persuasion |
| `docs/technical/storyteller/` | D2 | Bounded LLM operation, context, dispatch and publication contract | Player's artistic preference as an implementation detail |
| `docs/technical/client/` | D2 | Player frontend runtime and UI delivery guarantees | Admin privileged commands |
| `docs/technical/admin/` | D2 | Privileged control plane, policy, read/write/audit routes | Gameplay mechanics authority |
| `docs/technical/observability/` | D2 | Forensic data identity/provenance, replay and redaction guarantees | Yesterday's trial transcript |
| `docs/technical/lab/` | D2/D5 | Developer-only Chamber constraints and fixture protocol | End-user game requirement |
| `docs/decisions/` | D3 | Dated accepted alternatives, rationale and supersession; link the normative owner | Another free-standing specification or unresolved brainstorm |
| `docs/runbooks/` | D1/D3 | Actual repeatable human procedures, test/diagnosis instructions | Architecture target or one-time execution log |
| `work/` | D1/D3 | Not-yet-accepted or execution-scoped work with deletion/promote policy | Permanent game rules |
| `work/changes/` | D3 | Selected code/config/docs migration outcomes and state transitions | Complete archive of every old transcript |
| `work/changes/open/` | D3 | Nonterminal packets; one folder per bounded change identity | Completed Change retaining 10 stale instructions |
| `work/changes/ledger/` | D3 | Searchable one-row terminal summaries, month partition only for navigation | Full copied CHANGE/PLAN dossiers |
| `work/designs/` | D3 | Active unratified architecture investigations with explicit close gate | Accepted core technical contract |
| `work/designs/open/` | D3 | One temporary project, owner/target and closure date | Infinite numbered design-wave archive |
| `work/sessions/` | D3 | Brief short-lived human/agent continuity | Evergreen chat transcript |
| `evidence/` | D1/D3 | Verifiable observations with provenance and claims bounded by revision | Future proposal treated as factual proof |
| `evidence/inspections/` | D3 | Dated source review, method, SHA, positive and negative case | Authoritative design updated silently through inspection |
| `evidence/runs/` | D3/D5 | Controlled evaluations and authentic receipts; run ID scopes assets | Cursor handoff disguised as a trial |
| `research/` | D1/D3 | Curated studies with citations, checked date and applicability | Mandatory standard or forgotten scratchpad |
| `research/storyteller/` | D2 | External methods for in-game agent research, not product target | Coding-agent policy |
| `research/development-agents/` | D2 | General investigation/reference on tool use; procedural rules still in .agents | An extra always-loaded agent rulebook |

**Conditional leaf test:** a proposed second-level folder is removed and its contents lifted to the parent if it has no independently named owner, query, or retention rule. The candidate table above does not grant every empty leaf unconditional legitimacy. In particular, `research/` should not exist merely to save speculative essays.

## 4. One authority per topic, no new shadow bibles

A topic's product owner states **what must be experienced**; its technical owner states **what invariant implements that promise**; source-adjacent maps state **where code currently does it**; evidence records **whether an experiment observed it**. For example:

- **Accepted action and time:** `product/gameplay/actions-and-commitments.md` and `time-and-autonomy.md` own the player promise; `technical/engine/chronology-and-activities.md` and `authority-and-transitions.md` own state transitions; the relevant application README routes to code; a dated `evidence/runs/` record owns the measured result.
- **Storyteller and narrative memory:** `product/storyteller/` owns creative contract; `technical/storyteller/` owns agent/controller, snapshots, retrieval and provider dispatch; `technical/platform/data-and-persistence.md` owns storage primitives only. Do not duplicate the identity/rollback contract in three places.
- **Support investigation and replay:** `product/admin/player-360-and-support.md` owns staff needs and disclosure rules; `product/experience/replay.md` owns the player's own history; `technical/observability/` owns causal evidence; `technical/admin/` owns staff security. One function can satisfy more than one product need without multiple technical truth owners.
- **UI / React:** `product/experience/` owns interaction outcomes and accessibility intent; `technical/client/` owns Next/React topology, state/data boundaries, presentation machinery. The existing React engineering target is promoted or reconciled there, not maintained in parallel.

Ownership conflicts are **resolved by decomposing a claim**, not by copying a paragraph into each neighbor. Each owner uses links for external responsibilities and can include a terse locally necessary consequence (e.g. “this operation never advances time; see engine owner”).

## 5. Consolidation and losslessness

**Do not implement by `git mv` alone.** Extract an atom ledger for every file and important section before rewriting. Every nontrivial atom receives one of:

- **PROMOTE** to the unique accepted normative owner, with a stable heading.
- **DECISION** to a durable accepted choice record *and* its normative consequence into the product/technical owner.
- **DRAFT** to bounded `work/designs/open/` with owner and expiry; never silently promote a proposal.
- **EVIDENCE** to a dated inspection/run manifest with SHA, actual commands and limitations.
- **PROCEDURE** to a runbook, `.agents` rule/skill, or runnable code/tests according to audience.
- **MERGE** into another atom with evidence of semantic equivalence, not just similar filenames.
- **DROP** only when entirely stale/duplicate/transient and unique facts were transferred, with an explicit disposition and Git commit pointer.

A large technical decision that contains essential contracts (e.g. ENG03 context capture, bounded dispatch, AD staff grants, evidence envelope) may remain long after relocation; no fabricated 5 KB document cap. Split a mixed document when its normative contract and its investigation/history have different reasons to change.

When existing docs disagree, use an explicit conflict record: statement A + SHA/heading, statement B + SHA/heading, inspected source/evidence, owner-selected resolution, resulting doc and test. Never assume newer file timestamp means correct product semantics.

## 6. Lifecycle rules that prevent recurrence

- **Work packets:** one selection register, one active bounded Change, other Proposed/Blocked clearly distinct. Closing a packet requires product/technical reconciliation. Extract a compact ledger row with outcome, source commits and evidence, then remove full terminal folder from the active tree (Git holds previous versions). Do not create a permanent `archive/<month>/<program>/<packet>` hierarchy.
- **Design investigations:** at creation name intended permanent owners, decision gate, expiry/checkpoint and disposition. Close by promote/record/abandon, not by accumulating final handoff documents.
- **Evidence:** keep only reproducibility-critical inputs, claims, hashes, commands, observation environment and limitations. Logs and screenshots belong in dedicated assets outside docs or in appropriate test snapshots; protect secrets and private narrative. Apply explicit retention/review dates for bulky or sensitive outputs.
- **Session continuity:** concise rolling notes, not 70 KB daily chat memoirs. Promote decisions and unresolved obligations. Expire old notes after comparison against permanent specs, ledger and owner-approved outstanding choices; Git remains the historical recovery route.
- **Indices:** `README` files in the canonical tree show routing questions and owners, not a second implementation status dashboard or daily chronology. Do not repeat large child inventories at every ancestor.
- **Agent hygiene:** `AGENTS.md` remains small and timeless, current selected work lives in the queue; `.agents` owns agent operating procedures, not game-design contracts.
- **No irreversible pruning by default:** material involving legal attribution, business policy, spend, privacy, evidence of incidents, or explicit owner-retained dormant design receives manual preservation review.

## 7. Non-goals

DOC01 does **not** change gameplay policy, accept proposed architecture, rewrite the actual runtime, call LLM providers, modify a live DB, or declare previously untested features validated. The target directory topology is a means to protect knowledge; deleting text for a prettier tree is not success.

**Cross-check:** [audit](../../../../work/changes/archive/2026-11/other/2026-11-16--doc01-documentation-architecture/AUDIT-BASELINE.md), [directory census](../../../../work/changes/archive/2026-11/other/2026-11-16--doc01-documentation-architecture/DIRECTORY-REGISTER.md) and [file dispositions](../../../../work/changes/archive/2026-11/other/2026-11-16--doc01-documentation-architecture/FILE-DISPOSITION.md), [migration](../../../../work/changes/archive/2026-11/other/2026-11-16--doc01-documentation-architecture/MIGRATION.md), [verification](../../../../work/changes/archive/2026-11/other/2026-11-16--doc01-documentation-architecture/VERIFICATION.md), [execution packet](../../../../work/changes/archive/2026-11/other/2026-11-16--doc01-documentation-architecture/CHANGE.md).
