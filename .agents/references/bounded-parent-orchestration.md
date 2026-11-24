# Bounded Cursor parent orchestration | integration batches, truthful closure, economical Git

**Owner decision 2026-11-24: `main` is the integration trunk.** Storyteller Workshop remains an active outcome/acceptance dossier, not a separate integration branch. New Changes branch from current `main` and join `main` after their own proof, using dedicated Change branches and linked worktrees. The former `undertaking/storyteller-workshop` reference is a historical transition checkpoint; no new joins there. Reconcile in-flight branches against main without resetting or discarding user work. Do not force-push or delete the old branch until local migration is verified. This explicitly overrides older Storyteller Workshop target instructions, not safety, release, live acceptance or Change gates. The dossier closes on accepted outcome, not branch promotion.

## Dependency readiness is not a planner blocker

Owner direction (2026-11-24): distinguish design readiness, execution dependency order, commission, and live-resource permission. A settled packet with frozen interfaces, selected algorithm, scope and proof is **Ready (dependency-gated)** even when predecessors have not landed. An explicitly commissioned batch may dispatch each named packet as soon as its recorded predecessor receipts and source postconditions hold, without further planner promotion, certification, or owner approval. A parent may verify those postconditions and mechanically reconcile import paths, manifests, symbols and test paths under a frozen mapping; this is execution, not delegated architecture discovery. Do not require a pre-existing test harness when creating it is the selected task. Source implementation and deterministic tests proceed independently of separately gated live proof. Use **PLANNER-BLOCKED** only for a named material unresolved design, algorithm, authority, safety, or semantic contradiction that prevents correct execution; state exact missing decision/evidence and affected task, not a generic readiness disclaimer. Unfinished predecessors, normal integration sequencing, or absent future source implementing an already frozen contract are not planner blockers. Preserve all actual safety, correctness and resource permission gates. Before recommending `do ID`, ChatGPT must ensure the repository packet is actually commissioned and executable now or explicitly dependency-gated, and verify the push. No repeated approval for an unchanged commissioned contract. This rule clarifies all readiness/review language below; it does not waive source-grounded planning or permit uncommissioned sibling work.

**Selected operating rule (2026-11-20).** Applies to Cursor **parent/coordinator**, whether children run in the same checkout or isolated branches. Child implementation depth and model selection remain governed by [Composer microtasks](composer-first-execution.md), [Cursor budget](cursor-model-budget-policy.md), and [Change work units](change-work-unit-standard.md). [Current selection](../../work/QUEUE.md) stays the **only** global selector. This is a procedure, **not** a new Change kind, queue, automated approval or product rule.

## Mandatory Change branch policy

**Undertaking supervisor overview reconciliation:** When a Change lands into an Undertaking, its **named integration custodian** compares the accepted receipt and updated `STATUS.md`/technical ledger with `work/undertakings/<slug>/OVERVIEW.md`. If a meaningful human-visible milestone, risk, or next priority changed, reestimate the overview's **overall and major-track completion/remaining percentages** with uncertainty and update the page **in the same serialized integration window**. A closed Change is not automatically an increased percentage. If not, leave it unchanged after confirming accuracy. This is an integration/communication responsibility of the parent/custodian, **not** a new Composer-child T-ID, separate Change, or mandate for a full retrospective after each code edit. ChatGPT remains responsible for framing the next plain-language supervisor recap.

**Named integration custodian (parallel Changes):** For any owner-authorized concurrent Changes targeting one reference branch, designate **one existing Cursor coordinator or the human owner** as the *integration custodian* before parallel dispatch. This is an assignment, **not a new agent, queue or folder**. Each Change parent owns its own branch, tests, narrow Change receipts and proposed closure; it does **not** independently rewrite shared `work/QUEUE.md`, catalogs, `STATUS.md`, overlapping canonical headings, migrations or integration branch while peers are active. The custodian serializes shared docs/queue/ledger reconciliation and squash joins, checks each branch's accepted proof, refreshes dependencies, and reports the reference branch SHA. If no custodian was named, the commissioning Change parent is its own integration custodian by default and serializes joins through one designated integration checkout. For multiple active Change parents, coordinate the join with the other parents before touching shared integration files; do not require an extra human review merely to name a custodian. For a single Change, its parent is custodian by default.

