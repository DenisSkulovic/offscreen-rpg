# Context Provenance | Know exactly what the Storyteller was given

**Status: technical target with landed custody subset, reconciled 2026-11-15.** This is about the *actual* input used by a real Storyteller operation, not a synthetic explanation reconstructed from the latest settings. Context and prompt policy remain owned by [Storyteller](../../storyteller/prompt-tools-and-models.md); [data capture authority](evidence-model.md) defines storage and links.

**Landed (bounded, not production entitlement):**
- [OBS00-A](../../../changes/open/2026-11-15--obs00-live-provider-custody/CHANGE.md) — provider forwarding / review custody path for the authorized slice.
- [OBS00-C](../../../changes/archive/2026-11/observability/2026-11-15--obs00-c-provider-wire-equality/CHANGE.md) — reviewed `packet_sha256` must equal `prepareWire` bytes before reserve/dispatch; mismatch refuses without HTTP ([provider-dispatch-review](../../../technical/provider-dispatch-review.md)).
- [OBS00-L](../../../changes/archive/2026-11/observability/2026-11-15--obs00-l-local-story-trial-guards/CHANGE.md) — local Story-mode stop/restart + DB-enforced trial caps (not OBS00-B).
- [OBS03](../../../changes/archive/2026-11/observability/2026-11-15--obs03-prompt-provenance/CHANGE.md) — first redacted consequence prompt sidecar / G metadata chain (final transport lineage still partial; see [OBS03 quality review](../evidence/obs03-provenance-quality-review-2026-11-15.md)).

**Still blocked / not claimed:**
- **OBS00-B** — default-worker / production current usage-authority resolver ([dispatch preflight](../evidence/live-worker-dispatch-preflight-2026-11-15.md)).
- Unified provenance graph of every selector/omission decision; raw full-context archive; production OTel.
- Paid live Story trial — requires a **fresh** owner spend authorization.

## 1. “What did it know, why, and from where?” is a data question

An investigator must be able to select generation G at historical moment T and trace:

~~~text
accepted cause + frozen game/state/source version
  -> task purpose + selected recipe + captured permissions
  -> source candidate catalogue (eligible, rejected, missing)
  -> canonical documents/passages/notes and exact versions
  -> context assembler and truncation/selection policy
  -> resolved prompt components (platform/task/personality/world/history)
  -> effective player/campaign settings and overrides
  -> feature/experiment decisions, validator + compiler build
  -> exact serialized provider request after output-schema projection
  -> visible response/tool/rounds + reported usage
  -> validation, publication and actual scene
~~~

The forensic viewer must distinguish:

- **Candidate:** known to the selector, never fetched or used.
- **Selected:** chosen for retrieval, not proof it loaded.
- **Loaded:** bytes fetched/validated, not proof included in packet.
- **Packed:** added to a draft packet but possibly pruned for size.
- **Final-included:** exact serialized bytes contributed to the **actual** dispatch.
- **Model-cited:** model output cites/uses source evidence, where detectable and validated.
- **Published:** resulting claim/change was admitted, not simply generated.
- **Unavailable/rejected:** missing/corrupt/forbidden/stale/truncated with a concrete reason.

**Diagnostic example:** “The relationship note existed in CAS, but the final request lacked it because the memory budget selected recent scene passages first” must be supported by recorded candidate, selector decision, omission cause and final packet section map. If candidate enumeration wasn't recorded, label that fact **unknown**, not “not considered.”

## 2. Do not invent a database prompt registry where source is code

As inspected on main 2026-11-15:

