# LIB01 | Library, shelf and workdesk vocabulary

**State:** READY FOR DOC-ONLY EXECUTION, subject to owner commission and current-HEAD verification. **Profile:** DOC. **Baseline:** `undertaking/storyteller-workshop@484fd4a09d9b5f22b46a89e217380d92d056055a`. **Dependency:** none. **Target integration:** `undertaking/storyteller-workshop`.

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