**Worktree ownership:** Before the first implementation edit, run `git worktree list --porcelain` and inspect the primary checkout's `git status --short`. Create a **dedicated sibling linked worktree** with `git worktree add -b change/<id>-<slug> <sibling-directory> <reference-branch>`, or reuse only an already existing, correctly assigned Change worktree. Execute all parent/child writes, tests, commits and the branch guard from that worktree's cwd. **Never run `git switch` or `git checkout` in the user's primary checkout to set up a Change**, even if no other agent is running. Don't remove a dirty worktree, steal another agent's checkout, or discard existing changes. After accepted integration, remove only the clean, fully reconciled Change worktree/branch. The custodian joins into the recorded integration branch using a designated integration checkout, not by commandeering the user's active workspace.

**Pre-edit check:** At branch creation and before first T-ID dispatch, run `node scripts/repo-tools/change-branch-guard.mjs --change <ID> --target <actual-integration-branch>`. It is read-only, checks the local Git topology, and cannot prevent a model bypassing the command. `--resume` is permitted only after actual reference-branch changes were inspected; it warns about drift rather than blessing stale interfaces. Do not force-reset to satisfy the check.


**At commissioning, before any implementation edit**, the parent resolves the actual reference/integration branch (the named Undertaking branch when one exists; otherwise the selected project branch, `main` only when actually selected), records its HEAD, and creates/switches to a dedicated `change/<id>-<slug>` branch starting at that HEAD. Parent and inexpensive children work on that Change branch for all T-IDs. A separate linked worktree is mandatory for every independently commissioned Cursor Change, regardless of chat count. Leave the primary checkout's branch unchanged. No branch per T-ID; shared-checkout children do not commit.

At acceptance the parent refreshes its recorded reference branch, reconciles genuine conflicts, **squash-merges the Change into that branch in one coherent commit by default**, confirms the result, then retires the temporary branch/worktree. An Undertaking Change lands on its recorded reference, which may be main when explicitly selected. This overrides any older references to conditional branching, base `main`, or unconditional finish-to-main. For already-started direct work, preserve changes; start a Change branch at the next safe checkpoint, without destructive reset or rewriting completed shared history.

## 0a. Budget-first Composer dispatcher contract (2026-11-21)

**Default for predesigned implementation Changes:** the Cursor parent is an inexpensive **dispatcher, integrator and keeper of receipts**, not a second architect. ChatGPT owns architectural investigation, decisions, source maps, execution recipes and deep design/review. The parent loads the selected `CHANGE.md` + `TASKS.md`, checks branch/status and existing work, then applies the **one-time delegation default** below to the first unfinished authorized `PLANNER-READY` T-ID. The child reads only its T-ID and 2–5 named anchors, performs the exact edit, runs its focused positive and diagnostic negative checks, and returns the six-line receipt. The parent validates status, integrates and dispatches the next ready T-ID. Normally **one child at a time**. When the planner supplies a source-verified dependency DAG and a no-collision execution matrix, the parent **should dispatch up to two ready children concurrently** if their contracts are frozen, they have no shared write/generated/test/resource/Git-index contention and the available worktree execution isolation supports it. Otherwise serial is cheaper and safer. This is not permission for a research swarm; concurrency is a planner-proven optimization, not a parent design assignment. See [packet design](packet-design-manual.md). A child cannot spawn children.

**One-time delegation decision (no repeated model debate):** For a commissioned Change with multiple substantive PATCH T-IDs, default to **a Composer 2.5 Standard implementer child for the first substantive task**, then continue dispatching bounded implementation work to Composer. Parent may make a direct edit only if it is mechanical, locally obvious, already understood from necessary orientation, and less work than transmitting/reviewing a child assignment (for example a one-line import, a typo or a trivial manifest correction). **One file does not automatically mean trivial:** a new authorization condition, transaction change, state machine or new negative test is substantive even in one file. The parent must not use the direct-edit exception to perform a chain of substantial T-IDs or spend an extended period designing. If the exception is used, record one brief reason in the final receipt rather than rehearsing the decision in the chat. An explicit packet dispatch wave takes precedence; a parent may combine adjacent strictly dependent tiny edits in **one** bounded child only if they share an already-frozen contract, have the same ownership and can be proved together without broadening scope. No subagent launch ritual for pure VERIFY, routine Git/closure commands or a truly single trivial edit.

