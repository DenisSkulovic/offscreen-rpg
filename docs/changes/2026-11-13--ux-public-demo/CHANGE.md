# UX09 | Public demo: show the dream quickly, without faking persistence

**State:** Proposed. **Approval:** owner has not authorized code. **Kind:** public presentation and browser-only scripted demo + tests. **Parent:** [experience program](../../experience/implementation-program.md), M3. **Dependencies:** UX02/UX03 interaction grammar, or an independently reviewed equivalent adapted for a public scripted route.

## Cursor first-screen brief

> **Source map:** [App Router](../../../apps/web/app/README.md), inspect apps/web/app/demo/story-demo.tsx, scene-view.tsx, script.ts, content/script.json and demo/page.tsx.
> **Primary target:** [first-run visitor path](../../experience/flows/creation-and-first-run.md#visitor-path-prove-the-fantasy-before-demanding-configuration), [portfolio](../../experience/foundations/experience-thesis.md#portfolio-criterion).
> **Known trap:** /demo is already a **browser-only authored script that resets on refresh**. It is not authenticated persistent server play, a proof of model quality, or actual time-work execution. Never imply that it is.
> **Scope:** proposed only. No paid providers, hosted write API, real story persistence or backend scheduling.

## Independent end-state experience

A first-time visitor should experience the product's idea, not read about it. Open on a specific, atmospheric current moment. Make one real *scripted* choice, see what an extended commitment **would** mean in the full game, experience a simulated interruption or return digest, then see an invitation to create a persistent story.

The demo must carry an explicit but understated label: **“Interactive preview. Time is simulated here and this sample resets when refreshed.”** A realistic long wait is not imposed on a recruiter; a fake live persistent story is not advertised either.

Alternative to test: the demo could focus on the **interruption/decision** (more immediately interactive) or on **work-and-return** (more distinctive to the product). A short designed sequence can communicate both, but should not become a ten-minute tutorial.

## One complete code outcome

- A concise, original-licensed scenario script with a readable scene, at least one meaningfully different authored choice, a clear consequence, a simulated longer activity, return state and a source-linked-like digest **without pretending it is real server provenance**.
- One consistent player-facing language shared with Now: a choice is an intention, progress is conditional and outcome is distinct.
- The demo has no auth requirement and no hidden request to paid providers; works even if regular API unavailable.
- A skip/restart path for scripted sections and a clear route toward **Create story** or **Learn more** without blocking demo access.
- Finite narrative text, visually composed for mobile and desktop, keyboard-friendly, accessible and attractive with no illustrations.
- Honest limitations: preview reset-on-refresh; public real-play link can be separate and shown only when actually supported/deployed.

## Authority, baseline and scope

[Game vision: portfolio link](../../vision.md#why-build-it), [player experience prototype](../../player-experience.md#arriving-and-returning), [UX first-run](../../experience/flows/creation-and-first-run.md), [navigation](../../experience/spaces/information-architecture.md).

Existing demo code exists under apps/web/app/demo and is separate from Story mode. Inspected main 8c91618 2026-11-13; no visual/browser playtest was run. Reinspect current script and decide whether to replace it **entirely** to reach target, not preserve it because Codex authored it.

Likely app/demo page, scene-view, story-demo, script content, CSS, tests. No modifications to authenticated Play commands or story DB. Demo content must be original or legally cleared; do not reuse copyrighted game screenshots/lore as a public showcase without review.

## Acceptance and negative proof

**Normal:** no account required, first meaningful choice quickly visible; choices have genuinely different consequence in the **script**; simulated time preview is expressly labelled; an interruption and return show the conceptual distinction between attempt/work/outcome; demo can restart; “Create a story” leads to real creation rather than a dead route.

**Negative:** refreshing demo loses scripted state as declared, not a surprise; “live”/“persistent” labels never attach to preview; no charge or provider request; an offline API does not break the demo; choice spam doesn't produce duplicates; timer animation cannot be confused with actual server-authorized progress; no hidden mandatory fantasy map or inventory for nonhuman sample; screen reader can play.

**Evidence:** Playwright public route with network blocking, screenshot at 375/1440, reduced-motion test, keyboard task observation, content/licensing review. Do not assert a time-to-first-choice pass until humans actually tried it.

## Handoff

Before Ready, critique a written 60–120-second script against the real fantasy and original content ownership. Cursor implements only this public interactive preview, not live production gameplay. Document precisely which behaviors are simulated.