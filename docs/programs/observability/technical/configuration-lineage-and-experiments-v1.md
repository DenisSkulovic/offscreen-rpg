# Configuration lineage, prompt governance and experiment decisions V1

**Status:** Wave-5 technical/product design, Proposed (2026-11-15); **no prompt registry, flag system, Admin editor or code changes authorized**. Source inspected after OBS00-A/OBS01 landed on `main@010c980`. Related [context source provenance](context-provenance.md), [prompt source map](storyteller-prompt-source-map-v1.md), [Turn Evidence Capsule](forensic-turn-capsule-v1.md), [evidence claims](evidence-claims-and-quality-v1.md), [Admin security](forensic-access-and-read-contract-v1.md).

## 1. What must be answerable for every real turn

> Exactly which instructions, creative settings, world/rules, runtime policies, model route and experiment decisions were **effective** for G and/or round A when the request was actually prepared and dispatched? Which source version supplied each? What override changed it? When and by whom, **when known**?

This is much more demanding than archiving one final prompt string or the current profile name.

**Four independent identities** should exist in historical metadata:
1. **Definition identity:** immutable code-backed component, authored DB setting/profile/prompt, canonical world source or external policy.
2. **Selection identity:** why this definition was chosen over other eligible alternatives, and in which source scope/version.
3. **Effective value identity:** exact merged/derived value **actually consumed by task preparation**.
4. **Dispatch-time authorization:** current server-owned funding/entitlement/route authority, which may differ from the creative settings frozen earlier. This is a **fence**, not a chance to silently rewrite old creative prompts.

## 2. Source-grounded current owners

| Configuration family | Current real source | What is already versioned | Missing forensic information / future owner |
| --- | --- | --- | --- |
| **Storyteller instructions** | `packages/storyteller/src/tasks/index.ts` code constants and task-specific branches | `promptVersion='storyteller.v17'`, task/request schemas | Exact component IDs/source file/git SHA/content SHA, branch/interpolation/transform chain and original build, because code may change without promptVersion bump |
| **Storyteller profiles** | `packages/storyteller/src/profiles/index.ts`, JSON definitions | Catalogue resolves `profile.id/revision`, validated profile content | Repo build/path/content SHA and historical provenance of the selected definition, not invented DB editor |
| **User creative settings** | `campaign/settings.ts`, `campaign_settings(storyId,revision,settings,profile)` | Immutable revision and profile snapshot; accepted settings command | Which field came from baseline profile, player edit or preset, accepted operation/actor and effective merged field |
| **Saved player presets** | `storyteller_preset(ownerId,creative,profile)` | Save identity and owner, checked against catalogue | Preset creation time/owner, selected preset ID at actual settings command, effective value lineage; don't assume admin editor history |
| **World/rules canon** | Pinned `story_document_commit/rootHash`, package manifest/section IDs | Manifest root/revisions/hashes | Selector result, eligibility, actual loaded bytes/version and chosen sections per G/round |
| **Gameplay configuration** | `campaign_settings` including pace/time/risk, plus current campaign clock/holds | Settings revisions, commands, current state | Original settings vs current running state vs future projection, actual authorizing effect on a transition |
| **Usage/recipe policy** | `story.usagePolicy` and frozen `task.resources.authority.policy`; `resolveEffectiveUsagePolicy` pure intersection | Platform/entitlement IDs+revisions, restrictions list and per-limit sources in effective policy | *Independent current server-owned policy loader* for provider dispatch **not yet wired** (OBS00-B); policy source snapshot/custody and exact denial/allow reason |
| **Model/provider request** | Execution policy, task provider dispatch and OpenRouter adapter | Route/output policy/request packet SHA | Final transport equality, per-round request identity and independent current authority, no fake “sent packet” on prepared-only |
| **Feature flags/AB testing** | **No general assignment/evaluation system demonstrated in inspected source** | None proven | Future flag/experiment definition, assignment and effective decision per actual operation; mark `not-configured` until it exists |

**Source update:** OBS00-A landed at `main@010c980` and now uses `wrapApprovedWorkerProvider(provider,execution)` to forward the whole `(task,dispatch)` pair. OBS00-B remains blocked: `readStorytellerWorkerOptions` explicitly supplies **no** `dispatchAuthority`. This matters for both true policy provenance and actual provider custody.

## 3. EffectiveTurnConfigurationV1