**Execution boundary:** Source-freshness checks should touch named symbols only, then **dispatch or perform the chosen narrow patch**. The parent must not first read every planned source file and fully design its implementation; doing so duplicates child context. Children implement and run their focused tests. The parent remains responsible for reviewing meaningful diffs, integration proofs and safe branch cleanup. If the model/tool runtime does not offer subagents, state the limitation rather than falsely claiming delegation, then use a bounded direct path only when cost and correctness justify it.

**Dispatch contract and prohibited parent preflight:** Read `CHANGE.md` and selected T-ID queue once, verify the recorded branch/HEAD/worktree and the specific referenced symbols, then dispatch the first task. Do **not** first conduct a general architecture review, independently reconstruct package graphs or enumerate every caller. A `Ready` card with missing caller, contract, authorization or test-fixture decisions is a **packet defect**: report its T-ID + missing mapping to ChatGPT, leave the Change unimplemented and do not commission an investigation swarm. Do not invent implementation decisions to save a blocked task. A simple local compiler/import error is not a planner defect: fix it with focused diagnostics. A notification and a task receipt are one completion event; no repeated narration/TLDR per step. One concise final Change receipt after completion or a concrete blocker is enough.

**Usage policy:** prioritize cheapest correct accepted Change over exhaustive exploration. Do not run a planning review, broad repo audit, repeated “quality” sweeps, model comparison, independent second-opinion review, multiple alternate implementations, extensive performance tuning or global tests by default. Do not reread SOURCE-MAP/EXECUTION/PROOF in full for each child. Parent may consult one precise section on contradiction only. Run one focused positive and one diagnostic negative per T-ID (or combine them in one targeted test command), plus only necessary package/integration/closure checks at a checkpoint. Reuse existing green receipts for unchanged paths where trustworthy; never claim PASS for an unrun test. A small noncritical defect can be reported accurately for ChatGPT to repair later; never waive data integrity, privacy, authorization, idempotency, money or publication correctness.

**Freshness and debugging boundary:** Before dispatch, compare the packet's named source symbols/schema/contract anchors with the local HEAD. If the changes are mechanical/non-contractual, continue and note the changed SHA; if a dependency changes an interface, fence, authority or ownership assumption, stop that T-ID for ChatGPT replanning. Ordinary independent compiler, import and test-fixture errors do not consume a single global two-error allowance: repair them with bounded focused diagnosis. The stop threshold is two unsuccessful hypotheses against the **same unexplained invariant**, or any actual architectural/permission contradiction.

**Source-craft checkpoint:** After a coherent source batch, inspect its diff against [code craftsmanship](../rules/code-quality.md): human-readable phases, clear ownership, runtime validation of unknown input, safe domain result types, meaningful invariant comments and no gratuitously broad controller. Run Prettier and `eslint.quality.config.mjs` on the **changed files** where the local toolchain is available, plus affected typecheck/tests at the appropriate Change join. Existing unrelated debt is not a reason to suppress a new violation. On a genuine architecture-size mismatch, send the exact seam to ChatGPT rather than asking children to redesign.\n\n**Closure optimization:** Treat worktree/branch status, exact owned staging, focused proof, wiki close guard, archive, squash integration, push verification and clean retirement as a pre-agreed **finite procedure**, not a sequence of new owner approval questions. Parent executes it once at acceptance, logging only meaningful failures. Do not assume a passing guard proves architectural correctness; inspect the actual diff and truthful evidence before closing. Avoid a new multi-step shell automation that force-cleans worktrees or guesses safe deletion. Use `git add` with exact owned paths, never blindly stage unrelated files. Retire a squash-merged temporary branch with `-D` only after verifying its content is integrated and its worktree is clean; never force-remove dirty work. Git/permission conflicts remain hard stops.\n\n**Integration is the default completion path, not an approval request:** An owner commissioning a whole Change authorizes its parent to implement, run required focused tests, reconcile, integrate into its named reference branch, archive and retire its clean worktree **without returning for another human or ChatGPT approval checkpoint**. A separate ChatGPT audit is normally **post-integration** and may yield a follow-up bounded Change. Parent source/diff review and required normal/negative proof still happen **before** integration. **A real blocker** is a failing required safety/correctness test, credible unresolved authorization/privacy/financial/idempotency/data-loss/fence or irreversible-migration risk, incompatible changed contract, unsafe resource authorization, or a genuine Git collision that cannot be reconciled safely. If such a blocker remains, do not merge merely to claim Done: return the exact source location, observed failure and attempted resolution. A named independent review is a pre-merge gate **only when the owner explicitly commissioned it for that specific Change**, not by automatic categorization as "security adjacent". If parallel Change worktrees exist, serialize integration but do not invent an approval ceremony.

