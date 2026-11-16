# SA05 evidence | stored→final-packet→cited lineage

**Date:** 2026-11-14. **Change:** [SA05](../../../../../../work/changes/archive/2026-11/storyteller/2026-11-14--sa05-evidence-lineage/CHANGE.md). **Provider spend:** none.

## What landed

- `storyteller-evidence-lineage.v1` sidecar (`packages/storyteller/src/providers/evidence-lineage.ts`)
- Fixtures: gift-recall, rumor-corrected, selected-then-pruned, ordinary-no-memory, false-citation-rejected
- `pnpm storyteller:packet-audit` writes `evidence-lineages.json` / `.md`
- Observability only; task schema unchanged (v10–v17 still readable)

## Checkpoints

`stored → eligible → discovered → exact-loaded → final-packet → cited-used → published`

A passage **loaded but pruned** cannot claim model-visible knowledge. Citing a pruned passage throws (`false citation`).

## Fixture results

| Scenario | Result |
| --- | --- |
| gift-recall (`p6`) | final-packet + cited + published |
| rumor-corrected | `p2` pruned; `p10` cited in final |
| selected-then-pruned | `failureClass=selected-then-pruned`; not cited |
| ordinary-no-memory | valid cheap path; no citation required |
| false-citation-rejected | construction throws |

## Unknowns (honest)

- Semantic prose faithfulness is not proved (`unknowns` includes it)
- Live `publication.ts` / SQL publication not wired; fixture publication states only
- No disposable SQL run

## Commands

- `pnpm --filter @offscreen/storyteller build`
- `pnpm --filter @offscreen/storyteller test` (48/48)
- `pnpm storyteller:packet-audit`
