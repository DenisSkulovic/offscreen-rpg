# LIB01 | Library, shelf and workdesk vocabulary

**State:** Done (2026-11-23). **Profile:** DOC. **Baseline:** `undertaking/storyteller-workshop@f6dbb79aee054712f968692f06efc1c4ca49a96e` (packet recorded `484fd4a09d9b5f22b46a89e217380d92d056055a`; current HEAD was ahead and the vocabulary still fit). **Dependency:** none. **Target integration:** `undertaking/storyteller-workshop`. No source behavior changed.

## Goal
Clarify the existing canonical-documents technical owner without inventing package/API implementations. Reconcile the writer-at-desk mental model with currently implemented immutable content roots and separate SQL authority. This is a documentation contract Change, not library mounting implementation.

## Decided vocabulary
- **Document:** individually identified versioned content object; may be Markdown-bearing, structured JSON, source passage, or other typed canonical artifact. Not synonymous with an `.md` file.
- **Library:** independently governed collection of documents and its immutable, content-addressed root/revision history. One story has a **Story Library** for story canon.
- **Shelf:** a named *mount/view* of a Library for a specific Storyteller mission or story. It is not a new persistence layer, trie level, Kubernetes service, or mandatory directory. Mounts may ultimately point to independently versioned reference libraries (lore, craft, prior works).
- **Workdesk:** mission-local staged edits and research artifacts, not published canon; the Game Authority admits committed changes.
- **Book:** optional product-facing grouping/catalog object if later needed; not a mandatory parent for documents. No Ladder abstraction.
- **Reference Library:** curated imported source with pinned immutable root; mounted read-only by default. No automatic web browsing, external model memory as canon, cross-user access or permission escalation.
- **Story Library:** has a mutable *head pointer* under authoritative transaction rules, while all committed roots and objects are immutable. Forks pin historical roots; they do not mutate originals.

## Boundary decision
Document representation/hash verification and storage ports do not own fictional canon policy. Library membership, path lookup, view/root pagination and historical selection belong to Library capability. Source content-package validation belongs to its owning content domain. Storyteller owns mission tool grants, retrieval/ranking, creative policy and Workdesk staging. Game Authority owns committed root selection, actor/tenant/visibility authorization and joint scene/game-state publication. Redis cache is optional infrastructure decoration outside the pure domain; do not introduce Redis here.

## Exact editorial write scope
- `docs/technical/storyteller/canonical-documents-and-packages.md`: add a short vocabulary/ownership section, reconcile existing sections **rather than** duplicate source-canon, package and overlay contracts.
- `docs/technical/storyteller/prompts-and-tools.md`: only fix navigation/terminology links if actually inconsistent.
- No changes to source, schemas, manifests, migrations, APIs, runtime pods or `work/QUEUE.md`.

## Acceptance and non-goals
A reader can explain Story Library vs mounted reference shelf vs Workdesk, immutable object vs selected root, and authorization before reads. Preserve existing world/rule/start references; document that shelves are *target vocabulary*, not implemented. A counterexample must demonstrate that one narrative document can be mounted without becoming story canon, and that a private document is not exposed by mounting. Run `pnpm repo:docs-health` if present, or the documented read-only docs health command; report exact command/result. Stop if existing technical owner explicitly contradicts the proposed mount semantics. Integrate through one planning/docs branch and reconcile this packet as Done only after docs links and distinction between target and implementation are checked.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/storyteller/canonical-documents-and-packages.md#library-shelf-and-workdesk-vocabulary--target-lib01 | technical | changed: shared nouns and ownership split; shelves and multi-library mounts stay target, not implemented | no source behavior changed; baseline `f6dbb79aee054712f968692f06efc1c4ca49a96e` | source-inspected | a mounted narrative document is not story canon; a private document is not exposed by mounting; authorization before reads | quick route on this page and context-and-memory.md |
| docs/technical/storyteller/canonical-documents-and-packages.md#reusable-world-libraries-and-campaign-overlays | technical | unchanged: pinned world import, overlay, and bootstrap remain the implemented contract | same SHA; world/rule/start sections not rewritten | source-inspected | updating a reusable library does not rewrite an existing campaign | existing anchors kept |
| docs/technical/storyteller/prompts-and-tools.md | technical | unchanged: Library/Workdesk tool facade already matches the nouns; no mount-runtime claim added | same SHA | source-inspected | tool facade still does not claim multi-library mount runtime | no edit required |
| docs/product/foundations/concepts.md | product | unchanged: no chapters; product page was not rewritten to ratify unimplemented shelves | same SHA | source-inspected | shelves are not described as player-available behavior | N/A |
| work/QUEUE.md | process | unchanged: LIB01 was an owner-commissioned parallel Change, not the global selector | same SHA | source-inspected | Current work line left on DXK09 | N/A |