**Escalation cost ceiling:** on an unexplained failure, one targeted diagnostic and one materially different local fix/test retry maximum **for the same unexplained failure invariant**. If a *new architectural decision* appears, stop immediately without a generic discovery phase or expensive-model escalation. Return `T-ID | file:symbol | failed assumption | smallest reproducer | suggested planner question` to ChatGPT. No Grok/Claude/expensive model upgrade without owner approval. For a cheap local syntax/type mistake the child may fix it directly without invoking the planner. Do not repeatedly ask the human at every T-ID; continue inside the commissioned Change until Done or a genuine boundary.

**Historical dedicated Undertaking override (superseded for Storyteller Workshop):** where the user has named an Undertaking integration branch, any instructions below saying “from main”, “merge into main” or “report final main SHA” are **overridden for this undertaking**. For WR02–WR08 the base and destination are `undertaking/storyteller-workshop`, and `main` is untouched. Preserve in-flight worktrees and rebase/merge planning updates safely; no forced reset.

**Readiness:** the parent is permitted to start a selected ready T-ID without repeating ChatGPT's planning investigation. A dependent `PLANNER-READY AFTER WRxx` packet requires ChatGPT source refresh after its predecessor has landed; the parent must not fill missing architecture gaps itself. No new Change is auto-selected.

## 0. Dedicated Change commission owner shorthand

When the owner gives one Cursor parent chat a direct instruction such as **“do DXK01”**, **“work on DATA06”**, **“finish STORY03”**, or another unambiguous single-Change assignment, that instruction is a **dedicated Change commission**.

It means:

- the named Change is authorized for that parent chat even if `work/QUEUE.md` currently points to another globally selected item; this is the same owner-authorized parallel-work exception described by the Change work-unit standard, not a second global selector;
- the parent owns the **whole Change lifecycle**, not merely its first T-ID;
- parent creates its dedicated Change branch in a new linked worktree from the selected reference branch, without switching the primary checkout;
- the parent may orchestrate bounded subagents in parallel when paths/resources are genuinely disjoint, using Auto utility children for context-isolation chores and Composer children for substantive implementation;
- internal T-ID/batch checkpoints remain mandatory for clean integration and context control, but they are **continuation checkpoints, not owner-prompt checkpoints**;
- after a checkpoint, the parent re-reads the Change's acceptance and proceeds to the next necessary T-ID in the **same Change** automatically;
- the job is not finished until the Change is either truthfully Done and retired, or genuinely blocked by something the parent cannot resolve within existing authority.

### Finish-to-reference-branch responsibility

For a successfully completed dedicated commission, the parent is responsible for the entire landing sequence:

1. implement the accepted scope and necessary discriminating negative cases;
2. run proportionate source/integration/live proof at the tier the Change itself requires;
3. update affected canonical product/technical docs, run documentation reconciliation, and complete the Change's four-plane/Reconciliation ledger;
4. run required plan/close guards and relevant link/maintenance checks;
5. mark the Change Done and move its folder from `work/changes/open/` to the correct archive path in the **same ownership window**;
6. repair inbound links, Change catalog, roadmap/queue references and stale status claims caused by that retirement;
7. commit coherent milestones on the dedicated branch;
8. refresh the recorded reference branch, reconcile concurrent changes, merge/rebase/cherry-pick as appropriate **without force, history loss, or silently overwriting another chat's work**;
9. rerun the smallest integration/guard checks needed after the join;
10. ensure the completed Change and archive move are on the recorded reference branch, then report its **final SHA**, proof, and any explicitly out-of-scope successor.

A parent may use subagents to perform parts of this sequence, but **closure, archive and merge remain parent responsibilities**.

### What is *not* a legitimate reason to linger or stop

Do not stop merely because:

- one T-ID or one child finished;
- an intermediate commit is clean;
- the Change is not the global QUEUE pointer after explicit owner commission;
- the packet says a downstream Change owns broader system acceptance, when the current Change can still prove its own bounded Goal at a lower tier;
- a useful optional enhancement exists;
- the parent would prefer another planner opinion despite the existing contract being sufficient;
- the next step is ordinary docs reconciliation, archive housekeeping, Git integration, or a safe local test.

