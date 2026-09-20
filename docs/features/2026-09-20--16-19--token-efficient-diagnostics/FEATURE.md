# Token-efficient diagnostics

Status: Agreed engineering constraint; first request-inspection slice implemented.

## Outcome

Make repeated playthrough debugging economical for a coding agent. A failure should first yield a compact, correlated map of what exists and what changed. Exact prose, JSON and traces are loaded only for explicitly selected areas.

The optimization target is useful diagnostic evidence per reviewer token, not merely smaller log files. Complete bounded artifacts may remain local for reproducibility while the default report stays small.

## Inspection ladder

1. Outcome: operation identity, terminal state, failure class and the smallest useful correlation set.
2. Manifest: stable section IDs, kinds, counts, byte/character sizes, hashes, completeness and sensitivity labels.
3. Focused detail: selected summaries, key shapes, failed checks or changed sections.
4. Exact content: explicitly named sections within a caller-supplied byte cap.
5. Full raw artifact: exceptional manual escape hatch, never the default input to a coding or storytelling model.

Each level points to the next available level. Missing, redacted and truncated are distinct states. A hash or byte count is structural evidence, not a token, quality or cache claim.

## Contracts

- Preserve stable correlation IDs from QA run through operation, attempt, publication and resulting state.
- Store large content once and reference it from manifests.
- Prefer deterministic selectors such as failures, changed sections, IDs and bounded neighborhoods.
- Emit machine-readable evidence and a concise human view from the same source.
- Compare stable hashes before loading content; unchanged sections should disappear from ordinary diffs.
- Keep secrets out of all levels. Private game plans and provider bodies require explicit developer-only access.
- Fail closed when a selection exceeds its declared byte allowance; never silently truncate exact content.
- Diagnostic collection must not perform provider transport or imply authorization to spend.

## First slice

The offline Storyteller packet audit is the proving ground. Its default manifest describes each top-level user-request section with stable identity, shape, size and hash, while omitting exact section content. An optional selector writes exact content for named `case-id:section-key` pairs under a shared byte cap.

This is intentionally not a universal telemetry framework or a second trace store. Later trace-explorer work should apply the same ladder to durable operation evidence after its ownership inventory is complete.

## Acceptance

- A reviewer can identify the largest or changed Storyteller request section without reading the request.
- A reviewer can retrieve one exact section without retrieving its siblings.
- Oversized selections fail with the limit stated.
- Default inspection performs no provider call and contains no full request body.
- The approach can later cover a failed playthrough without depending on terminal scrollback or dumping every related row.
