# AD04 | Protected Next Admin shell, SSR privacy and isolated Query ownership

**State: Proposed, NOT Ready.** Code-bearing UI/security. **Depends on:** AD01–AD03. **Parent:** [Admin program](../../admin/implementation-program.md).

## Cursor first-screen

> **Outcome:** an authorized staff user can open `/control`, view the permitted Player 360 summary, and navigate without losing source truth or exposing Admin data to nonstaff, revoked actors or a different browser identity.
>
> **Authority:** [Admin frontend target](../../admin/technical/frontend-and-operator-experience.md), [V1 contracts](../../admin/technical/core-v1-contracts.md), [selected React/Next standard](../../engineering/targets/react-next.md).
>
> **Start/revalidate:** `apps/web/app/README.md`, `app/(authenticated)/layout.tsx`, `src/server/{viewer,nest-reader}.ts`, `src/features/session/authenticated-query-provider.tsx`, `src/shared/api/{README.md,query-keys.ts}`, [browser integration owner](../../../tools/api-integration/README.md).
>
> **Do not:** place Admin in player navigation, reuse `requireViewer` as staff authorization, duplicate server-state store, store token in localStorage, build all ten empty sections, introduce new state libraries, create protected-data persistence in service worker.

## Intended code delta

1. Create `app/(control)/control` layout/page with independent **server-only** staff resolver using `/api/admin/me`, no-store. Render a compact staff identity and valid routes only after server verification.
2. Add minimal Player 360 reference lookup/detail using AD03 strict DTOs. Distinguish known/unknown/unsupported/forbidden/unavailable.
3. Use isolated Admin TanStack Query namespace keyed by staff principal and access epoch; validate SSR hydration/recovery and logout/revocation cache purge across tabs.
4. Keep critical initial authorized summary in SSR HTML. Use safe access errors, keyboard/search accessibility and responsive narrow-screen behavior.
5. Provide deterministic Storybook/MSW and Vitest UI states, then full Next+Nest+browser route proof.

## Normal and discriminating negative

**Normal:** active staff with allowed scope opens `/control` and searches a permitted exact ID; SSR renders safe summary; client navigation preserves current authorized data and source status.

**Negative:** a player-only actor, anonymous visitor, unauthorized staff, other staff tenant or revoked session never sees privileged HTML, cached Query data, preview title or API result. Back/forward and soft navigation cannot flash previous staff's data; a 503 is not shown as "no players."

**Proof:** Vitest/RTL/MSW for error/revocation UI plus disposable Next start/Nest/DB Playwright SSR HTML, logout+history, different actor and permission revocation. A mocked layout gate is **not** enough.

## Excluded / risk

No live preview impersonation, sensitive narrative, financial controls, global ad hoc search, new marketing shell or real hosted deployment. The Admin cookie must be present at `/control` SSR as specified in first-wave auth design.

**Ready gate:** AD01–AD03 verified and actual web sources rechecked; owner selects AD04. **Return:** routes, controls, actual SSR/browser security evidence, no provider spend, next AD05.
