# Source-to-leaf composition lab

**Status:** OPEN DESIGN research. **Not** a production React implementation, public API, design system or selected paginator. Open [index.html](index.html) in a local browser; no packages or network services required.

This intentionally plain **developer-facing experiment** measures and fragments exact V1-style prose into temporary leaves, with a continuous reader alternative. It is not another proposed player-facing UI. The reader's real book material, surrounding Storyteller atmosphere, and motion still need product design.

The controls explore: measured leaves vs continuous reading; long ten-paragraph text, Unicode/markup-looking text, or one 6,000-character paragraph; 100/150/200% selected type size; and an optional fixture illustration. The publication and offer buttons simulate **separate** authoritative Now and pinned reader state; they never call a real backend or accept a game command.

**Docs:** [source model and pagination rules](../13-NARRATIVE-DOCUMENT-COMPOSITOR.md) · [continuity/update policy](../14-READER-CONTINUITY-AND-UPDATE-POLICY.md) · [decisions/readiness](../15-DECISION-REGISTER-AND-IMPLEMENTATION-READINESS.md) · [browser evidence](RENDER-EVIDENCE.md).

The full test script and captures are also available in the conversation's standalone design-study ZIP. This repo embeds the inspectable HTML, not a new application dependency. No `work/changes/` packet or production code modification is authorized.