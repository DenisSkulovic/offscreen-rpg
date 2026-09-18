# QA journeys and evidence plan

Feature: [QA journeys and evidence](FEATURE.md)
Status: Proposed for owner review.

## Phase 1 — Case and run contracts

Define strict case/stage/run/result schemas, cost classes, evidence references and the initial offline catalog. Store definitions in developer tooling; store run evidence in the Chamber database. Do not create a general workflow language.

Exit: cases can be listed and a run can be opened, advanced and finalized without provider access.

## Phase 2 — Chamber checklist workspace

Add case selection, stage guidance, manual observations, artifact links and final disposition to the developer-only Chamber. Reuse production snapshots and existing scenario creation. A reset creates a new isolated run/story rather than rewriting evidence.

Exit: a human can complete the offline player-entry journey and understand every expected observation.

## Phase 3 — Shared drivers

Expose typed case helpers to the focused browser/integration driver. Automation may mark objective stages; qualitative stages remain awaiting human review. Keep manual and automated results under the same stage IDs.

Exit: the immediate-loop case can mix automated structural evidence with human quality observations.

## Phase 4 — Evidence bundle

Export a sanitized JSON bundle containing run manifest, stage results, trace references, selected artifacts, cost summary and operator notes. Exclude credentials, session secrets and unrelated player content.

Exit: a failed experiment can be inspected or shared locally without querying several tables manually.

## Current checkpoint

Design only. Implement after agreeing the initial journey catalogue and trace contract. No provider call is required.
