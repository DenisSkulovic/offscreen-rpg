/**
 * Implementer-written paraphrases of ten frozen v1 questions.
 * These were not drafted or approved by an independent reviewer.
 * Do not treat the score as a held-out generalization result.
 */
export const PARAPHRASE_STATUS = 'implementer-drafted-not-independently-approved';

const QUESTIONS = [
  ['P01', 'Why does play continue as a world, instead of remaining only a conversation?'],
  ['P02', 'If I never accept an action, does made-up time still move?'],
  ['P03', 'Which player statements become real commitments, and which stay talk?'],
  ['P04', 'What is the player allowed to know when they come back to a story?'],
  ['P05', 'Which facts may staff change, and which decisions stay with the player?'],
  ['T01', 'Which part of the system is allowed to decide dice, items and time?'],
  ['S01', 'Does live SSE cache invalidation exist in the client, and is hosted proof done?'],
  ['D02', 'Is there already an accepted automatic choice when the player misses a prompt?'],
  ['A01', 'An old note claims SSE was never built. Is that note the current contract?'],
  ['A06', 'A finished Change packet is in the archive. Does Done mean I may execute it again?'],
];

export function paraphraseCases(cases) {
  return QUESTIONS.map(([sourceId, question]) => {
    const source = cases.find((item) => item.id === sourceId);
    if (!source) throw new Error(`Missing paraphrase source ${sourceId}`);
    return {
      ...source,
      id: `H-${sourceId}`,
      question,
      paraphraseOf: sourceId,
      independentApproval: false,
    };
  });
}
