/**
 * Test-only minimal scripted opening fixture (not production API).
 */

/** @param {unknown} _task */
export function unitScriptedOpeningResult(_task) {
  return {
    version: 1,
    scene: {
      version: 1,
      content: { paragraphs: ['The medium warms.'] },
      next: { kind: 'held', state: 'observe' },
    },
    currentNotes: [],
    arrivalNotes: [],
  };
}