Not a global mutable `GameConfig`, and not a second owner of all settings. A strict **resolved provenance manifest** linked to a particular G/attempt:

~~~ts
type EffectiveTurnConfigurationV1 = Readonly<{
  version: 1;
  storyId: UUID;
  generationId: UUID;
  attemptId: UUID | null;
  roundId: string | null;
  taskPurpose: TaskPurpose;
  code: { buildId: string; promptCompilerId: string;
    promptCompilerVersion: string; providerAdapterBuild: string };
  captured: {
    campaignSettingsRevision: number | null;
    originalProfileId: string;
    originalProfileRevision: number;
    effectiveProfileSha256: SHA256;
    storyDocumentRootHash: SHA256 | null;
    rulePackageRefs: readonly ImmutableSourceRef[];
    selectedRecipeVersion: string;
    capturedEffectiveUsagePolicySha256: SHA256 | null;
  };
  values: readonly ConfigFieldResolutionV1[];
  dispatch: {
    independentlyResolved: boolean;
    currentAuthorityRevision: string | null;
    decision: 'allowed'|'denied'|'unavailable'|'not-applicable';
    reason: ClosedPolicyReason | null;
    reviewedPacketSha256: SHA256 | null;
    actualTransportSha256: SHA256 | null;
    equality: 'verified'|'mismatch'|'not-checked';
  };
  experiments: readonly EvaluatedExperimentAssignmentV1[];
  coverage: EvidenceCoverageV1;
}>;
~~~

**No secrets:** do not include API tokens/credential URLs, raw payment instruments or private account identities in ordinary metadata/OTel. Full creative settings can contain sensitive player prose; an S1 support view gets stable field **category and revision**, not necessarily the values. S3 body/content requires separate permission and audit.

### Field resolution receipt

~~~ts
type ConfigFieldResolutionV1 = Readonly<{
  targetPath: string; // schema-defined, e.g. /creative/tone
  sourceCandidates: readonly {
    sourceKind: 'repo-default'|'profile-definition'|'player-settings'
      |'player-preset'|'rule-package'|'server-policy'|'runtime-derived';
    sourceId: string;
    immutableRevision: string;
    contentSha256: SHA256;
    settingOperationId: UUID | null;
    editorOrActorId: string | null; // only if real source proves it
    disposition: 'base'|'overrode'|'selected'|'rejected'|'not-evaluated';
  }[];
  resolver: { ruleId:string; ruleVersion:string; codeBuildId:string };
  effectiveValueArtifactId: UUID | null;
  effectiveValueSha256: SHA256;
  decisionReason: ClosedReasonCode;
}>;
~~~

For a code-backed instruction there is an original Git commit/build and content SHA, **not** a fictional row in an editable prompt database. For a campaign settings edit there is actual `campaignCommand`/revision/owner; show the exact field override where the source supports it. If settings are serialized but there is no known editor, say unknown.

**A prompt component may be transformed** by schema-projection/escaping/rule interpolation. Record **input component hash**, resolver transform ID/version and **actual emitted component/request field hash** separately. Exact final packet mapping is owned by [the source map](storyteller-prompt-source-map-v1.md), not regex string search.

## 4. The provenance user journey that justifies this

A developer compares G102 (wrong mood) and G103 (correct mood). The Context Inspector reports:

~~~text
Storyteller profile: id=..., revision 3 (same both turns)
Effective creative setting: tone overridden at settings rev 7 → 8
Source of rev 8: accepted player setting operation O88
Instruction component: system/task-consequence, Git build B unchanged
Canonical root: H13 unchanged
Provider route: R unchanged
Final packet: different user/profile section SHA after override
Conclusion [Recorded]: effective profile text changed via player settings
Root-cause hypothesis: the tone change may explain the different style
~~~

The original operation/setting revision can be inspected; the UI must not claim the changed tone **caused** the model's exact word choice without stronger evidence.

A second case compares two turns with same settings revision but different deployed Git build; the inspector shows **prompt code hash changed**, not “the user edited Storyteller personality”. Distinguish definition edits, selection and effective value, and transport.

## 5. Experiment flags and A/B assignments, future-only

A/B testing is a genuine possible source of diagnostic variance, but **there is currently no evidenced generalized flag platform**. Do not attach invented `variant='control'` to all historic operations.

When/if introduced, require:

