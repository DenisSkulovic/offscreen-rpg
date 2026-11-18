/**
 * Frozen held-out questions for the deterministic wiki finder.
 * Gold is the governing heading and its authority. Do not edit a target
 * page so a miss becomes a hit. This file is not an input to route scoring.
 */
export const HELDOUT_SCHEMA = 'wiki.heldout.v1';
export const HELDOUT_K = 5;

export const REQUIRED_CASES = [
  'proposed-raw-prompt-access',
  'old-notification-vs-get',
  'accepted-time-dependencies',
  'unknown-charged-attempt',
  'world-package-pin',
  'no-humanoid-assumptions',
  'shared-consent-proposal',
  'retention-stays-proposal',
  'turn-evidence-capsule-stays-proposal',
  'scene-direction-uncertain-not-paid',
  'prohibited-staff-read',
  'unratified-grant',
];

export const QUESTIONS = [
  {
    id: 'raw-prompt-staff-read',
    cases: ['prohibited-staff-read', 'proposed-raw-prompt-access', 'turn-evidence-capsule-stays-proposal'],
    prompt: 'May a staff worker read any player complete raw prompt under the Turn Evidence Capsule?',
    gold: {
      ref: 'docs/technical/observability/identities-and-evidence.md#turn-evidence-capsule',
      status: 'proposal',
      negative: "cannot treat this contract as permission to read any player's complete raw prompt",
      stop: 'proposed/blocked; a staff read of a raw prompt is not selected',
    },
  },
  {
    id: 'turn-capsule-nested-proposal',
    cases: ['turn-evidence-capsule-stays-proposal'],
    prompt: 'The evidence graph page is a selected target. Does that make the Turn Evidence Capsule a selected read contract?',
    gold: {
      ref: 'docs/technical/observability/identities-and-evidence.md#turn-evidence-capsule',
      status: 'proposal',
      negative: 'No table, API or code is authorized by this section',
      stop: 'proposal nested in a selected page; not a selected grant',
    },
  },
  {
    id: 'raw-prompt-proposed-page',
    cases: ['proposed-raw-prompt-access'],
    prompt: 'Is raw-prompt access in the AI engineering workspace a production grant to open raw prompts?',
    gold: {
      ref: 'docs/product/admin/ai-engineering-and-investigation.md#ai-engineering-and-investigation',
      status: 'proposal',
      negative: 'not a production grant to open raw prompts',
      stop: 'proposed/blocked',
    },
  },
  {
    id: 'retention-unratified-grant',
    cases: ['retention-stays-proposal', 'unratified-grant'],
    prompt: 'Is the 90 day raw artifact retention window an accepted retention policy?',
    gold: {
      ref: 'docs/technical/observability/retention-and-access.md#replay-retention-and-privacy--time-travel-without-rewriting-history',
      status: 'proposal',
      negative: 'It is not an accepted retention policy',
      stop: 'unratified; not a selected grant',
    },
  },
  {
    id: 'folded-invariants-nested-proposal',
    cases: ['nested-proposal'],
    prompt: 'Are the folded invariants from the 2026-11 essays a landed selected contract?',
    gold: {
      ref: 'docs/technical/observability/identities-and-evidence.md#folded-invariants-from-the-2026-11-essays',
      status: 'proposal',
      negative: 'Proposed, not landed',
      stop: 'proposal; not landed',
    },
  },
  {
    id: 'multi-day-family-proposal',
    cases: ['nested-proposal'],
    prompt: 'Is the multi-day evaluation family ratified acceptance?',
    gold: {
      ref: 'docs/product/storyteller/behavior-and-quality.md#multi-day-evaluation-family',
      status: 'proposal',
      negative: 'not ratified acceptance',
      stop: 'Proposed/Blocked',
    },
  },
  {
    id: 'scene-direction-not-paid',
    cases: ['scene-direction-uncertain-not-paid'],
    prompt: 'Is scene-direction production an approved paid provider-writing change?',
    gold: {
      ref: 'docs/technical/client/scene-direction-production.md#storyteller-art-direction--bounded-author--publication--reader-target',
      status: 'uncertain',
      realization: 'not-paid-production',
      negative: 'no automatic provider-writing change is approved',
      stop: 'uncertain; not paid production',
    },
  },
  {
    id: 'old-notification-current-view',
    cases: ['old-notification-vs-get'],
    prompt: 'Following an old notification, is the current story view authoritative?',
    gold: {
      ref: 'docs/product/gameplay/time-and-autonomy.md#notifications-and-reliability',
      status: 'selected',
      negative: 'the current story view is authoritative',
      stop: 'an old notification does not replace the current story view',
    },
  },
  {
    id: 'get-not-sse-hint',
    cases: ['old-notification-vs-get'],
    prompt: 'Does an SSE hint replace the scene, or does GET stay the settled world?',
    gold: {
      ref: 'docs/technical/platform/http-api-and-client-contracts.md#get-truth-and-sse-hints',
      status: 'selected',
      negative: 'Render the next passage from GET',
      stop: 'an SSE message is not a settled world consequence',
    },
  },
  {
    id: 'accepted-time-dependencies',
    cases: ['accepted-time-dependencies'],
    prompt: 'Does a calendar that labels accepted time grant idle time while the player is absent?',
    gold: {
      ref: 'docs/technical/engine/calendars-and-world-time.md#calendars-label-accepted-time',
      status: 'selected',
      negative: 'It does not grant idle time',
      also: ['Permission to advance'],
      stop: 'the label depends on permission to advance and does not grant idle time',
    },
  },
  {
    id: 'unknown-charged-attempt',
    cases: ['unknown-charged-attempt'],
    prompt: 'May an uncertain charged provider dispatch start a second paid call?',
    gold: {
      ref: 'docs/technical/storyteller/provider-boundary.md#attempt-custody-and-an-unknown-call',
      status: 'selected',
      negative: 'an uncertain charged dispatch does not start a second paid call',
      stop: 'unknown charge; do not start a second paid call',
    },
  },
  {
    id: 'unknown-metering-stop',
    cases: ['unknown-charged-attempt'],
    prompt: 'What should admission do when required metering for a charged attempt is absent?',
    gold: {
      ref: 'docs/technical/platform/spending-and-entitlements.md#window-accounting-and-admission',
      status: 'selected',
      negative: 'Required metering absent means unknown',
      also: ['stop further paid admission'],
      stop: 'unknown; stop further paid admission until reconciled',
    },
  },
  {
    id: 'world-package-pin',
    cases: ['world-package-pin'],
    prompt: 'Does updating a reusable world library silently rewrite a campaign that pinned that world package?',
    gold: {
      ref: 'docs/technical/storyteller/canonical-documents-and-packages.md#reusable-world-libraries-and-campaign-overlays',
      status: 'selected',
      negative: 'does not silently rewrite an existing campaign',
      stop: 'a pin does not follow a later library edit',
    },
  },
  {
    id: 'no-humanoid-inventory',
    cases: ['no-humanoid-assumptions'],
    prompt: 'Does a microorganism or a disembodied mind get a humanoid inventory because a human character has one?',
    gold: {
      ref: 'docs/product/gameplay/worlds-and-characters.md#flexible-settings-and-protagonists',
      status: 'selected',
      negative: 'Do not give a microorganism or a disembodied mind a humanoid inventory',
      stop: 'do not invent a humanoid inventory',
    },
  },
  {
    id: 'shared-consent-proposal',
    cases: ['shared-consent-proposal'],
    prompt: 'Is shared consent for collecting conflicting player intentions an accepted product rule?',
    gold: {
      ref: 'work/designs/open/shared-play/README.md#shared-play--open-design',
      status: 'proposal',
      negative: 'Not accepted product mechanics',
      stop: 'proposed; do not implement shared decision resolution from this note',
    },
  },
  {
    id: 'charter-withholds-raw-prompt',
    cases: ['unratified-grant'],
    prompt: 'Does the accepted admin charter grant production raw-prompt access?',
    gold: {
      ref: 'docs/product/admin/charter-and-personas.md#charter-and-personas',
      status: 'selected',
      negative: 'raw-prompt and emergency-edit powers remain absent until a named grant exists',
      stop: 'selected direction; the raw-prompt grant is absent',
    },
  },
  {
    id: 'no-unadmitted-human-action',
    cases: ['shared-consent-proposal'],
    prompt: 'May the Storyteller take an action for a human without an admitted delegation rule?',
    gold: {
      ref: 'docs/product/storyteller/behavior-and-quality.md#what-it-must-not-do',
      status: 'selected',
      negative: 'take actions for a human without an admitted decision/delegation rule',
      stop: 'no unadmitted delegation',
    },
  },
  {
    id: 'green-link-not-semantic',
    cases: ['link-index-not-semantic'],
    prompt: 'Does a green wiki link index make an unratified raw-AI grant into live permission?',
    gold: {
      ref: 'docs/technical/lab/chamber-and-fixtures.md#editorial-comprehension-pass',
      status: 'selected',
      negative: 'A green-link wiki does not make an unratified raw-AI grant into live permission',
      stop: 'a green link index is not semantic correctness',
    },
  },
];
