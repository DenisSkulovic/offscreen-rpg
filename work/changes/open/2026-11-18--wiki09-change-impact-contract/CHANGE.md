# WIKI09 | Require an explicit product, technical, code and dependent-doc plan

**State:** Proposed, not selected. **Owner decision:** accept [documentation impact design](../../../designs/open/documentation-impact-system/README.md) before Ready. **Dependencies:** HK02 (docs/Change CI path coverage), then this packet. **Permission:** NO implementation until selected.

**Why:** a Change can currently describe intended code edits in detail yet leave canonical documentation changes to a generic close-time admonition. The existing wiki:change-guard checks mentions at plan time, not designed P/T/C/D dispositions.

## Cursor first-screen brief

Read [target architecture](../../../designs/open/documentation-impact-system/TARGET-ARCHITECTURE.md), [.agents Change standard](../../../../.agents/references/change-work-unit-standard.md), [Change template](../../../../.agents/skills/change-workflow/assets/CHANGE.md), and current [change guard](../../../../scripts/repo-tools/wiki-core/change-guard.mjs) + [self-tests](../../../../scripts/repo-tools/wiki-core/change-guard-self-test.mjs). Recheck HEAD/dirty status, HK02 outcome and current source first. Do not claim the target is already binding.

## Falsifiable implementation outcome

Newly approved Ready executable Changes cannot pass plan validation without **prospective** reasoned dispositions for product intent, technical contracts, executable artifact and related documentation/source-map impacts. Legacy open Changes stay readable and receive a clear upgrade-on-selection warning; old archive never becomes invalid history.

## Planned specification and implementation delta | proposed planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| **Product docs** | **unchanged:** no player behavior, promises or game semantics are altered by a development workflow validator; product pages are not implementation journals | Check product docs only if fixture explicitly changes game meaning; none planned | Design owner approves rule scope; negative: no accidental game edit |
| **Technical docs** | **unchanged:** no game runtime/API/data contract changes; new executable checker contract is developer tooling, not the game's technical architecture | Existing wiki graph and repo maintenance interfaces must remain compatible | Existing parser/guard fixtures |
| **Development authority docs** | **change:** require the three planned planes plus dependency review *before Ready*, keeping existing seven-column retrospective ledger at Done | .agents/rules/documentation.md; .agents/references/change-work-unit-standard.md; .agents/skills/change-workflow/assets/CHANGE.md; .agents/skills/documentation-reconciliation/SKILL.md; AGENTS.md only if routing truly needs it | Concrete accepted template section; no duplicative manuals |
| **Code/tools** | **change:** extend scripts/repo-tools/wiki-core/change-guard.mjs plan mode and self-test; optionally narrow CLI output in existing scripts/repo-tools/wiki-change-guard.mjs | No second validator; HK02 workflow/CI gate owns triggers; check workflow's plan/close call route | Failing fixture for missing plane + passing reasoned no-op |
| **Dependent docs/maps** | **change when needed:** update template/skill links and nearest relevant work/changes queue/status route; no blanket editing of all active packets | Existing wiki-operating-model and HK plan are historical/proposed references, not new sources of truth | Link scan, no newly conflicting owner |

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

## Reconciliation ledger | fill only after execution

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Developer Change plan authority | development harness | changed: prospective P/T/C/D plan contract, no game product changes | pending executed paths + SHA | not run | missing-plane fixture | pending |
