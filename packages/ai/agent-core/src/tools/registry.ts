import type { ZodType } from 'zod';

/** Trusted static capability. The name is not a function lookup key. */
export interface CapabilityBinding {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: ZodType<unknown>;
}

/** Activity request built only from admission and a selected binding. */
export interface SyntheticToolRequest {
  readonly missionId: string;
  readonly definitionId: string;
  readonly definitionVersion: 1;
  readonly effectiveToolNames: readonly string[];
  readonly toolName: string;
  readonly input: unknown;
}

export type DispatchSyntheticTool = (
  request: SyntheticToolRequest,
) => Promise<string>;

const TOOL_ID = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const INPUT_LIMIT = 1024;

function registryError(code: 'invalid-registry' | 'tool-not-allowed'): Error {
  return new Error(code);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/** Reject values JSON would coerce, drop, or fail to round-trip. */
function jsonSafe(value: unknown, seen: WeakSet<object>): boolean {
  if (value === null) return true;
  if (typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) {
    if (!value.every((entry) => jsonSafe(entry, seen))) return false;
    seen.delete(value);
    return true;
  }
  if (!isPlainObject(value)) return false;
  for (const key of Object.keys(value)) {
    if (!jsonSafe(value[key], seen)) return false;
  }
  seen.delete(value);
  return true;
}

/**
 * Bindings in effective-name order. Duplicate or illegal registry names are
 * an impossible host state. A missing name is a capability denial.
 */
export function selectCapabilities(
  registry: readonly CapabilityBinding[],
  effectiveNames: readonly string[],
): readonly CapabilityBinding[] {
  const byName = new Map<string, CapabilityBinding>();
  for (const binding of registry) {
    if (
      binding == null ||
      typeof binding.name !== 'string' ||
      !TOOL_ID.test(binding.name) ||
      typeof binding.description !== 'string' ||
      binding.description.length === 0 ||
      byName.has(binding.name)
    ) {
      throw registryError('invalid-registry');
    }
    byName.set(binding.name, binding);
  }
  const seen = new Set<string>();
  const selected: CapabilityBinding[] = [];
  for (const name of effectiveNames) {
    if (typeof name !== 'string' || seen.has(name)) {
      throw registryError('invalid-registry');
    }
    seen.add(name);
    const binding = byName.get(name);
    if (binding === undefined) throw registryError('tool-not-allowed');
    selected.push(binding);
  }
  return selected;
}

export function validateToolInput(
  schema: ZodType<unknown>,
  input: unknown,
):
  | { ok: true; value: unknown }
  | { ok: false; code: 'invalid-tool-input' | 'tool-input-limit' } {
  if (!jsonSafe(input, new WeakSet())) {
    return { ok: false, code: 'invalid-tool-input' };
  }
  const serialized = JSON.stringify(input);
  if (serialized.length > INPUT_LIMIT) {
    return { ok: false, code: 'tool-input-limit' };
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, code: 'invalid-tool-input' };
  if (!jsonSafe(parsed.data, new WeakSet())) {
    return { ok: false, code: 'invalid-tool-input' };
  }
  if (JSON.stringify(parsed.data).length > INPUT_LIMIT) {
    return { ok: false, code: 'tool-input-limit' };
  }
  return { ok: true, value: parsed.data };
}
