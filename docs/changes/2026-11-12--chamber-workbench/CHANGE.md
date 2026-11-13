# Change CH11 | Interactive Chamber workbench and developer console

> **Cursor first look:** [current Chamber React map](../../../apps/web/src/features/developer-tools/chamber/README.md) → `view.tsx`, `use-chamber-play.ts`, `qa-workspace.tsx`, `inspector.tsx`. **Target:** [C01/C06/C11/C16](../../engineering/targets/chamber-laboratory.md#11-verifiable-acceptance-c01c16); [protocol 7](../../technical/chamber-lab-protocol.md#7-client-api-and-workbench); [audit H10](../../engineering/audits/chamber-gap-2026-11-12.md#4-ranked-gaps). **Trap:** do not polish old scripted scenes into a pretend laboratory or copy game rules into React.

**State: Done** (2026-11-13). Owner authorized via continue after CH10. **Depends on:** CH01/CH06–CH10 and W15 (Done). Preserves developerTools Nest gate and legacy scene/QA.

**Evidence:** `lab-workbench-service.ts` + `ChamberLabController` (developerTools-only) + `LabWorkbench` Query UI. Tests: `lab-workbench-service.test.mjs` 2/2; `lab-workbench.test.tsx` 1/1. Normal: open activity-clock-wait-eighty, advanceClock delta, finalize replay command. Negatives: foreign owner not_found; blocked/planned lane refuses open; UI disables Open when lane unavailable. No provider; ordinary API omits lab controller.

## One bounded executable result

Replace the existing Chamber's disconnected “scripted scene + inspector + manual QA form” composition with a **usable developer workbench** for already available scenario lanes. Scope to: searchable mechanic scenarios/availability, validated semantic parameters, typed run/step/pause/reset controls, a command-palette/textual console sharing the CH06 registry, compact authoritative inspector + before/after trace/assertion, one-click copy replay and QA/old-scene entry.

## Binding design

- **TanStack Query** owns viewer/run/fixture/story keyed remote state; useMutation submits frozen typed steps with no automatic replay; local state only selection/editing/panel visibility. Do not adopt another global store. Next API developer routes remain absent in ordinary normal API.
- The command console is semantic and discoverable (command names + typed params); **no eval/SQL/JS**. Buttons and typed commands use identical validated endpoint. All state changes go through the real application/lab runner.
- Preserve working inspector drill-down, manual QA human rubric, legacy `chamber.v1–v5` access and player “jump to scene” link. Main focus is *debuggability and speed*, not a new visual theme or player UX.
- A scenario's unavailable lane must show why and refuse to act. Pending/blocked/uncertain/run failure are different states; no infinite spinner or guessed successful completion.

## Proof

**Normal:** select 'partial shift', instantiate valid isolated specimen, step until a due boundary, inspect changed/unchanged delta and copy a deterministic replay with no ordinary campaign creation.  
**Negative:** stale story/run A response never appears under B, another viewer's QA hint isn't reused, command cannot bypass lane/cost/authorization, and unsupported controls remain disabled with real reason.  
**Check:** Vitest/RTL/MSW interaction+race tests, a targeted accessible keyboard pass, and selected real local browser test only at integration gate.

**Handoff:** read CH11 + relevant C criteria and current React map, implement coherent workbench components; do not add game mechanics, speculative custom UI framework or paid provider.
