# Change: bounded authoritative documentation or executable implementation outcome

**Execution/acceptance ownership:** [apply root AGENTS.md]; record exact cheap checks and heavy acceptance owner below. Remove template instructions when filling the packet.

**Create under:** `work/changes/open/YYYY-MM-DD--slug/`. After **Done/Cancelled** and completing reconciliation, `git mv` to `work/changes/archive/YYYY-MM/<program>/YYYY-MM-DD--slug/`; repair all inbound links and update the queue. Existing legacy code-bearing packets retain their original meaning.

**State:** Proposed / Ready / Implementing / Verifying / Blocked / Done / Cancelled.
**Kind:** `documentation` / `implementation` (behavior, defect, refactor, test, executable tool/config, migration).
**Approval and owner:** [owner ratification of any changed selected meaning, execution authorization and executor; no implied approval from historical notes].
**Parent initiative (optional):** [link to one program, not a copied dossier].

**Planner admission:** [verify actual source/authority, apply .agents/references/planning-artifact-quality.md and packet-readiness-review.md; material multi-task work requires TASKS, SOURCE-MAP, PROOF and selected contracts. Record current disposition; do not leave this instruction in a completed packet.]

## Implementation first-screen brief

[Actual task count; current planning count/KiB; parent/largest child required words; estimated active implementation minutes; heavy acceptance owner. Use existing readiness/review receipt, not another ledger.]

> **Current-source map:** [nearest document hub or source README; inspected SHA/date].  
> **Primary governing heading:** [exact selected product/technical claim with Markdown link/fragment; distinguish proposals].  
> **Known trap / contrary case:** [one explicit reason a plausible edit would be wrong].  
> **Scope/permission:** [for documentation: named canonical heading edits and links only; for implementation: source/tests/config files; both require negative proof and no unapproved side effects].
> **Route card:** [2–5 source or test paths, one negative case, and the verification commands]. The executor reads this card and the primary heading. It does not preload the change-workflow skill or guard source.

The parent reads the front door and dispatch index; each child reads its selected card and exact mandatory contract/source/test anchors. The full packet remains binding but is not mandatory preload. Permanent product/technical owners, not this handoff, hold authority. Avoid copying whole historical audits or lengthy research.

## Target alignment (mandatory for portfolio-modernization work)

- End-state accepted specification and target criterion: [...]
- Source-grounded gap, exact affected section(s), inspected revision and evidence: [...]
- Contribution to the selected architecture and what remains: [...]
- Alternative considered (including leaving good text or code alone): [...]
- **Readiness:** no Ready without owner-reviewed intent, bounded actual delta, side effects and falsifiable proof.

## Outcome and motivation

One coherent, independently reviewable outcome. For `documentation`, specify *which reader inference becomes more accurate* and which existing meaning must remain intact. For `implementation`, specify *which executable behavior/invariant changes* and how it will be proved. Do not invent code merely to qualify an editorial change.

## Authority and baseline

