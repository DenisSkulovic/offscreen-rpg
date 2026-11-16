# Independent content-quality audit | A navigable page can still be wrong

**Observed source:** GitHub `main@91c28452070c98627656fa633bde74cce24a6241` (2026-11-16); inspected selected root/agent rules, product principles and vision, gameplay, Storyteller, Client, platform, Admin, Observability and runbook pages, plus package scripts. **Not** a paragraph-by-paragraph independent proof of all 74 docs and **not** a local execution of Cursor's WIKI05 report.

## Baseline and what it does not prove

- Cursor's post-WIKI04 graph reports **74/74 canonical pages reachable** from `docs/README.md`, zero broken internal links/anchors, short median routes. That's a significant wiki-infrastructure improvement, not a content-quality certificate.
- `docs/` currently has **74 files and ~955,737 Git-tree bytes**; the ten largest consume about **39.3%** of the tracked bytes. Large coherent specs are allowed; *unroutable claims inside large sections* are the problem.
- WIKI05 v2 reports owner Recall@5 0.667, standard first-hit MRR ~0.486, CompleteAnswer@5 0.50 and row-aware Hopper hit@3 ~0.357. These are controlled lexical/navigation baselines, not an estimate of a fresh agent's semantic comprehension.
- The static 30-question gold set was implementer-checked; no independent reviewer, full source-tier oracle or real model trial is established. Ten paraphrases were authored by Cursor itself. A green graph and self-test do not mean a correct wiki.

## Findings with concrete source and action

### C01 — A live runbook gives false execution advice (critical)

`docs/runbooks/local-development.md` around line 54 still asserts:
- W01's `test:watch` and W20's `test:fast` are “**Planned, not yet implemented**”; it tells readers not to invoke these commands until later work.
- Current `apps/web/package.json` contains `test:watch` and `test:fast` scripts, and the root `package.json` contains `test:fast`. `docs/technical/client/architecture.md` says W01–W11 and W13–W22 Done. The W21 CI claim must be source/workflow checked rather than inferred from the Done table.
- Therefore at least the W01/W20 part of that current procedure is **demonstrably stale**. Fix the command table with exact package scope and actual safe commands, not a blanket future label. Validate W21 separately against the current CI files; avoid inventing a guarantee that CI is actually green.

**WIKI08 targeted remediation:** inspect actual script and test runner, replace the outdated paragraph with current, scoped commands and risk/safety notes, show before/after claims and test evidence.

### C02 — The same runbook presents legacy research as chosen current execution authority (high)

`docs/runbooks/local-development.md` around line 44 tells cheap Cursor agents to use the “chosen frontend execution playbook” at `research/legacy-engineering/frontend-execution-playbook.md`. Existing `.agents/README.md`, `.agents/HARNESS.md` and `research/engineering-manuals.md` explicitly warn that legacy engineering research is non-authoritative, with maintained frontend skill/technical client owners preferred.

This may still contain excellent tips and caching commands, but a current operating runbook cannot casually nominate a **legacy research copy as the default chosen playbook**. Compare unique practical instructions, promote them into the maintained frontend skill/runbook if useful, then link the normative maintainer path. Do not remove useful command knowledge before promotion.

### C03 — Two canonical technical pages are expressly proposal-only (high)

- `docs/technical/observability/telemetry-and-diagnostics.md` opening: “technical recommendation ... not installed or authorized”; remains in canonical `docs/technical` because the architecture “names this path.”
- `docs/technical/observability/capture-and-provenance.md` opening: “proposal only ... no code/schema/test authorized”; its role is currently a design input to the open OBS04 Change. Its presence in `docs/technical` does **not** by itself indicate a selected writer architecture.
- `docs/technical/observability/identities-and-evidence.md` also labels itself a “technical target proposal.”

**Classification principle:** folder layout is not evidence of ratification. Investigate which individual clauses, if any, were selected as binding future invariants. For genuinely unapproved option bundles, relocate under a named `work/designs/open/observability/` gate; leave short accurate pointers in the normative Observability owner maps. For individually ratified technical invariants, promote their precise clauses and negative cases to the existing owner rather than deleting them. The open OBS04 packet must still resolve its design and remain Proposed. No new staff permissions or telemetry installation is authorized.

**This is an owner-governance checkpoint, not a mandate to delete all unimplemented target architecture.**

### C04 — The current product wiki still opens with DOC01 migration archaeology (medium)

Examples:
- `docs/product/experience/principles.md` opens “Owner (DOC01 P2)” and links its comparison packet instead of simply identifying the present product guarantee.
- `docs/product/experience/navigation-and-stories.md` begins “Owner (DOC01 P2)” and describes old `spaces/information-architecture.md` paths.
- `docs/product/experience/play-and-decisions.md` begins “Owner (DOC01 P2)” and details which former program had “Living Stage” terminology.
- `docs/product/experience/presentation.md`, `entry-and-onboarding.md`, `settings-and-accessibility.md` and `docs/product/storyteller/behavior-and-quality.md` similarly have first-screen reconstruction narrative.

These comments are not equivalent to wrong product rules. They **waste the most valuable first 20 lines** of the article, advertise retired taxonomy and point new readers at history. Replace with “owns / selected promise / exclusions / adjacent owner”; move historical provenance, if necessary, to a short bottom note or preserve it only in the permanent DOC01 archive. Preserve every meaningful accepted product obligation.

### C05 — Very large, poorly chunked *sections* cause context waste (high for cheap agents)

