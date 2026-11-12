# Change W12 | Chamber snapshot policy reuse and QA state isolation

**State:** Proposed, not Ready. **Owner:** repository owner for target/scope approval. **Future executor:** Cursor after selection. **Permission now:** Markdown planning only; no app source edits, CLI/DB reset, browser test service, provider spend, deployment or migration authorized by this packet.  
**Audited source baseline:** `470a5df069470bf758eb1a560c515846ce781637`; inspect live branch/worktree first. **Dependencies:** W01 + W03 + W05; inspector access-policy decision is separately owned by backend/product.

## Outcome and authority

**Code-bearing outcome:** Chamber uses the same proven resource-safe snapshot and read-refresh policy as Play where genuinely equivalent, while inspector/QA runs remain separate, viewer-partitioned, authorized presentation state.

**Destination:** [React/Next F1–F15](../../engineering/targets/react-next.md) criteria **F3 F4 F6 F13**; **evidence:** [November 12 source audit](../../engineering/audits/react-next-gap-2026-11-12.md) findings **G18 G23**.

**Relevant source owners:** `apps/web/src/features/developer-tools/chamber/use-chamber-play.ts`, `transport.ts`, `view.tsx`, `qa-workspace.tsx`, `apps/web/app/chamber/page.tsx`, `apps/api/src/modules/stories/chamber-tools-controller.ts` (read).

## Proposed engineering contract

Share the **pure** story version/identity gate and bounded read lifecycle established by W03/W05, not Play's game controls or general interface. Chamber scenario/inspector state remains lab-specific; request identity/abort is explicit on story changes. Scope the local QA-run hint to an authenticated viewer plus run ID, clear/ignore it on logout/account switch, and always reauthorize the run via Nest; browser storage cannot be a permission shortcut. The inspected Nest `ChamberToolsController` owner-checks requests but has no distinct developer-role check. This packet may verify and document that policy but **must not claim frontend navigation hides an endpoint** or silently implement a new API role/restriction. Product owner must separately decide self-service laboratory vs restricted deployment before any public exposure of debug internals.

## Intended bounded code/test delta

1. Replace duplicated Chamber snapshot ordering/polling with identical small W03/W05 pure/refresh primitive where verified; retain chamber-specific start/response endpoint semantics.
2. Guard inspector requests and QA run local storage/read lifetimes by viewer and selected story/run; preserve current QA UI actions and server authorization.
3. Add controlled A→B, inspector-late, Strict Mode, user-switch and no-privileged-data tests; record API access classification separately.

## Acceptance and meaningful rejection

- **Normal:** Authorized developer/self-service owner can launch Chamber, read own inspector, resume own QA run and refresh saved story without stale requests.
- **Adversarial negative:** A prior viewer's stored QA-run ID and old inspector GET cannot display previous data after session change; wrong-story high version is rejected. Hiding Chamber link is not accepted as API access control.
- **Cheapest truthful verification:** Web controlled API/component test; narrow Nest owner/other-owner integration only when existing disposable test setup is authorized. Any separate role-policy change needs owner-approved backend Change.
- **Result evidence:** Document shared vs separate responsibilities, viewer partitioning, API checks and policy decision status.

## Constraints, alternatives and abort gate

- **Explicit exclusions:** No new gameplay, in-game AI dispatch, unapproved RBAC/backend controller change, public debug exposure, universal Play/Chamber component merge or screen redesign.
- **Main risk:** Role/access policy is a real unresolved backend/public deployment decision; if host security requirements demand new authorization, this Change remains a frontend-only slice and reports blocker explicitly.
- **Option zero:** retain the working boundary and add one targeted check if source/test evidence proves the presumed implementation gap does not exist. A library or abstraction is not an outcome.
- **Stop condition:** any new backend/public policy, payment, data schema or UI/UX redesign decision is referred to the owner and permanent spec; do not improvise one inside Cursor. Permission remains Proposed until revalidated, reviewed and owner-selected.

## Cursor handoff (after approval only)

Use the [frontend skill](../../../.agents/skills/frontend-engineering/SKILL.md), the named F criteria and G findings, and the 2–5 owning paths above. Implement only the specified delta, preserve behavior, verify a normal **and** discriminating negative case, and return: diff/paths, commands actually run, pass/fail, limits and next recommended packet. Do not automatically execute or expand into unrelated cleanups.
