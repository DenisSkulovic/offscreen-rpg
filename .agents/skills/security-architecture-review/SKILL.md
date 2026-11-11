---
name: security-architecture-review
description: Evaluate a consequential software security or privacy boundary in Offscreen RPG using threat modeling, identity/authorization, tenant isolation, browser security and resource governance. Read-only design/review by default.
---

# Security architecture and trust review

**Trigger:** introducing/exposing an API, authentication/session change, new shared data/cache/index, tenant or user ownership, external URL/file/webhook, developer tool surface, privileged workflow or expensive resource. Not a universal checklist to read for every trivial edit.

1. Locate affected **product behavior** and technical authorization/storage owner. State asset, principals, data visibility, operation identity, enforcement boundary and who may revoke access.
2. Read the relevant section of [Security and trust boundaries](../../knowledge/security-and-trust.md). The manual contains viable approaches (sessions/JWT, RBAC/ABAC/RLS, browser protections, tenant isolation, credentials, quota limits) with their selection conditions. **Compare options and trust-boundary consequences before naming a favorite library.**
3. Trace one real input through browser/API/application/DB or provider. Separate transport authentication, object authorization, property projection and business-state permission. Include worker/cache/search/log exposure where it affects the result.
4. Challenge the design against one realistic attacker/abuse case. Prefer a counterexample at the **actual authoritative boundary**, not “validate input” slogans. The test should demonstrate prevention of cross-owner access or unintended effects.
5. Deliver a narrow security contract/review: `asset and actor | plausible designs and criteria | chosen enforcement owner | trust crossings | permission/revocation | negative proof | remaining uncertainty`. A reviewer may block with evidence but cannot silently alter product behavior.
6. For execution, send a separate bounded Cursor packet with precise spec anchors; avoid external scans, new dependencies, rotations or deployments without explicit authorization.

This is coding-agent engineering expertise, not in-game Storyteller prompt security. A skill invocation does **not** authorize access to secrets, production systems or personal data.