At the inspected revision, some largest H2 sections were approximately:
- `docs/technical/platform/data-and-persistence.md`, “Durable records”: **18.5 KB**.
- `docs/technical/storyteller/context-and-memory.md`, “A concrete workspace”: **17.0 KB**.
- `docs/runbooks/local-development.md`, “Local live Story mode without OAuth”: **16.2 KB**.
- `docs/technical/storyteller/request-context-and-cost.md`, “Bounded work, not an open-ended agent”: **14.1 KB**.
- `docs/technical/engine/mechanics-and-capabilities.md`, “Prepared local opportunities”: **13.1 KB**.
- `docs/technical/storyteller/operation-and-controller.md`, “Tools, rules and the remaining DM task”: **12.0 KB**. A single line/paragraph in that page has **~3,668 characters**, with other paragraphs >2,000.

Most of these are real technical design, not garbage. But a hyperlink to an H2 with a 17-KB block is a poor *default* route for an agent that only needs 700 characters. **Improve H3/H4 segmentation where independent concepts/revision triggers exist**, add question→exact subsection routing and provide `wiki:read` bounded excerpt navigation. No arbitrary “all docs <10 KB” requirement, no loss of negative interleavings or full contract.

### C06 — Some technical pages still point to historical evidence as the reader's code map (medium/high)

`docs/technical/platform/topology.md` currently recommends an old `evidence/inspections/doc01-retained-observations/engineering/code-navigation.md` for “actual entry points, current coupling and task-oriented reading routes.” Similarly, `docs/technical/storyteller/context-and-memory.md` points to an old engine-model inspection as the “implemented boundary.”

Dated evidence can support a historical claim; it is not guaranteed to describe *current* source ownership after ongoing waves of code changes. Prefer current package READMEs and actual symbols for implementation navigation; retain historical inspection links explicitly as **dated corroboration**, not current-code authority.

### C07 — Agent guidance is partially stale and itself badly formatted (medium)

`.agents/rules/documentation.md` includes two literal ```` pseudo-delimiter characters around `README.md` instead of Markdown backticks. `.agents/references/documentation-navigation-standard.md` contains many similar `` pseudo-code delimiters, a historical “until G3 move” claim, and a footer referring to `canonical-files.md` and `storyteller-runtime.md`, which are not current canonical technical pages. `.agents/HARNESS.md` keeps old migration/initiative pointers. These are **maintenance source files** for the coding agents, even if `docs/` link graph is 100% reachable.

This is a good example of why scope must include the actual *agent knowledge interface*, not just canonical docs and a path checker. Fix the literal formatting, historical “future move” messages and stale source filenames in the appropriate owners. Do not rewrite unrelated rules merely for style.

### C08 — Selected technical pages mix contract and source-era rollout state (medium)

`docs/technical/storyteller/context-and-memory.md` begins with a long status paragraph cataloguing precisely what was implemented in multiple dated slices. `request-context-and-cost.md` repeats implementation and experimental packet history across a ~51-KB technical owner. `docs/technical/client/presentation-runtime.md` also includes a dated source-grounded baseline and “C3” repair note. They are legitimate design contracts, but these source-status paragraphs have independent revision triggers from their selected target semantics.

**Policy:** preserve binding target and negative cases in the technical owner, move volatile implementation coverage to `STATUS.md` and source README, put dated trials into evidence. A short honest “selected target; implementation subset at STATUS” is cheaper and ages better. Keep compatibility/protocol version semantics when they are *current binding contracts*, even if they include dates or version numbers.

### C09 — Content-level contradictions are not caught by current wiki scripts (high, systemic)

`pnpm wiki:health` checks graph/path/anchor health. `wiki:bench:static` ranks correct pages and simulates readers. WIKI03's fake harness tests event accounting, not actual agent semantics. None can tell whether a sentence like “W20 is not implemented” contradicts `package.json`, or whether a permission is unapproved. Nor does link reachability tell whether a 60-KB page contains unrelated essays, internal contradictions or an actually actionable invariant.

**Remedy:** a risk-weighted **claim and answer audit** with minimal structured evidence. Automate only deterministic candidate extraction/metrics; judge semantic truth by inspected source/contract and independent reader. Benchmarks must distinguish: page found, correct claim read, correct accepted/proposed distinction, current source verified, and answer correct.

## Content-quality characteristics to score

Each sampled canonical page or claim can be reviewed on a short rubric (0–2 per axis, with **critical false authority or permission as a blocker**):

| Axis | 0 | 1 | 2 |
| --- | --- | --- | --- |
| **Question answerability** | Can't answer its title or major route | Partial/generic | Answer and negative boundary explicit |
| **Normative clarity** | Proposed/current mixed as law | Labeled but confusing | Accepted choice vs proposal vs status unambiguous |
| **Ownership** | Multiple contradictory owners | Refers neighbor vaguely | One owner, neighbor links at right heading |
| **Evidence fidelity** | Untrue present-source claim | Source/dates uncertain | Code/fixture tier and provenance check out |
| **Retrieval economics** | No useful subsection/huge unbroken claim | Some route | Right section excerpt cheaply discoverable |
| **Information density** | Migration diary, copy, filler | Mixed | Specific mechanisms, examples and rejection cases |

A page can score high on navigation and zero on source fidelity. Do not average away a critical permission mistake. A single false claim in a runbook should fail *that claim*, not mark the whole wiki “garbage.”

## Scope and preservation

First remediation wave: **C01, C02, C04, C06, C07, and the worst bounded section headings of C05**, all with before/after clauses, evidence and test receipts. C03 needs a distinct owner selection/migration assessment before any semantic deletion. C08 needs careful per-section contract/coverage review; not every long page in one bulk operation.

No artificial minimum link density, hard max page bytes, automatic model rewrites, universal metadata banners or new historical archive. Preserve original terminal Changes in full. Record actual unresolved defects and evidence gaps rather than declaring 100% content health.
