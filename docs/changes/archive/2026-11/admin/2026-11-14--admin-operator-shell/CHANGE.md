# AD04 | Protected Next Admin shell, SSR privacy and isolated Query ownership

**State: Done (2026-11-14).** Code-bearing UI/security. **Depends on:** AD01–AD03 Done. **Parent:** [Admin program](../../../../../programs/admin/implementation-program.md). Evidence: [ad04-operator-shell](../../../../../programs/admin/evidence/ad04-operator-shell-2026-11-14.md).

## Cursor first-screen

> **Outcome:** an authorized staff user can open `/control`, view the permitted Player 360 summary, and navigate without losing source truth or exposing Admin data to nonstaff, revoked actors or a different browser identity.
>
> **Authority:** [Admin frontend target](../../../../../programs/admin/technical/frontend-and-operator-experience.md), [V1 contracts](../../../../../programs/admin/technical/core-v1-contracts.md), [selected React/Next standard](../../../../../engineering/targets/react-next.md).
>
> **Start/revalidate:** `apps/web/app/README.md`, `app/(authenticated)/layout.tsx`, `src/server/{viewer,nest-reader}.ts`, `src/features/session/authenticated-query-provider.tsx`, `src/shared/api/{README.md,query-keys.ts}`, [browser integration owner](../../../../../../tools/api-integration/README.md).
>
> **Do not:** place Admin in player navigation, reuse `requireViewer` as staff authorization, duplicate server-state store, store token in localStorage, build all ten empty sections, introduce new state libraries, create protected-data persistence in service worker.

## Landed code delta

1. `app/(control)/control/enter` + `(staff)` shell with `requireAdminActor` (`/api/admin/me`), isolated `AdminQueryProvider` keyed by staff+epoch.
2. Separate `safe-control-destination` allowlist (player safe-entry unchanged); sign-in accepts `/control*` next without merging lists.
3. Player lookup via AD03 DTOs + SSR hydrate when `?ref=` authorized; empty/unauthorized copy without existence leak.
4. Vitest for control destinations + lookup UI. Production `next start` + Playwright SSR privacy proved via `pnpm test:focus admin-control-ssr` (2026-11-14 residual).

## Normal and discriminating negative

**Normal:** staff enter → `/control` → players lookup shows authorized summary / unsupported commercial.

**Negative:** open redirects rejected; forbidden ref → “no authorized match”; player safe-entry still rejects `/control` via its own allowlist.

## Excluded / next

No AD05 campaign drilldown. Provider spend: none. Playwright SSR residual cleared 2026-11-14.