- `packages/storyteller/src/tasks/index.ts::requestFor` constructs task-specific instructions and output schema; `prepareStorytellerTask` freezes `inputVersion:17` and `promptVersion:'storyteller.v17'`.
- `packages/storyteller/src/profiles/index.ts` imports profile JSON under `profiles/definitions/`, validates identity/revision and produces the catalogue. These are **repository-backed definitions**, not currently a general mutable DB prompt management system.
- `packages/application/src/storyteller/task-admission.ts` derives effective usage/recipe and prepares the admitted task; `application/storyteller/context.ts` and `canonical-knowledge.ts` gather frozen SQL/CAS evidence and bounded omissions.
- `packages/storyteller/src/context/index.ts::boundStorytellerContext` prunes optional passages under size constraints; the task contains a `contextManifest` with limited evidence information.
- `packages/storyteller/src/providers/openrouter.ts::buildOpenRouterRequest` projects the final request to a provider-specific protocol and `inspectOpenRouterRequest` can compute request/schema hash/bytes.
- `application/storyteller/memory-exploration-controller.ts` persists multi-round operation state and pending model-request artifacts in `storyteller_memory_exploration`, but **not yet a unified graph of every provenance decision**.
- [SA01 operation trace](../../storyteller/evidence/sa01-operation-trace-sample-2026-11-14.md) is **fixture/lab output**, **not live runtime tracing**.

An “instruction ID and editor history” is possible only if the instruction is an actual mutable governed entity. Until then, the real identity must include **`origin='repo'`, Git commit/build, source path, stable component name, content SHA and prompt-compiler version**. Mark `editedBy` as “Git provenance”, not fictitious staff editor ID. Later authored prompts can use an immutable DB registry with actor/version/audit; both sources converge into one provenance interface. Current player-owned campaign settings already have `campaign_settings` revisions and may refer to the initiating command; preserve the authoritative command/account context.

**Reject retrospective false precision:** a compiled prompt string plus current prompt definitions cannot prove what an old provider received. A matching old `promptVersion` string alone is insufficient if source was hotfixed without the version changing. Store actual packet SHA and exact protected bytes at dispatch, plus build/deployment identity.

## 3. PromptComponentV1 / PromptAssemblyV1

A prompt is a **compiled immutable artifact** plus a **component map**, not just messages[0].content. The map provides editor, ownership, ordered sections, override resolution and byte ranges that match final serialized output.

~~~ts
type PromptComponentV1 = Readonly<{
  key: string; // e.g. platform/game-authority, task/consequence,
               // profile/character-driven-drama, rule/time, scene/current
  purpose: 'platform' | 'task' | 'creative-profile' | 'campaign-config'
    | 'rule' | 'world' | 'current-situation' | 'history' | 'tool-evidence'
    | 'output-contract';
  source: {
    kind: 'code' | 'profile-definition' | 'pinned-library'
      | 'story-setting' | 'prompt-registry' | 'runtime-derived';
    logicalId: string;
    immutableRevision: string;
    gitBuildId: string | null;
    sourcePath: string | null;
    sourceArtifactSha256: SHA256;
    editedBy: string | null;   // only if actually known and authorized
    approvedBy: string | null; // only if actual review occurred
    sourceVisibility: 'player' | 'restricted';
  };
  order: number;
  contentSha256: SHA256;
  contentBytes: number;
  finalPacketMessageIndex: number | null;
  finalPacketByteRange: { start: number; endExclusive: number } | null;
  status: 'used' | 'overridden' | 'pruned' | 'ineligible' | 'not-run';
  decisionId: UUID | null;
  reasonCode: string | null;
}>;

type PromptAssemblyV1 = Readonly<{
  generationId: UUID;
  taskInputArtifactId: UUID;
  providerPacketArtifactId: UUID;
  contextArtifactId: UUID;
  compiler: { name: string; version: string; gitBuildId: string };
  serialization: { codec: string; providerProtocol: string };
  components: readonly PromptComponentV1[];
  coverage: 'exact-packet' | 'metadata-only' | 'partial';
}>;
~~~

**Byte spans are optional when the provider format transforms a component** (e.g. JSON schema projection or token-safe escaping). In that case record a transformation step and message/field pointer into the final bytes. Byte-accurate source maps require the compiler to emit offsets while compiling; do **not** locate strings later via ambiguous substring search, particularly when the same paragraph appears twice.

### Provenance layers to retain

