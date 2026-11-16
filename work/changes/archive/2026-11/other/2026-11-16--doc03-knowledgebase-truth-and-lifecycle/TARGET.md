# DOC03 | Desired knowledge architecture and proof obligations

**Purpose:** serve future ChatGPT sessions and coding agents with reliable product meaning, selected technical guarantees, actual implementation coverage, and accurate remaining decisions. Do not optimize merely for fewer files, nor reinvent the already useful domain folder tree. Source code is an artifact of accepted product and technical design, while source/tests/receipts establish only what actually runs.

## 1. Six invariant tests

**K1. Exactly one product owner per accepted rule.** A page in `docs/product/` answers a specific player/staff question and includes an important normal and negative case. Aspirations and unapproved policies cannot be read as default permission.

**K2. Exactly one selected technical owner per invariant.** `docs/technical/` explains authority, data and failure behavior for the accepted target. Source-era implementation reports do not replace the selected architecture, and models never determine committed mechanical truth.

**K3. Implementation status is separately evidenced.** `STATUS.md` is the dated current capability matrix. It distinguishes selected architecture, source-observed, unit-tested, connected-tested, live-observed, human-validated and absent/blocked. Specs remain normative; source maps describe only code inspected at a named revision. No repeated blanket W/CH/SA "Done / not yet" banners across many contracts.

**K4. Moving a file cannot change its epistemic class.** Selected implementation-grade design is not made "unapproved open design" by moving under `work/designs/open/doc01-unpromoted-design`. An old handoff is not evidence merely because it sits under `evidence/inspections`.

**K5. Current knowledge routes never depend on history.** From `docs/README.md` or `AGENTS.md`, a scoped question needs no more than two navigation decisions to find the relevant canonical heading. Historical Change archives and Git commits are for intentional provenance queries only.

**K6. Full completed Change archive is permanent.** Retain all `work/changes/archive/` dossiers, unlike miscellaneous dated handoffs, redundant run copies and one-off migration scripts. Real trials retain one authoritative manifest and necessary unique assets.

## 2. Authority class and lifecycle contract

| Class | Location | Accepted as normative? | Update trigger |
| --- | --- | --- | --- |
| Product promise and constraints | `docs/product/<subject>/` | Yes, only approved sections | owner changes product behavior/policy |
| Technical desired correctness | `docs/technical/<domain>/` | Yes, only selected design | owner changes technical architecture |
| Unapproved live design | `work/designs/open/<topic>/` | No | explicit owner choice, gate, expiry |
| Explicit owner-retained dormant design | `work/designs/parked/<topic>/` | No | periodic review and reactivation |
| Decision rationale | `docs/decisions/D-*.md` | Why selected; not duplicate law | accepted trade-off superseded |
| Current coverage and proof | `STATUS.md` + actual evidence links | Factual, not normative | relevant code/test/work Change |
| Source ownership | nearest source-adjacent README | Source fact at inspected revision | source symbol/interface moved |
| Active code/docs work | `work/changes/open/` | Only one selected Change authorizes edits | selected work changes state |
| Completed code/docs work | `work/changes/archive/` | Historical, no active permission | permanent full packet |
| Source inspection, experiment | `evidence/inspections/` or `evidence/runs/` | Dated observation, not product law | actual experiment/reinspection |
| Repeatable human procedure | `docs/runbooks/` | Procedural, not normative gameplay | commands/environment change |
| Coding-agent procedure | `.agents/` | Governs software development only | tool/process evolution |
| Curated external study | `research/` | No | independent research relevance |
| Authored example | `examples/` **only if warranted** | No, unless benchmark criteria extracted into product | scenario/test reuse |
| Short session continuity | `work/sessions/` | No | promote then expire |

Two axes are orthogonal: **acceptance state** (accepted / selected future / proposed / rejected) and **implementation proof** (observed source / unit / connected / paid live / human). A future target can be binding but not built. A tested fixture does not approve a general product behavior.

