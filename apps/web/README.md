# Web: Next.js player interface

`@offscreen/web` owns presentation, forms and interaction with **published server projections**. It is not a second gameplay engine, clock, dice roller or provider-billing authority. Before changing the player experience, read [product UI intent](../../docs/player-experience.md); [client and identity](../../docs/technical/client-and-identity.md) owns intended browser/session boundaries.

## Find the owning surface in one hop

**For a selected Cursor Change:** open its own `CHANGE.md`, **one** matching map below, then 2–5 named source symbols. These describe the **current code**, not TanStack/RHF/SSE as already implemented. The [selected architecture](../../docs/engineering/targets/react-next.md) is a different, future-state owner.

| Question / Change family | One first-read map | Only then inspect |
| --- | --- | --- |
| Next page, authenticated initial data, 401/404 | [App Router map](app/README.md) (W02/W07/W15) | One `app/(authenticated)/**/page.tsx` and [`src/server`](src/server/README.md) |
| Query keys, provider, SSR hydration | [Shared Query API](src/shared/api/README.md) (W15/W03) | `query-keys.ts` / Play `HydrationBoundary` |
| Server vs browser transport, version merge | [Server reader map](src/server/README.md) / [browser transport](src/lib/README.md) (W02/W03/W15) | `src/server/*` or `story-transport.ts`, not both by habit |
| Play command, polling, campaign, history/settings | [Play owner map](src/features/play/README.md) (W03/W04/W05/W06/W07/W11/W17) | `view.tsx`/target symbol, then Nest route if needed |
| Draft creation, opening, Start, list pagination | [Stories owner map](src/features/stories/README.md) (W08/W09/W10) | `draft-editor.tsx` / `opening-preview.tsx` |
| Chamber inspector and QA | [Chamber owner map](src/features/developer-tools/chamber/README.md) (CH01–CH16; CH11 UI after W15; W12 superseded) | `use-chamber-play.ts` and conditional Nest bootstrap |
| Connected real browser/DB evidence | [Test source map](../../tools/api-integration/test/README.md) (W14/W19) | One test file; integration runner **resets** disposable test DB |
| Local scripts, Turbo, CI, Storybook | [Execution playbook](../../docs/engineering/frontend-execution-playbook.md) (W01/W18/W20/W21) | Exact script/manifest; no full app start for pure React tests |

**Fast context test:** If the chosen map plus Change cannot name the input, state owner, output and relevant failure path, **report the missing fact to ChatGPT** rather than starting an unbounded Cursor search.

## Authority and design traps

The server Play route validates `storySnapshotSchema` before rendering `PlayScene`; client commands request server-owned state transitions. Do not show a prepared action as a settled reward, treat an uncertain provider response as permission for another model call, or infer private mechanics from UI text. New interactive states must handle late/stale replies, loading, blocked, failed and uncertain separately.

For development-agent expertise, load [frontend-engineering](../../.agents/skills/frontend-engineering/SKILL.md) or [player-experience-design](../../.agents/skills/player-experience-design/SKILL.md) when the task warrants it; do not preload both for every CSS change.

The package manifest has `dev`, `build`, `start`, `typecheck`, plus Vitest `test` / `test:watch` / `test:fast` (happy-dom + MSW). **Fast local path:** `pnpm test:fast` or `pnpm --filter @offscreen/web test:fast` (Turbo `test:fast` depends on `^build` only — not `@offscreen/web#build`). Avoid `turbo run test --filter=@offscreen/web` for iteration; legacy `test` still depends on same-package production `build`. Provider-free Vitest/RTL/MSW tests prove UI/state races only; they do **not** certify Nest ownership, SSR privacy or exactly-once. Browser/integration evidence remains under [tools/api-integration](../../tools/api-integration/).
