# PF03 | Preserve a safe entry purpose across authentication

**State: Done (2026-11-13).** Safe allowlisted `next` through `/sign-in` and Better Auth `callbackURL`; `requireViewer` + middleware preserve path. No Nest identity change. Parent: [entry program](../../experience/platform-entry-implementation-program.md).

## Cursor first-screen brief

> **Goal:** anonymous “Create a real story” and authorized story/deep-link navigation survive sign-in and return the user to their *intended safe destination*, not unconditionally to /stories, without open redirects or replaying charged actions.
>
> **Authority:** [preview-to-play handoff](../../experience/flows/preview-to-play.md#the-auth-handoff-keep-the-users-original-purpose), [platform journey J-P02](../../experience/platform-journeys-and-states.md#journey-j-p02-curious-visitor-wants-real-play), [client identity](../../technical/client-and-identity.md#authentication-and-sessions), [React/Next auth boundary](../../engineering/targets/react-next.md).
>
> **Sources:** `apps/web/src/features/session/sign-in-button.tsx`, `apps/web/app/sign-in/page.tsx`, `apps/web/src/server/viewer.ts`, `apps/web/app/(authenticated)/layout.tsx`, existing Better Auth client config and route tests; inspect only closest callers.
>
> **Do not:** change identity provider, OAuth token exchange, Nest auth/permissions or billing; never allow arbitrary external redirects.

## Current observed gap

The existing sign-in button hardcodes GitHub provider and `callbackURL:'/stories'`; private `requireViewer` redirects missing sessions to /sign-in without preserving the target. As a result, a visitor clicking /demo → Create story is not guaranteed to resume creation after authentication. This is a browser journey defect but touches a sensitive **security seam**.

## Target implementation boundary

- Capture only a **bounded local navigation purpose** (known internal route/path and safe optional resource ID), not the submitted command, any paid intent body, password/token or arbitrary URL.
- Restore intent after successful OAuth and revalidation. Default to /stories if absent/malformed/expired/unsupported.
- Validate same-origin/local target and allowed route families: Stories, Create, an authorized draft/opening or Play resource, and future special flows only after separate contract. Explicitly reject javascript:, protocol-relative URLs, encoded/recursive external URLs and unknown arbitrary paths. Ensure no redirect loops and avoid leaking invitation secrets in callback parameters.
- Existing session holder and Next server remain authoritative; if implementing redirect persistence requires new backend/session behavior, **stop and return a contract request** rather than improvising in React.
- After sign-in, a GET/read may load the current target; **never replay** the original accepted action or auto-call Generate/Start. Current viewer/story authorization is rechecked as usual.
- Cancelled/failed OAuth preserves a safe retry/back-to-preview route; authenticated visitor bypasses redundant sign-in. Normal session expiry while in Play returns safely, with current offer/operation revalidated.

## Normal and negative acceptance

**Normal:** /demo → Create story → GitHub sign-in → /stories/new (or safe actual next step). An already-authenticated user enters creation directly. A signed-out user opening an authorized /play/:id bookmark returns to that resource after login *when still permitted*.

**Negative:** crafted external returnTo, encoded double redirect, javascript: URL, wrong-user story, removed draft, expired/revoked membership, cancelled OAuth, callback failure, stale pending choice or lost paid ACK: no open redirect, private data leak, silent command resubmit, new provider charge or infinite loop. If target no longer exists/authorized, show genuine owner-safe unavailable or /stories fallback, not stale content.

**Proof:** targeted pure validation tests, Next route/auth callback tests with stubbed Better Auth, browser navigation with existing safe test identity and explicit negative URLs. Use existing auth testing conventions. No live OAuth browser test claim unless one actually runs. Protect request-scoped Query privacy and sign-out cleanup.

## Permissions and handoff

**Security-sensitive.** Owner must explicitly authorize PF03 with auth/Next read of current HEAD, and the parallel backend auth owner must agree on boundary if callback behavior crosses services. A design page alone is not a permit to edit Nest or identity contracts. Return sources changed, threat cases tested, exact redirects, and any unsupported sign-in return path. No Google OAuth migration as part of PF03.

## Landed (2026-11-13)

- `safe-entry-destination.ts`: allowlist `/stories`, `/stories/new(?id=UUID)`, `/stories/:id`, `/stories/:id/preview`, `/play/:id`; reject external/hostile/unknown.
- Middleware sets `x-offscreen-pathname`; `requireViewer` → `/sign-in?next=…`; SignInButton uses validated Better Auth `callbackURL`; signed-in visitors skip form; SessionRefresh preserves path; error path keeps safe next + Back to preview.
- Proof: `test:fast` 153 passed (safe-entry + SignInButton hostile next). No Nest identity change; no live OAuth claim; no provider spend.
