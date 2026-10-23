# Documentation and discovery maintenance

Read when changing documentation, navigation, rules or a cross-file responsibility. The [documentation map](../../docs/README.md) routes readers; this rule defines maintenance. Existing product, spending and verification authority is unchanged.

## One explanation, several useful levels

Find the existing owner before adding a document. Put the full explanation there and link from higher levels. A summary is useful when it answers a different, broader question; copying a detailed contract into a plan or package README creates drift.

| If this changes | Maintain |
| --- | --- |
| Product purpose or demonstrated core loop | Root README; link to progress for current coverage |
| Implemented capability, evidence or next outcome | `docs/progress.md`; evidence owner with date, run/revision identity and limits |
| Selected work or exact next slice | `docs/features/README.md` current-plan link; selected PLAN checkpoint |
| Domain meaning, behavior or authority | Product/concepts first, then owning technical contract |
| Entry point, cross-file flow or package boundary | Code map or package guide; link to the contract |
| Non-obvious local invariant, ordering or retry constraint | Comment beside the owning code; no syntax narration |
| New topic, moved/removed owner or changed heading | Affected incoming links and relevant map row |
| Repeated operating mistake | Small rule at the right trigger, or procedure in a skill; avoid unconditional policy growth |

Before finishing a slice, ask whether a fresh reader can find its purpose, current boundary, owner and evidence from the nearest map without reverse-engineering source. Repair the missing link or summary during that slice. This is a reasoning check, not a mandatory validation command or a repository-wide rewrite.

## Keep the entry cheap

The root README should explain the project in roughly one page. Progress begins with a short `## Orientation` section: status, demonstrated result, principal gap and next action. The feature index has exactly one `Current plan:` line followed by a Markdown link to the selected relative `PLAN.md` path. `pnpm repo:brief` consumes these two contracts and checks that the selected plan has a nonempty `## Current checkpoint`; update the helper if intentionally changing them. It must never hard-code a list of dated feature folders.

Default brief output contains the orientation and plan path. `--checkpoint` adds only the selected checkpoint, not phase history or every feature. Keep that checkpoint short enough to act on: current phase, inspected revision, bounded next edits, acceptance, verification limits, blockers and spend. Put durable evidence in its permanent evidence owner. Temporary maintenance work can be listed separately without silently replacing the gameplay route.

Use roughly 200 words for orientation and 300 for a checkpoint as review triggers, not enforced caps. Large coherent contracts can stay large; give them a useful opening boundary and headings so readers can select a section. Do not split documents into arbitrary fragments to game size. A map should route questions across product, authority, execution, data, presentation and evidence, not just enumerate directories.

## Fresh-context discovery

Read required safety rules, run the brief, then choose the relevant map/plan. State the unresolved question before opening large files. Locate headings or symbols first; read the owning section and immediate callers rather than concatenating entire libraries. Stop widening the search once the input, authoritative operation, output and relevant failure path are understood. Preserve a surprising discovery with its owner before compaction can erase it.

Classify evidence explicitly: **designed**, **implemented/source-inspected**, **fixture-exercised**, **live-observed**, or **human-accepted**. Use these ordinary words where needed; no custom tags or blanket file headers. Never upgrade one into another. Date monetary and runtime observations; avoid “today,” “currently green” or a historical balance without its observation date. Missing local artifacts do not invalidate history, but they limit what can be reverified.

Replace obsolete claims in place. Git holds history; plans are not investigation diaries. Preserve original private run artifacts and compact useful evidence, without committing credentials or player payloads. When a discovery reveals confusing code ownership, record the actual boundary and a scoped repair; documentation alone does not fix the architecture.

For a substantial navigation change, walk representative routes from the entrypoint: product recap, next coding slice, failure/spending investigation, and an unrelated domain such as time or presentation. Check that each reaches an owner without loading every linked file. Optional local link checks help find broken targets but cannot certify clarity, truth or completeness.
