# Target-first engineering renewal

**Applies to:** material architecture, infrastructure, domain redesign and portfolio-quality renewal. Not a mandatory Design for a small fix or feature under settled contracts. [AGENTS.md](../../AGENTS.md) owns general authority, Git and acceptance responsibilities; [submission standard](../references/planning-artifact-quality.md) owns deliverable quality and scale.

## Governing rule

Define the desired, reviewable end state; investigate the actual gap; implement independently meaningful changes that close it. Current source supplies facts and constraints, not the design brief. Every modernization Change must name a target criterion, material gap, bounded outcome and discriminating proof. If the criterion is already satisfied, do not manufacture work.

## Design-led engineering: mandatory material-design gate (2026-11-26)

Design, challenge, make concrete specimens, experiment, defend, then implement. The objective is the simplest comprehensible system that meets real requirements, not more architecture documents or attractive technologies.

### Desired-state reconciliation is the governing mindset

Establish purpose, consumer needs, external contracts and researched criteria independently of inherited mechanics. Requirements discovery may inspect actual behavior, adjacent callers and boundary evidence; distinguish intentional promises from accidental implementation. Freeze or version target before detailed gap audit. Revise only for articulated new constraints, evidence or owner decisions, not to rationalize existing code.

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

Use one scoped dossier in `work/designs/open/<area>/`, with a short current entrypoint and flexible research, decisions, specimens, experiments and reviews. Follow [Design profiles and scope measurements](../references/planning-artifact-quality.md#4-submission-scale-and-measurement). Consolidate or split genuinely distinct design problems rather than accumulate amendments. Each custom abstraction/script must own a real unmet requirement; compare native mechanisms and simpler composition.

Iterate design, critique, specimen, authorized experiment and revision. Examine whole-system composition and particular failure/operational seams. Use actual tools and meaningful counterexamples; fixtures do not prove native vendor behavior. When local runtime is unavailable, collaborate with owner on bounded terminal experiments, read-only first; fix reproducible source paths, not hidden live prerequisites.

### Gate before implementation planning

For the selected scope require:

1. Coherent target, requirements, meaningful alternatives and justified mechanisms.
2. Concrete specimens and settled interfaces, lifecycle, security, state and failure contracts; feasible acceptance matrix.
3. Source-grounded integration/cutover map: consumers, compatibility, authority, retained/replaced/retired state, rollback/refusal and proof. Respect clean-slate exclusions; inspect affected replaceable source only when permitted.
4. Passed self-defense and [independent committee](#mandatory-independent-design-committee) on exact candidate and scope; decisive uncertainties evidenced or explicitly gated outside selected slice.
5. Separate owner acceptance of material decisions and promotion into permanent product/technical owners, distinguishing selected, implemented and proven.

Do not prepare implementation packets or dispatch before the selected design passes these gates. Narrow authorized experiments may precede acceptance; no implied implementation or ratification. A settled dependency-gated Change is not a design blocker.

### Select execution by economics and fit

Direct ChatGPT edits with owner terminal feedback, bounded Cursor Changes or hybrid are all legitimate after design convergence. Compare access, cohesion, local build requirements, risk, owner learning, interaction overhead and total rework. Preserve ownership, Change branch, proof and documentation requirements on every implementation route; no artificial paid-agent handoff.

Infrastructure deliverable is reproducible repository lifecycle: distinguish existing provisioning, repeat ensure, upgrade, workload proof and fresh-clone/cold-cluster acceptance. Manual actions are diagnostics or authorized maintenance, not hidden setup. Repair normal public path, prefer deterministic recurring checks and never infer disposability or destruction authority.

## Adaptive design workshop: choose the investigation, not a universal sequence

A direct redesign request commissions scoped non-destructive design research, provisional specimens and isolated dossier writes, not production implementation, promotion, live mutation, destruction or paid calls. Read current applicable rules and verify actual repository, integration baseline, scope, exclusions and existing dossier before work.

At kickoff identify outcome, authority, assumptions, highest-risk unknowns, evidence methods and next review; **begin substantive investigation in the same turn**. Orientation alone is not the deliverable. Choose lenses, then adapt as findings warrant. At first substantive checkpoint create/resume scoped design branch, persist actual findings, source anchors, provisional decisions and evidence limits; verify commit and link. If unavailable, state why; no empty dossier, duplicate work or fictitious commit.

Continue useful authorized work without repeated permission; return at a meaningful discovery, consequential owner choice, necessary experiment, evidence/access blocker or completed scope. Keep owner involved; no autonomous wholesale ratification. Keep current entrypoint honest and revise owning sections in place. Git and historical evidence retain prior revisions. Reconcile adjacent baseline drift before promotion. Specimens stay outside runtime paths; use isolated checkout or immutable retrieval, not a merge merely to run experiments.

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

Freeze compact matrix: claim → normal and diagnostic negative → evidence tier/environment → required result → integration classification and owner. Essential safety, functionality and compatibility must pass at agreed tier. Extended assurance can defer only with explicit owner risk acceptance, follow-up/evidence owner and visible NOT RUN. Classify by consequence, not difficulty; essential crash/concurrency/transport cases stay essential. Known material defect or missing indispensable proof blocks acceptance. New evidence may reopen gates with explained invariant and revised matrix, not silent expansion or downgrade. [Acceptance and integration](../../WORKFLOW.md#9-verification-review-and-the-next-loop); heavy proof belongs to ChatGPT/owner, focused checks to Cursor per AGENTS.md.

### Mandatory formal architecture defense and convergence

After coherent target, representative specimens and integration investigation, designer switches from advocate to skeptical examiner. Construct strongest credible objections: simpler/no-change alternative and counterexample invalidating core premise. Assess requirements coverage, necessity of each mechanism, economics, interfaces/authority, dependencies, concurrency, security/data integrity, failure/migration/rollback, resource use, user/operator ergonomics and maintainability. Walk representative successful/adverse scenarios; test actual contracts, source, pinned upstream and specimens. Seek discriminating experiments, not generic risks or compliments. What happens if an abstraction is removed? Can native capabilities suffice?

Record target revision/scope, self-review identity, ranked objections/counterexamples, evidence/limitations, per-material-claim disposition, actual revisions and remaining decisive questions/acceptance. Overall verdict **DEFENDED**, **REVISE AND RE-DEFEND**, or **EVIDENCE-GATED** (bounded slices allowed). Revise or abandon weak choices and repeat; unavailable decisive evidence gates affected scope. No arbitrary scores, pass counts, fictional committee or unrun test claims.

Convergence means passed self-defense and independent committee for exact selected target, consistent specimens/contracts, complete integration/preservation map and falsifiable acceptance. Not proof of implementation or owner authorization. Reopen design for wrong premise, unjustified abstraction, cross-boundary contradiction or repeated repairs exposing architectural failure; ordinary bounded defects remain implementation fixes.

### Mandatory independent design committee

**Required for material design after self-defense, before owner acceptance, promotion or implementation planning.** Owner opens a fresh ChatGPT conversation; another persona in designer's chat is not independent. This is independent conversation review, not separate model training or human certification.

**Submission:** passed self-defense, coherent target, integration map, feasible matrix and [whole-folder quality and scope gate](../references/planning-artifact-quality.md#6-independent-review-submission-quality-is-a-hard-gate). Scope reconsideration at Design thresholds. Freeze candidate SHA, actual integration baseline, branch, dossier and precise scope; pause edits to reviewed scope. Supply neutral launch prompt, no expected answers or preselected objections. Early owner-requested review is CONSULTATION, non-accepting but still requires committed verdict. Do not submit knowingly premature formal candidates.

**Review:**

1. Read current integration-branch agent rules even if design branch predates them. Verify repository, baseline, branch and candidate. Inventory entire dossier, actual current/ historical roles, counts/bytes, required routes and smells according to submission standard. Hard quality failure: stop before expensive technical review and record REVISE AND RE-DEFEND; missing critical access gates evidence.
2. Independently inspect actual target, source, contracts, specimens, pinned external evidence and feasible proof. Challenge necessity, alternatives, integration, safety, failure, economics and maintainability. Be demanding but fair: no invented objections, reward for volume or unrelated implementation demands. Distinguish established defect, plausible risk and unknown. Each material finding names evidence, blocked decision, counterexample and required closure. Positive verdict requires affirmative reasons.
3. **Commit and push every completed verdict before terminal response**, including negative, evidence-gated and early consultation. Create-only `committee/pass-NN.md` within dossier on reviewed branch; expected-head CAS. Include candidate/baseline SHA, scope, role/date, submission measurements/disposition, evidence and limits, stable ranked findings, closure criteria, scope-specific and overall verdict (DEFENDED / REVISE AND RE-DEFEND / EVIDENCE-GATED; CONSULTATION for early reviews). Separate optional advice. No edits outside verdict, redesign, main merge, live mutation, spend or implementation commission.
4. Verify branch HEAD and actual verdict file at committed SHA; return SHA/link. If expected HEAD changes, permissions/tooling fail or write cannot be verified, stop and report REVIEW INCOMPLETE with concrete blocker; no overwrite, force-push or unreviewed certification. A chat-only verdict is incomplete.

**Re-defense:** designer reads committed verdict, maintains stable findings/dispositions, addresses each with evidence or reasoned rebuttal, edits current owners/specimens/links (not amendments), self-defends revised candidate. Failed formal defense or material target revision requires fresh-chat committee on new candidate. Reinspect entire current dossier/quality gate every pass; reuse unrelated closed investigation only when applicable. New findings welcome. No repeated review for unrelated scope or clerical verdict bookkeeping. Accepted slice cannot absorb gated scope. Owner ratification remains separate.

Neutral launch prompt:

> You are the independent architecture defense committee. Review repository <repo>, integration baseline <SHA>, design branch <branch>, candidate <SHA>, dossier <path>, scope <scope>. Read current integration-branch rules and follow the mandatory independent design committee protocol. Review actual architecture and evidence; commit your verdict to the reviewed branch. Do not redesign or implement.

### Execution and learning economics

After convergence select independently safe measurable Changes following [submission scale](../references/planning-artifact-quality.md#4-submission-scale-and-measurement): normally 5–10 minutes active Cursor work, 1–5 tasks, maximum seven actual assignments. One Design may need multiple Changes; do not split atomic safety boundaries or move unresolved decisions into execution. Freeze shared contracts and dependencies, exploit genuine independent parallelism.

Explain architecture, findings and experiment implications to owner at checkpoints. At close retain transferable lessons (overturned assumptions, escaped defects, avoidable retries/complexity, measured spend/time if available, evidence and limitations). Improve canonical method only when lesson generalizes; component recipes belong to own design/runbook/evidence. [Temporal example](https://github.com/DenisSkulovic/offscreen-rpg/tree/3bf63b3ab46de8974b76886031853249c15e1e10/work/designs/open/temporal-platform) and [observed run](../../evidence/runs/2026-11-26-temporal-platform.md) are examples, not templates.

## Three distinct artifacts, in this order

| Artifact | Responsibility |
| --- | --- |
| Design target | Purpose, requirements, boundaries, choices/alternatives, lifecycle/authority/failure, non-goals and scenarios. Promote selected guarantees after defense/owner acceptance. |
| Source gap audit | Identified source/test/config revision, target-to-actual map, observed/fixture-tested/live/unknown evidence, preserved behavior, dependencies and material priority. |
| Execution route | Direct scoped work or bounded Change(s): target criterion → actual gap → chosen delta → preserved invariants → proof. Distinguish readiness, commission and dependency gates. Verify actual source before dispatch. |

Target discovery and gap audit iterate before final defense; do not treat the table as a prohibition on requirements discovery. No packet count establishes progress.

## What good and bad progress look like

| Good | Bad |
| --- | --- |
| Coherent frontend data/state target, audited consumers, bounded migration | Random hook extraction, query library and CSS rewrite without selected target |
| Native mechanism that meets actual invariant | Custom infrastructure glue or CV technology without demonstrated need |
| Named workload, experiment and remaining evidence limits | "Production-grade", "optimized" or "zero defects" without falsifiable proof |

## Required review gate

Reject implementation plans without named target criteria, real source owner and evidence, meaningful alternative for material decisions, exact target/gap/delta/proof trace, preserved invariants and feasible migration/stop conditions. Use [packet readiness review](../references/packet-readiness-review.md) for delegated work; it is separate from architecture defense. Do not create Changes for satisfied criteria. Resolve disputed targets with owner/design first, not Cursor. No opportunistic unrelated cleanup.

## Roles and specialized knowledge

Select relevant [engineering knowledge](../knowledge/README.md), [frontend state](../knowledge/frontend-state-and-async.md), [architecture alternatives](../knowledge/architecture-decision-space.md), [testing](../knowledge/testing-and-quality-evidence.md), [interface craft](../knowledge/interface-design-craft.md) and task-scoped frontend-engineering, ui-art-direction or security-architecture-review skills. They are design lenses, not authority to override product intent or execution permissions. No whole-library preload.

Repository text alone cannot ensure compliance. Apply actual independent review, owner authorization and evidence gates.
