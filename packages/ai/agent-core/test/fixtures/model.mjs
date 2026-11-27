import { DEFINITIONS, FIXTURE, MODEL_ID, SCENARIO_NAMES } from './scenarios.mjs';

const TEXT_LIMIT = 4096;
const ARGS_LIMIT = 1024;
const CANCEL_HOLD_MS = 8000;
const TIMEOUT_HOLD_MS = 12000;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function textOf(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) throw fail('unexpected-prompt', 'Prompt content is not text.');
  const parts = [];
  for (const part of content) {
    if (part?.type === 'text' && typeof part.text === 'string') parts.push(part.text);
    else if (part?.type === 'tool-call' || part?.type === 'tool-result') continue;
    else throw fail('nontext-content', 'Prompt contains a non-text part.');
  }
  return parts.join('');
}

function systemMarker(prompt) {
  const system = prompt.find((message) => message?.role === 'system');
  const text = textOf(system?.content ?? '');
  const hits = [DEFINITIONS.researcher, DEFINITIONS.arithmetic].filter((definition) =>
    text.includes(definition.marker),
  );
  if (hits.length !== 1) throw fail('unknown-definition', 'System instructions lack one definition marker.');
  return hits[0];
}

function userScenario(prompt) {
  const user = prompt.find((message) => message?.role === 'user');
  const text = textOf(user?.content ?? '').trim();
  if (!SCENARIO_NAMES.includes(text)) throw fail('unknown-scenario', 'User text is not an exact scenario marker.');
  if (text.includes('E1_DEF_')) throw fail('marker-spoof', 'Definition marker is not read from user text.');
  return text;
}

function toolCalls(prompt) {
  const calls = [];
  for (const message of prompt) {
    if (message?.role !== 'assistant' || !Array.isArray(message.content)) continue;
    for (const part of message.content) {
      if (part?.type !== 'tool-call') continue;
      calls.push({
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        input: part.input,
      });
    }
  }
  return calls;
}

function toolResults(prompt) {
  const results = [];
  for (const message of prompt) {
    if (message?.role !== 'tool' || !Array.isArray(message.content)) continue;
    for (const part of message.content) {
      if (part?.type !== 'tool-result') {
        throw fail('nontext-content', 'Tool message contains a non-result part.');
      }
      results.push(part);
    }
  }
  return results;
}

function resultText(output) {
  if (typeof output === 'string') return output;
  if (output?.type === 'text' && typeof output.value === 'string') return output.value;
  if (output?.type === 'json') return JSON.stringify(output.value);
  if (output?.type === 'error-text' || output?.type === 'error-json' || output?.isError) return null;
  throw fail('unexpected-tool-result', 'Tool result content is not text or JSON.');
}

function isErrorResult(part) {
  return part?.isError === true || part?.output?.type === 'error-text' || part?.output?.type === 'error-json';
}

function expectedSuccess(definition, scenario) {
  if (definition.id === 'researcher' && (scenario === 'E1_TOOL' || scenario === 'E1_RESTART')) {
    return { toolName: 'readDocument', text: FIXTURE.documentText, answer: FIXTURE.researcherAnswer };
  }
  if (definition.id === 'arithmetic' && (scenario === 'E1_TOOL' || scenario === 'E1_RESTART')) {
    return { toolName: 'calculate', text: FIXTURE.arithmeticResult, answer: FIXTURE.arithmeticResult };
  }
  return null;
}

