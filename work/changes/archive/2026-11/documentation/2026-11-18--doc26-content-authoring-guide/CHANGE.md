# DOC26 | Create a practical world/rule/start package authoring and validation guide

**State:** Done (2026-11-18).

## Cursor first-screen brief

**Why this is missing:** Actual 'content/worlds/vvardenfell-poc', 'content/rules/srd-5.2.1-subset' and 'content/starts/seyda-neen-prisoner' packages exist. Their JSON manifests and authority/admission rules are described inside the 8.5k-word Storyteller context document; a new content author lacks a focused recipe.

**Start with actual current owners:**
- [docs/technical/storyteller/context-and-memory.md](../../../../../../docs/technical/storyteller/context-and-memory.md)
- [packages/documents/README.md](../../../../../../packages/documents/README.md)
- [content/starts/seyda-neen-prisoner/start-package.json](../../../../../../content/starts/seyda-neen-prisoner/start-package.json)
- [content/rules/srd-5.2.1-subset/rule-package.json](../../../../../../content/rules/srd-5.2.1-subset/rule-package.json)

Do not skim old DOC05–24 archives as if they were live authority. Inspect exact headings and source at HEAD; if the source has moved, correct this packet's paths and affected claims before Ready.

## Designed documentation outcome

1. Read exact manifest JSON and import/admission symbols at HEAD; write a step-by-step author task from world lore, rule topic, start identity through manifest validation, immutable publication and source-pinned campaign instantiation.
2. Show current real sample paths and only commands proven safe and supported; explain what remains target-only, no arbitrary user-authored code and no legal/licensing approval implied by example assets.
3. Include negative cases: undeclared content/symlink escaping root, mismatched rule adapter, hidden possibility accidentally materialized, package revision mutating an existing campaign. Link source schema, not copy every schema field.
4. Add one question-first route to runbook hub and relevant technical ownership; choose existing runbook tree instead of creating a new generic 'guides' directory prematurely.

Each output must have a **distinct reader question, normative status, unique owner**, normal procedure/example, negative example and exact related links. A new file is only justified when the task cannot be answered economically inside an existing owner. Record *no page created* with a reason if survey disproves the proposed split.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because authoring instructions cannot broaden world invention or mechanical permissions set by product rules | `docs/product/README.md` and mentioned selected player claims, including Proposed exclusions | No new rights; require owner ratification for changed meaning |
| Technical | unchanged because immutable package roots, exact adapter identity, visibility and start activation remain owned by docs/technical/storyteller/context-and-memory.md; new task guide links, not duplicates, those contracts | `docs/technical/README.md` and selected technical/source owners cited above | Status and evidence must reflect source/fixture reality |
| Code | unchanged because no import parser, package schema or content fixture is modified; source/tests are read-only evidence | Source path inspection is read-only and not a code-writing permission | Negative: any executable diff or imagined test report blocks Done |
| Related | changed: CREATE docs/runbooks/content-package-authoring.md and update docs/runbooks/README.md, plus one precise link in docs/technical/storyteller/context-and-memory.md and one precise link in packages/documents/README.md | Existing inbound links, docs/runbooks, source-map and work/designs routes as relevant | Review actual created/moved/deleted targets and semantic dependence |

**CREATE declaration:** CREATE `docs/runbooks/content-package-authoring.md`. The path did not exist at design time. This Change created that file. A misspelled existing path is not a valid CREATE. Close-guard compatibility remains WIKI16; the parent runs the guard after that lands. Ready for close is not Done.

## Acceptance and negative proof

**Normal:** a reader can find the exact owner and perform the correct bounded intellectual/task step, or clearly distinguish unselected policy from an accepted rule. **Negative:** A creator editing shared WORLD.md in place causes an already started campaign to change, or adding descriptive Markdown schedules a world obligation automatically.

**Evidence:** Source-inspected manifests and safe local validation command evidence; no imports against production data, link/authority review. Run actual link/anchor and `wiki:change-guard` checks when selected in a full checkout; record actual command, revision and skipped checks. Independent adversarial reading must verify that the new page did not create shadow product/technical authority.

