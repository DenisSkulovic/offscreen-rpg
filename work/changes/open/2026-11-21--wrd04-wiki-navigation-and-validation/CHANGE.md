# WRD04 | ChatGPT documentation wave 4: wiki routing, editorial reconciliation and verification

**State:** Done on `storyteller-evolution-electric-boogaloo` (documentation routing/verification complete; runtime implementation follows). **Kind:** documentation-only. **Owner:** ChatGPT; not Cursor. **Depends on:** committed WR01, WRD02, WRD03. **Outcome:** the *existing* rich wiki navigates reliably to the rewritten authoritative sections and is internally consistent enough for Cursor to implement without reading 200 KB of unaccepted design drafts.

[Program](../../WRITER-IMPLEMENTATION-2026-11-21.md) · [ChatGPT handoff](../../WRITER-DOCS-CHATGPT-HANDOFF-2026-11-21.md).

## This Change is not “rewrite all 114 pages”

**Navigation first:**
- \`docs/README.md\`, \`docs/product/README.md\`, \`docs/technical/README.md\`, \`docs/architecture/README.md\`: update question-to-owner routes, status language and direct section links to Play, Storyteller writer/skills/subagents, Library source/versioning, scene publication, active fictional state, fork, first arrival/clock.
- \`docs/architecture/01-system-and-ownership.md\`, \`02-one-turn.md\`, \`03-data-and-transactions.md\`, \`05-scenes-and-forks.md\`, \`07-client-and-trust.md\`, \`08-gaps-and-decisions.md\`: re-evaluate diagrams that would teach agents the obsolete wizard or old publication path. **Architecture Atlas is an explanation, not a competing spec.** Retain still-useful platform/DB/K8s architecture and mark aspirational changes as target.
- \`docs/product/experience/living-book-poc.md\`, \`docs/technical/client/living-book-poc.md\`, \`docs/technical/client/architecture.md\`, \`docs/product/experience/presentation.md\`: targeted co-review so direct Play and historical scene/fork controls fit the selected book experience without an unapproved visual redesign. Leave unrelated style decisions alone.
- \`docs/runbooks/content-package-authoring.md\`, \`local-storyteller-rehearsal.md\`, \`local-integration-tests.md\`: update only concrete authoring/test guidance made obsolete by the selected new source/launch model; **do not write commands for code that hasn't landed**. Separate current working runbook from proposed future invocation.
- \`docs/decisions/\`, \`STATUS.md\`, \`work/IMPLEMENTATION-ROADMAP.md\`: **do not silently rewrite or falsify**. A new design decision may need an accepted ADR; current STATUS stays implementation evidence; unrelated schedule unchanged. Record unresolved historical implications for owner review, not wishful “Done”.
- Other admin, platform, observability and runbook pages: use a focused phrase/link/claim scan to identify actual *dependent* sections; record **NO-OP** if unaffected.

**Cross-claim review:** locate surviving normative statements that assert a mandatory four-step wizard, universal 5e character, fixed 3-round writer, manual preview/Start, flat v1 manifest as the target, quiescent-only fork as final promise or “all context fits in a prompt”. Rewrite or explicitly label **current POC** only where the statement is a genuine owner claim. Do not blindly replace substrings or destroy dated evidence in old documents.

## Wiki-quality acceptance

- Run \`pnpm repo:docs-health\`, \`pnpm wiki:health\`, and \`pnpm wiki:find\` if installed/current scripts support these commands. Follow the actual package scripts; record exact outputs/limitations. Check changed Markdown links and **heading anchors**, then regenerate any *generated* wiki index using its official script (never edit \`WIKI-INDEX.json\` by regex).
- Inspect the result as a **cold reader**: open only \`docs/README.md\` + \`docs/product/README.md\` or \`docs/technical/README.md\`. Within two heading-level hops find the new Play contract, Writer tools/skills, rooted Library, exact fork and cost authority; no referral to draft design files to learn accepted law.
- Reconcile claim/authority collisions between product, technical, architecture and Change packets. Keep one owning page per rule; no duplicate 15-page “Storyteller V2” overview. Preserve useful examples, negative constraints, rationale and decision status.
- A moved/renamed heading needs an inbound-reference update; a new page/split/retirement needs the repository's \`shape-ops.v1\` and \`shape-receipt.v1\` record, not an untracked file move. Prefer edits to existing pages, minimal new canonical pages.
- Existing broken archive \`.../other/...\` links are separate known repository debt. **Repair those intersecting changed pages and report other confirmed cases without broad unsafe archive mass surgery** unless user separately selects cleanup.

## Closure and Cursor release gate

Produce one concise **documentation completion receipt** in this Change (or \`RECONCILIATION.md\`) listing pages updated/no-op, governing owner/decision, source baseline, unresolved policy issues, cold-reader routes, crosslink quality and command evidence. **Do not claim 114/114 reviewed unless actually inspected.**

**Done means:** WR01 + WRD02 + WRD03 + WRD04 are finished with real substantive wiki diffs and navigational verification. **Only then is WR02 (Cursor Library implementation) eligible for selection**, after the user approves the final target decisions. Code packets may point to canonical \`docs/\` headings instead of excavating the disposable design dossier.

No application code, package schema, migrations, provider/cluster operations, new game rules, unapproved changes to account policy or unrelated maintenance releases.


## Documentation completion receipt | 2026-11-21

**Cold-reader routes:** `docs/README.md` now routes directly to creation, Storyteller writer behavior/controller, rooted Library/source identity, tools/skills/Workdesk/assistants, scene publication, active-state fork semantics and fictional time. Product and technical README maps provide the same owners without requiring `work/designs/`.

**Architecture atlas reconciliation:** system ownership, one-turn flow, data/transactions, scenes/forks, client trust and gaps/decisions now state the Storyteller-evolution target and defer to permanent product/technical owners. They no longer teach preview/Start, flat-manifest, one-shot writer or quiescent-only fork limitations as desired end state.

**Runbooks:** content authoring names the target Library/source roles while clearly marking currently implemented tooling. Local Storyteller rehearsal and integration-test pages remain honest current-runtime procedures; no commands were invented for code that Cursor has not landed.

**NO-OP / preserved:** Living Book visual geometry, presentation styling, admin, Kubernetes, observability and unrelated platform/security owners were not rewritten because the Storyteller target does not alter their owned claims. Existing rich examples and negative constraints remain in place.

**Verification evidence and limitation:** `python scripts/check_docs.py` is available in the uploaded/current-main snapshot and reports broad pre-existing archive/reference debt (445 problems after the WR01 anchor repair). The execution container has no `pnpm`, and outbound GitHub cloning is unavailable, so `pnpm repo:docs-health`, `pnpm wiki:health` and `pnpm wiki:find` could not be run against the connected branch here. GitHub connector reads were used to verify the changed routing pages and owners directly. No generated wiki index was edited manually.

**Release gate:** permanent product/technical owners are now sufficient for Cursor's WR02–WR08 program. Cursor should branch from `storyteller-evolution-electric-boogaloo`, implement against these docs, and update implementation-evidence/status as code lands rather than rewriting the target back to legacy behavior.
