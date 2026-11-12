# Change W08 | Versioned draft editing and unsaved-state lifecycle

**State:** Proposed, not Ready. **Owner:** repository owner for target/scope approval. **Future executor:** Cursor after selection. **Permission now:** Markdown planning only; no app source edits, CLI/DB reset, browser test service, provider spend, deployment or migration authorized by this packet.  
**Audited source baseline:** `470a5df069470bf758eb1a560c515846ce781637`; inspect live branch/worktree first. **Dependencies:** W01 + W02. Independent of Play command migration after server reader semantics are stable.

## Outcome and authority

**Code-bearing outcome:** Draft editing has explicit entity identity, local dirty values, saved revision and immutable attempted-save snapshot; stale/conflicting/unknown outcomes cannot silently overwrite user work.

**Destination:** [React/Next F1–F15](../../engineering/targets/react-next.md) criteria **F3 F8 F11 F12**; **evidence:** [November 12 source audit](../../engineering/audits/react-next-gap-2026-11-12.md) findings **G19 G17**.

**Relevant source owners:** `apps/web/src/features/stories/draft-editor.tsx`, `apps/web/app/stories/new/page.tsx`, `apps/web/app/stories/[id]/page.tsx`, `packages/contracts/src/drafts.ts`, `apps/api/src/modules/drafts/controller.ts` (read).

## Proposed engineering contract

Keep local controlled form state; no React Hook Form adoption by default. Model `savedRevision`, `editableContent`, `inFlightSave={draftId,expectedRevision,content}` and `conflict/latestServer` independently. Freeze the PUT payload when Save begins and disable that submitting form; 200 parses server-confirmed revision and should apply only if the current edit session is still the same and no newer edits occurred; 409 preserves user content and offers explicit discard/reload. With a lost acknowledgement, GET latest authorized draft to reconcile before any reissue; a revision-fenced PUT is not a paid game operation. Deliberately reset or preserve state on actual draft identity navigation. Keep the existing before-unload and visible in-app leave confirmation; do not monkey-patch unsupported Next router internals to simulate universal back-navigation blocking. If browser back cannot be safely intercepted, record an explicit limitation and owner policy request, not a stealth navigation hack.

## Intended bounded code/test delta

1. Introduce a small feature-local edit-session model, ideally a reducer only if transitions genuinely benefit, and label the resource by draft ID.
2. Refactor Save/load-confirmed/conflict/unknown-read handling using typed W02 response rules, preserving current field defaults/validation and page appearance.
3. Verify route id switch, session expiry, two-tab 409, user edits versus delayed response and actual link/back transitions. Keep optional storage out unless owner selects a private-draft persistence policy.

## Acceptance and meaningful rejection

- **Normal:** Save a valid existing/new draft, parse new saved revision, return to creation flow with unchanged current fields; intentional reload of saved state works.
- **Adversarial negative:** A stale 409, delayed save after draft A→B or an uncertain response cannot replace B/unsaved current editing; two tabs cannot silently overwrite each other's revision.
- **Cheapest truthful verification:** Provider-free controlled HTTP/unit/component tests, targeted existing draft-browser flow if separately authorized. A test mock does not claim server concurrency proof.
- **Result evidence:** State/lifetime diagram plus actual interrupted-save, 409, entity-switch and navigation test outcomes.

## Constraints, alternatives and abort gate

- **Explicit exclusions:** No creation UX redesign, new gameplay, autosave/background model generation, browser localStorage of private prose, new form library or backend revision redesign.
- **Main risk:** Full navigation and App Router soft navigation are different. Avoid resetting dirty state merely because initial SSR props changed for same draft.
- **Option zero:** retain the working boundary and add one targeted check if source/test evidence proves the presumed implementation gap does not exist. A library or abstraction is not an outcome.
- **Stop condition:** any new backend/public policy, payment, data schema or UI/UX redesign decision is referred to the owner and permanent spec; do not improvise one inside Cursor. Permission remains Proposed until revalidated, reviewed and owner-selected.

## Cursor handoff (after approval only)

Use the [frontend skill](../../../.agents/skills/frontend-engineering/SKILL.md), the named F criteria and G findings, and the 2–5 owning paths above. Implement only the specified delta, preserve behavior, verify a normal **and** discriminating negative case, and return: diff/paths, commands actually run, pass/fail, limits and next recommended packet. Do not automatically execute or expand into unrelated cleanups.
