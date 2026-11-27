import type { AgentDefinitionV1, MissionV1 } from './contracts.js';
import { missionWorkflowId } from '../index.js';

/** Admission result. Denial codes are stable and carry no effects. */
export type Admission =
  | {
      ok: true;
      mission: MissionV1;
      definition: AgentDefinitionV1;
      effectiveToolNames: readonly string[];
    }
  | { ok: false; code: string };

const MISSION_KEYS = [
  'version',
  'missionId',
  'definitionId',
  'definitionVersion',
  'input',
  'requestedTools',
  'maxSteps',
] as const;

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const DEFINITION_ID = /^[a-z][a-z0-9-]{0,63}$/;
const TOOL_ID = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const TEXT_LIMIT = 4096;
const TOOL_LIST_LIMIT = 16;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function deny(code: string): Admission {
  return { ok: false, code };
}

function validToolNames(value: unknown, max: number): value is readonly string[] {
  if (!Array.isArray(value) || value.length > max) return false;
  const seen = new Set<string>();
  for (const name of value) {
    if (typeof name !== 'string' || !TOOL_ID.test(name) || seen.has(name)) {
      return false;
    }
    seen.add(name);
  }
  return true;
}

function hostConfigurationValid(
  definitions: readonly AgentDefinitionV1[],
  registeredToolNames: readonly string[],
): boolean {
  if (!validToolNames(registeredToolNames, Number.POSITIVE_INFINITY)) return false;
  const registry = new Set(registeredToolNames);
  const ids = new Set<string>();
  for (const definition of definitions) {
    if (!isPlainObject(definition)) return false;
    if (
      typeof definition.id !== 'string' ||
      !DEFINITION_ID.test(definition.id) ||
      ids.has(definition.id)
    ) {
      return false;
    }
    ids.add(definition.id);
    if (definition.version !== 1) return false;
    if (
      typeof definition.instructions !== 'string' ||
      definition.instructions.length > TEXT_LIMIT ||
      definition.instructions.trim().length === 0
    ) {
      return false;
    }
    if (!validToolNames(definition.toolNames, TOOL_LIST_LIMIT)) return false;
    for (const name of definition.toolNames) {
      if (!registry.has(name)) return false;
    }
  }
  return true;
}

/**
 * Admit one mission before any effect. Host definitions and the registry are
 * checked as trusted configuration; requested tools are copied, never expanded.
 */
export function admitMission(
  raw: unknown,
  actualWorkflowId: string,
  definitions: readonly AgentDefinitionV1[],
  registeredToolNames: readonly string[],
): Admission {
  if (!isPlainObject(raw)) return deny('invalid-mission');
  const keys = Object.keys(raw);
  if (
    keys.length !== MISSION_KEYS.length ||
    MISSION_KEYS.some((key) => !Object.hasOwn(raw, key))
  ) {
    return deny('invalid-mission');
  }
  if (raw.version !== 1) return deny('invalid-mission');
  if (typeof raw.missionId !== 'string' || !UUID_V4.test(raw.missionId)) {
    return deny('invalid-mission');
  }
  if (actualWorkflowId !== missionWorkflowId(raw.missionId)) {
    return deny('workflow-id-mismatch');
  }
  if (typeof raw.definitionId !== 'string' || !DEFINITION_ID.test(raw.definitionId)) {
    return deny('invalid-mission');
  }
  if (raw.definitionVersion !== 1) return deny('invalid-mission');
  if (typeof raw.input !== 'string') return deny('invalid-mission');
  if (raw.input.length > TEXT_LIMIT) return deny('input-limit');
  if (raw.input.trim().length === 0) return deny('invalid-mission');
  if (!Array.isArray(raw.requestedTools)) return deny('invalid-tool-list');
  if (!validToolNames(raw.requestedTools, TOOL_LIST_LIMIT)) return deny('invalid-tool-list');
  if (
    typeof raw.maxSteps !== 'number' ||
    !Number.isInteger(raw.maxSteps) ||
    raw.maxSteps < 1 ||
    raw.maxSteps > 3
  ) {
    return deny('step-limit');
  }
  if (!hostConfigurationValid(definitions, registeredToolNames)) {
    return deny('invalid-definition');
  }
  const definition = definitions.find((item) => item.id === raw.definitionId);
  if (definition === undefined) return deny('unknown-definition');
  const allowed = new Set(definition.toolNames);
  for (const name of raw.requestedTools) {
    if (!allowed.has(name)) return deny('tool-not-allowed');
  }
  const mission: MissionV1 = {
    version: 1,
    missionId: raw.missionId,
    definitionId: raw.definitionId,
    definitionVersion: 1,
    input: raw.input,
    requestedTools: raw.requestedTools,
    maxSteps: raw.maxSteps,
  };
  return {
    ok: true,
    mission,
    definition,
    effectiveToolNames: [...raw.requestedTools],
  };
}
