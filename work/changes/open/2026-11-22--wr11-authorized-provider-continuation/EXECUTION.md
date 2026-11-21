# WR11 | selected server admission and distributed continuation algorithm

## Gate 0, source rebase

Do not begin implementation until WR10 source/positive and financial negative tests are integrated and actual types match private prepare/outcome/status and executor adapter. Require TURN03 scripted cold-kind baseline (or mark live KIND proof blocked; source implementation may proceed once WR10 is verified). Fix no new transport/budget schema in this packet. The planner, not Cursor, owns any mismatched interface decisions.

## Admission mode, one authority transaction

Introduce server-owned immutable WriterContinuationMode = scripted | provider with policy object from GA host configuration, **default scripted**. Provider mode only with explicit server mode flag, allowlisted OpenRouter provider+exact model/priceVersion, max token and worst-case price cap, healthy current owner funding/run and opt-in consent already stored by authority. No client request field can enable provider or choose prices. For this first slice use a disposable test-only enabled policy injected at GA composition; production flag stays off unless a later separately granted live run. At scheduleWriterContinuation(tx,input), select policy once BEFORE generation insertion. Build capture v3 modelSelection and pinned price/profile hash, preserving capture canonical sha, owner/root/campaign/controlling intent. For scripted route retain bit-identical modelSelection and old wake topic. For provider create new outbox topic writer.scene.provider.v1 (id/operationId=missionId), new workflow type writerSceneProviderV1 with id writer-scene-provider/<missionId>. Existing mission replay reads its recorded outbox topic and validates it against pinned captured mode; it must not decide a new mode on retry. One transaction owns both mission generation/step and outbox. No provider request on this path, only scheduled work.

## Temporal workflow orchestration, no SQL in executor

Add WriterProviderSceneActivities with:
- control side observeWriterProviderMission(missionId): returns strictly bounded status union {kind:'ready',ordinal,attemptId} | {kind:'round-settled',ordinal} | {kind:'proposal-ready'} | {kind:'held'|'uncertain'|'failed',reasonCode}, reading GA private control API.
- executor side executeWriterProviderRound(missionId,ordinal,attemptId): uses WR10 private client and adapter, returns only {status,attemptId,requestSha256} after submit; any lost/ambiguous send -> uncertain and no internal retry.
- control side advanceWriterProviderMission(missionId,ordinal): GA reads committed private CAS, invokes idempotent WR09B decision interpreter/tools, prepares next model-step if needed, or marks proposal-ready, never returning text.
- control side publishWriterProviderScene(missionId): GA transaction calls existing publishAcceptedWriterScene with a validated rehydrated proposal, same source pin and expected story revision.

The Temporal workflow loops maxModelRounds captured bound, never recursive, never serializes private prompt/response, uses separate control/executor TaskQueues already in workflows/index.ts. All provider transport activities have retry.maximumAttempts=1, and restart logic observes mission state before any new send. If unconfirmed execution, STOP/hold; do not invoke again merely because a Temporal Activity timed out. Publish success and duplicate delivery idempotent. Controller role cannot impersonate executor and vice versa.

## Child research and bad outcomes

Provider mode v1 permits mandatory read-only Library tool calls and final v3 proposal, **not research.delegate**. If model emits research.delegate, the GA interpreter reports held unsupported_tool without spending a second parent call or granting publish to child. No latent child workflow auto-spawn. Wrong actor/root/source proof, malformed tool, stale checkpoint, unexpected policy price, provider timeout/unknown, corrupted CAS or too-many-rounds fail closed; preserve operation funding and uncertain accounting. Valid final commits one new scene and offered decisions; web and terminal consume same ordinary StorySnapshot.

## Bounded paid qualification (optional only)

Free positive and negative gates must all pass: full affected build/typecheck, WR10 private HTTP receipt and SQL custody faults, two-round fake Writer tool/scene, authenticated player scene2, recovery/duplicate and TURN03 scripted cold-kind. Then propose exact one allowlisted model and price-version; maximum three calls across at most three separately admitted disposable missions, hard cumulative cap USD 0.75 (750_000 microusd), and **each mission** must stay within its existing writerContinuationMissionBudgets.maxMicrousd=250_000 (USD 0.25) across all its rounds. Calculate worst-case model charge against the **smaller** of the exact stored mission balance and preauthorized account/run allowance before each send; stop when the sum cannot fit, never increase the captured budget to fit the smoke. Block if budget/price data cannot guarantee ceiling. No auto-fallback, no retries of unknown, no child calls, logs redacted. **User must explicitly authorize paid execution at that stage**, and supply secret via approved local config; otherwise NOT RUN. A fake-model test cannot count as live-model proof. This is not permission to deploy a permanent provider flag.

## Proof

Run original scripted regression and new provider workflow/GA/worker tests on disposable SQL/Temporal fake; one local integrated player flow through actual API/GA/outbox/Temporal executor on fake fetch, then controlled test Pod restart. Actual kinds/real provider may be NOT RUN, not Pass. No changes to Nest StoriesController or CLI auth schema.
