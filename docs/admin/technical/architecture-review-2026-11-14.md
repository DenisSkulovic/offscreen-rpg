# Admin technical architecture review | scoped core decision

**Status:** Architect desk review, 2026-11-14; **disposition updated 2026-11-15** after AD01–AD08 + OBS06/07 synthetic landing. Original review outcome (coherent read-only foundation) stands. This file is **not** production certification. Advanced commercial, shared-campaign, raw narrative, repair and LiveOps designs remain gated. **No production Support grant issuer.**

## Review questions and dispositions

| Review question | Outcome | Evidence / limitation |
| --- | --- | --- |
| Does staff identity remain distinct from player authorization? | **Pass — implemented (AD01)** | [AD01 evidence](../evidence/ad01-staff-session-2026-11-14.md); staff session ≠ player cookie |
| Do overlapping permissions avoid cross-product escalation? | **Pass — implemented (AD02)** | [AD02 evidence](../evidence/ad02-grant-policy-2026-11-14.md); complete grants, deny-by-default |
| Can a reader see account/operation truth without private raw JSON? | **Pass — implemented (AD03/05/OBS01)** | Redacted Player 360 + diagnostics; raw JSON still excluded by default |
| Does the Admin avoid spoofing `ownerId` and breaking player APIs? | **Pass — implemented** | Nest `/api/admin/*` + `createAdmin*` application boundary |
| Are financial and game outcomes correctly separate? | **Pass — implemented for technical usage only (AD06)** | Not customer billing; no paid subscription ledger |
| Are administrative writes safely attributable and reconciled? | **Pass as long-term contract; first wave read-heavy** | Case assignment (AD08) audited; paid writes deferred |
| Can the first version be tested without external model costs? | **Pass — proved** | Disposable DB + Playwright `/control`; 0 provider spend for AD/OBS06–07 |
| Support Situation without production grant issuer? | **Pass synthetic only (OBS06/07)** | [OBS06/07 evidence](../../observability/evidence/obs06-case-scoped-situation-read-2026-11-15.md); production issuer **absent** |
| Are all ten workspaces fully executable now? | **No, intentionally** | First-wave shell + diagnostics; no fake commercial/Trust/LiveOps |
| Is broad hosted commercial security approval established? | **No** | MFA/legal/commercial/ops acceptance still needed |

## Important disagreements / anti-patterns rejected

1. **Single `isAdmin` flag** is insufficient for overlapping, sensitive, scoped responsibilities.
2. **Same player session alone** should not authorize control plane; require explicit staff-purpose session and current staff principal.
3. **Second microservice** is not justified simply to make Admin feel enterprise-grade.
4. **One global raw query endpoint** would make authorizing Player 360 nearly impossible.
5. **Immediate impersonation/repairs/refunds** would force unsafe guesses about consent, funding, concurrency and world truth.
6. **A simulator that writes player state** is not "read-only view as Player."
7. **An audit appended after a privileged effect** without reliable causal recording does not satisfy an accountable action contract.
8. **A stop button disconnected from worker dispatch** does not provide cost safety.

## Residual implementation risks

- Better Auth session-cookie, freshness, and session linking APIs must be confirmed against pinned version before AD01 becomes Ready.
- Drizzle migrations and DB schema module exports must be inspected at the current head; existing migration sequence may change.
- The current account state lacks verified status/restriction rules. V1 response must say unknown, not pretend active.
- Authorizing broad player search is dangerous; first-scope exact-ID lookup needs strong resource scoping and test fixtures with hidden accounts.
- Raw `story_public_event` titles and `generation.input/output` are **not** safe summaries simply because they are accessible via SQL.
- Real public/hosted Admin rollout requires staff assurance beyond a seven-day OAuth player cookie.
- The active Cursor branch and docs branch must be reconciled without overwrite before implementation.

## Decision

**Selected for implementation planning:** a tightly bounded foundational Admin program with separate staff session, typed access evaluator, redacted account/game/operation projections, a separate Next staff shell, staff governance/audit and only verifiable technical usage/status.

**Not selected for implementation yet:** customer refunds/credits, arbitrary story repair, full impersonation/assisted live gameplay, raw narrative export, commercial plans and paid subscriptions, global production changes, automated AI investigator, broad community moderation or real customer privacy-rights execution.

**Post-implementation note (2026-11-15):** AD01–AD08 packets are **Done**. Further Admin/forensic work requires a new selected Change. This desk review does **not** authorize production Support grants, OBS00-B, or paid spend.