**Execution record:** The guide states the acceptance failures as false. Editing shared `WORLD.md` in place must not be described as safely mutating an already started campaign. Adding descriptive Markdown must not be described as scheduling a world obligation. Undeclared content and a symlink that escapes the package root stay rejected. A mismatched rule adapter does not instantiate. A hidden possibility stays noncanonical and Storyteller-private. A package revision does not mutate an existing campaign. Link check: `python` import of `scripts/check_docs.py` `check_file` on the five Markdown files in this Change, result clean. `pnpm wiki:change-guard` skipped for the parent after WIKI16. `pnpm --filter @offscreen/documents test` verified present and not run. No production import.

## Reconciliation ledger (fill at execution)

CREATE `docs/runbooks/content-package-authoring.md`

Inspected source SHA: `b3113814` (`git rev-parse --short HEAD`). Code unchanged. `pnpm wiki:change-guard` not run; parent runs it after WIKI16. `pnpm --filter @offscreen/documents test` was verified in `packages/documents/package.json` and not executed.

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Content package authoring (new task guide) | task guide; not a product rule and not a technical contract | changed: CREATE `docs/runbooks/content-package-authoring.md`. Adds the authoring recipe for the checked-in world, rule and start directories. Does not ratify product meaning or the technical contract. | no source behavior changed; manifests and import/admission symbols inspected at `b3113814` (`content/worlds/vvardenfell-poc`, `content/rules/srd-5.2.1-subset/rule-package.json`, `content/starts/seyda-neen-prisoner/start-package.json`, `packages/documents/src/{world,rule,start}-import.ts`, `start-instantiation.ts`, `schema.ts`, `packages/application/src/stories/start.ts`) | source-inspected; documents importer tests not re-run | Editing shared WORLD.md in place must not be described as safely mutating an already started campaign. Adding descriptive Markdown must not be described as scheduling a world obligation. Undeclared content and a symlink escaping the root stay rejected. A mismatched rule adapter does not instantiate. A hidden possibility stays noncanonical and Storyteller-private. A package revision does not mutate an existing campaign. | `docs/runbooks/README.md` question route; one link from `docs/technical/storyteller/context-and-memory.md`; one link from `packages/documents/README.md` |
| `docs/technical/storyteller/context-and-memory.md` — Reusable world libraries, Reusable rule libraries, Campaign bootstrap | technical contract | unchanged because immutable package roots, exact adapter identity, visibility and start activation remain owned by those headings. One question-route link was added. The contract text was not rewritten. | no source behavior changed; headings re-read at `b3113814` | source-inspected; contract meaning preserved | The same page still says import publishes a package manifest only and does not create a campaign or schedule an obligation. The new guide must not be read as moving that ownership. | outbound link to `docs/runbooks/content-package-authoring.md` |
| `packages/documents/README.md` | source-adjacent storage map | unchanged because object storage, manifests and export stay as written. One task link was added. | no source behavior changed; README and `packages/documents/src/index.ts` exports inspected at `b3113814` | source-inspected | A task link must not be read as a second storage contract or as permission to overwrite a published object. | outbound link to the new guide |
| Product gameplay and invention/mechanical permissions | product | unchanged because authoring instructions cannot broaden world invention or mechanical permissions. No product page was edited. | no source behavior changed; `b3113814` | source-inspected boundary; no product ratification | A sample asset and a Markdown page do not grant a new player right or a new mechanical effect. | N/A |
| Import parser, package schema, content fixtures, executable code | code | unchanged because no parser, schema, fixture or other executable file was modified. | no source behavior changed; `b3113814` | source-inspected read-only. Negative: an executable diff blocks Done. This Change has none. | A green or skipped documents test is not a new importer. | N/A |

**Stop:** proposed new gameplay/privacy/security or public API behavior cannot be ratified by writing a document. No auto-selection of next packet. Archive only with unique-claim preservation and complete ledger.