| Layer | Minimum provenance | Why |
| --- | --- | --- |
| Game authority/core rules | immutable component key, source build/version/hash | Investigate policy regression |
| Task-specific contract and output schema | task kind, prompt/compiler schema versions, projected provider output schema hash | Distinguish model instruction vs validator/transport drift |
| Storyteller profile | profile ID/revision/hash, selected task guidance, code/catalogue origin | Understand tone/initiative and revision |
| Campaign/player settings | exact settings revision/command actor and effective merged values, default/override decision | Distinguish user changes vs platform defaults |
| Pinned world/rules | package root hash, section ID+revision/hash, selection rule/reason | Which rules and lore were truly available |
| Current/game state | frozen `storyId`/passage/revision, accepted operation/receipt, actor/world/time/hold snapshots | Never narrate unearned actions |
| Active scene and continuity | required IDs, source sequence, note provenance, selected/loaded/omitted reasons | Explain lost memory |
| Canonical entities and retrieval | document root/revision; candidate IDs, index version, filters, score/bound, exact CAS bytes | Why a person/fact was recalled or missed |
| Model memory/tool rounds | requested handles, tool schema/version, result IDs and read limits, final evidence pack | Understand real search behavior |
| Funding/dispatch and route | effective usage policy, model/provider route/config version, token caps, price version | Why more rounds did/didn't occur |
| Experiments/flags (future) | assignment ID, experiment revision, variant, bucketing policy ID, allocation timestamp and override | Explain A/B behavior without guessing |

**Experiment labels are not runtime authorization.** Any use of flag/variant must be captured as an *effective immutable decision*, with the evaluated rule and source. If the current POC has no experiment/flag system, mark those fields **not-applicable**, not invented “control” variants.

## 4. Configuration provenance must be effective, not merely a history of edits

For a turn, show a **configuration resolution sheet**:

| Field | Base source | Override candidate | Effective value at admission | Why |
| --- | --- | --- | --- | --- |
| Storyteller profile | definition profile ID/revision | player selected profile revision | captured immutable profile content/hash | selected at Start or revised settings |
| Story risk/pace | campaign settings version | player command with operation ID | captured revision with exact merged policy | accepted settings command |
| Memory exploration | default off | supported creative request + usage-policy cap | chosen recipe/round budget/version | deterministic policy gate |
| Model route | story execution policy | live dispatch authority may restrict | actual dispatched model/protocol/price version | final account/route validation |
| Document selection | pinned canon root | active scene/recall cues/selector | selected source IDs and inclusions | selection rule and budget |

A revision log answers **when values changed**. A turn-level effective record answers **which value the engine actually used**. Both are necessary. An operation admitted before a settings change may legitimately run using its earlier captured configuration while later dispatch authority gets stricter; the viewer must show both snapshots and their separate authority.

Use stable value **hashes for repeated large settings**, but retain a protected typed artifact when full reconstruction is promised. Show a diff with provenance in the inspector, never let a UI merge silently promote a later override into an older turn.

## 5. Source selection explanation as executable design

Each selection algorithm should emit a **compact typed decision record** alongside the normal chosen context, not print internal logs:

~~~ts
type SourceSelectionDecisionV1 = Readonly<{
  selectorId: string; selectorVersion: string; buildId: string;
  generationId: UUID; capturedRootHash: SHA256 | null;
  sourceId: string; sourceRevision: string | null;
  sourceKind: 'passage' | 'continuity-note' | 'canonical-doc'
    | 'rule-section' | 'world-section' | 'memory-unit';
  role: 'mandatory' | 'eligible' | 'optional';
  disposition: 'selected' | 'loaded' | 'included'
    | 'omitted' | 'rejected' | 'not-evaluated';
  reasonCode:
    | 'required-current'
    | 'active-scene'
    | 'continuity-source'
    | 'pinned-rule'
    | 'recall-cue-match'
    | 'outside-scope'
    | 'visibility-denied'
    | 'source-missing'
    | 'corrupt-source'
    | 'read-budget'
    | 'byte-budget'
    | 'loaded-then-pruned'
    | 'duplicate'
    | 'stale-root'
    | 'not-applicable';
  rank: number | null; candidateSetSize: number | null;
  estimatedBytes: number | null; actualIncludedBytes: number | null;
  retrievalArtifactId: UUID | null;
}>;
~~~

