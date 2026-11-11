# Engineering gap audits

This folder records source-grounded **comparisons against preselected targets**, not arbitrary lists of code smells. Follow [target-driven renewal](../../../.agents/rules/target-driven-renewal.md): define the destination → inspect the code → cut justified bounded Changes.

| Area | Target first | Audit | Verification level |
| --- | --- | --- | --- |
| React / Next.js | [F1–F10 end-state design](../targets/react-next.md) | [November 11 source audit](react-next-gap-2026-11-11.md) | GitHub source/manifests/tests **inspected only**; no browser/test run |

Audit conclusions are dated and revision-specific. An auditor may find the target already satisfied, in which case **no Change is required**. A proposed target is not an execution permission. Only the owner-selected [Change queue](../../changes/README.md) governs implementation.
