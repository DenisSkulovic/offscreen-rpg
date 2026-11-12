# React / Next.js target-to-implementation gap audit

**Audit date:** November 11, 2026. **Inspected GitHub revision:** `a92695e8dbf4403aa7e52e8ff9a66dbe760ea06d`. **Method:** read-only inspection of repository source, manifests, existing tests and current contracts; **no local build, tests, browser, deployment or provider runs**. **Authority:** the [React/Next target F1–F10](../targets/react-next.md), written and committed **before** this audit; the target remains **proposed for owner review**.

**Priority:** portfolio-quality implementation, not new gameplay, a new design skin or an impressive inventory of libraries. Assess the implementation **against the selected destination**, never infer that a large file or unfamiliar code must be rewritten.

## Expert lenses actually activated

- [Target-first engineering](../../../.agents/rules/target-driven-renewal.md) and [Change workflow](../../../.agents/skills/change-workflow/SKILL.md): destination → evidence → bounded diff → falsifiable proof, not code-smell whack-a-mole.
- [Frontend engineering](../../../.agents/skills/frontend-engineering/SKILL.md) and [frontend state/async manual](../../../.agents/knowledge/frontend-state-and-async.md): owner/identity/lifetime, late replies, command acceptance vs publication, correct Effects.
- [Architecture decision-space manual](../../../.agents/knowledge/architecture-decision-space.md): cohesive boundaries vs artificial layers, real workload and maintenance cost.
- [API/network](../../../.agents/knowledge/api-and-network-contracts.md), [security/trust](../../../.agents/knowledge/security-and-trust.md), and their [API](../../../.agents/skills/api-contract-design/SKILL.md) / [security](../../../.agents/skills/security-architecture-review/SKILL.md) review skills: cookie sessions, object authorization, no-store, 200/202/409, idempotency and unknown transport completion.
- [Testing and evidence](../../../.agents/knowledge/testing-and-quality-evidence.md), [test-strategy](../../../.agents/skills/test-strategy/SKILL.md) and [independent design review](../../../.agents/skills/independent-design-review/SKILL.md): negative/race/identity proofs and cheaper truthful test seams.
- [Player-experience design](../../../.agents/skills/player-experience-design/SKILL.md), [UI art direction](../../../.agents/skills/ui-art-direction/SKILL.md) and [interface design craft](../../../.agents/knowledge/interface-design-craft.md): semantics and task focus here; **visual redesign is a different, future target**, not decided by reading CSS.
- Cross-checked [Next.js Server/Client](https://nextjs.org/docs/app/getting-started/server-and-client-components), [Next fetch cache](https://nextjs.org/docs/app/api-reference/functions/fetch), [Next errors](https://nextjs.org/docs/app/api-reference/file-conventions/error), and [React Effects](https://react.dev/learn/you-might-not-need-an-effect).

## Verified baseline and existing strengths

- `apps/web/package.json`: **Next.js 16.3.5, React/React DOM 19.3.0**, with shared Zod contracts; Next is already in the stack, not a technology to introduce. No `@offscreen/web` test script is defined. The `apps/web/` tree has **45 tracked files** in this revision.
- Real App Router Server Components already render [Play](../../../apps/web/app/%28authenticated%29/play/[id]/page.tsx), [story list](../../../apps/web/app/%28authenticated%29/stories/page.tsx), [drafts](../../../apps/web/app/%28authenticated%29/stories/[id]/page.tsx) and [opening preview](../../../apps/web/app/%28authenticated%29/stories/[id]/preview/page.tsx). They check a viewer, use no-store internal fetches and validate many responses with shared schemas.
- [Story transport](../../../apps/web/src/lib/story-transport.ts) parses story snapshots and `preferNewerSnapshot` resists lower `viewVersion` for a presumed same story. [PlayScene](../../../apps/web/src/features/play/view.tsx) and [Chamber controller](../../../apps/web/src/features/developer-tools/chamber/use-chamber-play.ts) use it for responses and refreshes.
- Several commands capture UUIDs for retry, and draft saves send expected revisions. [DraftEditor](../../../apps/web/src/features/stories/draft-editor.tsx) preserves unsaved input on 409 and disables the form during save; [OpeningPreview](../../../apps/web/src/features/stories/opening-preview.tsx) has bounded status polling and a saved request ID.
- There **are** real Playwright/browser integration scenarios in [stories-browser.integration.ts](../../../tools/api-integration/test/stories-browser.integration.ts), [drafts.browser.ts](../../../tools/api-integration/test/drafts.browser.ts) and [story-start.integration.ts](../../../tools/api-integration/test/story-start.integration.ts). They exercise persisted browser flows, owner/session and backend semantics. They are not the same as isolated React component/race tests, and they rely on the integrated test environment.
- `apps/web/app/stories/error.tsx` has an error fallback, and `apps/web/app/style.css` provides visible focus selectors and responsive breakpoints. No rendered/accessibility evaluation was performed for this audit.

**Do not discard this foundation.** This is an uneven but substantive application, not a blank project. The goal is to make its boundaries consistent and explainable, retaining correct auth, async and mechanical authority.

## Target-to-baseline matrix

| Target criterion | Evidence from source | Gap / required decision | Assessment |
| --- | --- | --- | --- |
| **F1 Server/client rendering** | Server route pages load typed initial data, with client islands | Repeated server fetch/error boilerplate; no recorded production route/bundle analysis; [story list](../../../apps/web/app/%28authenticated%29/stories/page.tsx) awaits drafts before starting story-list fetch | **Partially aligned**, performance not measured |
| **F2 Auth/API ownership** | `requireViewer()`, no-store server reads, same-origin rewrite, Nest owner-scoped API | [viewer](../../../apps/web/src/server/viewer.ts) and multiple pages independently classify failures; [Next rewrite](../../../apps/web/next.config.ts) hardcodes 127.0.0.1 while server read origin is configurable; no demonstrated private-cache/proxy trace for deployment | **Partially aligned**, do not infer a leak |
| **F3 State and identity** | Initial snapshot moved into [PlayScene](../../../apps/web/src/features/play/view.tsx) local state; history and command refs are local | `useState(initial)` does not itself express prop-change identity; [StoryHistoryView](../../../apps/web/src/features/play/history.tsx) keeps page state across prop changes and has no read abort; route remount semantics may avoid a real issue but need a negative test | **Identity guarantee unproved** |
| **F4 Version reconciliation** | `preferNewerSnapshot` compares `viewVersion` and `resolution.version` | It does **not compare story IDs or viewer identity**. Its correctness requires caller isolation; an older operation completing on a different resource is not explicitly rejected by this pure function | **Source gap confirmed**, exploitability unproved |
| **F5 Recoverable commands** | Stable UUID refs in [Play](../../../apps/web/src/features/play/view.tsx), [campaign hook](../../../apps/web/src/features/play/use-campaign-command.ts) and [preview](../../../apps/web/src/features/stories/opening-preview.tsx) | Similar 409/400/unknown-completion handling is independently repeated; `submitStoryJson` accepts `unknown` payload and masks most statuses. [Campaign hook](../../../apps/web/src/features/play/use-campaign-command.ts) exposes retry from a ref tied indirectly to a render | **Scattered ownership**, actual duplicate-effect defect not established |
| **F6 Invalidation/polling** | Play, Chamber and Preview use abortable timer polling; preview watches hidden tab | Play and Chamber maintain separate polling and error policies; Play silently swallows read failures and has no visibility gating. A future SSE event source must feed the same snapshot owner, not introduce parallel truth | **Partial**, SSE not required now |
| **F7 Component responsibility** | Feature folders, a shared transport utility and command hook already exist | [CampaignPlay](../../../apps/web/src/features/play/campaign-play.tsx) ~649 lines handles world state, choices, activity controls, event lists and input state; [CampaignSettingsEditor](../../../apps/web/src/features/play/campaign-settings.tsx) ~410 lines handles preset reads, edits, history and commands | **Mixed responsibilities**, size alone not a defect |
| **F8 Forms/editor consistency** | Draft revision conflict, dirty guard, schema validation and pending disable exist | [DraftEditor](../../../apps/web/src/features/stories/draft-editor.tsx) ~439 lines, [OpeningPreview](../../../apps/web/src/features/stories/opening-preview.tsx) ~409 lines; route/late-response/uncertain-start cases lack targeted UI proofs. Distinguish real issue from merely large source before cutting another Change | **Partially aligned; needs targeted evidence** |
| **F9 Resilient/a11y UI** | Native controls, fieldsets, status roles, a story error boundary, focus CSS | No `loading.tsx` routes or representative Play error boundary found in web tree; no documented keyboard/focus recovery for major states and no measured WCAG review. CSS reading cannot certify rendered experience | **Evidence and some boundary gaps** |
| **F10 Testing/portfolio proof** | Real API+Playwright integration, TS typecheck and repo quality tools | No isolated `apps/web` test script or targeted component/state tests for response ordering, story switches and command uncertainty; current integration is expensive and may reset disposable DB | **Important testability gap** |

**Interpretation:** these are comparisons with a **proposed target**, not a passing/failing scorecard. `Source gap confirmed` means a contract check is absent from inspected code, **not** that an end user has been shown the wrong story. A date/version in existing documentation is not a currently executed test.

## Diagnostic findings (ranked by portfolio engineering importance)

| Finding | Observation, not conjecture | Why it matters | Priority |
| --- | --- | --- | --- |
| G01. Identity not enforced in snapshot comparator | `preferNewerSnapshot` checks view/resolution versions, not `id` | High-quality React state needs identity before ordering. Test A→B and A late-response independently of Next route remount | **P1** |
| G02. State lifecycle is implicit in multiple clients | Play and Chamber own similar snapshot/poll/command paths; History owns its own page/read | Identity switch, stale reply and teardown behavior must have a single explicit contract, not depend on incidental mounts | **P1** |
| G03. Command lifecycle is copied across screens | Play and Campaign hook capture retry refs and interpret HTTP statuses separately | Duplicate retry semantics raise maintenance cost; post-timeout effect status must remain honest | **P1** |
| G04. React behavior lacks cheap narrow proofs | Browser tests exist, but no web-local component/unit runner or race tests surfaced | Verification should not require database reset/worker orchestration for a pure view-version decision | **P1** |
| G05. SSR API reading is scattered | Repeated viewer/origin/fetch/schema/error handling; stories list waterfall | A small *server-only* typed boundary improves consistency, authentication and maintainability; first measure actual performance before claiming speedup | **P2** |
| G06. Interactive refresh is inconsistent | Play/Chamber/Preview have independent polling/error/visibility choices | An agreed refresh owner and explicit visibility/identity behavior help avoid stale state and extra requests | **P2** |
| G07. Campaign UI has cross-cutting responsibilities | CampaignPlay combines options, controls, future events, receipts, status and history with local action-path state | Split by coherent user-facing lifecycle and pure selectors, not arbitrary line count | **P2** |
| G08. Route failure/a11y proof incomplete | Only one dedicated Next error boundary; focus CSS and some roles but no route-level acceptance matrix | A professional frontend makes failed/blocked navigation understandable and keyboard-accessible | **P2** |
| G09. Creation/editor behavior requires challenge | Draft editor and preview already have safeguards, but no isolated reverse-order/identity/uncertainty test | Audit further; don't generate a form library or wholesale rewrite absent a specific failing condition | **P2 investigation** |
| G10. Production rendering/performance baselines absent | No actual production trace, HTML/client bundle measurement or network waterfall captured | Avoid claiming SSR “optimized” or refactors “faster” without representative measured evidence | **P2 evidence** |

### Most important discriminating experiments

1. **A→B identity race:** preserve a mounted client, begin A refresh/command, navigate to B, resolve A after B; inspect the DOM and no cross-owner cache. A version comparator unit case alone is insufficient to prove Next navigation behavior.
2. **Same-story out-of-order versions:** return v14 before v13 and concurrent resolution updates at equal `viewVersion`; only permitted monotonic updates render.
3. **Timed-out mutation after commit:** inject a transport timeout after the backend accepts a stable operation ID, then retry exactly that ID. Verify one authoritative effect and honest pending/uncertain UI.
4. **Authenticated SSR boundary:** anonymous, signed-in permitted and signed-in other-owner requests; inspect initial HTML, private caching headers and error behavior. A private page's redirect alone is not object authorization proof.
5. **Browser accessibility/long-content:** keyboard-only create→preview→play, focus after errors, narrow width, long text, disabled/uncertain actions; record actual browser results, not JSX speculation.
6. **Development economics:** compare a local isolated state/component suite against the existing full-browser integration runner, preserving the *stronger* full-stack tests rather than replacing them with mocks.

## Design decision: three credible alternatives

- **A. Keep existing structures; add tests only.** Cheapest near-term; many safeguards already work. **Rejected as the full target** because duplicate lifecycle ownership and a pure identity-check gap remain. Good as an interim discovery step.
- **B. Server-first App Router + small feature-owned client controllers and a few truly shared primitives.** **Recommended.** Match current Next/Nest boundaries, centralize state/command/reconciliation semantics where they are identical, preserve use-case specifics and add independent proofs. Does not need Redux, a client-only rewrite or new backend services.
- **C. Install a global React entity store / query cache and rewrite all fetching.** Useful for dense distributed consumer state, but **not currently justified**. It would introduce invalidation, identity, hydration and rollback rules before measuring need. TanStack Query may become appropriate for repeated reads only after a dedicated decision.

**Counterevidence that could change this recommendation:** browser tests establish that identity crossing is impossible at every relevant route and the existing hooks remain reliably isolated; or measured read workflows become too complex for small feature-local controllers. Then narrow/omit state migrations. A source file being 650 lines is not enough to justify changing behavior.

## Proposed dependency order: Change packets, not marching orders

| Order | Candidate bounded Change | Target / gap | Why this is the step |
| --- | --- | --- | --- |
| 1 | [W01: isolated web test foundation](../../changes/2026-11-11--web-test-foundation/CHANGE.md) | F10, G04 | Prove pure/client guarantees without resetting the DB; retain full-stack Playwright |
| 2 | [W02: private server-read boundary](../../changes/2026-11-11--web-server-read-boundary/CHANGE.md) | F1–F2, G05 | Consolidate authenticated server loading and error semantics, no new authority |
| 3 | [W03: resource-safe snapshot owner](../../changes/2026-11-11--web-snapshot-identity/CHANGE.md) | F3–F4, G01–G02 | Establish the identity/version invariant before more async wiring |
| 4 | [W04: recoverable Play command lifecycle](../../changes/2026-11-11--web-play-command-lifecycle/CHANGE.md) | F5, G03 | Explicitly model stable intent, unknown completion and response reconciliation |
| 5 | [W05: Play refresh lifecycle](../../changes/2026-11-11--web-play-refresh-lifecycle/CHANGE.md) | F6, G06 | One owner for refresh/visibility/cleanup; do not conflate this with SSE implementation |
| 6 | [W06: CampaignPlay responsibility split](../../changes/2026-11-11--web-campaign-composition/CHANGE.md) | F7, G07 | Clear rendering and derived state boundaries after controllers stabilize |
| 7 | [W07: Play route failure/a11y recovery](../../changes/2026-11-11--web-play-route-recovery/CHANGE.md) | F9, G08 | Test visible and keyboard behavior without preempting future visual design |

**Not yet a Change:** creation/editor restructuring, preview state, Next deploy-mode improvements, TanStack Query, SSE/WebSockets, global CSS redesign, performance tuning, Tailwind/shadcn and UI art direction. Their target design questions or measured gaps must be resolved first. A new Change should not exist just to keep a coding model busy.

## Exit, evidence limits and owner decisions

- **No runtime correctness certified:** we did not run source, unit tests, Playwright, a browser screenshot, lint, build, CI or live model. The test locations are confirmed by source reading, not fresh passing results.
- **Target remains Proposed:** approve/revise its architecture and priority, plus the local web testing stack before upgrading packets to Ready. The owner already approved **the philosophy and documentation work**, not each eventual code diff.
- **No active Change:** `docs/changes/README.md` keeps `Current change: none`. Cursor should not silently execute the numbered table.
- **Separate forthcoming target:** UI visual/UX art direction requires its own design thesis and stress cases, not a superficial follow-up to splitting JSX components.
- **Final completion** is a target criterion-to-evidence matrix from `../targets/react-next.md`, backed by a running build and demonstrated tests, with honest remaining limitations. Closing seven Changes without proving F1–F10 does **not** imply the target was achieved.