**Avoid combinatorial explosion:** one decision per *bounded evaluated* source (a real candidate set), not every row in the story database. Exact selection rules and ranked candidates can be archived once per context operation. Quiet deterministic shifts without model work have **no prompt assembly**, with an explicit not-run status rather than a zero-length fake packet.

## 6. Exact packet, model output and the “thoughts” limitation

Archive a protected `provider-packet.v1` with original wire-serialization bytes, model route, response-format/schema projection, all visible instructions and request message order. **Do not archive credentials or auth headers.** A separate content-addressed component map points to its sections and recognized source blocks. The exact bytes must be verified against `sha256` before and after storage; the same hash carried in attempt/review metadata ties to the actual send.

Archive provider-returned output/streaming final result, usage/finish-reason and any **externally visible** tool calls, responses or provider-visible reasoning summary if offered and permitted. We may retain application-side structured intent/selection/rule rationales, tool result eligibility and validator issues; these are **observations and deterministically recorded decisions**. **We cannot reconstruct unprovided internal model chain-of-thought**, and a language model's explanation of why it chose something is not proof of its hidden decision process. UI wording should be “Model output and recorded decisions”, not “Read the AI's mind”.

Separate **provider outcome** (sent, uncertain, settled), **candidate quality** (validated/rejected), **game effect** (accepted/settled) and **publication** (published/stale/blocked). These can have different timestamps and statuses for the same G.

## 7. Versioning and migrations

- Record **application build** (Git SHA, package build IDs), prompt compiler/policy version, Zod schema reference, profile/package revisions and provider adapter version.
- Prefer immutable component IDs and hashes over mutable aliases; a label such as `production` is resolved and frozen **at admission/dispatch**.
- Old archived envelopes remain decodable through explicitly tested readers/upcasters; rewriting old evidence or “updating” historical prompt bodies in place is forbidden.
- Display source edit/audit provenance only when supported by actual repo history or persisted admin/player settings commands. If a definition lacks editor history, show “editor history unavailable”.
- **Optional Langfuse or future registry:** it may provide a prompt management UI/version history and link to traces, but the game's source of truth remains the captured effective instruction reference and packet. Never make an external dashboard the only holder of business-critical forensic data.

## 8. Tests and anti-fictions

1. Two turns with identical profile name but different Git/content hashes are distinguishable.
2. Two settings revisions with same displayed label yield distinct effective snapshots.
3. Required canonical doc selected then CAS missing fails, with **no fabricated inclusion**.
4. Loaded passage later pruned remains “loaded, omitted from final”, not model-visible.
5. One provider byte changes and packet hash differs; inspection finds the true compiled component path.
6. Tool read retrieves fact but resulting final packet prunes it; model “didn’t use” cannot be asserted solely from inclusion.
7. Hidden NPC/private story/payer data is never available in support-safe projection.
8. Old prompt cannot resolve via current `latest` alias; old build or immutable revision required.
9. Paid attempt uncertain is not shown as “0 tokens” or “free”.
10. Two model rounds have distinct packet IDs/response hashes and one parent G; no fake agent loop for one-shot.
11. A feature flag record exists only when evaluated, with real assignment and policy source; absent flags do not become “off by default” evidence.
12. Sensitive body expires or is erased: metadata/provenance remains according to policy but inspection clearly says “content unavailable / retained only as integrity hash”.

**Exit gate:** given one real, deliberately created provider-disabled historical turn, the engine produces a machine-checkable manifest mapping each final request segment back to the exact historic source and its decision. An audit script can compare the retained packet hash to the bytes actually passed to the transport. Without that equality proof, the design cannot honestly claim precise context reconstruction.
