/**
 * Finite harbor oracle for long-form acceptance.
 * The eventual target is a 200-scene campaign. This fixture keeps the
 * authored facts that later scenes must preserve, and it does not invent
 * paragraphs for scenes the Living Writer has not published.
 */

export const HARBOR_PROMPT =
  'The harbor bell hangs unmanned. No keeper, no pack, no listed skill.';

export const pendingLivingWriter = [
  {
    id: 'decisions-scene-2-3',
    title:
      'Meaningful decisions: admitted command advances scene 1 to scene 2 to scene 3',
    reason:
      'Pending Cursor A Living Writer continuation. WR07B publishes one scene with interaction null, so a choice cannot yet be admitted. This check must not pass by mock.',
  },
  {
    id: 'decisions-wrong-stale-duplicate',
    title:
      'Meaningful decisions: wrong option, stale revision, duplicate operation, cross-owner',
    reason:
      'Pending an admitted offer. There is no command identity to mismatch until a continuation scene publishes real options.',
  },
  {
    id: 'ordinary-life-earned-time',
    title:
      'Ordinary life: one finite routine earns exactly its authorized fictional time',
    reason:
      'Pending continuation settlement. Opening publication leaves gameSecond at 0 and does not tick. A per-tick model call cannot be disproved by running a routine that does not exist.',
  },
  {
    id: 'continuity-exchange-promise-revision',
    title:
      'Continuity: object changes hands, a promise is made, a fact is revised, later reads separate current from history',
    reason:
      'Pending Writer source admission. The opening checkpoint has empty story facts and no exchanged object. Do not seed those facts beside the authority under test.',
  },
  {
    id: 'fork-parent-beyond-selected-scene',
    title:
      'Historical forks: parent progresses past the selected scene before the child is cut',
    reason:
      'Pending scene 2+. The landed fork of the opening scene checks inheritance of scene 1 only. It does not claim a scene-80 parent.',
  },
];

export function assertQuiescentOpening(checkpoint, prompt) {
  if (checkpoint.format !== 'offscreen.scene-checkpoint.v2') {
    throw new Error(`expected a v2 checkpoint, received ${checkpoint.format}`);
  }
  const state = checkpoint.fictionalState;
  if (!state || state.mechanicsAbsent !== false) {
    throw new Error('opening checkpoint has no null-character fictional state');
  }
  if (state.character !== null) {
    throw new Error('narrative-only opening acquired a character');
  }
  if (state.gameSecond !== 0) {
    throw new Error(`opening spent fictional time: ${state.gameSecond}`);
  }
  if (state.offer !== null || state.acceptedActivityPlan !== null) {
    throw new Error('opening invented an offer or routine');
  }
  if (
    state.items.length !== 0 ||
    state.storyFacts.length !== 0 ||
    state.activeActivities.length !== 0
  ) {
    throw new Error('opening materialized inventory, facts, or abilities');
  }
  if (checkpoint.passage.interaction !== null) {
    throw new Error('opening exposed an unbound choice');
  }
  if (checkpoint.passage.content !== null) {
    const paragraphs = checkpoint.passage.content.paragraphs;
    if (!Array.isArray(paragraphs) || paragraphs.join('\n') !== prompt) {
      throw new Error('opening prose is not the pinned prompt');
    }
  }
}