If the original acceptance outcome is achieved, do not keep the Change open by appending unrelated ambitions. If a downstream Change owns broader proof, record that boundary and close the current Change once its own capability/proof is complete.

### Genuine early-stop conditions

Stop and return one precise blocker only when continuation requires something outside the existing commission, such as:

- a new product/architecture/security authority decision not settled by current docs/packet;
- explicit owner permission for paid provider use, secrets, deployment, destructive/unowned data or cluster mutation;
- a prerequisite that genuinely has not landed and cannot be safely implemented within the named Change;
- an active branch/path/shared-resource collision that cannot be serialized locally;
- an unavailable required environment;
- one focused diagnosis plus one materially changed retry still fail on the same unresolved invariant.

The blocker must name the exact missing decision/resource/symbol and the smallest route to resolve it. “Planner decision needed” without a concrete unresolved choice is not sufficient.

## Diagnosis and end-state

Composer-first T-IDs have produced substantial useful implementation with low reported usage, but the parent's work was not bounded: it could keep dispatching tasks, defer all housekeeping, accumulate a very large dirty diff, and confuse a successful child with acceptance of its parent Change. Some earlier rules also told *every isolated child* to commit while newer rules assigned commits to the parent. Correct the conflicting ownership without replacing a fast execution workflow with administrative ceremony.

**Desired invariant:** every accepted implementation batch reaches an **integration checkpoint** with a coherent diff, appropriate normal/negative tests, an explicit disposition for each touched Change, and one or a few meaningful commits; or it stops with a truthful, recoverable blocked/dirty receipt. A child finishing never by itself satisfies the Change's Goal.

## 1. Declare a finite batch before dispatch

A **batch** is an **ephemeral scheduling and integration envelope**, not a Change, Task, or second backlog. It contains only explicitly owner-authorized Changed work and already-selected implementation T-IDs. A broad "continue the POC" instruction cannot silently authorize new provider spend, protected database mutation, or a destructive cluster run.

Parent writes a **tiny charter in its own current chat** (or uses existing [work/sessions](../../work/sessions/README.md) for a handoff genuinely needing persistence). Do not create a new folder or large plan for every batch:

```text
Batch: <short label> | source HEAD: <sha>
Authorized Changes/T-IDs: <specific IDs; no Proposed expansion>
Finish line: <one integrated observable outcome>
Owners: <disjoint write paths, canonical headings, shared resources>
Permitted checks: <focused positive, negative, integration only if safe>
Hard stops: <missing design/authorization, collision, red acceptance, unsafe environment>
Commit group: <one cohesive milestone or two separable results>
```

**Default budget:** approximately **2–5 small Composer T-IDs**, **at most two independently accepted Change outcomes**, or **one high-risk cross-service join**. **Five child dispatches is the default checkpoint ceiling**, not a license to skip the necessary last test or split an atomic operation. The owner can explicitly approve a larger envelope; still integrate/checkpoint after each manageable slice. **Never keep expanding the batch because unrelated T-IDs happen to be Ready.**

Keep **one or two concurrent children** by default, only with truly disjoint files/resources. Additional concurrency requires an explicit collision-free schedule and provides no new spending, DB or cluster authority. The parent should do small routing and join work, not another repository-wide investigation.

### Context-isolation delegation: use Auto for boring-but-bulky missions

The parent is not required to personally perform every easy operation. **Context isolation is itself a valid reason to delegate** when the work is straightforward but would generate enough repository reads, terminal output or repetitive edits to pollute the coordinator context.

Prefer the `utility-worker` on **Auto** when all of these hold:

- the mission is bounded and the desired result is already known;
- success can be stated as factual output or deterministic edits/checks;
- it is more than one or two tiny parent actions, or is likely to produce noisy intermediate output;
- no product/architecture/security/transaction decision is being delegated;
- the child can return a compact receipt instead of raw logs.

Typical examples: inspect a sequence of Git refs/status/diffs and summarize only relevant facts; run a small series of safe repository commands; rename/move/update already-decided documentation across several files; collect exact occurrences/links; reconcile a mechanical list; gather test counts or changed paths. **Do not delegate a two-command triviality merely to spawn an agent**, and do not use Auto for an ambiguous bug hunt or implementation slice just because it is cheap.

