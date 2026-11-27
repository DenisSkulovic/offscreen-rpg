# Target-first engineering renewal

**Applies to:** material architecture, infrastructure, domain redesign and portfolio-quality renewal, at the depth in [AGENTS.md](../../AGENTS.md#investigation-depth). This file owns progressive-resolution engineering. It is not a mandatory Design, formal defense or independent committee for focused work under settled contracts, or for evolutionary subsystem work whose accepted architecture still determines the solution. [AGENTS.md](../../AGENTS.md) owns delivery, finding severity, Git and acceptance; [submission standard](../references/planning-artifact-quality.md) owns deliverable quality and scale signals.

## Governing rule

Establish a sufficiently coherent architectural direction, select the next evolution, design that evolution to the depth its risks require, freeze and accept it, implement and verify it, then learn and raise resolution in a later evolution. A target is normally the desired next accepted state within that direction. It is not a comprehensive production-mature architecture of the whole subsystem. Current source supplies facts and constraints, not the design brief. Every selected evolution must name a target criterion, the material gap, a bounded outcome and discriminating proof. A construction Change carries the source postcondition and the downstream owner of that proof. It does not each re-prove the whole evolution. [Staged verification](verification.md) owns that schedule. If the criterion is already satisfied, do not manufacture work. Every meaningful evolution advances the actual system. Repeated revisions of a design document are not delivered engineering progress.

## Progressive resolution (owner decision 2026-11-27)

The metaphor is rendering a complex image progressively: from nothing, to a coherent low resolution, then to medium and higher resolution. Each evolution is a real change to the system. Design resolution, investigation depth and correctness are independent. Do not require a formal low, medium or high resolution label on every small change. These are design concepts, not administrative gates, scores or certificates.

### Three independent dimensions

| Dimension | What it is | What it is not |
| --- | --- | --- |
| Design resolution | Breadth, sophistication, generality and detail of the selected evolution | Permission to weaken code, failure behavior or existing guarantees |
| Investigation depth | Rigor needed to settle the decisions and risks inside that evolution. Use the focused, evolutionary and material-new-architecture distinctions in [AGENTS.md](../../AGENTS.md#investigation-depth) | A requirement to design the whole future subsystem before the next useful change |
| Correctness and safety | Mandatory inside every implemented scope | Optional polish that can wait for a later evolution |

A deliberately simple system may be complete and correct for a limited set of supported capabilities. Low-resolution architecture is not permission for low-quality code, incomplete required failure behavior, authorization defects, unsafe transactions, data corruption, unbounded spending or weakened existing guarantees.

### Select the evolution and freeze it early

For substantial design, establish a compact current-evolution boundary early. Record it in the existing design README, current target or decision register. Do not add a mandatory companion file.

Capture, in proportion to the risk:

- The long-term architectural direction.
- The current evolution's meaningful outcome.
- The selected sophistication and the capabilities it supports.
- What is included, and what is intentionally excluded.
- The material decisions and evidence required before implementation.
- Falsifiable freeze and acceptance criteria.
- Valuable candidates for a later evolution.

Recommend a practical first or next implementation scope. Do not wait for the owner to define every boundary. Choose the smallest coherent evolution that creates meaningful functionality, establishes a useful architectural foundation, or resolves a consequential engineering problem. Do not force an artificially small slice that breaks an atomic correctness boundary or produces no meaningful progress.

The boundary may change for material evidence, an integration constraint or an explicit owner decision. Do not expand it silently because a further improvement is imaginable.

### Stop when the evolution is sufficient

Proceed toward implementation when the selected evolution is coherent, its material decisions are resolved, indispensable evidence is available, feasible acceptance is defined, and the required reviews and owner acceptance are satisfied. Actively recommend freezing that evolution. Do not keep refining it because a more sophisticated future architecture is possible, a later capability might be useful, another framework or mechanism could be investigated, an abstraction could be generalized for a hypothetical consumer, Medium or Low findings remain, or the broader subsystem is not production-mature.

Further design work answers a consequential unresolved question inside the selected evolution, or it is an explicitly commissioned later investigation. For a consequential alternative, prefer implementation evidence or a bounded discriminating experiment when that is safe and feasible. A design checkpoint does not stop useful authorized work. [Continuous development flow](../references/planner-investigation-standard.md#continuous-development-flow) still applies.

### Review the selected evolution

Independent reviewers judge the selected evolution and its affected integration boundaries. They do not judge an imaginary final version of the subsystem. Maintain material-architecture defense, independent review, exact candidate provenance, indispensable evidence, owner ratification and impact-based re-review. Do not weaken those safeguards, and do not require a fresh full-design review after every later evolution.

Distinguish:

1. Defects and indispensable missing evidence in the current evolution.
2. Unsafe integration with existing consumers, authority or guarantees.
3. Intentional exclusions that are safely enforced.
4. Worthwhile future functionality and architectural refinement.
5. Ordinary Medium and Low findings.

Only unresolved Critical and High findings that affect the selected scope block that scope, under the [severity policy](../../AGENTS.md#finding-severity-and-blocking). Absence of a future capability is not a defect. That capability may have high strategic priority without being a High finding against the current evolution. Declaring something out of scope does not permit a violated existing guarantee, an unsafe partial state or ambiguous current authority. Verify that each exclusion is genuinely safe and that unsupported paths are absent, disabled, refused or otherwise bounded.

Packet readiness checks that the Changes fully and safely implement the accepted evolution. Do not require tasks, interfaces or proof for capabilities the evolution safely excludes.

### Keep later work discoverable

Record deferred capabilities, design hypotheses, unresolved future decisions, intentionally low-resolution areas, known limitations and Medium or Low findings in the durable technical owner or code-adjacent README under [durable engineering knowledge](../../REPOSITORY-STRUCTURE.md#durable-engineering-knowledge). The Design may point there, but must not be the sole record. Distinguish unratified hypotheses from selected contracts and current evidence. Name why the item matters, approximate priority, why it is not selected now and a reactivation trigger. At promotion and closure reconcile these entries and residual proof, not just accepted requirements. Do not write detailed algorithms, packets, estimates or specifications for speculative later work. Do not create a Change for every future idea.

Use the existing deferred Design and Change backlog only when independent tracking is justified. Preserve unique research and evidence through the existing archive, canonical owner and ledger procedures. Future-evolution priority is distinct from finding severity, current execution selection and implementation readiness. Do not create a second work queue.

### Do not add machinery

Progressive resolution does not add document types, directory trees, committees, review gates, resolution certificates, approval forms, maturity scores, per-evolution tickets, planning-time tracking, governance ledgers, a mandatory full re-review after every evolution, or new roles.

### Close an evolution and carry what was learned

After acceptance, use the existing implementation lifecycle: promote only the accepted scope into canonical product and technical owners; prepare the complete authorized Change batch; freeze shared contracts and real dependencies; allow safe parallel execution; keep the design implementation branch and per-Change branches; complete each Change's assigned gate and the evolution's joint acceptance; reconcile documentation, evidence and demonstrated status; archive completed Changes under the current lifecycle. Construction may dominate early Changes. Integration and qualification concentrate executable proof. [Staged verification](verification.md) owns that schedule. An isolated design branch may hold an intentional incomplete source state. Main does not.

At closure, record compactly, in the existing design, evidence or session record:

- Which assumptions were confirmed or disproved.
- Which limitations became material.
- Which later candidates are now justified.
- Which speculative ideas can be discarded.
- What the next meaningful capability could be.

Do not add a retrospective report or a learning ledger. An accepted evolution does not stay in the active design tree merely because the wider subsystem can evolve further. A later evolution resumes the relevant history through the existing design lifecycle, with explicit provenance and a reconciliation to current source. A revision of the design document is not, by itself, a delivered evolution.

## Design-led engineering: mandatory material-design gate (2026-11-26)

Design, challenge, make concrete specimens, experiment, defend, then implement. The objective is the simplest comprehensible system that meets the selected evolution's real requirements, not a production-mature design of every later capability, and not more architecture documents or attractive technologies.

### Desired-state reconciliation is the governing mindset

Establish purpose, consumer needs, external contracts and researched criteria independently of inherited mechanics. Requirements discovery may inspect actual behavior, adjacent callers and boundary evidence; distinguish intentional promises from accidental implementation. Freeze the current evolution before the detailed gap audit. Revise that boundary for material evidence, an integration constraint or an explicit owner decision. Do not expand it silently because a further improvement is imaginable, and do not revise it to rationalize existing code.

Preserve proven behavior, source history, durable data, permissions and financial/correctness guarantees. Clean-slate thinking is not permission to delete source or data. Retain justified mechanisms; replace only for demonstrated misalignment, unnecessary complexity or safer/cheaper realization. Neither reuse, rewrite nor file count establishes quality.

### External research is an engineering input, not optional decoration

For material framework, platform, protocol, library or practice decisions, inspect version-matched official documentation, tagged source, release artifacts, APIs, examples and standards before selecting approach. Compare credible industry implementations where useful. Investigate native capabilities and established libraries before inventing glue; do not recreate accessibility, state or interaction primitives without a concrete need.

Record URL, version/date, finding, implication and caveat. Trace consequential ambiguity into actual API/schema/template/source and pinned experiments when feasible. A citation is not live proof. Numerical settings need a workload, constraints, failure/cost reasoning and measurement route; supported defaults are provisional only if requirements permit. If access is unavailable, disclose and gate dependent decisions. No ornamental research on settled trivial fixes.

### Select the design posture

| Posture | When and how |
| --- | --- |
| Clean-slate target | Internals are fundamentally misaligned, disposable or untrusted. Identify excluded subtree, inspect requirements/adjacent contracts/environment instead. Do not copy its tree, algorithms, abstractions or tests. Reopen explicitly excluded internals only with owner permission for necessary integration/cutover. |
| Evolutionary | Proven behavior, data, compatibility or sound architecture warrants preservation. Establish independent target criteria first; inspect and retain justified implementation. |
| Focused fix | Existing contract settles a narrow defect. No dossier or formal design-defense ritual unless a material architecture question emerges. |

Select and briefly justify provisional posture at kickoff; revise with evidence. Treat initial preferences as hypotheses. Source exclusions and owner constraints remain binding.

### Work in the design space, not the packet queue

Use one scoped dossier in `work/designs/open/<area>/` when the work is a material new architecture or the evolutionary decision needs a durable home. A short current entrypoint and flexible research, decisions, specimens, experiments and reviews are enough. Follow [Design profiles and scope measurements](../references/planning-artifact-quality.md#4-submission-scale-and-measurement). Do not open that dossier for a settled-contract fix. Consolidate or split genuinely distinct design problems rather than accumulate amendments. Each custom abstraction or script must own a real unmet requirement. Compare native mechanisms and simpler composition.

Iterate design, critique, specimen, authorized experiment and revision. Examine whole-system composition and particular failure/operational seams. Use actual tools and meaningful counterexamples; fixtures do not prove native vendor behavior. When local runtime is unavailable, collaborate with owner on bounded terminal experiments, read-only first; fix reproducible source paths, not hidden live prerequisites.

### Gate before implementation planning

Use the depth that matches the risk. Do not apply the material-architecture gate to evolutionary or settled-contract work merely because the subject is infrastructure, persistence or Kubernetes.

**Focused work under settled contracts.** The accepted contract determines the solution. Use focused source investigation and proportionate review. Do not open a Design dossier or convene a committee.

**Evolutionary subsystem development.** Investigate the affected subsystem, preserve relevant behavior, resolve material decisions and prepare the implementation batch. A compact design artifact is warranted when it records a real decision or risk. Independent review concentrates on consequential architecture changes, interfaces, integration boundaries, safety guarantees and acceptance obligations. Reuse accepted architecture and existing evidence. Promote a canonical guarantee only when accepted behavior actually changes.

**Material new architecture or substantial redesign.** For the selected scope require:

1. A coherent current evolution: its requirements, meaningful alternatives and justified mechanisms. Later capabilities stay recorded candidates.
2. Concrete specimens and settled interfaces, lifecycle, security, state and failure contracts; feasible acceptance matrix.
3. Source-grounded integration/cutover map: consumers, compatibility, authority, retained/replaced/retired state, rollback/refusal and proof. Respect clean-slate exclusions; inspect affected replaceable source only when permitted.
4. Passed self-defense and [independent committee](#mandatory-independent-design-committee) on the exact candidate and scope. Decisive uncertainties are evidenced or explicitly gated outside the selected slice. Only unresolved Critical and High findings block that slice.
5. Separate owner acceptance of material decisions and promotion into permanent product/technical owners, distinguishing selected, implemented and proven.

Do not prepare implementation packets or dispatch a material new architecture before the selected design passes these gates. Narrow authorized experiments may precede acceptance; no implied implementation or ratification. A settled dependency-gated Change is not a design blocker. Proportionality is not permission to leave consequential architecture undecided for the implementation agent, or to skip proof that an established safety guarantee requires.

### Select execution by economics and fit

Direct planner edits with owner terminal feedback, delegated Changes or a hybrid are all legitimate after the selected evolution has converged. Compare access, cohesion, local build requirements, risk, owner learning, interaction overhead and total rework. Preserve ownership, the Change branch and documentation requirements on every implementation route. Schedule proof with [staged verification](verification.md). No artificial paid-agent handoff.

Commissioning the Design for implementation creates `implementation/<design-slug>` from the verified main revision that holds the accepted dossier and packets, unless an existing authorized integration branch is grandfathered in place. Record that target and the Change dependency edges in the existing implementation plan or catalog. Constituent Changes join only that branch. The design-level closure joins main after the constituent sources are integrated and the required joint acceptance has passed. An Undertaking is not required for the branch.

Infrastructure deliverable is reproducible repository lifecycle: distinguish existing provisioning, repeat ensure, upgrade, workload proof and fresh-clone/cold-cluster acceptance. Manual actions are diagnostics or authorized maintenance, not hidden setup. Repair normal public path, prefer deterministic recurring checks and never infer disposability or destruction authority.

## Adaptive design workshop: choose the investigation, not a universal sequence

A direct redesign request commissions scoped non-destructive design research, provisional specimens and isolated dossier writes, not production implementation, promotion, live mutation, destruction or paid calls. Read current applicable rules and verify actual repository, integration baseline, scope, exclusions and existing dossier before work.

At kickoff identify outcome, authority, assumptions, highest-risk unknowns, evidence methods and next review; **begin substantive investigation in the same turn**. Orientation alone is not the deliverable. Choose lenses, then adapt as findings warrant. At first substantive checkpoint create/resume scoped design branch, persist actual findings, source anchors, provisional decisions and evidence limits; verify commit and link. If unavailable, state why; no empty dossier, duplicate work or fictitious commit.

Continue the authorized investigation without repeated permission. Report a meaningful discovery in the current dossier and keep going. Stop for a consequential owner choice, a necessary experiment the owner must run, an evidence or access blocker, or completion of the authorized scope. Keep the owner informed. Do not ratify the design autonomously. Keep the current entrypoint honest and revise owning sections in place. Git and historical evidence retain prior revisions. Reconcile adjacent baseline drift before promotion. Specimens stay outside runtime paths. Use an isolated checkout or immutable retrieval, not a merge merely to run experiments.

### Choose the design lens by the problem

| Area | Questions | Specimens and discriminating experiments |
| --- | --- | --- |
| Infrastructure | Native vs glue, identity, topology, persistence, secrets, ownership, permission, timeout, recovery | Pinned artifacts/values, actual render and inventory, read-only discovery, isolated install/reuse/failure, cold-cluster proof |
| Packages/libraries | Domain boundaries, exports, dependency direction, type/runtime imports, state/effect ownership, errors | Proposed tree/manifest/export map, types and consumers, graph, compile/import negatives, adapter contracts |
| Distributed/backend | Composition root, auth/transport, command/query, transaction, retries/idempotency, shutdown | Request/response sequences, schema/transaction specimen, concurrent requests, crash/replay/denial |
| Frontend | User journey, information hierarchy, state authority, routing/rendering/hydration, accessibility, responsive visual design | Comparable prototypes, browser/screenshots, keyboard/mobile/long-content trials, loading/error/race checks |
| Data | Identity, invariants, cardinality, query workload, concurrency, retention, migration | Example data, DDL, EXPLAIN, constraints, concurrent transactions, migration/rollback |
| Cross-cutting | Compatibility, seams, consumer transition, independent integration slices | Consumer and old-to-new maps, vertical slice, migration rehearsal, regression/negative proof |

Use relevant lenses, not six mandatory recipes. Consult specialist references and actual pinned versions.

### Make design concrete before spending on execution

A specimen answers a named question (interface/consumer, tree, manifest, SQL, mockup, prototype, fixture or sequence). Label illustrative/executable/observed, dependencies and reproduction; keep in dossier or explicitly isolated sandbox. No shadow production subsystem. Promotion needs correctness, maintainability, ownership, integration and proof review.

Maintain a compact current decision/evidence register: question, alternatives, discriminating observation/experiment, decision and uncertainty. Record SHA/version, target, command/fixture, expected distinction, actual result, permissions and limitations. Prefer tests that could disprove the favored approach. Distinguish failed from unavailable evidence; no repeated unchanged experiments.

For owner terminal work, batch independent checks with expected results, bounds and stop conditions; skip unsafe dependent stages, collect successes and failures and interpret together. Compare inherited defects against immutable baseline. Batch source-grounded repairs, check remotely available facts first, avoid speculative fetch/run/paste loops. Promote useful recurring checks into existing verification infrastructure; one-offs need not become scripts.

### Design verification with the system

Before defense select actual tool/environment versions, access, fixtures, identities, isolation, resource admission, setup, public entrypoints, observations, fault injection, timeout, stop/cleanup and evidence. Demonstrate consequential feasibility uncertainty with small experiments. An unimplemented harness can be feasible if construction is precisely specified; verify harness refusal/setup failure. Reuse existing tools. Distinguish native public-path proof from adapted/injected tests; never weaken production fences for testing.

Freeze compact matrix: claim → normal and diagnostic negative → evidence tier/environment → required result → whether the proof is essential before source integration or only before final acceptance → owner. Essential safety, functionality and compatibility must pass at the agreed boundary before exposure and before final acceptance. Moving a check to its planned qualification boundary does not downgrade it and does not need a risk exception on each preceding construction Change. Extended assurance beyond the evolution's final boundary can defer only with explicit owner risk acceptance, a follow-up owner and visible NOT RUN. Classify by consequence, not difficulty; essential crash, concurrency and transport cases stay essential. A known material defect or missing indispensable proof blocks the acceptance that requires it. New evidence may reopen gates with an explained invariant and a revised matrix, not a silent expansion or downgrade. [Acceptance and integration](../../WORKFLOW.md#9-verification-review-and-the-next-loop); heavy proof belongs to the acceptance lead and owner; assigned inexpensive checks belong to the implementation agent, per AGENTS.md.

### Mandatory formal architecture defense and convergence

This defense is required for material new architecture and substantial redesign. Evolutionary work uses a proportionate skeptical check of consequential decisions. Focused settled-contract work does not manufacture this ritual.

After the selected evolution is coherent, and representative specimens and integration investigation exist, the designer switches from advocate to skeptical examiner. Construct the strongest credible objections: a simpler or no-change alternative, and a counterexample that would invalidate the core premise. Assess requirements coverage, necessity of each mechanism, economics, interfaces and authority, dependencies, concurrency, security and data integrity, failure, migration and rollback, resource use, user and operator ergonomics, and maintainability. Walk representative successful and adverse scenarios. Test actual contracts, source, pinned upstream and specimens. Seek discriminating experiments, not generic risks or compliments. What happens if an abstraction is removed? Can native capabilities suffice?

Record target revision and scope, self-review identity, ranked objections and counterexamples, evidence and limitations, disposition of each material claim, actual revisions, and remaining decisive questions. Classify findings with the [severity policy](../../AGENTS.md#finding-severity-and-blocking). Overall verdict **DEFENDED**, **REVISE AND RE-DEFEND**, or **EVIDENCE-GATED** (bounded slices allowed). **DEFENDED** requires no unresolved Critical or High finding in the accepted scope. Medium and Low findings are recorded and deferred. Revise or abandon weak choices that are Critical or High, then continue. Unavailable decisive evidence gates the affected scope. No arbitrary scores, pass counts, fictional committee or unrun test claims.

Convergence means the selected evolution has passed the defense its depth requires. For material new architecture, that defense is self-defense and the independent committee on the exact candidate, with consistent specimens and contracts for that scope, a complete integration and preservation map for the affected boundaries, and falsifiable acceptance. It is not proof of implementation, owner authorization, or production maturity of the wider subsystem. Stop the current design iteration when [the evolution is sufficient](#stop-when-the-evolution-is-sufficient). Reopen it for a wrong premise, an unjustified abstraction, a cross-boundary contradiction or repeated repairs that expose an architectural failure. Ordinary bounded defects remain implementation fixes.

### Mandatory independent design committee

**Required for material new architecture and substantial redesign, after self-defense and before owner acceptance, promotion or implementation planning of that scope.** It is not required for focused settled-contract work, or for evolutionary subsystem work that does not replace the accepted architecture or authority model. Review the [selected evolution](#review-the-selected-evolution) and the integration boundaries it affects. Do not review an imaginary final version of the subsystem. A later evolution is a new selected scope. It does not automatically reopen a full review of an accepted earlier evolution. Use an independent review context that did not author the candidate. A fresh chat is one valid realization. Another persona in the designer's chat is not independent. This is independent review, not separate model training or human certification.

**Submission:** passed self-defense, coherent target, integration map, feasible matrix and [submission-quality review](../references/planning-artifact-quality.md#6-independent-review-submission-quality). Counts and sizes are signals under the severity policy, not an automatic stop. Freeze candidate SHA, actual integration baseline, branch, dossier and precise scope; pause edits to the reviewed scope. Supply a neutral launch prompt, with no expected answers or preselected objections. An early owner-requested review is CONSULTATION: it does not accept the design, and it still needs a delivered verdict. Do not submit a knowingly premature formal candidate.

**Initial review.** Seek the complete material set of discoverable concerns in the commissioned scope. Review the actual architecture, source, contracts, evidence and execution instructions. Report findings together. Where useful, give each a stable identifier, plus severity, affected scope, concrete evidence, consequence, the required correction for a blocking finding, and the deferred disposition for a nonblocking finding. Use [finding severity](../../AGENTS.md#finding-severity-and-blocking).

Stop early only when missing access, fundamentally incoherent instructions, or another decisive prerequisite makes further meaningful review impossible or unreliable. Do not stop merely because one correctable deficiency already justifies a negative verdict. For a batch, review the commissioned Changes together when feasible. Keep individual conclusions and the cross-Change dependency analysis. A blocked item does not block unrelated work.

1. Read the current integration-branch agent rules even if the design branch predates them. Verify repository, baseline, branch and candidate. Inspect the dossier's current roles, routes and smells. A size or formatting concern is Medium or Low unless its consequence meets Critical or High. Missing critical access evidence-gates the affected scope.
2. Independently inspect the actual target, source, contracts, specimens, pinned external evidence and feasible proof. Challenge necessity, alternatives, integration, safety, failure, economics and maintainability. Be demanding and fair: do not invent objections, reward volume, or demand unrelated implementation. Apply the [review distinctions](#review-the-selected-evolution). Distinguish an established defect, a plausible risk and an unknown. A positive verdict states affirmative reasons and requires no unresolved Critical or High finding in the accepted scope. Required material evidence stays required. Medium and Low findings may remain. A safely excluded future capability may remain.
3. Deliver the complete verdict, including a negative, evidence-gated or early consultation result. Bind it to the candidate SHA, integration baseline, scope, role and date, evidence and limits, stable findings with severity, closure criteria for blocking findings, and the scope-specific and overall verdict (`DEFENDED`, `REVISE AND RE-DEFEND`, `EVIDENCE-GATED`, or `CONSULTATION`). Separate deferred advice from blocking corrections. Two persistence routes are equally valid. An authorized reviewer writes `committee/pass-NN.md` on the reviewed branch and verifies the file at the committed SHA. A read-only reviewer delivers the same complete verdict, as repository Markdown or a scoped patch, for the integration custodian to persist. The reviewer may keep local working files and deliver them at meaningful checkpoints. A complete verdict awaiting persistence is not an incomplete analysis. Do not repeat the analytical review because a write is unavailable. The custodian verifies the imported content matches the reviewed candidate and records the verdict against that repository revision. Do not attach the verdict to later edits. No overwrite, force-push, silent candidate substitution or loss of review history. No edits outside the verdict, and no redesign, main merge, live mutation, spend or implementation commission by the reviewer.
4. Report which of these are done: analysis completed, verdict delivered, verdict persisted and verified, owner ratification still separate, implementation not commissioned. Use REVIEW INCOMPLETE only when the review itself could not be finished. Persistence pending is not that state. Promotion and integration still require the persisted, SHA-matched verdict. Include an intended durable owner/path and disposition for every substantive deferred finding, limitation and remaining proof. The reviewer stays within the verdict boundary; the designer or custodian transfers actionable knowledge to the durable owner and verifies that transfer before retirement. This transfer is not a new architecture gate or permission to change reviewed contracts.

**Correction.** The designer addresses every known Critical and High finding in one coordinated batch, in the current owning sections, with evidence or a reasoned rebuttal. Do not add an append-only correction layer. Medium and Low findings stay deferred and do not trigger corrective planning. Then self-check the revised candidate.

**Subsequent review.** Replace unconditional comprehensive re-review with impact-based re-review. Verify previously blocking findings and their resolution, changed contracts, algorithms and assumptions, affected callers, tasks, dependencies and ownership, relevant acceptance obligations and negative proof, regression risk introduced by the corrections, and whether earlier review evidence still applies. Reuse unaffected evidence. A full review is warranted when the architecture changes materially, the correction has substantial cross-cutting effects, the original evidence is invalidated, or the scope cannot otherwise be bounded. A localized correction does not repeat every unaffected investigation. Do not treat the author's claim as proof. Newly discovered Critical and High findings remain blocking. Do not impose a review-count limit that permits a known correctness defect. Further passes must be justified by remaining material risk, not by deferred Medium or Low findings. A material target revision requires an independent review of the new candidate. An accepted slice cannot absorb gated scope. Owner ratification remains separate.

Neutral launch prompt:

> You are the independent architecture reviewer. Review repository <repo>, integration baseline <SHA>, design branch <branch>, candidate <SHA>, dossier <path>, scope <scope>. Read current integration-branch rules and follow the mandatory independent design committee protocol, including finding severity and impact-based re-review. Review the actual architecture and evidence. Deliver a complete verdict bound to that candidate SHA. Persist it when you have write access; otherwise deliver it for custodian persistence. Do not redesign or implement. Do not repeat the analysis because a write is unavailable.

### Execution and learning economics

After the required confidence exists, select independently safe measurable Changes following [submission scale](../references/planning-artifact-quality.md#4-submission-scale-and-measurement): normally 5–10 minutes of active implementation and 1–5 tasks. Seven actual assignments is a strong default, not an automatic rejection. One Design may need multiple Changes. Prepare the authorized batch and release independently ready Changes while later ones remain in review. Do not split atomic safety boundaries or move unresolved decisions into execution. Freeze shared contracts and dependencies, and use genuine independent parallelism.

Explain the selected evolution, findings and experiment implications at checkpoints. At closure follow [Close an evolution and carry what was learned](#close-an-evolution-and-carry-what-was-learned). Improve the canonical method only when a lesson generalizes. Component recipes stay in that design, runbook or evidence. [Temporal example](https://github.com/DenisSkulovic/offscreen-rpg/tree/3bf63b3ab46de8974b76886031853249c15e1e10/work/designs/open/temporal-platform) and [observed run](../../evidence/runs/2026-11-26-temporal-platform.md) are examples, not templates.

## Three distinct artifacts, in this order

| Artifact | Responsibility |
| --- | --- |
| Design target | The current evolution: direction, outcome, supported capabilities, inclusions and exclusions, material decisions, freeze criteria and later candidates. Promote accepted guarantees after defense and owner acceptance. |
| Source gap audit | Identified source/test/config revision, target-to-actual map, observed/fixture-tested/live/unknown evidence, preserved behavior, dependencies and material priority. |
| Execution route | Direct scoped work or bounded Change(s): target criterion → actual gap → chosen delta → preserved invariants → proof. Distinguish readiness, commission and dependency gates. Verify actual source before dispatch. |

Target discovery and gap audit iterate before final defense; do not treat the table as a prohibition on requirements discovery. No packet count establishes progress.

## What good and bad progress look like

| Good | Bad |
| --- | --- |
| Coherent frontend data/state target, audited consumers, bounded migration | Random hook extraction, query library and CSS rewrite without selected target |
| Native mechanism that meets actual invariant | Custom infrastructure glue or CV technology without demonstrated need |
| Named workload, experiment and remaining evidence limits | "Production-grade", "optimized" or "zero defects" without falsifiable proof |
| A bounded evolution with later capabilities excluded, and full guarantees on the operations it supports | Waiting to implement until every future capability and hypothetical consumer is designed |

## Required review gate

Reject implementation plans for material work that lack named target criteria, a real source owner and evidence, a meaningful alternative for material decisions, an exact target/gap/delta/proof trace, preserved invariants, or feasible migration and stop conditions, when that absence is Critical or High. Use [packet readiness review](../references/packet-readiness-review.md) for delegated work; it is separate from architecture defense. Do not create Changes for satisfied criteria. Resolve disputed targets with the owner or the design, not during implementation. No opportunistic unrelated cleanup. Medium and Low improvements do not reject the plan.

## Roles and specialized knowledge

Select relevant [engineering knowledge](../knowledge/README.md), [frontend state](../knowledge/frontend-state-and-async.md), [architecture alternatives](../knowledge/architecture-decision-space.md), [testing](../knowledge/testing-and-quality-evidence.md), [interface craft](../knowledge/interface-design-craft.md) and task-scoped frontend-engineering, ui-art-direction or security-architecture-review skills. They are design lenses, not authority to override product intent or execution permissions. No whole-library preload.

Repository text alone cannot ensure compliance. Apply actual independent review, owner authorization and evidence gates.
