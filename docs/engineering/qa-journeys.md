# QA journeys and evidence

The local Chamber contains a developer-only, manual-first QA workspace for repeatable POC investigation. A person or coding agent reads each stage, performs the action through the UI or endpoint, observes the result and records evidence. The structured catalogue does not imply an automation fleet; browser driving remains optional. It is a guide for investigation, not a production release gate.

## Case catalogue

The [offline POC acceptance matrix](offline-poc-acceptance.md) covers context, mechanics, agent tools, recovery and end-to-end play. It distinguishes checks possible now from those blocked on the DM runner; it does not change catalogue availability or claim those checks have been performed.

Cases are versioned TypeScript data validated by `@offscreen/contracts/qa`. A case declares its cost class, availability, prerequisites, supported driver modes, variants, ordered stages, evidence requirements, reset policy and limits. A stage separates the player-visible expectation from the authoritative saved-state expectation.

The catalogue contains:

- offline player entry, available for local execution;
- immediate mechanical DM loop, visible but planned until that loop exists;
- storyteller contrast, available for offline comparison;
- failure and recovery, visible but planned until controlled fault injection exists;
- conservative live quality probe, visible but unavailable until the separate live-evaluation gates pass.

Availability is data, but the server also enforces the boundary. It opens only cases whose cost class is `offline` and whose state is `available`. A credential present in the process cannot turn an offline run into a provider call. The live case cannot be opened through this API.

## Run lifecycle

The Chamber launcher captures the Git commit, dirty-tree state and non-secret local environment identity. The client supplies the case/version, variant, driver and known scenario/profile/settings identities. The server snapshots the complete case definition into the run, fixes execution to offline, and initializes provider accounting to verified zero use.

Stage results append in catalogue order under an expected run revision. A recorded stage cannot be edited or replaced. Unrecorded stages are returned as `not-run`; callers cannot submit that status. `passed` and `failed` require each declared evidence kind. `blocked` names the missing prerequisite and `skipped` remains visible.

Qualitative stages declare `human-judgment` assessment and specific dimensions from the anchored 0–2 rubric. Structural stages have no rubric dimensions. The server rejects missing, duplicate or unrelated ratings instead of collapsing them into one score.

Finalization records a disposition and operator notes, advances the revision and closes the run. No stage or finalization mutation is accepted afterward. A rerun receives a new UUID and preserves earlier evidence.

## Storage and API

`qa_run` owns the immutable case snapshot, provenance, setup, execution/accounting state and final disposition. `qa_run_stage` owns one append-only result per stage identity. Both are owner-scoped through the normal authenticated Chamber session.

Developer-only routes are mounted under `/api/chamber-tools/qa`:

- `GET /cases` lists the full catalogue, including planned cases and reasons;
- `PUT /runs/:runId` opens an available offline run;
- `GET /runs` lists the owner's 20 most recent runs;
- `GET /runs/:runId` reads its complete checklist and results;
- `PUT /runs/:runId/stages/:stageId` appends the next result;
- `PUT /runs/:runId/finalization` closes the run;
- `GET /runs/:runId/evidence` exports a finalized sanitized JSON bundle.

The API is mounted only when `developerTools` is enabled. The production story API has no QA mutation route.

## Chamber workflow

Launch `pnpm chamber` and open `/chamber`. The QA workspace lists every journey and explains why unavailable work is blocked. It stores the last run UUID in local browser storage so a reload resumes the durable database record. Operators can record stage observations, artifact references and anchored ratings, finalize early as inconclusive or defective, then export a standalone evidence bundle. Starting again clears only the local pointer; it never deletes or rewrites the prior run.

Run `pnpm chamber:review` for a headless, authenticated visual pass over the mechanical pineapple opening and first live scene. It writes wide and narrow full-page screenshots to the temporary `offscreen-rpg-review` directory reported by the command. The images are disposable evidence and are not committed; the flow uses the normal API, worker and persistence boundaries with offline fixtures only.

The same case IDs, stage IDs and commands support browser automation. Automation should record structural evidence only. Human-judgment stages remain for an operator even when surrounding navigation and state assertions are automated.

No live model call was made while implementing this system. Its offline accounting is zero calls, zero tokens, zero charge and no reservation.
