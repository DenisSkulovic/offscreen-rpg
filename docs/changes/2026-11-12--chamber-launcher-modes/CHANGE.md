# Change CH12 | Fast CLI lane entry and modular safe local launcher

> **Cursor first look:** [launcher mode/source map](../../../tools/chamber/src/README.md) → `tools/chamber/src/main.ts` **bounded sections**, `stop.ts`, root `package.json` scripts. **Target:** [C11/C12/C13/C14/C16](../../engineering/targets/chamber-laboratory.md#11-verifiable-acceptance-c01c16), [protocol 2/8](../../technical/chamber-lab-protocol.md#2-architecture-and-drivers), [audit H11/H14](../../engineering/audits/chamber-gap-2026-11-12.md#4-ranked-gaps). **Trap:** 1,518-line launcher is long because it orchestrates many different lifecycles; preserve real safety checks, not just split by line count.

**State:** Specified/Proposed, no source permission. **Depends on:** CH02 and CH04. **Source baseline:** `470a5df`.

## One code-bearing outcome

Expose cheap, documented **`chamber:bench` / `chamber:scenario` / `chamber:inspect`** entries using one command grammar, and factor the existing launcher's **distinct** resource lifetimes into coherent small mode modules (local session/bootstrap, offline packet capture, explicit live evaluation, web/browser worker, cleanup). Do not require an interactive browser startup for Bench, nor make run-local fixture DB depend on a persistent Chamber user.

## Binding design

- Keep existing CLI flag aliases and exact behavior for `chamber`, `chamber:review`, `chamber:packet`, memory packet/evaluation, `story:local`, `--reset-database`, and explicit live budgets; old operator workflows must still work.
- New lane scripts select the right dependency tier **before** opening DB/Next/Chrome. Avoid repeated full Turbo builds or reinstall; warmed pnpm cache and build graph already exist.
- Extract by mode and side-effect boundary, not generic function reexports; no new orchestrator package unless a separately reviewed source boundary demands it. Preserve `stopChamberResources` error cleanup.
- Never collapse held and authorized live modes; no stored API key grants auto-release. Normal API still excludes developer controllers.

## Proof

**Normal:** Bench starts and exits without Docker/API/browser; existing packet review still produces held zero-call manifest; ordinary local Chamber still launches via compatible alias with guarded DB.  
**Negative:** conflicting CLI flags, nonlocal DB URL, missing spend authorization, unexpected process stop and cleanup exception fail safely and leave no leaked process.  
**Check:** CLI argument/launch unit tests and one provider-free old-mode smoke when authorized; measure cold/warm wall time after code lands, not from guess.

**Handoff:** inspect only relevant `main.ts` ranges from source map, implement safe mode extraction/commands and maintain documentation; no speculative global platform launcher.