function callPayload(scenario, definition) {
  if (scenario === 'E1_UNKNOWN_TOOL') {
    return [{ toolCallId: FIXTURE.callId, toolName: FIXTURE.unknownTool, input: '{}' }];
  }
  if (scenario === 'E1_UNGRANTED_TOOL') {
    return [{ toolCallId: FIXTURE.callId, toolName: 'readDocument', input: JSON.stringify({ path: FIXTURE.documentPath }) }];
  }
  if (scenario === 'E1_BAD_ARGS') {
    const input = definition.id === 'researcher'
      ? JSON.stringify({ path: FIXTURE.badPath })
      : JSON.stringify({ a: 'nope' });
    return [{ toolCallId: FIXTURE.callId, toolName: definition.toolName, input }];
  }
  if (scenario === 'E1_THREE_TOOLS') {
    const input = definition.id === 'researcher'
      ? JSON.stringify({ path: FIXTURE.documentPath })
      : JSON.stringify(FIXTURE.arithmeticArgs);
    return [1, 2, 3].map((index) => ({
      toolCallId: `e1-call-${index}`,
      toolName: definition.toolName,
      input,
    }));
  }
  if (scenario === 'E1_TOOL' || scenario === 'E1_RESTART' || scenario === 'E1_TOOL_FAIL') {
    const input = scenario === 'E1_TOOL_FAIL'
      ? JSON.stringify(FIXTURE.failArgs)
      : definition.id === 'researcher'
        ? JSON.stringify({ path: FIXTURE.documentPath })
        : JSON.stringify(FIXTURE.arithmeticArgs);
    const toolName = scenario === 'E1_TOOL_FAIL' ? 'calculate' : definition.toolName;
    return [{ toolCallId: FIXTURE.callId, toolName, input }];
  }
  return [];
}

function assertBounded(value, limit, code) {
  if (typeof value !== 'string' || value.length > limit) throw fail(code, 'Fixture text exceeds its bound.');
}

/**
 * Pure decision from the current request. No invocation counter.
 * @returns {{mode:string,text?:string,calls?:object[],code?:string}}
 */
export function decideFixture(options) {
  if (!options || options.files) throw fail('files-refused', 'File inputs are refused.');
  const prompt = options.prompt;
  if (!Array.isArray(prompt)) throw fail('unexpected-prompt', 'Prompt must be a message list.');
  const definition = systemMarker(prompt);
  const scenario = userScenario(prompt);
  const results = toolResults(prompt);
  const calls = toolCalls(prompt);

  if (scenario === 'E1_MODEL_FAIL') return { mode: 'fail', code: 'model-scripted-failure', definitionId: definition.id, scenario };
  if (scenario === 'E1_CANCEL_HOLD') return { mode: 'hold-cancel', definitionId: definition.id, scenario };
  if (scenario === 'E1_TIMEOUT_HOLD') return { mode: 'hold-timeout', definitionId: definition.id, scenario };
  if (scenario === 'E1_PARTIAL') {
    return { mode: 'text', text: FIXTURE.partialText, finish: 'length', definitionId: definition.id, scenario };
  }
  if (scenario === 'E1_SINGLE') {
    const text = definition.id === 'researcher' ? FIXTURE.singleResearcher : FIXTURE.singleArithmetic;
    return { mode: 'text', text, finish: 'stop', definitionId: definition.id, scenario };
  }

  if (results.length === 0) {
    const emitted = callPayload(scenario, definition);
    for (const call of emitted) assertBounded(call.input, ARGS_LIMIT, 'args-limit');
    if (emitted.length === 0) throw fail('unknown-scenario', 'Scenario has no first response.');
    return { mode: 'tool-calls', calls: emitted, definitionId: definition.id, scenario };
  }

  if (results.some(isErrorResult)) {
    return { mode: 'text', text: FIXTURE.falseSuccess, finish: 'stop', definitionId: definition.id, scenario };
  }
  if (scenario === 'E1_THREE_TOOLS' || scenario === 'E1_TOOL_FAIL' || scenario === 'E1_BAD_ARGS' || scenario === 'E1_UNKNOWN_TOOL' || scenario === 'E1_UNGRANTED_TOOL') {
    return { mode: 'text', text: FIXTURE.falseSuccess, finish: 'stop', definitionId: definition.id, scenario };
  }

  const expected = expectedSuccess(definition, scenario);
  if (!expected) throw fail('unexpected-tool-result', 'This scenario does not accept a tool result.');
  if (results.length !== 1 || calls.length < 1) throw fail('missing-tool-result', 'Tool result does not match one call.');
  const result = results[0];
  const call = calls.find((item) => item.toolCallId === result.toolCallId);
  if (!call || call.toolName !== result.toolName || result.toolName !== expected.toolName) {
    throw fail('unexpected-tool-result', 'Tool result id or name does not match.');
  }
  const text = resultText(result.output);
  if (text !== expected.text) throw fail('unexpected-tool-result', 'Tool result content is not the fixture value.');
  return { mode: 'text', text: expected.answer, finish: 'stop', definitionId: definition.id, scenario };
}