## 3. Every existing docs directory must earn its place

There are **16 tracked docs subdirectories** at audited HEAD. Each entry below specifies its independent question, reason to change and domain boundary. D = different authority type, O = independent subject owner, R = independent revision trigger, P = repeatable operation. A directory does not qualify merely because it already exists.

| Directory | Test | Unique question and boundary | Decision |
| --- | --- | --- | --- |
| `docs/decisions/` | D/R | Why did an important selected alternative win; when revisit? Not a second contract. | Keep two existing ADRs and make further ADRs exceptional |
| `docs/product/` | D | What must the product mean, regardless of implemented code? | Keep |
| `docs/product/foundations/` | O/R | Shared premise and vocabulary; not mechanic/admission policy detail | Keep; clarify autonomy and shared-play aspirations |
| `docs/product/gameplay/` | O/R | Valid choices, rules, time, world, continuity; not prompt engineering | Keep |
| `docs/product/experience/` | O/R | What player perceives in browser and on return; not React rendering internals | Keep; selected visual semantics cannot be buried in DOC01 folders |
| `docs/product/storyteller/` | O/R | Player-facing DM creativity and continuity; not model dispatch protocol | Keep |
| `docs/product/admin/` | O/R | Staff goals/authority/workflow; separate accepted charter from proposed capabilities | Keep |
| `docs/runbooks/` | D/P | Repeatable safe human commands and diagnostics; not historical QA plan | Keep when maintained |
| `docs/technical/` | D | Machine guarantees selected to realize product intent | Keep |
| `docs/technical/platform/` | O/R | Shared identity/storage/delivery/spending/deploy; not frontend UX or shared-play product policy | Keep, split misplaced sections |
| `docs/technical/engine/` | O/R | Mechanical authority, transitions, time, capability kernel, concurrency | Keep, distinguish target vs current proof |
| `docs/technical/storyteller/` | O/R | Inference controller, context, prompt tools, provider, publication; one invariant per owner | Keep, reconcile overlapping working-cycle sections |
| `docs/technical/client/` | O/R | React/Next state, commands and presentation runtime; not staff grant law | Keep |
| `docs/technical/admin/` | O/R | Staff control-plane security, safe commands/reads/audit | Keep |
| `docs/technical/observability/` | O/R | Provenance, causal reconstruction, access and retention; not a trial transcript | Keep |
| `docs/technical/lab/` | O/R | Developer-only valid fixtures, controlled time/faults and reproducibility | Keep, update CH implementation boundary |

**Conclusion:** do NOT restructure the sixteen folders simply to make a new DOC03 shape. Their **contents and cross-boundaries** need repair. Delete a leaf only if its unique owner disappears after section reconciliation. Do not keep an empty "see elsewhere" stub.

## 4. Preferred final topology

    README.md                # project identity
    STATUS.md                # one factual entry plus evidence-linked capability coverage
    ROADMAP.md               # strategic owner directions, not execution queue
    AGENTS.md                # timeless coding-agent bootstrap
    NOTICE.md                # legal attribution
    docs/
      README.md              # <= 12 clear question->exact owner routes
      product/{foundations,gameplay,experience,storyteller,admin}/
      technical/{platform,engine,storyteller,client,admin,observability,lab}/
      decisions/             # only significant selected trade-offs
      runbooks/              # maintained procedures
    work/
      changes/{open,archive,ledger}/  # terminal archive permanently retained
      designs/open/<actual-topic>/    # real active proposals with owner/gate
      designs/parked/<actual-topic>/  # explicit owner-retained dormant work
      sessions/                       # rolling short continuity
    evidence/
      inspections/<dated-topic>/      # actual source audits, not generic old copies
      runs/<run-id>/                  # unique proof artifacts and one manifest
    research/<real-topic>/            # curated nonnormative research
    .agents/                           # development-agent rules/skills
    apps/**/README.md, packages/**/README.md # actual current code maps

