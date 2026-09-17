# Document identity and relationships

Status: Active documentation convention; reversible assistant setup choice.
Updated: 2026-09-16. Applies to product and future technical documentation.
Purpose: make the Markdown library traversable by identity, topic, dependency and evidence without requiring a graph database.

## Identity at three levels

- Documents: stable descriptive IDs, for example DOC-PRODUCT-VISION or DOC-TIME-AUTONOMY. Keep the ID when renaming or moving a file.
- Requirements: stable topic IDs such as TIME-001, allocated only to concrete requirements. These examples do not create requirements.
- Decisions: retain existing D001, D002, etc. Add scenario IDs such as SCN-001 when reusable acceptance scenarios exist.

Never renumber for cosmetic order or reuse retired IDs. Split documents receive new IDs and an explicit supersession note; requirement IDs stay with their authoritative definitions where possible.

An ID identifies content; it does not encode approval. Document status and individual requirement status can differ.

## Compact metadata

Each substantial product or technical document begins with YAML front matter:

```yaml
id: DOC-EXAMPLE
layer: product
status: draft
domains: [time-and-settings]
tags: [offline-play, consequences]
updated: 2026-09-16
relations:
  - type: depends_on
    target: DOC-OTHER
```

This is an illustrative example, not an existing reference. Use only real targets in actual documents.

Required fields: id, layer, status, domains, updated. Tags and relations may be empty. Keep front matter authoritative for those metadata fields; do not maintain a duplicate status/date block in prose.

Layer: product, technical, or workflow.
Status: draft, working-baseline, accepted, needs-revision, superseded.
Domains: current library folder names. Product vision may use foundations. Future technical domains are defined when that layer begins.

## Controlled tags

Start with these cross-cutting tags:
offline-play, direct-control, autonomy, consequences, time-cost, configurability, notifications, continuity, affordability, world-creation, dnd-rules, accessibility.

Use roughly 2–5 relevant tags rather than every tag that could apply. Domains already identify the subject area, so tags should provide another useful dimension. Add a new tag here when a repeated retrieval need justifies it; merge synonyms. Empty tags are fine.

Tags are discovery aids, not statements of dependency or authority.

## Typed relationships

| Type | Meaning from source to target |
| --- | --- |
| depends_on | Source relies on the target's definitions or contract |
| constrains | Source imposes a rule or limit on target behavior |
| derives_from | Source is based on the target, e.g. a design from product requirements |
| verifies | Source scenario/check supplies evidence for the target requirement |
| supersedes | Source replaces the identified target |
| relates_to | Useful association with no implied dependency |

Use precise requirement/decision IDs when the link concerns only one rule; use document IDs for document-wide relationships. Structural relations do not imply that a draft has been approved.

Store a relationship once at its source. Incoming links and impact lists should be derived by searching references or a later generated index; do not maintain matching reverse lists manually. Use relates_to sparingly.

For human navigation, include ordinary relative Markdown links in prose or the relevant section, with the target ID as the link label when helpful. IDs survive moves; paths still need link repair. A future index can resolve IDs to current paths, but no automatic resolver exists yet.

Do not put links to not-yet-created files in actual relation metadata. Planned dependencies belong in an open-question or dependency note until the target exists.

## Authority and change analysis

Each requirement has one owning document. Elsewhere, refer to its ID instead of copying its text.

Before a material change:
1. Locate the authoritative document/requirement and its status.
2. Follow outgoing constraints/dependencies and search for incoming references.
3. Identify affected topics, scenarios and later technical documents.
4. Update agreed behavior; mark unresolved dependents needs-revision.
5. Check IDs, links and relationship targets after moves or splits.

Dependency traversal is a starting point, not a proof of complete impact: missing links and undiscovered relationships remain possible. Search related terms as well.

Archived content is excluded by default. Superseded decisions may be retrieved for rationale but cannot silently override current requirements.

## Example use

A question about what happens when a robbery notification is ignored could lead through:
event-intervention-and-timeouts → pause-and-resume → autonomous-risk-and-decisions → difficulty-and-consequences.

Tags help discover that cluster; typed links explain how its rules depend on one another. Read the relevant sections, not every document in those domains. These topic paths are planned until authored.

## Adoption and tooling

Apply metadata as documents are created or substantively edited. Existing vision and time/autonomy overview are the initial real examples. Do not add metadata to every personal-workspace file or retroactively tag historical archives.

Current tooling remains Markdown, links and local search. No separate graph database or semantic service is needed to record these relationships.

A future derived manifest can collect IDs, paths, headings, tags, status and incoming/outgoing references. A lightweight checker can detect duplicate IDs, missing targets and broken links. Neither generator nor checker is installed by this document. Add them when the number of real relationships makes manual checks unreliable; use no LLM to generate metadata that can be extracted mechanically.

## Reading order, scope and growth

Retain descriptive filenames and stable existing IDs. Do not prefix files with sequence numbers just to impose reading order; TASKS and the index own that order. Renaming never changes a requirement's identity or approval state.

The release-scope document owns capability placement (MVP-candidate, next-candidate, parked or explicitly accepted release). Mixed-scope documents should link to that source rather than label their whole contents “MVP.” Parked ideas are not an automatic later backlog.

Lead an active topic with its responsibility, accepted direction, draft recommendation and next unresolved decision. State document-wide draft status once; keep local caveats only when they disambiguate an example or decision. Expand concrete mechanics, worked examples and consequential failure cases rather than repeating the vision.

Split when sections have independent responsibilities or change independently, or ordinary retrieval repeatedly loads unrelated material. Word count is a signal, not a mandatory threshold. A split moves authoritative definitions and repairs incoming links; it does not copy them into several files. Keep a short overview where navigation is useful. Preserve nuanced interactions even if that makes an owning specification longer.

A new planned file needs actual decision content or a distinct useful contract before creation. Use existing owners for small additions. Retired IDs remain traceable but should not dominate routine reading.
