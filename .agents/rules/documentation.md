# Documentation and discovery maintenance

Read when changing documentation, navigation, rules or a cross-file responsibility. The [independent documentation-navigation standard](../references/documentation-navigation-standard.md) defines the ideal information architecture before auditing existing files. The [documentation map](../../docs/README.md) routes readers; this rule defines maintenance. Existing product, spending and verification authority is unchanged.

## Source-adjacent retrieval maps: required when ownership is complex

A cheap implementation agent should not have to read a 30-KB target, a 28-KB audit and half the source tree just to discover a known entrypoint. The [layered retrieval contract](../references/documentation-navigation-standard.md#2026-11-12-explicit-layered-retrieval-contract-for-cheap-coding-agents) supplies L0–L4 levels and first-screen/maintenance rules. **Read only the relevant owner map**, not all maps as new required documentation.

- For complex/high-traffic source areas, maintain a short §README.md§ **beside** that area: a few lines of **current source / selected future target / start here / source-inspected date**, then a question→file/symbol/contract/test table and meaningful risk/counterexample. A new agent should know which 2–5 source files matter **before** doing a repo-wide search.
- For long technical docs, put a very short “owns / which heading / do not read more unless” preamble in the first ~20 lines. Don't turn every README into a second technical specification or repeat full code descriptions in Change packets.
- **No automatic source-file banners.** A 3–6-line top comment earns its place only for a surprising local invariant that cannot be discovered from the nearest map; otherwise source comments belong directly beside the relevant decision. No mandatory generated headers/TOCs.
- Preserve one canonical home: product intent → product doc; technical invariant → technical contract; exact current code ownership → source-adjacent README; next executable task → selected Change; actual proof → tests/receipt. Small summaries and links are allowed to avoid expensive re-derivation; wholesale duplication is not.
- **Maintenance trigger:** update the nearest map when a Change moves a symbol/file owner, changes route/status/schema/public export, async/retry semantics or source-of-truth boundary. Do not rewrite a map for a harmless JSX/local rename. Mark old source-inspection status as such; don't claim a new build/test occurred.
- The current §scripts/check_docs.py§ **does not scan nested source-adjacent READMEs or validate heading anchors**. Until [W22](../../docs/changes/2026-11-12--web-context-navigation-check/CHANGE.md) implements this code-bearing tool improvement, check newly added nested map links explicitly. A path check does not certify the described symbol is still its source owner.

## One explanation, several useful levels

Find the existing owner before adding a document. Put the full explanation there and link from higher levels. A summary is useful when it answers a different, broader question; copying a detailed contract into a plan or package README creates drift.

| If this changes                                                                     | Maintain                                                                                                                                          |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product purpose or demonstrated core loop                                           | Root README; link to progress for current coverage                                                                                                |
| Implemented capability, evidence or next outcome                                    | `docs/progress.md`; evidence owner with date, run/revision identity and limits                                                                    |
| Selected code work or next slice                                                    | `docs/changes/README.md` Current change declaration; selected CHANGE.md and optional PLAN checkpoint                                              |
| Domain meaning, behavior or authority                                               | Product/concepts first, then owning technical contract                                                                                            |
| Entry point, cross-file flow or package boundary                                    | Code map or package guide; link to the contract                                                                                                   |
| Non-obvious local invariant, ordering or retry constraint                           | Comment beside the owning code; no syntax narration                                                                                               |
| New topic, moved/removed owner or changed heading                                   | Affected incoming links and relevant map row                                                                                                      |
| Repeated operating mistake                                                          | Small rule at the right trigger, or procedure in a skill; avoid unconditional policy growth                                                       |
| Consequential owner remarks, decisions, alternatives, exclusions or session handoff | Append chronological entry in the [day's minutes](../../docs/minutes/README.md); promote lasting decisions to their owning spec/Change separately |

Before finishing a slice, ask whether a fresh reader can find its purpose, current boundary, owner and evidence from the nearest map without reverse-engineering source. Repair the missing link or summary during that slice. This is a reasoning check, not a mandatory validation command or a repository-wide rewrite.

## Keep the entry cheap

The root README should explain the project in roughly one page. Progress begins with a short `## Orientation`: status, demonstrated evidence and current owner priority. The [owner roadmap](../../TODO.md) explains the engineering-portfolio sequence; it is **not** an implementation queue.

The [Change index](../../docs/changes/README.md) must contain **exactly one** declaration of `Current change: none` or one linked packet (for example [W22](../../docs/changes/2026-11-12--web-context-navigation-check/CHANGE.md)). A deliberate **none** is valid during planning, design, evaluation and documentation work. `pnpm repo:brief` consumes progress orientation and this declaration. With a selected Change, `--checkpoint` reports the matching `PLAN.md` checkpoint if present, otherwise its `CHANGE.md` handoff section. The helper is read-only and does not authorize implementation or provider calls.

Keep the selected Change's handoff compact: owner, state and permission, affected source, scoped next delta, acceptance including a negative case, actual checks and blocker. Permanent engineering and product knowledge belongs in its owner. The older `docs/features/` dossiers are legacy initiative/history, **not** selected Change packets. `pnpm repo:docs-health` audits Change PLAN checkpoints only.

Use roughly 200 words for orientation and 300 for a checkpoint as review triggers, not enforced caps. `pnpm repo:docs-health` reports checkpoint sizes without reading code, invoking models or imposing a CI gate; investigate flagged checkpoints rather than deleting evidence. Large coherent contracts can stay large; give them a useful opening boundary, a short question-to-section quick route where beneficial, and headings so readers can select the relevant section. Do not split documents into arbitrary fragments to game size. A map should route questions across product, authority, execution, data, presentation and evidence, not just enumerate directories.

## Daily session continuity

The [daily minutes convention](session-minutes.md) preserves human discussion context **outside chat**. On each meaningful repository working day, use the local Europe/Vilnius date and append significant entries to `docs/minutes/YYYY-MM-DD.md` as the discussion unfolds. Log scope changes, detailed owner intent, rejected alternatives, technical consequences and actual checks/commits, with honest statuses. The minutes explain decisions; they do not replace current Change permission, product/technical authority or source evidence. Refresh `docs/minutes/README.md` for new dates. Never overwrite an older decision silently; append a correction/supersession instead.

## Fresh-context discovery

Read relevant safety rules, then route the task using the appropriate map. Run the brief **when resuming or disoriented**, not for a fully specified narrow change. State the unresolved question before opening large files. Locate headings or symbols first; read the owning section and immediate callers rather than concatenating entire libraries. Stop widening the search once the input, authoritative operation, output and relevant failure path are understood. Preserve a surprising discovery with its owner before compaction can erase it.

Discover filenames with `rg --files` before guessing package paths. Size independent read batches to their combined output budget. If a read truncates, narrow to the missing section; do not reread the whole batch or treat unseen text as inspected.

Classify evidence explicitly: **designed**, **implemented/source-inspected**, **fixture-exercised**, **live-observed**, or **human-accepted**. Use these ordinary words where needed; no custom tags or blanket file headers. Never upgrade one into another. Date monetary and runtime observations; avoid “today,” “currently green” or a historical balance without its observation date. Missing local artifacts do not invalidate history, but they limit what can be reverified.

For a behavioral diagnosis, distinguish proposal, committed state, selected evidence and the final consumer input. An empty change list is not an empty state; a saved response is not proof of publication; omitted context is not deleted history. State the observation separately from its suspected cause and name a counterexample that would disprove that cause. A new field or subsystem is not a fix until the traced failure actually crosses its boundary.

Replace obsolete claims in place. Git holds history; plans are not investigation diaries. Preserve original private run artifacts and compact useful evidence, without committing credentials or player payloads. When a discovery reveals confusing code ownership, record the actual boundary and a scoped repair; documentation alone does not fix the architecture.

For a substantial navigation change, walk representative routes from the entrypoint: product recap, next coding slice, failure/spending investigation, and an unrelated domain such as time or presentation. Check that each reaches an owner without loading every linked file. Optional local link checks help find broken targets but cannot certify clarity, truth or completeness.
