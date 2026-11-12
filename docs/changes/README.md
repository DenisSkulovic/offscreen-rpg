# Code-bearing Changes | React/Next and Chamber laboratory

**Chosen architecture:** [React/Next F1–F15](../engineering/targets/react-next.md), selected by owner direction on **2026-11-12**, including **TanStack Query v5, SSR HydrationBoundary, React Hook Form + Zod, typed Nest API, immutable useMutation commands, authenticated SSE/GET, Vitest/RTL/MSW/Playwright/axe, Storybook, strict lint/import rules**. **Source baseline:** [Nov 12 audit](../engineering/audits/react-next-gap-2026-11-12.md). **Implementation retrieval:** [source-adjacent owner maps](../../apps/web/README.md) before code, [staged toolchain](../engineering/frontend-execution-playbook.md) only if needed. **Purpose:** engineering portfolio, not gameplay or visual redesign. See [work-unit standard](../../.agents/references/change-work-unit-standard.md) and [Cursor handoff skill](../../.agents/skills/cursor-handoff/SKILL.md).

Current change: none

**Architecture is decided; W01–W06, W08, W09, W15, W19, W20 and W21 are Done.** Next dependency-ready packets when authorized: [W16](2026-11-12--web-sse-backend-invalidation/CHANGE.md) SSE backend, [W10](2026-11-12--web-pagination-navigation/CHANGE.md) paging, or [W07](2026-11-11--web-play-route-recovery/CHANGE.md) route recovery. There are **22 W-series frontend/tooling packets** (W12 is **superseded**; W01–W06/W08/W09/W15/W19/W20/W21 completed) and **16 CH-series developer-laboratory packets** (CH01–CH16, all Proposed). The [Chamber program](../engineering/chamber-program.md) is a separate dependency route. `Proposed` packets remain **not selected/authorized** until the owner instructs Cursor. Do not silently run a broad modernization, destructive integration tests, Storyteller/provider calls or deploy.

## Execution dependency DAG (source and test changes)

| Phase | Packet | Exact selected result | Dependencies |
| --- | --- | --- | --- |
| **A: proof** | [W01 test foundation](2026-11-11--web-test-foundation/CHANGE.md) | Vitest + RTL + user-event + MSW | None |
| **A: faster iteration** | [W20 Turbo test:fast/cache lane](2026-11-12--web-fast-feedback-toolchain/CHANGE.md) | Fast local Vitest/test graph without forcing a Next production build | W01 |
| **A: CI economy** | [W21 conditional GitHub Actions gates](2026-11-12--web-ci-budget/CHANGE.md) | Documentation-only skips broad infrastructure; real CI integration still available | W01 W20 |
| **A: navigation guard** | [W22 nested docs / anchor checker](2026-11-12--web-context-navigation-check/CHANGE.md) | Extend cheap `check_docs.py` to new source maps and exact heading anchors | No runtime dependency |
| **A: Next** | [W02 private SSR/API boundary](2026-11-11--web-server-read-boundary/CHANGE.md) | **Done:** server-only reader, `(authenticated)` group, `API_PROXY_ORIGIN` | W01 preferred |
| **A: TanStack** | [W15 Query SSR/hydration foundation](2026-11-12--web-tanstack-query-hydration/CHANGE.md) | **Done:** Query v5 provider, Play prefetch/hydrate, viewer keys | W01 W02 |
| **B: ownership** | [W03 monotonic story Query](2026-11-11--web-snapshot-identity/CHANGE.md) | **Done:** viewer/story/`viewVersion`/epoch Query write gate | W15 |
| **B: receipts** | [W19 durable operation receipt GET](2026-11-12--web-resolution-operation-receipts/CHANGE.md) | **Done:** read-only Nest resolution status/identity endpoint | W02 |
| **B: commands** | [W04 frozen Play useMutation](2026-11-11--web-play-command-lifecycle/CHANGE.md) | **Done:** intent FSM, immutable payload, verified lost-ACK/reload recovery | W03 W19 |
| **B: refresh** | [W05 Query polling/fallback](2026-11-11--web-play-refresh-lifecycle/CHANGE.md) | **Done:** visibility-aware, bounded conditional GET | W03 W04 |
| **C: forms** | [W08 RHF draft editor](2026-11-12--web-draft-editor-lifecycle/CHANGE.md) | **Done:** RHF/Zod, dirty revision/save conflict | W15 |
| **C: creation** | [W09 generation/Start recovery](2026-11-12--web-opening-start-recovery/CHANGE.md) | **Done:** Query preview, separate useMutation and frozen Start | W15 |
| **C: paging** | [W10 infinite lists/history](2026-11-12--web-pagination-navigation/CHANGE.md) | useInfiniteQuery with typed cursor/identity | W15 W03 |
| **C: settings** | [W11 RHF settings/presets](2026-11-12--web-settings-presets-lifecycle/CHANGE.md) | RHF/Zod, Query presets/history, revision-safe dirty editing | W15 W04 |
| **C: lab, superseded** | [W12 historical Chamber/QA](2026-11-12--web-chamber-qa-isolation/CHANGE.md) | **DO NOT IMPLEMENT:** requirements transferred to [CH10–CH11 Chamber redesign](../engineering/chamber-program.md) | Superseded |
| **C: components** | [W06 cohesive feature composition](2026-11-11--web-campaign-composition/CHANGE.md) | **Done:** Feature model/API/UI boundaries and shared pure pace | W15 W04 |
| **D: SSE server** | [W16 Nest SSE invalidation](2026-11-12--web-sse-backend-invalidation/CHANGE.md) | Authenticated PG-backed committed-version hints | W02 |
| **D: SSE client** | [W17 EventSource Query bridge](2026-11-12--web-sse-query-client/CHANGE.md) | Invalidate/refetch, reconnect, 30s safety + 2s fallback | W03 W05 W16 |
| **E: recovery** | [W07 route/a11y engineering](2026-11-11--web-play-route-recovery/CHANGE.md) | Next/Query error boundaries and keyboard recovery | W02 W03 W04 |
| **E: enforcement** | [W13 import/lint guardrails](2026-11-12--web-import-type-guardrails/CHANGE.md) | Strict React/Next/TanStack lint and server/client boundaries | W02 W15 W06 |
| **E: workbench** | [W18 Storybook states](2026-11-12--web-storybook-state-workbench/CHANGE.md) | Provider-free deterministic normal/error/recovery stories | W01 W06 W08 W11 |
| **E: evidence** | [W14 private SSR/route/perf proof](2026-11-12--web-private-route-evidence/CHANGE.md) | Production-like real browser/cache/SSE/bundle evidence | W02 W15 W03 W07 W17 |

