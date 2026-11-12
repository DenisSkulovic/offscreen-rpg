# Change W02: Authenticated Next route group and typed server-side Nest reader

> **Cursor first look (current source ≠ selected target):** [App Router map](../../../apps/web/app/README.md) → the **one** owning symbol. **Primary contract:** [F1](../../engineering/targets/react-next.md#f1-serverclient-rendering-boundary).  
> **Pre-investigated trap:** `requireViewer` is server-side; current browser rewrite loopback differs from configurable SSR origin.  
> **Context rule:** this packet is the complete implementation authority; read its remaining scope/negative test, **not** the entire audit, target, old minutes or adjacent Change folders.


**State: Specified / Proposed.** Architecture and library choices are **DECIDED by the owner-authorized [React/Next target](../../engineering/targets/react-next.md)**. This packet remains **unselected for code execution** until the owner instructs Cursor to perform it. **Source baseline:** `470a5df069470bf758eb1a560c515846ce781637` (GitHub source inspection only; recheck current branch/worktree at execution).

**Dependencies:** W01 recommended. Must precede W15 and W19.  
**Target:** [F1–F15 selected end state](../../engineering/targets/react-next.md) **F1 F2 F11 F14**. **Audit evidence:** [Nov 12 gap register](../../engineering/audits/react-next-gap-2026-11-12.md) **G14 G16 G25**.

## Code-bearing outcome and ownership

**Outcome:** Authenticated Next route group and typed server-side Nest reader.  
**Source starting points:** `apps/web/src/lib/viewer.ts`; `apps/web/app/{stories,play,chamber}/**/page.tsx`; `apps/web/next.config.ts`; `apps/api/src/modules/auth/identity.ts` and stories/drafts controllers (read).

## Binding implementation design

Use **server-only Nest fetch adapters** with Zod parsing, explicit typed status/error taxonomy and bounded request timeouts. Create the authenticated Next route group `app/(authenticated)/`, preserving public URL paths, but do not count a layout check as endpoint authorization. Per-page Nest reads must be owner-scoped and private/no-store. Preserve notFound/redirect framework exceptions outside generic catches. Configure browser `/api` same-origin rewrite and SSR `API_INTERNAL_ORIGIN` coherently for local/prod-like deployment; do not accidentally expose the internal origin to browser. Make independent stories+drafts SSR reads parallel. Group layout remains a Server Component and provides viewer identity to later W15 provider.

## Bounded implementation sequence

1. Define server request context, endpoint-specific typed `readNest` and status-to-route policy (401 sign-in, 404 hidden resource, 5xx transient).
2. Move private routes into route group, preserve exact URLs and page HTML, change only fetch/validation ownership.
3. Fix configurability of browser proxy vs internal server API origin and prove request-header forwarding/caching policy.
4. Parallelize independent initial reads without leaking viewer info.

## Falsifiable acceptance

- **Normal scenario:** Authenticated owner receives useful server-rendered data; independent list reads happen concurrently; public pages do not require auth provider.
- **Adversarial negative scenario:** Anonymous/other-owner page and browser API cannot obtain another viewer's private data; server 503 not mistaken for 404; non-loopback deployment configuration works; malformed Nest body gives protocol error.
- **Verification/evidence:** Unit test reader/status logic, production build/routing smoke and owner/other-owner HTTP/HTML checks when authorized. W14 provides full proxy/cache evidence.
- **Explicit exclusions:** No new auth provider, game commands in Next, Server Action migration or live-provider interaction.

## Cursor rules and return receipt

Implement exactly this outcome after owner selection, using the [frontend skill](../../../.agents/skills/frontend-engineering/SKILL.md), [Change workflow](../../../.agents/skills/change-workflow/SKILL.md), target criteria and exact source owners. Do not redesign the stack, change gameplay or run paid provider calls; inspect verification scripts before any destructive database/test service. If the current source invalidates an expected contract, return the evidence to the owner rather than invent an alternative library. Report affected paths, actual diff, commands executed/results, at least one discriminating negative test, known limits and next dependency. A successful mock is not proof of Nest authority or production behavior.
