# Admin technical architecture review | scoped core decision

**Status:** Architect desk review, 2026-11-14. Product target [accepted](../product-acceptance-and-scope.md). **Review outcome: technically coherent for a proposed read-only foundation implementation program.** This is **not** source implementation evidence, operational certification or an authorization to code. Advanced commercial, shared-campaign, raw narrative, repair and LiveOps designs remain gated by product policy.

## Review questions and dispositions

| Review question | Outcome | Evidence / limitation |
| --- | --- | --- |
| Does staff identity remain distinct from player authorization? | **Pass as design** | [Staff policy](staff-identity-and-policy.md) + [first-wave adapter](first-wave-design-decisions.md); actual Better Auth hooks unproved |
| Do overlapping permissions avoid cross-product escalation? | **Pass as design** | Bounded complete grants; case assignment recognized as separate governed precondition |
| Can a reader see account/operation truth without private raw JSON? | **Pass as design** | [Sanitized projection](read-models-and-privacy.md) and [core DTO](core-v1-contracts.md); enforcement not implemented |
| Does the Admin avoid spoofing `ownerId` and breaking player APIs? | **Pass as design** | Dedicated Nest/Admin application and explicit player-controller separation |
| Are financial and game outcomes correctly separate? | **Pass as design** | [Operations/funding](operations-economics-and-releases.md); no actual customer billing source audited |
| Are administrative writes safely attributable and reconciled? | **Pass as long-term contract; not in first wave** | [Action/audit](action-approval-and-audit.md); paid writes deferred |
| Can the first version be tested without external model costs? | **Pass as design** | [Verification matrix](security-and-verification.md); tests still must execute |
| Can current `main` be implemented without revalidation? | **No** | Cursor may have uncommitted/more recent changes; source audit pinned to initial baseline |
| Are all ten workspaces fully executable now? | **No, intentionally** | Only safe source-backed early views selected; no fake commercial/Trust/LiveOps pages |
| Is broad hosted commercial security approval established? | **No** | Strong staff MFA, legal/commercial, provider and operational acceptance still needed |

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

**Gate:** prepare **Proposed**, code-bearing `docs/changes` packets with exact source-owner paths, dependency and negative proof. The owner may later select dependency-ready packets and instruct Cursor to implement. No packet should be labeled Ready solely because this desk review says the architecture is coherent.