function usage() {
  return { inputTokens: { total: 10 }, outputTokens: { total: 20 } };
}

function render(decision) {
  if (decision.mode === 'tool-calls') {
    return {
      content: decision.calls.map((call) => ({
        type: 'tool-call',
        toolCallId: call.toolCallId,
        toolName: call.toolName,
        input: call.input,
      })),
      finishReason: { unified: 'tool-calls', raw: undefined },
      usage: usage(),
      warnings: [],
    };
  }
  assertBounded(decision.text, TEXT_LIMIT, 'text-limit');
  return {
    content: [{ type: 'text', text: decision.text }],
    finishReason: { unified: decision.finish, raw: undefined },
    usage: usage(),
    warnings: [],
  };
}

async function hold(ms, signal) {
  let timer;
  try {
    await new Promise((resolve, reject) => {
      const abort = () => reject(fail('model-aborted', 'Model hold observed abort.'));
      if (signal?.aborted) {
        abort();
        return;
      }
      signal?.addEventListener('abort', abort, { once: true });
      timer = setTimeout(() => reject(fail('model-hold-expired', 'Model hold expired.')), ms);
    });
  } finally {
    clearTimeout(timer);
  }
}

function record(observations, context, phase, extra = {}) {
  if (!observations) return;
  observations.push({
    workflowId: context?.info?.workflowExecution?.workflowId ?? null,
    activityId: context?.info?.activityId ?? null,
    attempt: context?.info?.attempt ?? null,
    phase,
    kind: 'model',
    ...extra,
  });
}

export function createLanguageModel(observations, readContext) {
  return {
    specificationVersion: 'v4',
    provider: 'e1-synthetic',
    modelId: MODEL_ID,
    supportedUrls: {},
    async doGenerate(options) {
      const context = readContext?.() ?? null;
      record(observations, context, 'started');
      const decision = decideFixture(options);
      if (decision.mode === 'fail') {
        record(observations, context, 'failed', { code: decision.code });
        throw fail(decision.code, 'Scripted model failure.');
      }
      if (decision.mode === 'hold-cancel' || decision.mode === 'hold-timeout') {
        const ms = decision.mode === 'hold-cancel' ? CANCEL_HOLD_MS : TIMEOUT_HOLD_MS;
        try {
          await hold(ms, options.abortSignal);
        } catch (error) {
          record(observations, context, 'aborted', { code: error.code });
          throw error;
        }
        throw fail('model-hold-expired', 'Hold returned without a terminal failure.');
      }
      record(observations, context, 'completed');
      return render(decision);
    },
    async doStream() {
      throw fail('streaming-disabled', 'Streaming is disabled.');
    },
  };
}

export function createFixturePlugin(observations, readContext = () => null) {
  return {
    modelProvider: {
      specificationVersion: 'v4',
      languageModel(name) {
        if (name !== MODEL_ID) throw fail('unknown-model', 'Only e1-synthetic is supported.');
        return createLanguageModel(observations, readContext);
      },
      embeddingModel() {
        throw fail('embedding-disabled', 'Embeddings are disabled.');
      },
      imageModel() {
        throw fail('image-disabled', 'Image models are disabled.');
      },
    },
    async download() {
      record(observations, readContext?.() ?? null, 'refused', { kind: 'download' });
      throw fail('download-disabled', 'Fixture download is disabled.');
    },
  };
}