`examples/` is **conditional**, only if authored scenarios have ongoing educational reuse distinct from executable tests and a concise product acceptance matrix. Do not create this folder by default merely because 15 old scenario files exist.

## 5. Important domain corrections

**Product:** label the opening vision's autonomous unanswered choices as long-term aspiration conditional on consent; the maintained time rule does not authorize advancement without an accepted commitment. GM07's general delegated choice remains proposed; Chamber's bounded gate fixture is not the general policy. Keep unratified temporal philosophy and group time under topic-owned design gates. Explain approved Storyteller quality and privacy without claiming a free model background mind.

**Engine:** selected modular monolith is the destination. Convert old "solo gameplay implementation contract" sections into true reusable invariants where relevant, and put observed release/prototype state in coverage and source maps. Explicitly reconcile selected ENG05/CAS and world-neutral capabilities from the DOC01 mixed design attic. Do not flatten detailed race negatives.

**Storyteller:** operation/controller owns WHEN/WHY bounded inference; prompts/tools owns model-facing recipe and tool protocol; context/memory owns actual canonical evidence; request-context/cost owns budget and packet construction; generation/publication owns validated current-state fence. Cross-link instead of maintaining five independently edited agent-loop descriptions. Keep selected prompt-language details in canonical owner, not old unpromoted DOC01 program paths.

**Platform:** identities/access owns authentication and shared security; React Query/SSE lives at client; shared-player mechanics under product/games; source-example implementation status belongs to coverage. Deployment/compatibility should not be the full old POC history, QA backlog and lab runbook; factor by revision trigger.

**Client and Chamber:** source-read status must acknowledge shipped W16/W17 and CH01+ modules where verified. Do not change target merely because a partial slice landed. Presentation-language selected contract cannot live only at `work/designs/open/doc01-unpromoted-design/programs/experience/system/`.

**Admin and Observability:** accepted staff charter and selected security/privacy guarantees are canonical; grant issuance, incident hold, kill switches and raw evidence access remain conditional. Observability evidence should have one canonical actual run identity, not copies in three unrelated folders.

## 6. Single capability-coverage authority

Replace scattered “SSE not implemented”, “Chamber code unchanged”, “everything Done” prose with a small indexed table in `STATUS.md` (or one linked `evidence/coverage.md` **only if necessary**):

| Capability | Target heading | Source owner / inspected SHA | Evidence tier + linked tests | Actually available | Still absent / blocked | Date |
| --- | --- | --- | --- | --- | --- | --- |

Populate with major domains first: time/finite actions, gameplay rules, Storyteller single/optional multi-round, provider spend, Admin grants, observability E0/Turn Capsule, React/Next SSR Query/SSE, Chamber Bench/Sandbox/Connected/Workbench, UX/human studies, and full ENG03. One row can differentiate CH fake-adapter tests vs real connected failure test. Never infer production proof from archived Change Done alone.

Maintain this matrix during Change reconciliation. Normative docs should have stable design state and a link to the coverage owner, not their own contradictory rolling history.

## 7. Retrieval and gardening

A fresh chat starts at `docs/README.md` → exact product/technical heading; STATUS answers actual coverage; work/designs answers owner-unresolved policy; source README answers code location; evidence explains proof. It should never need a DOC01 migration directory to know current design.

Deterministic checks should cover **maintained** `docs/`, `work/designs/`, `evidence/inspections` and `evidence/runs` manifests, `research/` and agent rules, while exempting full terminal Change archives. Add targeted failures for stale cutover language and unresolved DOC01 open folders, not a global word cap. Source-view status claims must be revalidated on touched Change paths, with inspection date and SHA.

The desired result is **higher correct-answer retrieval and lower chance of following a false authority**, not fewer words at any price. Compare fresh-agent test answers with meaningful adversarial documents before declaring success.
