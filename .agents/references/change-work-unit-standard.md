# Implementation change units: independent planning standard

**Purpose:** define the *smallest useful unit of AI coding-agent execution* independently of any particular Offscreen RPG dossier. A work unit is not necessarily a player-facing product feature. **This standard governs the development harness, not game behavior.** Reviewed 2026-11-11.

## Vocabulary and strict inclusion rule

| Concept | Definition | Code delta needed? | Durable home |
| --- | --- | --- | --- |
| **Initiative** | An outcome/program that may span many changes, investigations, tests and human decisions | No | Authoritative product/technical topic plus a short initiative overview *only when needed* |
| **Design / investigation** | Resolve an unknown, review an approach, define intent or choose a technical contract | No | Relevant permanent spec, evidence page or temporary research artifact; retire after synthesis |
| **Change** | One bounded, independently verifiable implementation outcome with an explicit intended diff | **Yes, when executed** | One selected execution packet, currently under `docs/features/` for compatibility |
| **Execution slice** | A smaller dependency-ordered portion of a change, with its own proof and handoff | Yes, as part of the change | Same change's short PLAN/checkpoint, not another duplicate dossier |
| **Evaluation / acceptance** | Measure what already exists through inspection, tests, manual play or controlled live experiments | No, unless tooling/test code itself is being changed | QA/evidence owner, not a fake implementation ticket |
| **Documentation / harness maintenance** | Improve rules, roles, manuals, product/technical navigation or accuracy | No, unless scripts/tests/executable configuration change | Owning document/skill; no compulsory feature dossier |

**Definition of code for this boundary:** application/library source, runnable tools/scripts, tests, migrations, executable schemas and meaningful runtime/build configuration. A Git commit touching only Markdown/skills, indices, instructions or plans is **not** a Change in this system. A test-only code change can be a valid Change if its acceptance and tested guarantee are concrete.

A planned Change need not **already** have a code diff; it must have a justified, bounded *future* code modification and falsifiable completion criteria. "Improve memory" is an initiative. "Make the report distinguish published document revisions from proposed patches in its JSON output" is a change. "Check whether the previous memory was recalled" is evaluation unless it also implements missing test/reporting code.

## The ideal planning unit

A fresh executor should be able to accept a Change packet without reconstructing a whole product program.

**One Change needs:**

1. **Outcome:** one observable new/changed implemented behavior or structural invariant; why this is necessary.
2. **Authority:** exact product/technical specification headings, or an approved invariant for internal refactors.
3. **Baseline:** latest verified source/revision, or a clear pre-implementation reinspection gate if stale.
4. **Scope:** likely file/symbol owners, intended code/test delta and excluded adjacent work.
5. **Acceptance:** a normal case, a discriminating negative/edge case, and smallest safe proof.
6. **Risks/permissions:** state, security, migrations, irreversible side effects, budget, authorized test environments.
7. **Status/next action:** one responsible executor, current step, actual checks and blockers, explicit human go-ahead if required.

**Quality of the cut:** all the implementation work contributes to one acceptance outcome, and it can be reviewed and reverted coherently. Split when tasks have different authorities, independent outcomes, incompatible permission requirements, or require a new major design choice. Do **not** split by arbitrary line count, hour target or token budget alone. Do **not** force a code ticket for a necessary design/acceptance discussion.

### Optional planning depth

- **Small change:** one concise `CHANGE.md`, no additional PLAN; the accepted contract and proof are sufficient.
- **Significant change:** `CHANGE.md` plus `PLAN.md` when dependencies, several independent code slices or a resumable checkpoint justify it.
- **Large initiative:** retain an overview and pointers to selected Change packets. Do not hand the initiative's entire 30–70 KB dossier to Cursor as an executable instruction.

Current tooling requires `PLAN.md` for the selected route; see compatibility below. This local requirement is an implementation constraint, **not** the ideal standard.

## Lifecycle and permissions

| State | Meaning | May an agent edit code? |
| --- | --- | --- |
| **Proposed** | Candidate code outcome; missing agreement, feasibility or source revalidation | No |
| **Ready** | Accepted scope, actual owners checked, acceptance/side effects defined, explicit authorization to start | Only as authorized |
| **Implementing** | One owner is executing the approved bounded delta | Yes, within scope |
| **Verifying** | Code exists; proof, review or human acceptance incomplete | Only targeted fixes with permission |
| **Blocked** | Cannot continue without named decision, dependency, environment or safety approval | Not beyond approved diagnostic scope |
| **Done** | Desired code change landed and its stated evidence recorded; remaining limitations explicit | No; retire the active packet |
| **Cancelled / superseded** | No longer worth implementing or replaced by a different accepted plan | No |

**Parked** is a scheduling label, not proof that an unreviewed design became approved. Legacy recorded approval describes historical owner communication, not automatic perpetual permission for any future model, deployment, provider spend or newly selected architecture. A newly resumed workstream must recheck source and any changed product/technical decision. The current user can always choose to pause code work without changing the historical specification.

## Execution and evidence contracts

**Preparation:** product/technical authority → source-grounded feasibility → professional knowledge for relevant role → alternatives and risk challenge (when consequential) → **one bounded Change**.

**Execution:** owner/agent receives only the current Change, relevant headings, source anchors and verification instructions. The agent cannot expand its own scope because a parent initiative contains tempting unfinished phases.

**Exit:** compare actual diff against acceptance; identify checks actually run; update permanent design/evidence owners if needed. Close/retire the packet, rather than leaving a completed active FEATURE/PLAN as a permanent source of truth. Historical Git versions preserve old research.

**Audit cadence:** when planning paths become confusing, classify each as active code work, program, proposal, evaluation, or completed history. Never delete a dossier merely because its checkpoint is old or large. Confirm unique decisions have a canonical home and inbound links are repaired before retirement.

## Repository compatibility, November 2026

The existing read-only `pnpm repo:brief` command parses **exactly one** `Current plan:` link in `docs/features/README.md`, and requires a `PLAN.md` *inside* `docs/features/`. The caller explicitly forbids code changes during this reorganization. Therefore:

- **Keep `docs/features/` physically named for now**; it is a legacy compatibility path, not a claim all its children are executable features.
- Use `CHANGE.md` for **new bounded code-bearing packets**, with a concise `PLAN.md` for a selected/current packet to satisfy the existing command.
- Preserve legacy `FEATURE.md`/PLAN dossiers as **initiative/proposal/history context** until a source-backed migration or retirement is safe.
- To rename/move the selected route later, commission a separate **code-bearing change** that updates `scripts/repo-tools/brief.mjs` and any related tools, plus all inbound links. That is intentionally out of scope now.

## Independent industry references

- [GitHub Spec Kit](https://github.github.com/spec-kit/): specify → plan → tasks → implement → converge; bug fixing and idea assessment are distinct entrypoints, not compulsory feature phases.
- [Spec Kit: persisting specifications](https://github.github.com/spec-kit/how-to/persisting-specs.html): teams choose whether to retain active/completed plan artifacts; no single mandatory archival pattern.
- [OpenAI Harness Engineering](https://openai.com/index/harness-engineering/): small persistent entrypoint, structured knowledge and active/completed execution plans with maintenance.
- [Anthropic AI-native SDLC playbook](https://claude.com/resources/articles/the-ai-native-sdlc-playbook): approved bounded plans specify likely files, tests, risk and checkable scope before implementation.

**Local design inference:** defining `Change` strictly as a planned code delta is our intentional optimization for the user's three-tool workflow. It is not a universal industry definition of "feature." This system is not empirically proven cheaper until tested on real executor sessions.
