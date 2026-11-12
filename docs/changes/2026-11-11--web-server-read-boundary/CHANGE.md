# Change W02 | Private authenticated Next server reader and same-origin routing contract

**State:** Proposed, not Ready. **Owner:** repository owner for target/scope approval. **Future executor:** Cursor after selection. **Permission now:** Markdown planning only; no source edits, CLI/DB reset, browser service run, provider call, deploy or migration authorized by this packet.  
**Code baseline:** `470a5df069470bf758eb1a560c515846ce781637` (GitHub source-inspected, no runtime tests). Executor must revalidate the current branch and preserve unrelated work.  
**Dependency:** W01 recommended, but does not depend on new Play controller.

## Why this is a Change

**Target:** [React/Next end-state](../../engineering/targets/react-next.md), criteria **F1 F2 F11**. **Gap:** [2026-11-12 source audit](../../engineering/audits/react-next-gap-2026-11-12.md), **G14 G16; existing sequential server reads**.  
**Desired single code/test/config outcome:** One small *server-only* Nest reader handles request-bound cookie forwarding, consistent typed response parsing, safe status/error mapping and private cache/timeout policy. Browser `/api` and SSR internal origin have a documented, testable same-origin deployment arrangement.

**Observed source owners:** `apps/web/src/lib/viewer.ts`, `apps/web/app/{stories,play,chamber}/**/page.tsx`, `apps/web/next.config.ts`, `apps/api/src/modules/stories/controller.ts` (read), `apps/api/src/modules/drafts/controller.ts` (read).

## Proposed design contract (not an invitation to redesign)

Use a server-only module with explicit `requireViewer`/session-bound read calls and endpoint-specific Zod schemas; **never** import it in Client code. Only the inbound session cookie (and other explicitly required headers) crosses to Nest. Use `cache: 'no-store'` for private reads and explicit bounded timeouts. Model 401 as reauthentication, scoped 404 as not-found, 5xx/timeout as recoverable failure, invalid schema as protocol failure; keep Next `redirect`/`notFound` decisions at route boundary, outside catches that could swallow special exceptions. Keep the public-facing Nest API unchanged and never install Server Actions for existing commands. Make rewrite destination configurable consistently with deployment configuration; validate whether Next rewrites resolve at build or runtime **before** choosing the env wiring.

## Expected bounded implementation

1. Extract pure status/typed parsing and server-only request reader without changing observable page content.
2. Convert Play, stories, draft/preview and Chamber route reads incrementally, preserving their schema and authorized error semantics.
3. Remove the verified drafts→stories sequential waterfall with safe parallel independent reads, if no session/dependency assumption requires serialization.
4. Align or document server origin and browser rewrite and add a non-loopback configuration/contract test.

## Falsifiable acceptance and proof

- **Normal case:** Permitted viewer obtains server-rendered typed story and list; both independent reads begin without an avoidable serial wait; auth/session paths remain correct.
- **Discriminating negative case:** Anonymous and other-owner HTML/route/API data do not expose private story; malformed Nest body and upstream 503 show safe protocol/retry outcomes rather than fabricated 404. A non-loopback API origin must not silently send browser calls to 127.0.0.1.
- **Check and evidence:** Web local adapter tests plus selected provider-free authenticated Next+Nest/browser trace when authorized. Examine response headers/Router Cache separately; this single Change cannot certify a whole production proxy.
- **Completion receipt:** List every converted private route, mapped statuses and verified staging-like host configuration; W14 owns broader browser/cache proof.

## Boundaries, alternatives and stop conditions

- **Keep / do not touch:** No new auth provider, Nest authorization changes, public cache, API controller rewrite, global BFF framework, generalized HTTP SDK or gameplay behavior.
- **Principal risk:** Next 16 request caching/Router Cache and rewrite build-time behavior are distinct. Source `no-store` is useful but insufficient as an end-to-end privacy proof. Keep forwarding narrow and never log cookies.
- **Alternative tested conceptually:** keep the existing owner with focused tests/repair instead of extracting modules; any larger framework/library must show that it meets these exact invariants with lower total maintenance and session complexity.
- **Stop/refer back:** if actual API semantics, resource lifetime, policy or source changed so this contract no longer holds, report the contradiction and revise the owning target/packet with the human. Cursor may choose local code techniques, **not** change product policy, authorization or paid-call behavior on its own.

## Executor handoff once approved

Read the [target](../../engineering/targets/react-next.md) criteria **F1 F2 F11**, audit **G14 G16; existing sequential server reads**, [frontend skill](../../../.agents/skills/frontend-engineering/SKILL.md) and the source owners above. Implement **only this outcome** in reviewable diff(s); preserve existing behavior. Run the cheapest truthful check including the negative case; return changed paths, exact commands/results, unknowns and next proposed Change. Do not infer implementation authority from this packet's presence.