~~~ts
type EvaluatedExperimentAssignmentV1 = {
  experimentId: string;
  experimentRevision: string;
  evaluatedAt: ISOTime;
  assignmentPolicyId: string;
  assignmentPolicyVersion: string;
  eligible: boolean;
  assignedVariantId: string | null;
  matchedRuleIds: readonly string[];
  overrideSourceRef: ImmutableSourceRef | null;
  effectiveFlagValueArtifactSha256: SHA256;
  appliedTo: 'source-selection'|'prompt-compiler'|'provider-route'
    |'mechanical-rule'|'ui-presentation';
  producerBuildId: string;
};
~~~

- Freeze **actual evaluated variant and reason** in the operation where it had an effect; do not rely on current experiment admin settings months later.
- Persist a real override actor/approval for manual variant change; no inferred editor history.
- Separate assignment from downstream usage: a variant can be assigned but not actually applied if a higher-priority source/permission vetoes it.
- Never let feature flags silently weaken mechanics/payment/user-grant authority. Game rule experiments need their own approved rule version and replay compatibility.
- A variant can affect **context selection**, **prompt compilation**, **model route** or **UI presentation**. Record this dimension so comparisons don't falsely attribute a visual change to a model change.
- Cohort analytics should be aggregated/redacted. Exact player assignment is private metadata; not a Prometheus high-cardinality label.

## 6. Governance for editable prompts, *if later accepted*

**Do not migrate source-backed prompt constants into DB merely to make Admin display an edit button.** The immediate design can fully trace code-backed definitions through Git. A future product authoring workspace may legitimately manage instructions with immutable content versions and review, in which case:

- Definition: `id,version,contentSHA,bodyArtifactRef,creator,createdAt,approvalState,approvedBy,approvalAt,scope`.
- Release: explicit environment/tenant/story assignment with effective start/end and signed change record, **not** a mutable “latest” alias used by in-flight G.
- Activation: evaluated source version frozen into `EffectiveTurnConfigurationV1` and packet compiler.
- Rollback: new activation event points to old immutable version; never mutate old definition or past G.
- Privacy: source content protected where it embeds customer-specific customization; global instruction text can be less sensitive but not a credential dump.
- Failure: if version missing/revoked/inconsistent, do not silently substitute another instruction under the old promptVersion.

This is a **separate product/security architecture decision**. A prompt editor is not required for the initial forensic system to have elite source provenance.

## 7. Validated “why” and negative tests

1. Code constant changes without numeric promptVersion bump: build/path/content hashes still distinguish generations.
2. Saved preset selected at settings R7: source preset ID and accepted settings command recorded; unrelated later preset edit cannot change G.
3. Player setting changed after G capture: old G uses frozen R7, new G uses R8; no latest source substitution.
4. Compiled profile ID/revision same but creative override different: effective merged hash differs and origin explains it.
5. Policy captured as allowed but independent **current** entitlement revoked: provider send denied, recorded policy decision independent of captured task. OBS00-B remains blocked until true resolver exists.
6. Static worker execution JSON equals task execution: **not** sufficient for account entitlement/usage authority.
7. Repair/memory round dispatch uses new per-round request; **OBS00-A forwarding** must preserve it, but packet must still be verified against actual last serializer.
8. No experiment platform: `not-configured` and **no assignment ID**; never fake control variant.
9. Experiment assigned but source feature vetoed: separate assigned/applied status, no erroneous applied flag.
10. User with S1 Support grant: can see “creative setting revision changed” when necessary, not raw sensitive tone/direction content.
11. Ineligible/unknown config source: source gap explicitly recorded; no fabricated editor, approver or version.
12. Historical task schema v16 vs v17: old values decoded by pinned archive codec, not coerced into newest profile compiler.

## 8. Implementation staging

1. **First:** OBS03's one-purpose prompt provenance manifest uses current real `campaign_settings` and repo profiles/task source. Focus on stable original version/hash and effective config, no new DB registry.
2. **Then:** a read-only comparison projection for two G, with original source revision differences; private content gated.
3. **Later:** a separately accepted independent live current-entitlement resolver (OBS00-B), with policy decision provenance and no automatic paid test.
4. **Only when needed:** authored prompt registry, experiment assignment service and broader Admin authoring UX.

**Not in scope:** changing pricing/entitlements, adding experimental model routing, introducing product-level variants now, altering prompt content for diagnostic convenience or enabling live provider spend. Historical truth is a product output in its own right, not an excuse to expand runtime authority.
