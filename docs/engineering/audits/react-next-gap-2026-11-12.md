# React / Next.js engineering gap audit | November 12, 2026

**Status:** Source-grounded, read-only audit of the unchanged pre-migration code against the **[decided F1–F15 architecture](../targets/react-next.md)**. The owner later selected TanStack Query v5, RHF/Zod, SSE, Storybook and other stack decisions; they are design deltas, **not observed runtime defects**. **Source baseline:** `470a5df069470bf758eb1a560c515846ce781637` (last code-equivalent `main` revision before the target update). **Target provenance:** target revised in the *earlier* documentation commit `6d81df4a673f706281cd1e989e49e71f5f1bd8ab`. **Method:** authenticated GitHub repository file/tree inspection; **no source change, local checkout, CLI run, typecheck, browser, CI, proxy, DB, live provider or performance measurement**. Statements about runtime behavior below are distinguished from static source facts.

**Mission filter:** the system is an engineering portfolio, not a gameplay MVP or UI-design sprint. Code changes are warranted only where a meaningful target invariant is missing, fragile, expensive to explain or unproved by appropriate tests. Attractive JSX, line count and library fashion are not evidence of architectural quality.

## 1. Evidence and expertise actually consulted

- Governance: [root agent entry](../../../AGENTS.md), [target-first rule](../../../.agents/rules/target-driven-renewal.md), [Change standard](../../../.agents/references/change-work-unit-standard.md), [Change workflow](../../../.agents/skills/change-workflow/SKILL.md), [November 11/12 minutes](../../minutes/README.md), [roadmap](../../../TODO.md).
- Specialist lenses: [frontend-engineering](../../../.agents/skills/frontend-engineering/SKILL.md), [architecture boundary review](../../../.agents/skills/architecture-boundary-review/SKILL.md), [independent design review](../../../.agents/skills/independent-design-review/SKILL.md), [codebase investigation](../../../.agents/skills/codebase-investigation/SKILL.md), [frontend async knowledge](../../../.agents/knowledge/frontend-state-and-async.md), [architecture choices](../../../.agents/knowledge/architecture-decision-space.md), [API](../../../.agents/knowledge/api-and-network-contracts.md), [security](../../../.agents/knowledge/security-and-trust.md), [testing](../../../.agents/knowledge/testing-and-quality-evidence.md), [caching](../../../.agents/knowledge/caching-and-performance.md), [observability](../../../.agents/knowledge/observability-and-production-diagnostics.md), [delivery](../../../.agents/knowledge/release-and-delivery-engineering.md).
- Application boundaries: [web README](../../../apps/web/README.md), [package/Next config](../../../apps/web/package.json), [viewer/server reader](../../../apps/web/src/lib/viewer.ts), [story transport](../../../apps/web/src/lib/story-transport.ts), authenticated `app/` pages, all major Play/creation/list/Chamber state owners, [Nest story controller](../../../apps/api/src/modules/stories/controller.ts), [Nest drafts](../../../apps/api/src/modules/drafts/controller.ts), [Nest openings](../../../apps/api/src/modules/drafts/openings-controller.ts), [Chamber tools](../../../apps/api/src/modules/stories/chamber-tools-controller.ts), [QA controller](../../../apps/api/src/modules/stories/qa-journeys-controller.ts), [shared schemas](../../../packages/contracts/src/stories.ts), [openings](../../../packages/contracts/src/openings.ts), [drafts](../../../packages/contracts/src/drafts.ts), [TS strict base](../../../packages/config/typescript/base.json).
- Verification source: [integration harness README](../../../tools/api-integration/README.md), [real browser flows](../../../tools/api-integration/test/stories-browser.integration.ts), [draft browser](../../../tools/api-integration/test/drafts.browser.ts), [Start integration](../../../tools/api-integration/test/story-start.integration.ts), [CI code workflow](../../../.github/workflows/code.yml), [quality lint config](../../../eslint.quality.config.mjs).
- Framework references: [React derived state/identity](https://react.dev/learn/you-might-not-need-an-effect), [Next Server/Client](https://nextjs.org/docs/app/getting-started/server-and-client-components), [Next caching (non-cache-components model)](https://nextjs.org/docs/app/guides/caching-without-cache-components), [Playwright](https://playwright.dev/docs/best-practices). Version-specific behavior must be confirmed using the installed `next` configuration and running build, not framework generalities.

**Evidence grades:** **S** source directly shows a design fact, **T** committed test *source* explicitly covers a scenario but was not executed here, **R?** runtime security/perf/user outcome not established, **D** design-decision dependency. “Source-confirmed gap” does **not** mean a failure has been reproduced in a browser.

## 2. Existing architecture worth retaining

1. **Real server-first Next, not a fake SPA.** `app/play/[id]/page.tsx`, `app/stories/page.tsx`, draft and preview routes use Server Components, request-bound viewer lookup, `cache: 'no-store'` and Zod validation before passing projections to interactive client islands. React `19.3.0` and Next `16.3.5` are installed. **S.**
2. **The correct backend authority is mostly preserved.** Nest controllers call `IdentityService.requireUser`, pass the owner ID to application use cases and return typed error codes. Story `202` admission is distinct from Start `200`; view versions and resolution versions exist in strict shared schemas. **S**, not proof of every ownership path.
3. **Several lifecycle safeguards already exist.** Play/Chamber use a version selector; pollers use AbortController; draft saves use expected revision and preserve unsaved text on 409; preview uses a saved generation attempt ID and bounded active reads; Start stores story UUID in URL; explicit pending/uncertain copy avoids claiming completed model results. **S.**
4. **Substantial existing integration verification.** The browser/integration suite exercises session ownership, reloads, draft conflicts, saved command behavior and Start/preview flows with real components. Root scripts and an existing `.github/workflows/code.yml` already check formatting, lint, TS, tests, build, Compose and selected DB/auth integration. The suite is **not** equivalent to deterministic component race tests and may reset a named disposable DB. **T**, not freshly passing.
5. **Strong baseline static types.** Shared config already uses `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`; Zod parsers exist. The production import graph and route performance are **unmeasured**, not presumed defective.

**Do not replace this with new libraries merely to demonstrate activity.**

## 3. Target-to-source matrix

| End-state contract | Observed source, tests and limits | Baseline assessment |
| --- | --- | --- |
| **F1 server/client HTML** | Server Play/stories/draft/preview pages and client islands exist. Production HTML hydration, route graph, bundle and router-prefetch behavior unmeasured. | Aligned structure; proof incomplete |
| **F2 security/privacy** | `requireViewer` forwards request cookie to Nest, pages no-store; server origin is configurable but `next.config.ts` browser rewrite hardcodes loopback. No actual proxy/private router-cache trace. | Partial; deployment model gap / R? |
| **F3 identity lifecycle** | `PlayScene` initializes `useState(initial)`; nested settings remount by revision, campaign by offer ID; history state may survive prop identity. Real App Router navigation/remount not tested here. | Explicit identity contract missing / S |
| **F4 monotonic snapshots** | `preferNewerSnapshot` compares `viewVersion` and `resolution.version` but not story ID or viewer epoch; caller isolation is assumed. | Identity gate absent in comparator / S |
| **F5 commands** | Ref-based frozen choice/control/campaign UUIDs while mounted; preview Start UUID persists in query but payload reconstructed per click; no shown reload recovery for ordinary Play operation ID. | Scattered semantics; critical retry-envelope risk / S |
| **F6 refresh** | Play and Chamber poll every 2s and ignore errors; preview suspends GETs when hidden, max 30 actual active reads. No shared visibility/reconnect/error model. | Partial / S |
| **F7 modules** | Feature folders exist, but `campaign-play.tsx` controls actions and renders many unrelated sections; `opening-preview.tsx` imports `paceOptions` from a Client Play screen. | Clear coupling seams; line count alone neutral / S |
| **F8 form lifecycle** | Draft 409 preservation exists; settings component keyed by revision; draft success applies response to local state; preview Start body not captured. No targeted unsaved/late-response tests. | Partial, selective risk / S |
| **F9 accessible recovery** | Native controls, labels, status roles, focus CSS and stories route error; no dedicated Play error/loading boundary; no actual keyboard/focus/a11y audit. | Evidence/boundary gap / S+R? |
| **F10 test proof** | `apps/web` has no local `test` script; integrated browser tests and CI exist. Focused deterministic reversal/React lifecycle suites not found. | Targeted proof gap / S |
| **F11 typed transport** | `submitStoryJson` takes `body: unknown`, returns raw `Response`; `readStorySnapshot` throws generic “Unavailable”. Callers repeat incompatible 400/401/409/5xx decisions. | Source-confirmed shared-boundary gap / S |
| **F12 pagination/navigation** | `LiveStoryList` replaces current `page` on “older”; `DraftList` appends/dedupes but interpolates raw cursor; `StoryHistoryView` keeps one page and lacks fetch abort. Identity/UX semantics need explicit contract. | Partial; negative proof missing / S |
| **F13 Chamber isolation** | Separate Chamber feature, but duplicate snapshot/poll/command ownership; QA workspace persists run ID in unpartitioned localStorage. Nest inspector requires session and owner ID, but controller has no separate developer-role check. | Security-policy D; test and owner isolation needed |
| **F14 strict TS/import graph** | Strict TS already configured, ESLint and optional quality audit exist, code CI exists. No focused test enforcing server-only import boundaries; cross-feature constant import present. | Preserve strengths; narrow static guard |
| **F15 diagnostics/performance** | No current production route trace, waterfall, bundle measurement or auth cache/proxy evidence. Story list fetches drafts *then* stories despite independent operations. | Measurement gap; one confirmed waterfall / S+R? |

## 4. Ranked findings with discriminating evidence

### Critical correctness and trust (P0 / first proof obligations)

**G11. Start retry envelope is not frozen.** In [`OpeningPreviewPanel.startStory`](../../../apps/web/src/features/stories/opening-preview.tsx), `storyId.current` is reused and written to `?story=...`, but each Start attempt serializes the *current* `preview.id`, `draft.revision`, `locked` and `pace`. A user can change settings after an uncertain transport result and press Start again under the *same resource identity* with different parameters. Nest `startFromCandidate` accepts typed candidate/revision/campaign; the integrated Start test shows same-request replay, not this changed-body path. **S confirmed risk; actual conflicting outcome or double-effect not demonstrated.** **Negative test:** timeout after server commit, modify speed/locked, click retry; exact same captured request must be used or a safe authorized read must reconcile without reissuing a changed request. **Proposed W09.**

**G12. Reload recovery is overstated if based on mount-local refs.** [`PlayScene`](../../../apps/web/src/features/play/view.tsx) and [`useCampaignCommand`](../../../apps/web/src/features/play/use-campaign-command.ts) store operation ID/body in refs. These are stable within that component lifecycle, not across reload. Their text suggests “retry same request or reload”; reloading can read authoritative story, but cannot reconstruct an arbitrary lost operation ID from that ref. Do not install localStorage replay reflexively. **S limitation; whether server projection already suffices must be checked per endpoint.** **Negative test:** lose ACK, reload, ensure no newly generated intent or misleading “safe retry”; reconcile through existing story/receipt or expose a truthful blocked state. **W04/W09; API extension not silently authorized.**

**G13. Snapshot comparator trusts caller resource isolation.** [`preferNewerSnapshot`](../../../apps/web/src/lib/story-transport.ts) contains no story identity or viewer context. This is a missing guard for any caller with re-usable scope, even though route remount may prevent actual cross-story display today. **S gap, R? exploitability.** **Negative:** wrong story with larger version cannot win; user A->B before B loads must not display A. **W03.**

**G14. Private SSR/browser routing is not deployment-verified.** [`viewer.ts`](../../../apps/web/src/lib/viewer.ts) uses `API_INTERNAL_ORIGIN`; [`next.config.ts`](../../../apps/web/next.config.ts) rewrites browser `/api/*` to fixed `127.0.0.1:3001`. Both work in one local topology but are inconsistent as independently configurable deployment contracts. No proxy or Next Router Cache private response test. **S configuration mismatch, R? leak/deploy failure.** **Negative:** same origin web/API in a deployed-like environment with non-loopback upstream, anonymous/other-owner and back-navigation. **W02 + W14.**

### State/testability correctness (P1)

**G15. No fast React-specific adversarial suite.** `apps/web/package.json` contains `typecheck` but no `test`; costly integrated Playwright exists and CI already tests many boundaries. **S missing narrow runner.** **Negative:** reversed network completion and Strict Mode lifecycle tests reject a plausible wrong implementation, do not falsely assert Nest authorization from a mock. **W01.**

**G16. Browser HTTP semantics are flattened.** `submitStoryJson` has untyped `unknown` payload and returns raw `Response`; several callers catch every non-OK as generic service unavailability; `useCampaignCommand` handles 400/409 but not explicit 401/429, while Play handling differs. Nest already emits machine-readable error codes. **S.** **Negative:** 401 does not become unknown pending, 409 retains user edits where relevant, 202 never claims published outcome, invalid JSON shows protocol error. **W02/W04/W11 (shared contracts only where identical).**

**G17. Identity lifetime depends on component keys and closure freshness.** `PlayScene` uses initial `useState`; `StoryHistoryView` saves page without abort/identity fence; `CampaignPlay key={offer id}` may remount and discard its command ref when offer changes; `CampaignSettingsEditor key={settings revision}` resets its draft on revision updates. Whether each transition occurs during an uncertain request is not established. **S vulnerability surface, R? user defect.** **Negative:** deliberately preserve/reuse a client across route changes, revise settings while dirty, deliver stale history response. **W03/W10/W11.**

**G18. Refresh has several independently designed lifetimes.** Play and Chamber each own timer policies, silently swallow GET errors and have no explicit hide/foreground refresh. Preview uses different behavior and stops after error/30 visible reads. **S inconsistency, not a demand for universal polling library.** **Negative:** hide/restore, repeated 503, identity change, Strict Mode remount; no timer leak or falsely “up-to-date” error. **W05/W12.**

**G19. Draft and preview lifecycle needs discriminating proof.** `DraftEditor` preserves edits after 409 and guards some navigation; successful response sets `content` from server; preexisting edits are disabled while pending but navigation/identity and two-tab update paths are not comprehensively proved. Preview generation/start are different command families. **S evidence gap, not established data loss.** **Negative:** navigate/refresh mid-save, conflict with newer revision and form editing, late response after identity change. **W08/W09.**

### Architecture, accessibility, evolution and portfolio proof (P2)

**G20. List and chronology data lifetimes differ without documented navigation semantics.** `LiveStoryList` replaces page, `DraftList` appends, history replaces; some fetches have no abort and some cursors are not URI-encoded. Different paging *may* be intentional, but tests should require the chosen behavior and guard late pages. **S.** **Negative:** page N resolves after changing viewer or filter; no stale/duplicate result. **W10.**

**G21. Client feature imports and responsibility boundaries are too permissive in selected places.** Preview imports `paceOptions` from `campaign-play.tsx` solely for a constant, coupling creation to a Client Play module; `CampaignPlay` combines input-path state, transport actions, world panels and receipt projection in 649 lines. Extraction should follow changed reasons-to-change, not auto-split by 100 lines. **S.** **Negative:** route bundle no longer imports another feature merely for a constant; rendered action/hold/receipt states unchanged. **W06/W13.**

**G22. Settings/preset editing mixes separable lifetimes.** [`CampaignSettingsEditor`](../../../apps/web/src/features/play/campaign-settings.tsx) owns editable settings, two GET catalogues, saves a preset under ref identity, history reads and campaign command; its revision-based key remount is a plausible unsaved-edit loss path. **S, not yet reproduced.** **Negative:** background revision changes while dirty, fail/timeout preset save, history read resolves after switch; no state substitution. **W11.**

**G23. Chamber needs architectural and security classification, not CSS hiding.** [`ChamberToolsController`](../../../apps/api/src/modules/stories/chamber-tools-controller.ts) authenticates and forwards `ownerId`, but inspected routes do not check a separate developer role; [`QaJourneysController`](../../../apps/api/src/modules/stories/qa-journeys-controller.ts) also authenticates/owner-scopes run data. Product may intend a self-service laboratory; access policy **D**, not a proven unauthorized-user leak. Client QA localStorage run ID is not an auth credential. **Negative:** own/other-owner read plus session switch, and explicit deployment exposure decision. **W12 (frontend partition); backend authorization policy separate owner decision.**

**G24. Representative route-level recovery/accessibility is unproved.** `app/stories/error.tsx` exists; no Play-specific `error.tsx` or loading boundary in audited web tree; CSS has focus styles and JSX uses some semantic labels. No browser human keyboard/focus evidence from this inspection. **S + R?** **Negative:** auth expires, upstream returns 503, keyboard user follows recovery, error remains associated with actual resource. **W07.**

**G25. Production performance/diagnostics lack a baseline.** The stories page awaits drafts before starting story list fetch; route HTML, hydration, JS cost, request counts and polling traffic have not been measured, so “optimized” would be fiction. Debug information must be safe. **S waterfall opportunity, R? performance impact.** **Negative:** no performance claim without comparable trace; no sensitive session/story logs. **W14.**

**G26. Static quality tools exist but do not enforce every architecture boundary.** Strict TS and CI already strong; optional quality lint is more stringent but `server-only` import and feature direction cannot be inferred from them. Avoid separate package boilerplate if one focused import rule proves actual boundary. **S evidence.** **Negative:** intentionally attempted server-reader import into Client graph rejected at check/build; no wholesale lint churn. **W13.**

## 5. Earlier architectural alternatives (historical; owner chose the stack afterward)

| Architecture | Fit to this repository | Counterexample / warning |
| --- | --- | --- |
| Keep implementation, only add tests | Cheapest route, preserves safeguards | A new test cannot give a mismatched-resource comparator a deliberate identity contract; real unsafe behavior may remain |
| **Feature-scoped controllers + small typed adapters (recommended proposed target)** | Separates SSR/session, resource snapshot, command intent, form editing and read pagination without a global store | Can degrade into bespoke per-feature state machines; require a bounded shared invariant and testability gate |
| TanStack Query for reads, separate immutable command controllers | Strong option if browser read/cache revalidation becomes cross-route and multi-consumer | Cache partition and hydration may increase complexity; it is not itself a command receipt protocol |
| Global client store + generic command dispatcher | Simplifies wiring of many consumers | Reintroduces second canonical story and generic retry semantics, with more cross-viewer isolation work |
| All Next Server Actions | Could hide browser API complexity in a BFF | Duplicates authority and adds network hop unless a concrete security need justifies it |
| Mandatory SSE / new broker | Low-latency hints once backend guarantees exist | Does not fix identity, lost ACK or authorization; currently out of scope |

**Decision superseded:** After reviewing these alternatives, the owner explicitly selected **TanStack Query v5** regardless of migration size. The decided target now requires a single authorized Query cache, Next SSR hydration, RHF for major forms and end-to-end transport/test standards. A focused test may still prevent needless local rewriting, but the stack choice is **not delegated to Cursor**.

## 6. Revised code-bearing implementation map (owner-selected destination)

**Important distinction:** G11–G26 are primarily source/contract observations. G27–G33 below describe newly mandated *architecture features not yet implemented*, not automatically detected user bugs. The owner's selection of TanStack/RHF/SSE does not retroactively prove the old code broken.

| Change | Destination/target | Depends on | Result |
| --- | --- | --- | --- |
| W01 | F10 | none | Vitest + RTL + MSW + deterministic adversarial React tests |
| W02 | F1 F2 F11 | W01 recommended | server-only typed Nest reader and private App Router route group |
| **W15** | F1 F3 F10 F14 | W01 W02 | TanStack Query v5 provider, per-request SSR prefetch/dehydrate/hydration, viewer-key factories |
| W03 | F3 F4 | W15 | query-owned identity/monotonic snapshot reconciliation |
| **W19** | F5 F11 | W02 | owner-scoped read-only operation receipt for admitted resolution recovery |
| W04 | F5 F11 | W03 W19 | useMutation transport + frozen typed Play intent and receipt-aware recovery |
| W05 | F6 | W03 W04 | Query refetch/polling fallback with visibility and error policy |
| W08 | F8 | W15 | React Hook Form + Zod draft editor and revision/dirty guard |
| W09 | F5 F8 | W15 W19 | generation/Start useMutation + immutable Start envelope |
| W10 | F12 | W15 W03 | useInfiniteQuery story/draft/history page identity/cursors |
| W11 | F8 | W15 W04 | RHF settings/preset editor, no dirty reset on refresh |
| W12 | F13 | W15 W03 W05 | Query Chamber/QA isolation and Nest developer-only gate |
| W06 | F7 | W04 W15 | feature model/api/ui separation and precise component extraction |
| **W16** | F2 F6 | W02 | authenticated Nest SSE + committed PostgreSQL invalidation hint |
| **W17** | F4 F6 | W03 W05 W16 | SSE client invalidates Query, 30s safety/fallback GET |
| W07 | F9 | W02 W03 W04 | Next/Query error recovery and accessible state |
| W13 | F14 | W02 W15 W06 | ESLint React/Next/TanStack rules and server/client dependency guard |
| **W18** | F7 F9 F10 | W01 W06 W08 W11 | Storybook with deterministic MSW state/workflow stories |
| W14 | F1 F2 F10 F15 | W02 W03 W07 W17 | provider-free private SSR/cache/route browser, performance evidence |

This is a dependency graph rather than a linearly scheduled 19-sprint program. Cursor executes one active approved packet at a time, coordinating overlapping modules. Any packet can close with *no rewrite* if the exact target proof is already met; the mandated stack itself remains selected.

## 7. Acceptance gate and unverified facts

- **Static source observation:** precise paths and branches described above. **Test source present:** integration scenarios exist, but no current run results. **Runtime unknown:** exact App Router remounts, stale private RSC behavior, proxy deployment, accessibility, duplicate effects after lost acknowledgement, timing/performance.
- **No invented defects:** long files alone do not fail F7; login-required Chamber is not synonymous with a proven data leak; local storage of a nonsecret QA run ID does not alone violate security; `cache: 'no-store'` already exists and is valuable; existing auth/CI/browser tests count as real engineering investments.
- **Design authority:** owner explicitly delegated technology and architecture decisions on November 12; the [selected target](../targets/react-next.md) resolves TanStack/RHF/SSE/testing/developer access/reload protocol. **Execution still awaits** separately selecting and authorizing one code-bearing Change. Cursor must revalidate source/tests and return a diff plus actual checks.
- **Proof needed for convergence:** every F1–F15 maps to a completed demonstrable or accepted-deferred receipt at a named revision. Closing 19 packet folders alone does not prove this target was reached.

**Historical comparison:** the [Nov 11 initial audit](react-next-gap-2026-11-11.md) identified G01–G10 and W01–W07. This update preserves its valid observations but supersedes its completeness and execution ordering; no historical claims about tests run are silently upgraded.


## 8. Selected-stack gap register (design chosen after source inspection)

These additional items distinguish an **adopted architectural destination** from observed bugs. The underlying application source remains the same audited revision.

| Finding | Directly inspected baseline | Selected end state and target | Evidence to collect |
| --- | --- | --- | --- |
| **G27. No TanStack Query owner/hydration** | `apps/web/package.json` has no `@tanstack/react-query`; web screens use ad hoc `fetch`/`useState` and RSC pass raw initial props | F1 F3 F4 F10: query cache, authenticated key factories, SSR prefetch/dehydrate and browser hydration, scoped provider | W15 query/hydration tests, production HTML, no client re-fetch-on-mount |
| **G28. No RHF editors** | `draft-editor.tsx` and `campaign-settings.tsx` own fields/dirty/edit flow manually; no `react-hook-form` in web manifest | F8: RHF + zodResolver, useFieldArray, frozen save/revision and explicit reset | W08/W11 dirty/409/revision and form focus tests |
| **G29. No Storybook state-workbench** | No Storybook dependencies/`.storybook` directory in inspected web tree; existing UI needs deterministic state evidence | F7 F9 F10: provider-free state stories, functional regression/evidence, no visual redesign | W18 workbench loads without app/DB/provider, main state fixtures |
| **G30. No end-to-end story SSE path** | Play and Chamber poll GET; `apps/api/src/modules/stories/controller.ts` has no SSE story updates endpoint in inspected source | F6: authenticated committed hint SSE, Query invalidation and GET fallback | W16/W17 missing/delayed event tests with proxy/auth |
| **G31. No read-only resolution operation receipt** | Story controller accepts `PUT /:id/resolutions/:operationId` but no corresponding owner-scoped `GET` identity/status receipt; server stores operation ID in resolution flow | F5 F11: identify original admitted intent after reload without reissuing unknown effect | W19 real DB owner/other, missing/duplicate, stopped/settled receipt tests |
| **G32. Missing selected library/static rules** | Strict TS/CI exist; current web config lacks TanStack and RHF checks; root ESLint lacks plugins selected by the target | F10 F14: React Hooks/Next/TanStack rules, dependency restrictions and CI local-test enforcement | W13 negative forbidden import and invalid query dependency test |
| **G33. No distinct developer-only Nest gate** | `ChamberToolsController` and `QaJourneysController` validate auth/owner, not a separate developer allowlist; local-only intended mode is not enforced in controller | F2 F13: developer endpoints disabled by default for hosted ordinary users, backend allowlist/role enforced | W12 ordinary authenticated denial vs authorized developer, QA hints scoped to viewer |

**Priority by risk, not checkbox value:** W01/W02/W15 lay the platform; W03/W19/W04 protect privacy/idempotency; RHF and infinite lists improve state consistency; SSE and Storybook prove architectural maturity when implementation is real. The source has existing valuable safeguards and integrated tests, so these additions should **converge**, not overwrite them with stylish wrappers.