- **Product:** [selected contract path#heading, or explicit reason no player-facing promise is affected].
- **Technical:** [selected contract path#heading, or explicit reason no runtime contract is affected].
- **Evidence / source:** [source revision, test receipt and/or original prose/heading; separate selected design from actual realization].
- **Integration:** [recorded target. A constituent Change names `implementation/<design-slug>` or an explicitly grandfathered design branch, never main. A standalone Change names main or its explicitly recorded target.]
- **Proposals / unknowns:** [named unresolved decisions that this Change does **not** ratify].

## Exact scope and exclusions

- **Canonical document edits:** [path#heading, planned replacement/split/link and preserving invariant; or no-op because ...].
- **Executable source/tests/config:** [expected delta and negative case, or **unchanged because this is a documentation-only Change**; no executable edits].
- **Related/inbound owners:** [specific links, dependencies, README/maps, evidence/status disposition].
- **Preserve:** [non-negotiable product, technical, accessibility, privacy, time, spending and provenance constraints].
- **Exclude:** [all unratified decisions, unrelated rewrites/refactors, provider/DB/deployment side effects].

## Acceptance and discriminating negative proof

- **Normal:** [a fresh reader or safe test correctly infers behavior and status from the revised local claims].
- **Negative:** [a plausible competing interpretation the revision must **not** permit; ideally an adversarial scenario].
- **Verification:** [before/after claim-equivalence ledger, exact links and anchors, real source/fixture checks only when material; independent reviewer for consequential meaning changes].
- **Human decision gate:** [exact normative question and blocked section, or none].

## Planned specification and implementation delta | planned-impact.v1

This is a *prospective design*, mandatory before Ready and separate from the retrospective ledger. **All four planes exist for both Change kinds.** A `documentation` Change may legitimately mark Code as `unchanged because`, with a concrete reason and no fabricated executable delta.

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | changed: [exact docs/product/...#heading] and scope, **or** unchanged because [specific unaffected promise] | [dependent claims or none because...] | [owner review / negative] |
| Technical | changed: [exact docs/technical/...#heading] and contract consequence, **or** unchanged because [specific unaffected contract] | [dependent claims or none because...] | [source or assertion proof] |
| Code | changed: [exact source/test/config path]; negative: [disproving case], **or** unchanged because [no executable modification authorized and why] | [source map or no impact because...] | [test or inspected no-code diff] |
| Related | changed: [exact inbound or hub Markdown path] and routing, **or** unchanged because [reviewed dependents do not change] | [actual reverse dependency/heading set] | [links/negative independent review] |

`N/A` and `docs updated` are not dispositions. For a documentation Change, the negative semantic proof remains mandatory even though its Code row says unchanged. A proposal may not be promoted merely by residing under `docs/product`.

A documentation Change names a file operation in that table when a page is created, split, merged, moved, retired, or left untouched. Put the uppercase token in the same cell as the path. A create token followed by the new Markdown path is what allows a file that does not exist yet. Split and move use `old.md#heading -> new.md#heading`, with `;` between two split destinations. Any other missing path fails plan mode. Implementation Changes do not add this vocabulary.

## Document shape

Add a section titled exactly `Document shape | shape-ops.v1` only when this packet really creates, splits, merges, moves, retires, or deliberately leaves a page. Omit that whole section for implementation kind, and for a documentation change that only edits wording inside pages that already exist. One row per real operation. The columns are Operation, Path, Heading migration, and Conservation. Conservation is a real sentence about this packet, at least a short clause. Merge names the unique negative the survivor keeps. Retire says the content is not ratified. Do not leave a sample path in the packet: the guard treats every such row as a declaration, and a sample file that was never created fails close.

Add `Migration receipt | shape-receipt.v1` only after a heading actually moves. Close then checks it against the diff and the wiki graph. The successor cell is a `path#heading`, `retired`, or `unchanged`. `unique negative:` is the sentence that must remain on the successor. `not ratified:` is the sentence that must not be copied onto a selected product or technical page. Omit the receipt until there is a real move.

## Handoff and next action

- Exact next permitted step when selected: [...]
- Current HEAD and dirty-worktree reinspection: [...]
- Known blockers and when to stop/return for an owner decision: [...]
- Follow-up dependencies, and no automatic selection of next packet: [...]

Use an optional `PLAN.md` only for meaningfully multi-step work or a resumable checkpoint. For editorial work, it must not become a second product spec.

## Reconciliation ledger (required before Done)

**Product documentation is the bible; technical docs second; code is the artifact.** Fill a row for every changed selected claim and material known dependent, including a reasoned `unchanged` disposition. For documentation-only work, name the **canonical Markdown path, headings, revision and evidence**; a source code SHA is not mandatory when **no source behavior changed**. Link/heading health and semantic preservation are actual verification requirements, not substitutes for owner ratification.

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| [docs/product/...#claim / docs/technical/...#claim / related dependent] | product / technical / evidence | changed: [new precise meaning] / unchanged: [why] | [document path @ SHA; source path @ SHA if consulted; or no source behavior changed] | reviewed / source-observed / fixture-tested / blocked (never not run when Done) | [counterexample with observed result] | [inbound route or reasoned no-op] |

**Closing:** compare actual files against planned P/T/C/Related; check every known reverse dependency and ambiguity, verify anchors and meaningful link routes, and challenge whether any meaning changed unintentionally. If a change needs ratification, remain Proposed/Blocked and do not promote it through prose. Run [documentation-reconciliation](../../documentation-reconciliation/SKILL.md) for changed or drifted owners. `pnpm wiki:change-guard` is structural proof only; a green status does not certify semantics. Record commands that actually ran, then archive and repair queue links.
