/**
 * Provider-facing Storyteller JSON Schema projection.
 *
 * These pure, recursive transforms narrow the schema sent to a model using
 * captured state and context. They do NOT modify the canonical Zod input/output
 * contracts or replace application-level semantic admission.
 *
 * Each function is intentionally a named policy transform. Composition and
 * ordering remain in tasks/index.ts, alongside request assembly.
 */

/** Immediate checks reject situational modifiers. The transmitted schema must too. */
export function withholdImmediateCheckModifiers(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(withholdImmediateCheckModifiers);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const source = value as Record<string, unknown>;
  const rewritten = Object.fromEntries(
    Object.entries(source).map(([key, child]) => [
      key,
      withholdImmediateCheckModifiers(child),
    ]),
  );
  const properties = rewritten.properties;
  if (
    !properties ||
    typeof properties !== 'object' ||
    Array.isArray(properties) ||
    !('check' in properties) ||
    !('difficultyBasis' in properties)
  ) {
    return rewritten;
  }
  const fields = properties as Record<string, unknown>;
  const check = fields.check;
  if (!check || typeof check !== 'object' || Array.isArray(check)) {
    return rewritten;
  }
  const checkSchema = check as Record<string, unknown>;
  const checkProperties = checkSchema.properties;
  if (
    !checkProperties ||
    typeof checkProperties !== 'object' ||
    Array.isArray(checkProperties)
  ) {
    return rewritten;
  }
  const checkFields = checkProperties as Record<string, unknown>;
  const modifiers = checkFields.modifiers;
  return {
    ...rewritten,
    properties: {
      ...fields,
      check: {
        ...checkSchema,
        properties: {
          ...checkFields,
          advantage: { type: 'boolean', enum: [false] },
          disadvantage: { type: 'boolean', enum: [false] },
          modifiers:
            modifiers &&
            typeof modifiers === 'object' &&
            !Array.isArray(modifiers)
              ? { ...modifiers, maxItems: 0 }
              : { type: 'array', maxItems: 0, items: {} },
        },
      },
    },
  };
}

export function constrainActionEvidenceHandles(
  value: unknown,
  handles: readonly string[],
): unknown {
  if (Array.isArray(value)) {
    return value.map((child) => constrainActionEvidenceHandles(child, handles));
  }
  if (!value || typeof value !== 'object') return value;
  const source = value as Record<string, unknown>;
  const result = Object.fromEntries(
    Object.entries(source).map(([key, child]) => [
      key,
      constrainActionEvidenceHandles(child, handles),
    ]),
  ) as Record<string, unknown>;
  const properties = result['properties'];
  if (
    properties &&
    typeof properties === 'object' &&
    !Array.isArray(properties)
  ) {
    const fields = properties as Record<string, unknown>;
    const evidence = fields['evidence'];
    const isActionPlan = 'key' in fields && 'resolution' in fields;
    const isFactDeclaration = 'fact' in fields && 'evidence' in fields;
    if (
      evidence &&
      typeof evidence === 'object' &&
      !Array.isArray(evidence) &&
      (isActionPlan || isFactDeclaration)
    ) {
      const evidenceArray = evidence as Record<string, unknown>;
      fields['evidence'] = {
        ...evidenceArray,
        ...(handles.length ? {} : { maxItems: 0 }),
        items: handles.length
          ? { type: 'string', enum: [...handles] }
          : { type: 'string' },
      };
    }
  }
  return result;
}

/** Generated quantity changes must be meaningful; stored legacy effects stay readable. */
export function constrainQuantityChangeDeltas(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(constrainQuantityChangeDeltas);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const source = value as Record<string, unknown>;
  const result = Object.fromEntries(
    Object.entries(source).map(([key, child]) => [
      key,
      constrainQuantityChangeDeltas(child),
    ]),
  ) as Record<string, unknown>;
  const properties = result['properties'];
  if (
    !properties ||
    typeof properties !== 'object' ||
    Array.isArray(properties)
  ) {
    return result;
  }
  const fields = properties as Record<string, unknown>;
  const kind = fields['kind'];
  const delta = fields['delta'];
  if (
    !kind ||
    typeof kind !== 'object' ||
    Array.isArray(kind) ||
    (kind as Record<string, unknown>)['const'] !== 'quantity.change.v1' ||
    !delta ||
    typeof delta !== 'object' ||
    Array.isArray(delta)
  ) {
    return result;
  }
  const integerDelta = delta as Record<string, unknown>;
  fields['delta'] = {
    anyOf: [
      { ...integerDelta, maximum: -1 },
      { ...integerDelta, minimum: 1 },
    ],
  };
  return result;
}

/** An opening has no existing activity identity that a fresh plan could resume. */
export function withholdResumeResolutions(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .filter((child) => {
        if (!child || typeof child !== 'object' || Array.isArray(child)) {
          return true;
        }
        const properties = (child as Record<string, unknown>)['properties'];
        if (
          !properties ||
          typeof properties !== 'object' ||
          Array.isArray(properties)
        ) {
          return true;
        }
        const kind = (properties as Record<string, unknown>)['kind'];
        return !(
          kind &&
          typeof kind === 'object' &&
          !Array.isArray(kind) &&
          (kind as Record<string, unknown>)['const'] === 'resume'
        );
      })
      .map(withholdResumeResolutions);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      withholdResumeResolutions(child),
    ]),
  );
}

type AvailableFact = Readonly<{ id: string; value: string | boolean }>;
type AvailableQuantity = Readonly<{ id: string; value: number }>;

function closeArray(schema: unknown) {
  const arraySchema =
    schema && typeof schema === 'object' && !Array.isArray(schema)
      ? (schema as Record<string, unknown>)
      : { type: 'array' };
  return { ...arraySchema, maxItems: 0 };
}

