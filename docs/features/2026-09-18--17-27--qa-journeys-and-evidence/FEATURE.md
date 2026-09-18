# QA journeys and evidence

Status: Proposed for owner review. Design only.

## Intended outcome

Turn the imagined player experience into a small set of repeatable QA journeys with explicit expectations and inspectable evidence. A developer should be able to choose a journey, execute it manually or through an automated driver, and answer:

- What exact product behavior was exercised?
- Which stage failed or became blocked?
- What committed state and AI artifacts support the conclusion?
- Was a provider called, how many times, and at what verified cost?
- Can another run reproduce the same setup?

The checklists guide investigation; they are not a substitute for judgment or a demand to make every check green during the POC.

## Case contract

Each case is a versioned TypeScript definition validated by a strict schema. It contains:

- stable case ID and human name;
- purpose and product risk addressed;
- cost class: offline, potentially billable or live-billable;
- prerequisites and initial scenario/template;
- supported driver modes: manual Chamber, browser automation or both;
- ordered stages;
- evidence requirements;
- cleanup/reset policy;
- declared limits and known non-assertions.

Each stage contains preconditions, operator/player action, observable expectation, authoritative expectation and evidence references. Expectations must describe behavior, not implementation trivia. A stage result is `passed`, `failed`, `blocked`, `skipped` or `not-run`, with a concise observation. “Blocked” names the missing prerequisite; it does not turn unfinished functionality into success.

Each expectation also declares failure importance: `poc-blocker`, `major`, `minor` or `observation`. This helps decide what to fix next without turning the POC into a production release checklist.

## Run record

A run captures:

- run and case version identities;
- Git commit and dirty-tree indicator;
- start/end timestamps and driver mode;
- local environment identity without secrets;
- scenario, storyteller profile/revision and settings revision;
- execution mode and, for live work, captured model/pricing/policy IDs;
- stage results and operator notes;
- story/draft/generation/planning-operation IDs;
- linked trace/evidence artifacts;
- provider call count, token usage, verified charge, outstanding reservation and accounting certainty;
- final disposition: useful evidence, inconclusive, product defect, infrastructure defect or design question.

Runs are immutable evidence. Rerunning creates a new run. A run may be annotated, but its captured facts are not edited to make the result cleaner.

## Initial journey catalogue

### 1. Offline player-entry smoke

Purpose: confirm that a developer can reach the product and understand how to begin.

Stages:

1. Launch the local Chamber/developer environment.
2. Enter through the declared identity variant.
3. View the story list and choose New Story.
4. Inspect the storyteller catalogue and distinguish the two profiles.
5. Save a premise and selected storyteller.
6. Generate an offline opening candidate.
7. Review the candidate and Start.
8. Reopen the story from the list.

Evidence: screenshots are optional; required evidence is route/status, draft/candidate/story identities and final snapshots. This case makes no claim about live prose quality.

Identity has two explicit variants:

- `local-developer-session` is the fast daily path and proves navigation/session use after the launcher creates local identity state. It does not claim account-creation coverage.
- `oauth-account-lifecycle` starts signed out and covers provider initiation/callback, first account creation, session persistence, return and revocation. It is manual or separately automated only when real OAuth credentials and an appropriate environment are available.

Reports must name the variant. Passing the developer-session variant cannot mark OAuth account creation as passed.

### 2. Immediate mechanical DM loop

Purpose: exercise the proposed playable DM adjudication feature end to end.

Stages:

1. Start the pineapple mechanical scenario from a reviewed candidate.
2. Inspect public options and their private admitted plans in the Chamber.
3. Select an option.
4. Observe one saved automatic/check resolution and committed effects.
5. Observe consequence narration and newly planned options.
6. Repeat until three rounds are committed.
7. Reload between rounds and retry one deliberately duplicated command.

Evidence: selected intentions, roll/effect receipts, offer identities, planning trace, before/after facts and publication states. The microbe variant repeats this case without human/economic assumptions.

### 3. Storyteller contrast

Purpose: determine whether profiles change decisions and development rather than only adjectives.

Run the same captured premise and mechanical seed once per profile. Compare opening framing, selected opportunities, consequence framing and later option direction. Structural validity is objective; profile adherence and meaningful difference use an anchored human rubric. Exact prose equality is not expected.

### 4. Failure and recovery

Purpose: make uncertainty and retry behavior visible.

Inject one controlled invalid output, one delayed result, one stale publication and one saved-result/publication interruption through Chamber-only boundaries. Confirm that committed dice/effects are not repeated and that recovery resumes from the correct durable boundary.

### 5. Conservative live quality probe

Purpose: collect the first paid evidence after explicit authorization. The separate live-evaluation feature owns caps, model selection and stop policy. This journey must not be runnable until trace completeness and accounting preflight pass.

## Quality rubric

Qualitative stages use anchored `0`, `1`, `2` ratings plus evidence:

- situation fidelity: contradicts / partly respects / clearly respects committed state;
- intention fidelity: ignores / partially follows / resolves the selected intention;
- option agency: synonyms or impossible / mixed / materially different feasible intentions;
- consequence integrity: conflicts with receipts / vague / accurately incorporates mechanics;
- profile expression: absent or disruptive / visible but shallow / shapes framing and developments coherently;
- continuity: forgets / partially recalls / correctly uses consequential prior facts;
- readability: confusing / serviceable / clear and playable.

Do not collapse these into one magic score. A structurally invalid or mechanically contradictory result fails regardless of prose quality.

## Chamber experience

The Chamber adds a QA workspace:

- select case and variant;
- view prerequisites and current stage;
- launch/reset through supported fixture boundaries;
- mark manual observations;
- follow linked story/trace artifacts;
- see accumulated cost/accounting state;
- export one sanitized evidence bundle.

The workspace drives production paths. It does not implement story behavior or mutate arbitrary rows.

## Acceptance

- The initial five journeys exist as versioned definitions with explicit cost classes.
- Manual and automated drivers share stage identities and evidence requirements.
- A run records commit, configuration, stage outcomes and artifact identities.
- Offline cases cannot invoke a provider even when a credential exists.
- Live cases cannot begin without the live-evaluation preflight.
- Failed and blocked stages remain visible; rerun never overwrites evidence.
- The player-entry and immediate-loop journeys can be followed without reading source code.
- The rubric yields specific observations rather than a single ungrounded quality number.

## Boundaries

This feature does not require broad regression coverage, a test-management SaaS, video recording, automatic model judging or production analytics. It does not change game rules. It supplies a disciplined path for exploring the POC.
