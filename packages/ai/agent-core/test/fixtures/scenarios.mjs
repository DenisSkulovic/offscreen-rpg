/** Frozen fixture truth shared by Workflow-safe definitions and Worker-side fixtures. No Node imports. */

export const MODEL_ID = 'e1-synthetic';

export const DEFINITIONS = Object.freeze({
  researcher: Object.freeze({
    id: 'researcher',
    version: 1,
    marker: 'E1_DEF_RESEARCHER',
    instructions:
      'E1_DEF_RESEARCHER. You are the fixture researcher. Use only the historical note.',
    toolName: 'readDocument',
    toolDescription: 'Read the fixed historical promise note.',
  }),
  arithmetic: Object.freeze({
    id: 'arithmetic',
    version: 1,
    marker: 'E1_DEF_ARITHMETIC',
    instructions:
      'E1_DEF_ARITHMETIC. You are the fixture arithmetic assistant. Add the two integers.',
    toolName: 'calculate',
    toolDescription: 'Add two bounded integers.',
  }),
});

export const SCENARIO_NAMES = Object.freeze([
  'E1_SINGLE',
  'E1_TOOL',
  'E1_UNKNOWN_TOOL',
  'E1_UNGRANTED_TOOL',
  'E1_BAD_ARGS',
  'E1_THREE_TOOLS',
  'E1_TOOL_FAIL',
  'E1_MODEL_FAIL',
  'E1_PARTIAL',
  'E1_CANCEL_HOLD',
  'E1_TIMEOUT_HOLD',
  'E1_RESTART',
]);

export const FIXTURE = Object.freeze({
  documentPath: 'history/promise.md',
  documentText:
    'POC_SOURCE_OLD_BRIDGE_DAWN: A promise was made to meet at the old bridge at dawn.',
  researcherAnswer: 'The promise was to meet at the old bridge at dawn.',
  singleResearcher: 'E1_SINGLE_RESEARCHER_OK',
  singleArithmetic: 'E1_SINGLE_ARITHMETIC_OK',
  arithmeticArgs: Object.freeze({ a: 7, b: 5, op: 'add' }),
  arithmeticResult: '12',
  failArgs: Object.freeze({ a: -999, b: 0, op: 'add' }),
  badPath: 'history/other.md',
  unknownTool: 'notRegistered',
  falseSuccess: 'UNSAFE_FALSE_SUCCESS',
  partialText: 'E1_PARTIAL_TRUNCATED',
  callId: 'e1-call-1',
});
