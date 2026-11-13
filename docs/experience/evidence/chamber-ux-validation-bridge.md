# Chamber ↔ player UX | how to manufacture evidence without fooling ourselves

**Status:** source-inspected design/test plan, **not** a Chamber implementation instruction. **Source baseline:** GitHub main \`3464f0d8dcd5c024ddf6cdc32290dbb0dd258b5a\` on 2026-11-13. The CH01–CH16 implementation packets are recorded Done; this does **not** imply every individual scenario/lane is available. Source mapping: [Chamber program](../../engineering/chamber-program.md), [lab scenario catalogue](../../../packages/application/src/developer-tools/chamber-lab-catalog.ts), [Chamber UI](../../../apps/web/src/features/developer-tools/chamber/README.md). Reinspect actual code when execution begins.

## Why this matters

The user wants an extraordinary **player interface**, and the existing Chamber was deliberately built to reach game states without playing hours of unrelated content. We should use that power where it is genuine. But a Chamber that can draw a seeded die or compose a fixture is **not** proof that Next.js renders a convincing, accessible interruption scene.

The correct validation pipeline separates **mechanic truth**, **authoritative projection**, **browser behavior** and **human comprehension**.

\`\`\`text
Versioned scenario / exact seed / valid specimen
             |
             +--> Bench: real pure rule decisions (no DB/browser)
             +--> Sandbox: guarded, persisted application state (if available)
             +--> Connected: real Nest/worker/Next pipeline (gated)
             |
             v
Authoritative, viewer-safe story projection
             |
             v
Storybook MSW / real authorized Next browser
             |
             v
Rendered wide/narrow scene + keyboard/a11y review
             |
             v
Human task observation and independent critique
\`\`\`

**No hop can stand in for the next hop.** A pure rule pass is not an authorized public DTO, and an MSW story isn't evidence a real worker advanced for ten hours.

## Exactly what current lab catalogue advertises

The live \`chamberLabScenarioCatalog\` inspected at the baseline includes five named cases. They have **per-lane** status, not a universal executable/green flag:

| Scenario id@version | Bench | Sandbox | Connected | Useful UX question |
| --- | --- | --- | --- | --- |
| \`calendar-named-year-projection@1\` | **Available** | Planned | Planned | Correct fictional date/calendar labels |
| \`finite-action-overlap-eligibility@1\` | **Available** | Planned | Planned | Mechanics reject overlap; finite action doesn't cheat time |
| \`chamber-immediate-conversation@1\` | Blocked | Planned | **Available** (legacy scripted case) | A current scene and one contextual choice can be routed through a real fixture |
| \`activity-clock-wait-eighty@1\` | **Available** | Planned | Planned | An 80%-complete accepted wait specimen can be structurally valid |
| \`activity-interrupt-same-tick@1\` | **Blocked** | **Blocked** | **Blocked** | The strongest interruption case is not available from this exact catalogue |

These statuses are **catalogue metadata**, not an assertion that we ran any lane during this design pass. “Connected available” for the legacy scripted scenario does not certify a full provider narrative or a real Sandbox integration. The source's own scenario expressly prevents automated pass for that legacy case.

**Important consequence:** we cannot tell Cursor “Use the Chamber to reach any game state instantly” and call it done. Its strong foundation needs a **targeted UX fixture bridge** and perhaps additional authoritatively valid cases, but only when code work is authorized.

## What to reuse immediately

### Bench and fixture provenance

When a UI concern involves **time math, saved roll/effect or eligibility**, cite the corresponding source-backed test or Bench evidence to establish the *fact*. E.g., a wait can show 80% because the fixture's accepted process and committed elapsed seconds support it. Do not mock “80% work earned” if the fixture only supports 80% of an elapsed clock wait.

### Storybook as the design canvas

The existing \`apps/web/src/stories/\` and MSW can render **typed public story projections** without paid model calls. This is the correct home for side-by-side visual design:
- One current scene, 1/2/8 choices, very long prose.
- Verified running contribution with actual earned units (distinct from elapsed fictional time).
- Active literal wait with honest elapsed duration.
- Interrupted saved activity with current controlling decision.
- Manual pause, no accepted action, system blocker and uncertain ACK.
- Return from source-backed events, with no viewer-seen claim until backend supports it.
- Microbe/no-body story with no fantasy currency/map.

**Each story file should label its evidence class:**
- \`synthetic-public-DTO\`: schema-valid mocked projection only;
- \`source-derived\`: built from a known fixture with a reproducible ID/seed/content hash;
- \`connected-authorized\`: real system read performed under explicit test authorization.

This classification is documentation of what a fixture proves, not a demand for a new runtime enum.

### Browser vs story truth

A screenshot and an RTL test can prove the user sees a clear "Repair suspended · 3/9 saved" line. They cannot prove the server actually retained 3 units after a real interruption. **That** needs an application/DB/worker test. A true UX acceptance report must have both evidence classes when making that promise.

## Missing UX target specimens to propose (not already present)

| UX specimen | What must be constructed truthfully | Best initial lane | Blocking rule |
| --- | --- | --- | --- |
| \`ux-scene-two-offers\` | Published passage with valid current offer + source identity | Existing scripted scenario / Storybook | No provider assumptions |
| \`ux-choice-lost-ack\` | Frozen action intent with server operation receipt in uncertain state | MSW / existing Play tests first | Must not auto-POST |
| \`ux-contribution-failed-check\` | 3/9 earned and later failed check with advanced fictional time | Source-derived app fixture | **Not** synthesized as 60%-completed work |
| \`ux-work-interrupted\` | Actual interrupted activity with durable 3/9 and a controlling published decision | New application/connected specimen when supported | Same-tick lab catalogue currently blocked |
| \`ux-travel-long-wait\` | Admitted route milestone/position and conditional ETA | Storybook conceptual **only** until travel adapter | Never infer route distance from elapsed time |
| \`ux-narration-failed-after-settlement\` | Saved mechanical receipt but unavailable passage | Existing fault mechanics / MSW with precise label | No reroll or second reward |
| \`ux-no-plan-away\` | No accepted execution and same fictional time across return | Source-backed engine projection or MSW | Cannot label "world continuing" |
| \`ux-offline-stale\` | Last verified snapshot and failed GET | MSW + browser | Must not assert server stopped |
| \`ux-microbe\` | Applicable sensing/condition, no humanoid economy | Current scripted fixture | No generic human body defaults |
| \`ux-return-real-events\` | Committed provenance-linked event sequence | Existing limited history initially; GM05 later | No unsourced “Since you left” |
| \`ux-multiplayer-hold\` | Shared actor ownership/decision policy | Design mock **only** | Real group semantics not implemented |

For each case specify **actual source input, stable expected projection, permitted claims and negative assertion**. A valid fixture constructor must not insert impossible state into a real user's DB merely because the UI needs a screenshot.

## Workflow for each UX implementation Change

1. Architect identifies one player journey and **the current public data fields required**. See [capability map](public-projection-capability-map.md).
2. Cursor selects a provider-free mock or source-backed specimen appropriate to **that evidence level**. It must not declare a blocked Chamber lane available.
3. Build/verify the UI state using the selected React/TanStack/Storybook setup, with normal **and negative** cases.
4. Obtain a **real browser screenshot** in at least one narrow and one wide viewport and a keyboard check. Keep private story content out of published artifacts.
5. If the journey depends on real application/DB authority, separately authorize/disclose the safe test environment and verify it. Never use an ordinary user campaign as a disposable lab run.
6. Independent reviewer critiques the rendered result against **intention, earned time and continuity**, not the current JSX shape.
7. Add a short evidence note: which result was **mocked**, **source-derived** or **connected**, which remains unproved, and what a human actually experienced.

Do **not** require Cursor to run every test suite and every Chamber scenario after each CSS change. Use the existing staged fast feedback policy and risk-triggered checks.

## Privacy/safety boundary

Chamber endpoints mount only under the existing developerTools gating. A normal public story route must not expose laboratory controls or private SQL/Storyteller inspection data. Reuse **safe public DTOs and pure presentation components**, not an inspector API/identity bypass. Even in local testing, live provider dispatch and disposable DB provisioning remain separately gated by the user's explicit permission.

## One meaningful portfolio proof

A reviewer sees a beautiful *Now* scene from a source-grounded fixture, chooses a scripted action, watches actual accepted work, encounters an interruption, returns to preserved progress and can inspect a truthful history.

The accompanying repository evidence says precisely:
- Which state transitions were proven by real engine/application tests;
- Which screens were tested with provider-free Storybook;
- Which integrated path was exercised in an authorized browser;
- What still requires live Storyteller evaluation.

That's a far more convincing senior-engineering portfolio than twenty pretty static screens with a green checkbox beside every "feature."

## Decision required later

Do we need a **new small UX specimen extension to the Chamber**, or are current scripted fixtures + MSW sufficient for the first Now vertical slice? Choose from actual coverage and cost. Don't add a broad Chamber redesign to the UX program merely to manufacture decorative screenshots.