The utility child should read/emit the minimum needed, never spawn children, and stop with one precise blocker when the mission stops being mechanical. The parent consumes the receipt, not the transcript. This reduces compounding conversation tax and preserves the parent for integration, judgment and decisions.

## 2. Cheap children; parent owns reconciliation

Child receives one already-resolved task card: T-ID, 2–5 actual source/test anchors, exact edit/command, negative test, allowed paths, and stop case. Child returns a **short factual receipt**: what changed, tested commands/counts, negative observation, blockers, touched docs and whether work is in the parent checkout or isolated worktree.

**Compact child-completion protocol (selected after November 20 usage review):** Prefer a **six-line maximum receipt** for an ordinary successful child. A child may provide more detail only when an assertion failed, the task departed from design, or a safety/authority decision needs evidence; keep full test output in terminal logs or an existing evidence artifact, not pasted twice into the parent chat. The six lines are:

```text
<ID> | PATCH/VERIFY | PASS/FAIL/NOT-RUN | <one achieved outcome>
Files: <owned changed paths or none>; worktree/commit <ref or none>
Proof: <command + exact result / exit>; tier <pure|DB|two-process|browser|kind>
Negative: <one discriminating refusal or NOT RUN (reason)>
Docs: <canonical owner changed or none required>
Blocker/next: <precise missing condition or none>
```

**Parent notification discipline:** A completion notification and a child return for the same T-ID are **one event**, not two new tasks. Acknowledge only the decision taken (integrate, retry once with new hypothesis, or stop). Do not copy the child receipt into a second long parent report or issue TLDR after every notification. Integrate as soon as the dependency is relevant; do not refill idle child slots simply to maintain utilization. Consolidate results **once** at the batch checkpoint. Preserve exact detailed logs elsewhere when a failure actually requires reconstruction.

**No child-run bureaucracy:** do not make each T-ID write a Change reconciliation ledger, run the whole repo suite, archive a packet, generate a long report, or create a Git commit merely to be "complete." Children operating in the **shared checkout must not stage or commit**; only the parent integrates and commits. An isolated worktree child **may** create a local branch commit when necessary for clean cherry-pick/merge, but it is not mandatory, and the parent still owns the final integration and Change closure. This supersedes older blanket "each subagent commits" wording.

The parent executes no new speculative architecture. On an actual source discrepancy, localize once; if resolving it requires selecting retry/transaction/role semantics or new product intent, return the smallest concrete question to ChatGPT with exact code/error. Repeated identical failures are not an invitation to spawn an endless loop of new agents.

## 3. Integration checkpoint: do this once per batch, not per child

1. **Reconcile the working tree.** Inspect current HEAD, `git status --short`, relevant diffs and child receipts. Identify owner/unrelated modifications and clashes. No automatic `git add -A`, reset, clean, forced stash, amend or force-push. Stage exact owned paths only; inspect staged diff and check whitespace/obvious secrets.
2. **Test at the appropriate tier.** Focused normal and discriminating negative checks belong with each changed behavior. At the integration join run the narrow cross-module tests needed to catch boundary errors. Broader typecheck, `pnpm repo:maintenance --strict`, `pnpm wiki:health` and the Change close guard are **per closure or affected boundary**, not reflexively after every child. A skipped environment-dependent test remains **NOT-RUN**, never zero failures by implication.
3. **Resolve each touched Change:** compare its **originally selected, independently useful acceptance outcome** with the actual merged code and proof. Choose:
   - **ACHIEVED:** all required outcome/negative evidence exists → reconcile canonical docs and affected-claim ledger, mark Done, archive and update inbound index/links in the same integration window.
   - **PARTIAL / ACTIONABLE:** meaningful implementation landed but Goal not yet met → keep open, record accepted T-IDs, exact remaining acceptance and one next task/proof.
   - **PLANNER GAP / GATED:** missing contract, owner-approved spend/cluster access or safety precondition → keep open with the precise missing decision/permission and named route; stop dispatch on that boundary.
   - **SCOPE INFLATED:** an independently accepted original deliverable is complete but unrelated or later ambitions were appended → preserve the original scope and evidence, explicitly separate additional work only when a distinct selected outcome exists. Do **not** rename a required integration acceptance "optional" or invent a Done label from unit tests.
   - **UNSELECTED OPTIONAL:** retain its proposed state and trigger without pretending it blocks unrelated completed outcomes.
