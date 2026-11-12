# Code-bearing Changes | React/Next engineering execution program

**Chosen architecture:** [React/Next F1–F15](../engineering/targets/react-next.md), selected by owner direction on **2026-11-12**, including **TanStack Query v5, SSR HydrationBoundary, React Hook Form + Zod, typed Nest API, immutable useMutation commands, authenticated SSE/GET, Vitest/RTL/MSW/Playwright/axe, Storybook, strict lint/import rules**. **Source baseline:** [Nov 12 audit](../engineering/audits/react-next-gap-2026-11-12.md). **Implementation retrieval:** [source-adjacent owner maps](../../apps/web/README.md) before code, [staged toolchain](../engineering/frontend-execution-playbook.md) only if needed. **Purpose:** engineering portfolio, not gameplay or visual redesign. See [work-unit standard](../../.agents/references/change-work-unit-standard.md) and [Cursor handoff skill](../../.agents/skills/cursor-handoff/SKILL.md).

Current change: none

**Architecture is decided; no Change is active.** There are **22 fully specified, code-bearing candidate packets (W01–W22)**. W20 and W21 address local workstation and CI economics as genuine code/config Changes, not new gameplay work. `Proposed` in a packet now means execution is **not selected/authorized**, *not* that Cursor may reopen its technology decisions. The owner will explicitly tell Cursor when to implement. Do not silently run a broad modernization, destructive integration tests, Storyteller/provider calls or deploy. Independent Change boundaries keep diffs reviewable even though the owner placed no artificial cap on total engineering effort.

## Execution dependency DAG (source and test changes)

| Phase | Packet | Exact selected result | Dependencies |
| --- | --- | --- | --- |
| **A: proof** | [W01 test foundation](2026-11-11--web-test-foundation/CHANGE.md) | Vitest + RTL + user-event + MSW | None |
| **A: faster iteration** | [W20 Turbo test:fast/cache lane](2026-11-12--web-fast-feedback-toolchain/CHANGE.md) | Fast local Vitest/test graph without forcing a Next production build | W01 |
| **A: CI economy** | [W21 conditional GitHub Actions gates](2026-11-12--web-ci-budget/CHANGE.md) | Documentation-only skips broad infrastructure; real CI integration still available | W01 W20 |
| **A: navigation guard** | [W22 nested docs / anchor checker](2026-11-12--web-context-navigation-check/CHANGE.md) | Extend cheap `check_docs.py` to new source maps and exact heading anchors | No runtime dependency |
| **A: Next** | [W02 private SSR/API boundary](2026-11-11--web-server-read-boundary/CHANGE.md) | Server-only authenticated reader, route group, same-origin config | W01 preferred |
| **A: TanStack** | [W15 Query SSR/hydration foundation](2026-11-12--web-tanstack-query-hydration/CHANGE.md) | Query v5 provider, per-request prefetch/dehydrate/HydrationBoundary, viewer keys | W01 W02 |
| **B: ownership** | [W03 monotonic story Query](2026-11-11--web-snapshot-identity/CHANGE.md) | Only one viewer/story authoritative Query projection and version gate | W15 |
| **B: receipts** | [W19 durable operation receipt GET](2026-11-12--web-resolution-operation-receipts/CHANGE.md) | Read-only Nest resolution status/identity endpoint | W02 |
| **B: commands** | [W04 frozen Play useMutation](2026-11-11--web-play-command-lifecycle/CHANGE.md) | Intent FSM, immutable payload, verified lost-ACK/reload recovery | W03 W19 |
| **B: refresh** | [W05 Query polling/fallback](2026-11-11--web-play-refresh-lifecycle/CHANGE.md) | Visibility-aware, bounded conditional GET | W03 W04 |
| **C: forms** | [W08 RHF draft editor](2026-11-12--web-draft-editor-lifecycle/CHANGE.md) | RHF/Zod, dirty revision/save conflict | W15 |
| **C: creation** | [W09 generation/Start recovery](2026-11-12--web-opening-start-recovery/CHANGE.md) | Query preview, separate useMutation and frozen Start | W15 |
| **C: paging** | [W10 infinite lists/history](2026-11-12--web-pagination-navigation/CHANGE.md) | useInfiniteQuery with typed cursor/identity | W15 W03 |
| **C: settings** | [W11 RHF settings/presets](2026-11-12--web-settings-presets-lifecycle/CHANGE.md) | RHF/Zod, Query presets/history, revision-safe dirty editing | W15 W04 |
| **C: lab** | [W12 Chamber/QA state and boot-mode tests](2026-11-12--web-chamber-qa-isolation/CHANGE.md) | Query lab viewer isolation; preserve **existing** Nest `developerTools` conditional registration | W15 W03 W05 |
| **C: components** | [W06 cohesive feature composition](2026-11-11--web-campaign-composition/CHANGE.md) | Feature model/API/UI boundaries and shared pure pace | W15 W04 |
| **D: SSE server** | [W16 Nest SSE invalidation](2026-11-12--web-sse-backend-invalidation/CHANGE.md) | Authenticated PG-backed committed-version hints | W02 |
| **D: SSE client** | [W17 EventSource Query bridge](2026-11-12--web-sse-query-client/CHANGE.md) | Invalidate/refetch, reconnect, 30s safety + 2s fallback | W03 W05 W16 |
| **E: recovery** | [W07 route/a11y engineering](2026-11-11--web-play-route-recovery/CHANGE.md) | Next/Query error boundaries and keyboard recovery | W02 W03 W04 |
| **E: enforcement** | [W13 import/lint guardrails](2026-11-12--web-import-type-guardrails/CHANGE.md) | Strict React/Next/TanStack lint and server/client boundaries | W02 W15 W06 |
| **E: workbench** | [W18 Storybook states](2026-11-12--web-storybook-state-workbench/CHANGE.md) | Provider-free deterministic normal/error/recovery stories | W01 W06 W08 W11 |
| **E: evidence** | [W14 private SSR/route/perf proof](2026-11-12--web-private-route-evidence/CHANGE.md) | Production-like real browser/cache/SSE/bundle evidence | W02 W15 W03 W07 W17 |

**Recommended cost-first opening:** **W01 → W20 → W21 → W02 → W15**; W22 is a small independent documentation tooling Change, not a prerequisite to shipping initial React infrastructure. W21 may be delayed if no GitHub pushes are planned, but W20 should precede high-volume Cursor implementation. **Parallelism:** W19 and W15 may follow W02 independently; W08/W09 may run after W15 without waiting on Play; W16 backend may run after W02. **One active Change at a time by default**, especially for overlapping Play source owners. This is not a requirement to implement the queue in numeric order, and the owner may authorize a bounded group only with explicit source conflict control.

**Knowledge-cache maintenance:** when a Change moves routes, source-owner symbols, wire shapes, error/identity/transaction boundaries or test harnesses, update the nearest [source-adjacent README](../../apps/web/README.md) in the same Change. Do not rewrite maps for local JSX changes. W22 will validate nested links/headings, **not** claim that Markdown proves code semantics.

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
