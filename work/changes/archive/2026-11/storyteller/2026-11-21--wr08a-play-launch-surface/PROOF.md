# WR08A | readiness and acceptance

**Baseline:** verified current `apps/web/app/(authenticated)/stories/page.tsx` (85 lines), `stories/new/page.tsx` (51 lines), `src/features/stories/draft-editor.tsx` (516 lines), `shared/api/start-intent-store.ts` (89 lines), `shared/ui/action.tsx` (89 lines) on undertaking post-MA06A, 2026-11-21. Source inspection only, no tests executed in ChatGPT.

**Dependency G0 PASS:** WR07C landed and archived; verified current public request/status Zod exports in `packages/contracts/src/story-launch.ts` and manifest `./story-launch` subpath. No WRA or MA06 dependency.
**Ownership G1:** only Web routes/features/local client adapter/test; no Writes to Contracts, DB, Story Engine, API or existing wizard beyond a capability-gated entry. Fully parallel with WR05P.
**Decision G2:** PUT/GET URLs selected in planning dossier; backend later implements exactly those routes. No second wire shape.
**Risks G3:** no persisted prompt, no second operation on ambiguous network, owner-scoped pointer, flag disabled by default, no lying `ready`.
**Tests G4:** MSW one-submission, reload GET status, 404, unauthorized/invalid status, held, uncertain, ready verified ID; accessibility and production gate.
**Cost G5:** no provider/DB calls beyond mocked fetch; no negative financial budget tests claimed.
**Integration G6:** each chat owns its worktree and only one joins undertaking at a time; never main.
**Verdict:** Done (2026-11-21) on `change/wr08a-play-surface`, integrated only to `undertaking/storyteller-workshop`. Focused Vitest 5 files, 21/21: capability, pointer store, hook, home actions, form. `pnpm --filter @offscreen/web typecheck` PASS after workspace package builds. `next build` compiled `/stories/launch` as a dynamic route. Quality lint on the changed web files PASS. Negatives observed: exact `true` flag only; home omits `/stories/launch` when disabled; lost PUT is one PUT plus GET; 404 does not PUT; failed/held/uncertain do not navigate; malformed status rejected; empty and 24001-character prompts do not fetch; prompt text is absent from sessionStorage; uncertain Check status does not PUT. No model call. No Launch backend. Browser click-through NOT RUN.