**Recommended cost-first opening:** **W01 → W20 → W21 → W02 → W15**; W22 is a small independent documentation tooling Change, not a prerequisite to shipping initial React infrastructure. W21 may be delayed if no GitHub pushes are planned, but W20 should precede high-volume Cursor implementation. **Parallelism:** W19 and W15 may follow W02 independently; W08/W09 may run after W15 without waiting on Play; W16 backend may run after W02. **One active Change at a time by default**, especially for overlapping Play source owners. This is not a requirement to implement the queue in numeric order, and the owner may authorize a bounded group only with explicit source conflict control.

**Knowledge-cache maintenance:** when a Change moves routes, source-owner symbols, wire shapes, error/identity/transaction boundaries or test harnesses, update the nearest [source-adjacent README](../../apps/web/README.md) in the same Change. Do not rewrite maps for local JSX changes. W22 will validate nested links/headings, **not** claim that Markdown proves code semantics.

## Chamber laboratory (CH01–CH16)

The owner's selected **developer-testing laboratory** is meant to manufacture valid rare game states without playing whole campaigns. The authoritative [Chamber C01–C16 destination](../engineering/targets/chamber-laboratory.md), [H01–H14 source audit](../engineering/audits/chamber-gap-2026-11-12.md) and [typed scenario/runner protocol](../technical/chamber-lab-protocol.md) own its decisions. **Cheap Cursor route:** use [the Chamber implementation program](../engineering/chamber-program.md) to select the correct dependency-ready packet, then read only that CHxx first-screen handoff, its nearest source README and exact technical heading.

**First independent Chamber path:** [CH01 catalogue](2026-11-12--chamber-scenario-catalogue/CHANGE.md) → [CH02 fast Bench](2026-11-12--chamber-bench-execution/CHANGE.md) → [CH03 valid specimens](2026-11-12--chamber-state-specimens/CHANGE.md) → [CH04 isolated Sandbox](2026-11-12--chamber-sandbox-materializer/CHANGE.md). CH05–CH16 are controlled-time, orchestration, inspection, faults, evidence, QA, workbench, launcher, connected, packet, coverage and replay. All are **Proposed**; none authorizes spending, DB reset, deployment or source edits.

**Cross-program constraints:** Bench/Sandbox can start independently of React; CH11 workbench **depends on W15 TanStack Query**, preventing a second client-state rewrite. W12 is superseded but its owner/query/conditional developer-controller security invariants survive in CH10–CH11.

## What these words mean

- **Design selected:** the stack and invariants have been chosen by owner direction. Cursor is not invited to choose SWR instead of TanStack, rebuild forms with plain useState, avoid SSR hydration, swap SSE for sockets or change gameplay semantics.
- **Proposed packet:** scope/design/acceptance specified, not yet selected or code-authorized. Code implementation requires explicit current owner instruction. `Ready` has the stricter meaning in the [Change standard](../../.agents/references/change-work-unit-standard.md).
- **Change:** expected executable source/test/config delta with a falsifiable normal and negative case. A design debate, read-only audit, markdown minutes or an existing test run alone is **not** a Change.
- **Evidence:** source inspection != passing test != browser integration != production guarantee. A completed code packet carries its own exact command/behavior receipt; a library appearing in package.json is not engineering achievement.

## Selecting and converging

1. Read **one** selected packet's first-screen brief, the linked [nearest source README](../../apps/web/README.md), then its own scope/negative acceptance and 2–5 actual source symbols. The packet already links the exact [target criterion](../engineering/targets/react-next.md); do **not** load the full target/audit/playbook by default. Reinspect touched code/branch/worktree narrowly. Read the latest [minutes index](../minutes/README.md) only for a genuine design-history question; do not preload all 22 packets or old audits.
2. Owner selects W01 (recommended start), then W20/W21 for efficiency, or another dependency-ready outcome and authorizes bounded code and safe verification. Change the single `Current change: none` declaration to the selected packet link and mark it Ready only under actual permission.
3. Cursor implements exactly the packet with **cheap V0/V1 feedback during edits, focused V2 verification at Change closure, V3 real integration at architectural seams, V4 broad checks at milestones**, per [playbook](../engineering/frontend-execution-playbook.md#4-verification-ladder-stop-checking-every-keystroke). No provider spend, automatic database reset or deployment. Return normal/negative evidence, diff and honest unproved claims, not a new architecture.
4. Review actual source/behavior against the fixed target; mark Done/cancelled/superseded as warranted and clear current selection. Replan future packet dependencies if evidence genuinely demands it, not for technology shopping.

**Out of scope:** [parked S3a continuity work](2026-11-11--s3a-continuity-report/CHANGE.md), [legacy game initiatives](../features/README.md), UI art direction, gameplay and features. The original [Nov 11 seven-packet audit](../engineering/audits/react-next-gap-2026-11-11.md) remains historical provenance.
