# Change CH01 | Typed, versioned mechanics-scenario catalogue

> **Cursor first look:** [current developer-tooling owners](../../../packages/application/src/developer-tools/README.md) → `contracts/src/{chamber,qa}.ts` and `developer-tools/qa-catalog.ts`. **Target:** [Chamber C01/C11/C15](../../engineering/targets/chamber-laboratory.md#11-verifiable-acceptance-c01c16); [protocol 1](../../technical/chamber-lab-protocol.md#1-contract-and-command-semantics); [audit H02/H12](../../engineering/audits/chamber-gap-2026-11-12.md#4-ranked-gaps). **Critical trap:** an existing QA driver label is not a runnable scenario.

**State: Done** (2026-11-13). Owner authorized Chamber work after W-series completion. **Dependencies:** none.

**Evidence:** `@offscreen/contracts/chamber-lab` schema + `chamber-lab-catalog` seeds (calendar bench, chamber.v2 connected, blocked activity-interrupt). Tests: `pnpm --filter @offscreen/contracts exec node --test dist/test/chamber-lab.test.js` (7/7) and `pnpm --filter @offscreen/application exec node --test test/chamber-lab-catalog.test.mjs` (4/4). Negatives: unknown fields, duplicate id@version, non-offline bench, blocked without reason, QA/`automatedPassAllowed: true` rejected, blocked/undeclared lane cannot open.

## One executable result

Add a strict, versioned, browser-safe *scenario catalogue* with `id@version`, mechanics family/search tags, proof intent, fixture reference, named supported lanes, per-lane available/blocked/planned status with reason, cost class and clear invariants. Use `@offscreen/contracts/chamber-lab` and a small developer-tools catalogue. **Preserve** historical `chamber.v1–v5` and all existing QA case/run snapshots as legacy metadata; do not auto-upgrade manual QA cases to executable passes.

## Decided implementation boundaries

- Use Zod v4 strict schema and inferred TS types, validate IDs/versions/duplicate family mappings and prohibited offline paid status. No arbitrary user script/SQL field, plugin loader, mega registry of hypothetical mechanics or new game code.
- Seed two real entries with exact owning source: one pure existing mechanical/calendar rule for upcoming CH02, one scripted current Chamber scene as a legacy connected case. Unsupported activity interruption may be listed as **blocked with reason**, not claimed working.
- Keep typed scenario identity separate from individual `LabRun` identity and operator `qa_run` stage journal.

## Acceptance and proof

**Normal:** lookup by mechanic/term returns correct scenario and lane/cost/prerequisites, and old cases retain original IDs.  
**Negative:** duplicate id/version, wrong lane/cost or missing fixture prevents opening; existing QA manual run cannot become an automated `passed` just by mapping a label.  
**Check:** provider-free schema/catalogue unit tests, no DB/browser/service. Preserve existing exports during migration.

## Cursor handoff

Read this packet, the small [owner map](../../../packages/application/src/developer-tools/README.md), and protocol 1 only. Add contracts/registry and focused tests, report exact files/checks and any missing source. No provider spend, database reset, deployment, gameplay or visual UI change.
