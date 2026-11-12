# Route / Query recovery | source map

**First look:** Typed 401 / 404 / 503 recovery copy and focusable actions. Used by Next `error.tsx` / `not-found.tsx` and Play when the snapshot Query fails with no cached scene.
**Start:** [classifyReadRecovery](read-error.ts) → [RouteRecoveryPanel](route-recovery.tsx).
**Source basis:** W07.

| Module | Role |
| --- | --- |
| `read-error.ts` | Pure status → recovery kind; 503 must not become not_found |
| `route-recovery.tsx` | Accessible panel; focuses primary action; alert copy |

**Maintenance:** update when recovery taxonomy or route boundary owners change.
