# WIKI09 | Require an explicit product, technical, code and dependent-doc plan

**State:** Done (2026-11-18). **Owner decision:** the [documentation impact design](../../../../../designs/open/documentation-impact-system/README.md) was accepted as written on 2026-11-18. **Dependencies:** HK02 is Done. **Permission:** this packet was the selected Change and is ready to archive.

**Why:** a Change can currently describe intended code edits in detail yet leave canonical documentation changes to a generic close-time admonition. The existing wiki:change-guard checks mentions at plan time, not designed P/T/C/D dispositions.

## Cursor first-screen brief

Read [target architecture](../../../../../designs/open/documentation-impact-system/TARGET-ARCHITECTURE.md), [.agents Change standard](../../../../../../.agents/references/change-work-unit-standard.md), [Change template](../../../../../../.agents/skills/change-workflow/assets/CHANGE.md), and current [change guard](../../../../../../scripts/repo-tools/wiki-core/change-guard.mjs) + [self-tests](../../../../../../scripts/repo-tools/wiki-core/change-guard-self-test.mjs). Recheck HEAD/dirty status, HK02 outcome and current source first. Do not claim the target is already binding.

## Falsifiable implementation outcome

Newly approved Ready executable Changes cannot pass plan validation without **prospective** reasoned dispositions for product intent, technical contracts, executable artifact and related documentation/source-map impacts. Legacy open Changes stay readable and receive a clear upgrade-on-selection warning; old archive never becomes invalid history.

## Planned specification and implementation delta | proposed planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| **Product docs** | **unchanged because** no player behavior, promises, or game semantics are altered by a development workflow validator | Check product docs only if a fixture explicitly changes game meaning; none planned | negative: no accidental game edit |
| **Technical docs** | **unchanged because** no game runtime, API, or data contract changes; the checker is developer tooling | Existing wiki graph and repo maintenance interfaces must remain compatible | Existing parser and guard fixtures |
| **Development authority docs** | **change:** require the three planned planes plus dependency review before Ready, keeping the seven-column retrospective ledger at Done | .agents/rules/documentation.md; .agents/references/change-work-unit-standard.md; .agents/skills/change-workflow/assets/CHANGE.md; .agents/skills/documentation-reconciliation/SKILL.md | Concrete template section; no second manual |
| **Code/tools** | **change:** extend scripts/repo-tools/wiki-core/change-guard.mjs plan mode and scripts/repo-tools/wiki-core/change-guard-self-test.mjs; negative: a missing product row fails | No second validator; scripts/repo-tools/wiki-change-guard.mjs stays the same command | Failing fixture for a missing plane and a passing reasoned no-op |
| **Dependent docs/maps** | **unchanged because** the queue and the existing template stay the only routes, and this packet does not create a second registry | work/changes/README.md records the selection only | Link scan, no newly conflicting owner |

## Exact code and policy slice

1. Introduce a recognizable **versioned Planned specification and implementation delta** section with P/T/C/D rows and exact owner heading links or concrete reasoned no-op. Code path(s) and rejected negative proof remain mandatory for a code-bearing Change.
2. Plan guard: for schema-declaring **Ready** packets fail on missing row, placeholder (“N/A”, “docs updated”), missing/invalid selected owner, no intended code/test delta or contradiction between approved target and claimed code behavior. Proposed packets may show missing entries as diagnostics without pretending Ready; historical packet compatibility remains.
3. Preserve old seven-column close ledger; do not treat planned prose as actual proof. New schema is upgraded during selection for legacy Ready packets, without retroactive mass rewrite or false CI baseline.
4. Update exact existing documentation standards/template/skill in their own canonical homes, not a new parallel rule file.
5. Negative fixtures cover test-only executable Change (both product/technical unchanged with specific reasons), product-changing Change requiring approval, missing technical/no-op reason, and unselected/historical compatibility.

## Acceptance

- **Normal:** a new Ready test-only Change names unchanged selected product rule and exact technical invariant with why, one test path and a negative case; plan mode passes when paths are valid.
- **Negative:** omit product or technical disposition, use unreasoned N/A, or claim code authority over unratified game promise => plan mode fails with precise field/line.
- **No regression:** old unselected packets get migration advice, old Done archive still historical; close ledger and existing tests unchanged except intentional extensions.
- **Proof:** actual Node self-tests plus wiki:change-guard on synthetic test packets in clean full repository; record commands/HEAD. No DB/provider calls.

## Scope boundaries and handoff

No semantic dependency engine (WIKI10), no Git reverse-closure (WIKI11), no full-existing-packet rewrite, no product/technical game rewriting, no paid model, no live mutation. When selected, implement just this contract; document expected vs actual edits in the existing reconciliation ledger and archive only after real proof.

## Proof

`node scripts/repo-tools/wiki-core/change-guard-self-test.mjs` exited 0 against baseline `f5c96645`. `node scripts/repo-tools/wiki-change-guard.mjs --mode plan --change work/changes/open/2026-11-18--wiki09-change-impact-contract/CHANGE.md` then reported plan ok. Model calls were not used. No database was opened.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Change plan contract | development harness | changed: a schema-declaring Ready packet now needs product, technical, code, and related dispositions | scripts/repo-tools/wiki-core/change-guard.mjs and scripts/repo-tools/wiki-core/change-guard-self-test.mjs inspected against f5c96645 | fixture-tested | a Ready packet missing the product row fails plan mode | N/A |
| Authoring homes | development harness | changed: the template, workflow skill, change standard, documentation rule, and reconciliation skill name the prospective table | .agents/skills/change-workflow/assets/CHANGE.md, .agents/skills/change-workflow/SKILL.md, .agents/references/change-work-unit-standard.md, .agents/rules/documentation.md, and .agents/skills/documentation-reconciliation/SKILL.md at f5c96645 | fixture-tested | N/A and docs updated are rejected as dispositions | those files are the map |
| Game product and technical contracts | product and technical | unchanged because no gameplay promise or engine contract page was edited | no source behavior changed | source-observed | an accidental product edit is outside this packet | N/A |
| Selection route | development harness | changed: the design records acceptance for this sequence without becoming canon, and the queue selected this packet | work/changes/README.md, work/designs/README.md, and work/designs/open/documentation-impact-system/README.md at f5c96645 | source-observed | a second Current change line would fail the queue check | the queue is the map |