4. **Create coherent commits.** Prefer **one integration commit** for one cohesive accepted batch, or **a few** if independently reviewable/revertible outcomes can be staged separately. Include implementation, required tests, affected canonical docs and packet reconciliation. **Commit at the checkpoint**, not one commit per tiny child and not one huge end-of-session commit across unrelated outcomes. A Change can remain open after a truthful intermediate commit. If code is safe to commit but broad proof is gated, commit with a partial/NOT-RUN receipt rather than claiming Done.
5. **Return the batch receipt** and stop or explicitly open a newly authorized batch. Do not silently move from a completed batch into another entire Change family.

## 4. Parent stop conditions and context budget

**Stop, checkpoint and report** on any of: five dispatches completed; one high-risk cross-service integration achieved; a Change closure/ownership transition; two repeated failures without a new diagnostic; an unexpected schema/product authority decision; unsafe/uncertain external side effect; shared-file collision; or a parent context that can no longer state precisely what is staged, uncommitted and accepted. If a clean commit is currently unsafe, do not start new writing children; return the dirty-state/ownership summary and exact next safe action.

**Repeated failure escalation:** after one focused diagnosis and one materially changed-hypothesis retry, stop that line of work. Infrastructure prerequisites and stale builds may be repaired once with evidence; repeated timeout/quiet-wait/worker-flag perturbations without changed explanation are not independent progress. Return the exact failing invariant and owning source to ChatGPT. The existing two-failure stop rule still controls. Never downgrade correctness to meet this budget.

**One parent turn normally handles one bounded batch** when the parent was commissioned for only that batch. **A dedicated Change commission is different:** it is an explicitly authorized multi-batch campaign over one named Change. The parent may continue through as many bounded, committed/reconciled checkpoints as needed to finish that Change, while keeping each checkpoint small enough to preserve context and Git clarity. It should summarize progress internally/briefly rather than ask the owner to reauthorize the next T-ID. It still may not auto-start a successor Change. This is a **default stop discipline**, not a claim the repo can technically cap a Cursor model's tokens or stop its internal UI. No hidden cross-Change auto-next loops and no automatic Grok escalation.

## 5. Minimal batch receipt (parent, not children)

```text
Batch <label> | starting HEAD <sha> | ending HEAD <sha/unchanged>
T-IDs: accepted <IDs>; failed/NOT-RUN <IDs + exact reason>
Proof: <commands/cwd/counts, important negative, observed tier>
Change decisions: <ID: Done+archive | still open: exact missing | split: explicit new owner>
Commits: <SHAs and what each contains>; uncommitted: <paths/owner/reason>
Docs/guards: <actual changed owners; run/pass/fail/not-run>
Next: <one bounded candidate or explicit owner/planner/permission gate>
Usage: <actual measured cost when known; otherwise unknown>
```

Keep this in the parent response. Persist a short batch note under `work/sessions/` **only** if needed for recovery across sessions; avoid a second authoritative status file. [Work taxonomy](../../work/WORK-TAXONOMY.md) remains unchanged: Change = lasting diff; standalone Task = independently tracked operation; Composer T-ID = subordinate implementation step.

## 6. What can and cannot be automated

Existing [maintenance](../../work/changes/README.md) and archive/Change guards can detect malformed routes, terminal packets left under `open/`, broken links and some missing reconciliation. They **cannot infer** that Gary's promise appears in the browser, that two processes share real DB authority, or that an unfinished Goal was secretly achieved merely because several T-IDs are marked LANDED. Do **not** build an auto-archiver that guesses from commits or child receipts.

A parent integration checklist and an actual **acceptance-vs-proof comparison** are the primary control. Automate only a demonstrated mechanical gap with one small tested Change. Do not move the remaining acceptance to a new Change just to improve archive counts; don't keep a genuinely completed, scoped outcome open because some distant product dream could be added later.

**Measurement, not utilization theater:** [Cursor session usage and outcome measurement](cursor-usage-evaluation.md) explains the opt-in CSV window tool and accepted-outcome comparison. The parent is not expected to parse exports during every Change or retain private chat transcripts in the repo. Keep one small batch receipt, preserve actual evidence tiers, and evaluate total rework. Model defaults remain unchanged.

**Success metric:** accepted correct outcomes, truthful unfinished boundaries, recoverable clean commits, low parent/child context and actual overall usage if measurable. The number of Done folders is not the target.