function exactFactRequirement(fact: AvailableFact) {
  return {
    type: 'object',
    properties: {
      id: { type: 'string', const: fact.id },
      value: { type: typeof fact.value, const: fact.value },
    },
    required: ['id', 'value'],
    additionalProperties: false,
  };
}

function availableRequirementArray(
  schema: unknown,
  items: readonly Record<string, unknown>[],
) {
  const arraySchema =
    schema && typeof schema === 'object' && !Array.isArray(schema)
      ? (schema as Record<string, unknown>)
      : { type: 'array' };
  return items.length
    ? { ...arraySchema, items: { anyOf: items } }
    : closeArray(arraySchema);
}

function availableStringArray(schema: unknown, values: readonly string[]) {
  const arraySchema =
    schema && typeof schema === 'object' && !Array.isArray(schema)
      ? (schema as Record<string, unknown>)
      : { type: 'array' };
  return values.length
    ? { ...arraySchema, items: { type: 'string', enum: [...values] } }
    : closeArray(arraySchema);
}

/** Choice retrieval hints may reference only the exact captured catalogues. */
export function constrainChoiceRetrievalHandles(
  value: unknown,
  worldSections: readonly string[],
  campaignDocuments: readonly string[],
  allowCreatedDocuments: boolean,
): unknown {
  if (Array.isArray(value)) {
    return value.map((child) =>
      constrainChoiceRetrievalHandles(
        child,
        worldSections,
        campaignDocuments,
        allowCreatedDocuments,
      ),
    );
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const result = Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      constrainChoiceRetrievalHandles(
        child,
        worldSections,
        campaignDocuments,
        allowCreatedDocuments,
      ),
    ]),
  ) as Record<string, unknown>;
  const properties = result['properties'];
  if (
    !properties ||
    typeof properties !== 'object' ||
    Array.isArray(properties)
  ) {
    return result;
  }
  const fields = properties as Record<string, unknown>;
  if (
    !('intention' in fields) ||
    !('worldSections' in fields) ||
    !('campaignDocuments' in fields) ||
    !('createdDocuments' in fields)
  ) {
    return result;
  }
  fields['worldSections'] = availableStringArray(
    fields['worldSections'],
    worldSections,
  );
  fields['campaignDocuments'] = availableStringArray(
    fields['campaignDocuments'],
    campaignDocuments,
  );
  if (!allowCreatedDocuments) {
    fields['createdDocuments'] = closeArray(fields['createdDocuments']);
  }
  return result;
}

/** Generated offers may depend only on prerequisites satisfied at capture time. */
export function constrainPlanPrerequisites(
  value: unknown,
  characterFacts: readonly AvailableFact[],
  storyFacts: readonly AvailableFact[],
  quantities: readonly AvailableQuantity[],
): unknown {
  if (Array.isArray(value)) {
    return value.map((child) =>
      constrainPlanPrerequisites(child, characterFacts, storyFacts, quantities),
    );
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const result = Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      constrainPlanPrerequisites(child, characterFacts, storyFacts, quantities),
    ]),
  ) as Record<string, unknown>;
  const properties = result['properties'];
  if (
    !properties ||
    typeof properties !== 'object' ||
    Array.isArray(properties)
  ) {
    return result;
  }
  const fields = properties as Record<string, unknown>;
  if (!('key' in fields) || !('resolution' in fields)) {
    return result;
  }
  fields['requires'] = availableRequirementArray(
    fields['requires'],
    characterFacts.map(exactFactRequirement),
  );
  fields['requiresStory'] = availableRequirementArray(
    fields['requiresStory'],
    storyFacts.map(exactFactRequirement),
  );
  fields['requiresQuantities'] = availableRequirementArray(
    fields['requiresQuantities'],
    quantities.map((quantity) => ({
      type: 'object',
      properties: {
        quantityId: { type: 'string', const: quantity.id },
        minimum: {
          type: 'integer',
          minimum: 0,
          maximum: quantity.value,
        },
      },
      required: ['quantityId', 'minimum'],
      additionalProperties: false,
    })),
  );
  return result;
}

function typedFactTransition(fact: AvailableFact) {
  return {
    type: 'object',
    properties: {
      branch: {
        type: 'string',
        enum: ['automatic', 'success', 'failure'],
      },
      fact: {
        type: 'object',
        properties: {
          id: { type: 'string', const: fact.id },
          value: { type: typeof fact.value },
        },
        required: ['id', 'value'],
        additionalProperties: false,
      },
    },
    required: ['branch', 'fact'],
    additionalProperties: false,
  };
}

/** Fresh generated plans explicitly pair finite-branch fact writes with intent. */
export function constrainPlanFactTransitions(
  value: unknown,
  characterFacts: readonly AvailableFact[],
): unknown {
  if (Array.isArray(value)) {
    return value.map((child) =>
      constrainPlanFactTransitions(child, characterFacts),
    );
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const result = Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      constrainPlanFactTransitions(child, characterFacts),
    ]),
  ) as Record<string, unknown>;
  const properties = result['properties'];
  if (
    !properties ||
    typeof properties !== 'object' ||
    Array.isArray(properties)
  ) {
    return result;
  }
  const fields = properties as Record<string, unknown>;
  if (
    !('key' in fields) ||
    !('resolution' in fields) ||
    !('factTransitions' in fields)
  ) {
    return result;
  }
  fields['factTransitions'] = availableRequirementArray(
    fields['factTransitions'],
    characterFacts.map(typedFactTransition),
  );
  const required = Array.isArray(result['required'])
    ? (result['required'] as unknown[])
    : [];
  if (!required.includes('factTransitions')) {
    result['required'] = [...required, 'factTransitions'];
  }
  return result;
}
