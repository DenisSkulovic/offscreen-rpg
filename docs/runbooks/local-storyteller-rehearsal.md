# Local Storyteller rehearsal

Two jobs live here, and they do not have the same side effects.

The first job is a provider-free local Chamber demo and its held-packet checks. Those commands do not read `.env.openrouter`, do not construct the live provider adapter, and do not make a model call. Start there for an authenticated local story demo.

The second job is an explicitly authorized paid rehearsal. It is below [Explicitly authorized paid rehearsal](#explicitly-authorized-paid-rehearsal). Do not open that heading for an ordinary no-spend check, a frontend pass, a database test, startup, or an unattended loop.

Ordinary boot stays on [Local development](local-development.md). Disposable `offscreen_db_test` and `offscreen_auth_test` checks stay on [Local integration tests](local-integration-tests.md). An uncertain local Story attempt is recovered from [Uncertain work recovery](uncertain-work-recovery.md). This page does not repeat a provider send, and it does not reset a non-disposable database.

**Explore by question:** [provider-free Chamber](#provider-free-chamber) · [provider-free packet checks](#provider-free-packet-checks) · [profiled rehearsal](#profiled-storyteller-rehearsal) · [mechanical rehearsal](#mechanical-rehearsal) · [paid rehearsal, explicit authorization only](#explicitly-authorized-paid-rehearsal).

## What each command touches

| Command | What it touches | Spend |
| --- | --- | --- |
| `pnpm chamber` | Migrates local `offscreen_chamber`, loopback ports 3001 and 3100, fixture identity | No model call |
| `pnpm chamber:reset` | Drops and recreates only `offscreen_chamber` | No model call. Permanently removes that database's local stories |
| `pnpm chamber --smoke` | Same launcher, headless, then shutdown | No model call |
| `pnpm chamber:packet` and the other held-packet commands in the next section | A temporary evidence directory and a held review | No credentials and no provider release |
| `pnpm test:focus -- storyteller "..."` | Recreates only `offscreen_auth_test` and strips provider opt-in. See [Disposable database checks](local-integration-tests.md#disposable-database-checks) | No |
| `pnpm story:local`, `pnpm story:server`, `pnpm story:play`, and `pnpm chamber:memory-evaluation-run` | `offscreen_story_local` or an evaluation config, plus a live provider credential | Explicit authorization only. Not a test |
| Live model without that authorization, a remote database, or a reset of `offscreen` | No command on this page grants it | Stop |

## Provider-free Chamber

With the Compose services running, dependencies installed and Playwright Chromium available, run `pnpm chamber`. It builds the web/API and opens a separate Chromium window as a local fixture user. No GitHub or model credentials are needed. The Chamber API injects that fixed identity only in this loopback-only developer process, so any browser on the workstation can open `http://127.0.0.1:3100/stories` without a cookie or OAuth redirect. Ordinary application startup still requires real authentication. Chamber uses only loopback ports 3001 and 3100 and refuses occupied ports; stop other API/test processes before starting it. `/demo` on port 3000 remains a separate in-memory prototype.

The launcher creates and migrates the dedicated local `offscreen_chamber` database, retains its stories, starts the API/web/Temporal worker and provisions the stable local fixture user. The served API uses a Chamber-injected identity resolver; no login route or provisioning plugin is mounted, and this behavior is absent from ordinary API construction. `CHAMBER_DATABASE_URL` may change local database credentials, but must still target that exact database on localhost/127.0.0.1; no remote database or URL query overrides are allowed. The default uses the Compose development credentials. Creating the database requires the local role's create-database privilege.

During the pre-POC single-baseline lifecycle, a regenerated baseline cannot migrate an older Chamber schema forward. Run `pnpm chamber:reset` to explicitly drop and recreate only the guarded local `offscreen_chamber` database before launch. This permanently removes its disposable local stories; ordinary `pnpm chamber` continues to retain them and never resets implicitly.

Choose a named scenario from the catalog (stable `chamber.vN` IDs remain the stored source) and retain its URL to reopen the saved story in the launcher's authenticated browser. After start, the player scene uses ordinary production snapshots; a separate Inspector panel shows committed story identity, passage, timing, items, bounded recent history and generation provenance when present. That inspector is read-only in this phase and is mounted only by the local launcher (`createApp(..., { developerTools: true })`), not by ordinary API startup. Relaunching creates a fresh session for the same local user; paste the saved URL into that browser to return. The Stories page lists owned live stories, including chamber instances. Closing the browser or pressing Ctrl+C stops the launched processes, including the worker. Stored timers resume when the worker runs again; this is not an always-on hosted service. Stories and local sessions are not automatically deleted. `pnpm chamber --smoke` runs headlessly, exercises letter delivery/reload, inspector visibility and anonymous-access rejection, then shuts down.

The local launcher also mounts a developer-only scripted Storyteller control at `GET/PUT /api/chamber-tools/stories/:storyId/storyteller-control`. A PUT with `{"action":"arm-hold","expectedRevision":0}` or `arm-failure` targets only that story's next `pending-consequence` generation. GET returns the control revision, state and captured generation ID—never the pending result. Release requires `{"action":"release","expectedRevision":<current>,"generationId":"<captured>"}` and wakes that exact saved generation through the normal outbox/worker path; `clear` disarms an unused control. Optimistic revision conflicts return 409. The launcher reuses the control object across local worker restarts, while generation and wake records remain durable. This is deterministic fault/timing injection for Chamber evidence, not a production administration API or model-latency simulator. The focused offline proof is `pnpm test:focus -- storyteller "worker restart and activity replay settle one finite action exactly once"`. That command follows the disposable-database rule in [Disposable database checks](local-integration-tests.md#disposable-database-checks).

The command does not read `.env.openrouter`, never constructs the live provider adapter and makes no model calls. It is a developer launcher, not public visitor onboarding or the planned live-story POC. Build scripts and tests likewise do not enable inference.

Chromium for the integration suite is recorded under [Identity checks](local-integration-tests.md#identity-checks). This page did not run a browser install.

## Provider-free packet checks

Run `pnpm chamber:packet` for the separate API-only held-packet probe. It provisions a normal authenticated draft and opening entirely through HTTP endpoints, waits for the worker's durable review artifact, verifies that no provider attempt exists, exports the exact credential-free packet under the reported temporary directory and exits. Each artifact is named with its generation ID, so another run does not overwrite the evidence being compared. It does not start Next.js or Chromium. A mandatory hold stops execution before funding reservation, provider construction or network I/O. This mode deliberately uses `dry-run/model-not-selected` with zero placeholder prices: it is for inspecting prompt composition, schema and context boundaries, not evidence that a commercial model or price was selected. It does not read `.env.openrouter`, and no release control is exposed.

Run `pnpm chamber:memory-packet` for the corresponding bounded-memory Gate-0 probe. It writes the maintained 200-passage Greywake corpus and canonical records to the local document store, prepares a minimal creative-exploration continuation with the normal admission/resource code, runs the ordinary durable memory controller and exports its exact first-round review packet. It fails unless the controller is held with one review and zero provider attempts. This is a credential-free structural check of task, context, tool contract and allowance composition; it does not prove retrieval relevance or cheap-model competence, publish a story turn, reserve funds or call a provider.

Run `pnpm chamber:memory-comparison-packets` to capture the fixed `greywake-hidden-key.v1` missing-context case twice from one interaction identity and deterministic canonical root. The brass-key relationship remains in that root and its neutral catalogue entry remains visible, but its body is deliberately unloaded from initial context; neither metadata nor another loaded document states the answer. The first generation admits one model round with tools disabled; the second admits at most two rounds and one canonical read. The launcher verifies that the task excluding resource policy is byte-identical, holds both exact first-round packets with zero attempts and writes a comparison manifest under the reported temporary directory. It does not select a live model, load credentials or release either packet. This prepares a fair capability experiment; it is not evidence that exploration improves gameplay.

Run `pnpm chamber:memory-evaluation-packet -- --config=path/to/memory-evaluation.json` to bind that same Greywake flow to a strict `memory-evaluation-packet.v1` route snapshot. The command parses a freshly verified OpenRouter route and either a one-shot/no-read or two-round/one-read recipe, projects that authority through ordinary admission, captures the exact held first attempt and writes `memory-live-evaluation.v1` beside the packet. For the hybrid memory protocol, it also executes the fixed evaluation case's previously observed canonical lookup through the production index and explorer, then writes the exact native-schema final-round packet as a provider-free projection. Route prices, the full-operation reservation and a zero-repair recipe are captured rather than inferred. Its provider is a tripwire and it neither loads credentials, releases the review, reserves usage nor contacts OpenRouter; the projection records zero attempts and zero spend and is not a released review. The resulting manifest authorizes nothing: each later round still needs its own review, freshness checks, explicit release and settlement reconciliation.

The explicit live counterpart of that held packet is [Live memory evaluation](#live-memory-evaluation). It is not part of this check. Do not run it from this section.

Run `pnpm storyteller:packet-audit` for the faster pure structural comparison of narrative opening, mechanical opening, continuation, consequence and report requests. The default audit also includes human turns 13–15 and a nonhuman fifteen-turn continuity case, checking independently declared evidence coverage and reporting cold serialized-request totals plus potential reusable message-content prefixes. It builds only the Storyteller package, uses deterministic authored fixtures, performs no HTTP/database/provider work and writes a fresh `manifest.json` plus `comparison.txt` beneath the reported temporary directory. Select cases with `-- --cases=scene-continuation,activity-consequence` or a profile with `-- --profile=absurd-action-comedy`. Byte counts and common prefixes are exact; token estimates, provider cache hits, cache-write prices and savings remain unknown. This audit complements rather than replaces the authenticated held-packet probe.

`pnpm chamber:evaluation-packet -- --config=path/to/evaluation.json` is the credential-free Gate-1 variant. Its strict `evaluation-packet.v1` JSON names the exact current model, provider endpoint tag, service tier, ordinary/cache-read/cache-write/output prices and validity interval, account/run identities, case and independently bounded recipe. It permits one primary/in-flight call and zero retrieval, repair, judge, comparison, background or reasoning calls. For the maintained Seyda opening case, the launcher imports and pins the same checked-in world, rules and start-package roots as Story mode before creating the authenticated opening, so the held request includes the real canonical library rather than only a mechanical content ID. The packet already contains the selected model and service tier inside its hashed body. The launcher stops at dispatch review and writes a calculated `live-evaluation.v1` manifest beside the packet. It does not read `.env.openrouter`, provision/enable funding, release the packet or contact OpenRouter. Never reuse an old configuration as current pricing evidence.

## Profiled storyteller rehearsal

Run `pnpm chamber` for the authenticated local launcher, then navigate to `/stories`. Create a draft, select either storyteller, and use a premise such as “I am SpongeBob waking in the pineapple with Gary.” Save, review/generate the opening and Start. Choose offered actions, pause/resume the 20-second quick-play journey, read saved passages and reopen through the Stories list. This is an authored offline rehearsal; arbitrary premises are not improvised. Storyteller profiles are JSON in `packages/storyteller/src/profiles/definitions/`, separate from rehearsal scenes.

Migration `0014_eminent_dagger.sql` adds nullable profile/execution/notes fields and private publication/accounting records. The launcher applies migrations to its dedicated local database. It creates no live funding allowance and does not enable provider execution.

The focused PostgreSQL suite for this rehearsal is a provider-free integration check on disposable `offscreen_auth_test`: [Storyteller integration suite](local-integration-tests.md#storyteller-integration-suite). It is not a live model call.

## Mechanical rehearsal

After the local launcher builds and applies migrations, open `/stories`, create the pineapple/SpongeBob premise, select a storyteller and generate the offline preview. Keep **D&D activity rehearsal** selected, choose the starting speed and optional settings lock, then Start. Town offers work and negotiation; shore offers fishing and coastal travel. The activity worker must be running for scheduled hourly results. Creative settings remain editable unless locked. No live key or provider call is needed. Migration 0015 is new; no database was migrated or application started in the implementation turn.

## Explicitly authorized paid rehearsal

Authorization is required before any command named here and before the paid headings that follow. These commands are the live-provider path. Do not run them as an ordinary no-spend check, a test, startup, or an unattended loop. `pnpm story:local` and `pnpm story:server` read the ignored `.env.openrouter` credential and verify the account and endpoint before enabling a model. Merely launching makes no inference call. That fact is not permission to launch without an explicit spending decision. Billable `pnpm story:play` actions fail closed without `--confirm-live` on that invocation. `pnpm chamber:memory-evaluation-run` requires `OPENROUTER_API_KEY` in the invoking environment and `--authorize`. The launcher does not read dotenv files for that run. None of these commands resets a non-disposable database. The persistent local Story database is `offscreen_story_local`. An uncertain provider delivery stops further admission. Recovery is [Uncertain work recovery](uncertain-work-recovery.md). This page does not repeat a provider send.

## Local live Story mode without OAuth

Explicit spending authorization is required. This heading is not ordinary local startup. The persistent database is `offscreen_story_local`. An uncertain provider delivery stops further admission, and this heading does not repeat a provider send.

For the ordinary player-facing product surface, run `pnpm story:local`. It uses
the normal `/stories`, creation, preview and play pages with a fixed loopback
identity, a dedicated persistent `offscreen_story_local` database and
`data/story-local-documents`. It does not mount Chamber scenarios, inspectors,
fault controls or QA endpoints, and it rejects scripted opening fallback.
Startup reads the ignored `.env.openrouter` credential, verifies account usage
and the exact current OpenAI endpoint before enabling GPT-5.6 Luna. Each turn
permits one buffered strict-JSON call and, only after a settled invalid output,
at most one explicit complete-result repair. Each request remains capped at
12,000 input and, by default, 2,048 generated tokens; both attempts share cumulative
24,000-input, 4,096-generated and $0.01 operation ceilings. Local diagnostics may
explicitly set `--story-max-input-tokens=8000..100000` and
`--story-max-output-tokens=512..8000`; each per-operation token ceiling remains twice
its per-request value, serialized request bytes are bounded at four times the selected
input-token cap, and the independently supplied dollar ceiling still limits the whole
operation. The selected caps are recorded in `data/story-agent/server.json`.
There is no
reasoning, fallback, judge or automatic retry. The local run/account ceiling is
$1 until deliberately changed; an uncertain provider delivery stops further
admission. Exact raw
provider responses are retained under ignored `data/story-local-evidence` for
the owner/Codex debugging loop. Merely launching makes no inference call.

**Restart and finite trial (OBS00-L).** A restart creates missing local funding
rows only. It never clears `storyteller_funding.stopped`, re-enables a disabled
`storyteller_run`, widens a saved cap or resets counters; a stopped account,
disabled run, uncertain attempt or exhausted run makes `--story-mode` refuse to
start live with a safe message (recovery is a separate owner procedure). An
explicit finite trial adds `--story-trial-max-microusd=<1..250000>
--story-trial-max-attempts=<1..4>` (optional `--story-trial-id=<uuid>`, default
`00000000-0000-4000-8000-000000000012`). Both are saved in a dedicated
`storyteller_run` row, so `budget.reserve` enforces the total microusd and
attempt ceiling in SQL, a restart with the same id re-mints nothing, and a
different cap under the same id is refused. These flags are a local lab ceiling,
not a production entitlement, and the local startup-pinned dispatch authority is
not OBS00-B; the generic `apps/worker` stays denied.
Normal non-loopback application startup still requires real authentication.

## Headless play and agent operation

Explicit spending authorization is required. Read-only commands never dispatch inference. `new`, `retry-opening`, `choose` and `retry` fail closed without `--confirm-live`. This flag confirms only that invocation.

`pnpm story:server` starts the same persistent local Story mode API and worker
without Chromium or the Next.js UI. It verifies the configured OpenRouter
account and route at startup but performs no inference. Use `pnpm story:play`
against that server:

```text
pnpm story:play profiles
pnpm story:play starts
pnpm story:play server
pnpm story:play list
pnpm story:play show <story-id>
pnpm story:play new --profile driven-adventure --character Mara --confirm-live
pnpm story:play retry-opening <draft-id> <opening-id> --confirm-live
pnpm story:play choose <story-id> <option-id-or-campaign/path> --confirm-live
pnpm story:play wait <story-id>
pnpm story:play retry <story-id> --confirm-live
pnpm story:play history <story-id>
```

Read-only commands never dispatch inference. `new`, `retry-opening`, `choose`
and `retry` fail closed without `--confirm-live`; this flag confirms only that
invocation and is not stored as background authorization. `retry-opening`
requires the failed preview's draft and opening IDs, consumes only captured
repair capacity, and starts the story after a valid correction. `choose` accepts a narrative option ID
or the complete slash-separated path printed under `campaignChoices`. It waits
up to two minutes for the admitted action and required narration, then returns
the current authoritative state even if work remains pending. Every observation
and mutation appends a private JSONL trajectory under ignored
`data/story-agent/<story-id>.jsonl`, including the exact visible choices,
revision, holds, committed scene, time and usage projection. Provider packets
remain separately captured by Story mode.

The default headless server retains GPT-5.6 Luna and USD 0.01 per operation. A
deliberate stronger-model session can start with reviewed exact arguments, for
example:

```text
pnpm --filter @offscreen/chamber start --story-mode --no-browser --story-model=openai/gpt-5.6-sol --story-max-input-tokens=16000 --story-max-output-tokens=4096 --story-max-microusd=110000 --authorize-story-model=openai/gpt-5.6-sol@110000
```

The launcher freshly verifies the exact OpenAI endpoint and pricing, pins that
route without fallback, keeps reasoning disabled and retains the shared USD 1
local run/account ceiling. The repeated authorization value prevents an
accidental model/cap switch; it does not replace the spending rule or authorize
unattended play. Compare models in separate stories or private evaluation
artifacts so a route change does not masquerade as continuity evidence.
The local creation journey first selects a prepared experience or custom story,
then the player role, Storyteller and final review. Creating the opening is the
first billable action. The UI distinguishes queued/running work, ordinary
failure and billing uncertainty; it never retries automatically.

## Live memory evaluation

Explicit spending authorization is required. This command is for deliberate local evaluation only, never tests, startup or unattended loops.

`pnpm chamber:memory-evaluation-run -- --config=path/to/memory-evaluation.json --authorize=<evaluation-id>` is the explicit live counterpart. Supply `OPENROUTER_API_KEY` in the invoking environment; the launcher does not read dotenv files. It admits only the captured one- or two-round operation under its stated microusd ceiling. Round one is released only after packet, funding and full-operation reservation preflight. If the model submits a valid memory request, deterministic retrieval may produce a second held packet, but the command releases it only after round one has settled with matched charge and a fresh route verification. Any uncertainty, charge mismatch, stale route or unadmitted extra attempt stops the run. This command is for deliberate local evaluation only, never tests, startup or unattended loops.
