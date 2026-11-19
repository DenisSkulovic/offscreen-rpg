import { z } from 'zod';

/** Twenty real minutes after publication. Waiting does not spend fictional time. */
export const PREAPPROVED_WITHDRAWAL_WINDOW_MS = 20 * 60 * 1000;

const PROVENANCE = 'Your approved fallback chose to withdraw.';

const choiceSchema = z.strictObject({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(200),
  kind: z.enum(['invitation', 'withdrawal']),
  fictionalSeconds: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
});

const settlementSchema = z.strictObject({
  operationId: z.uuid(),
  deliveryId: z.string().min(1).max(80),
  choiceId: z.string().min(1).max(80),
  source: z.enum(['player', 'preapproved-withdrawal']),
  settledAtMs: z.number().int().nonnegative(),
  fictionalSeconds: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  waitingFictionalSeconds: z.literal(0),
  provenance: z.string().min(1).max(240).nullable(),
});

const publishedDelegatedDecisionSchema = z
  .strictObject({
    decisionId: z.uuid(),
    kind: z.literal('published-two-choice'),
    publishedAtMs: z.number().int().nonnegative(),
    choices: z.tuple([choiceSchema, choiceSchema]),
    consent: z
      .strictObject({
        version: z.number().int().positive(),
        fallbackChoiceId: z.string().min(1).max(80),
        grantedAtMs: z.number().int().nonnegative(),
      })
      .nullable(),
    revokedConsentVersion: z.number().int().positive().nullable(),
    settlement: settlementSchema.nullable(),
  })
  .superRefine((decision, context) => {
    const [left, right] = decision.choices;
    if (!left || !right || left.id === right.id) {
      context.addIssue({
        code: 'custom',
        message: 'The two choices need distinct ids',
      });
    }
  });

const arrivalSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('player'),
    choiceId: z.string().min(1).max(80),
    atMs: z.number().int().nonnegative(),
    deliveryId: z.string().min(1).max(80),
    operationId: z.uuid(),
  }),
  z.strictObject({
    kind: z.literal('expiry'),
    atMs: z.number().int().nonnegative(),
    deliveryId: z.string().min(1).max(80),
    operationId: z.uuid(),
  }),
]);

type PublishedDelegatedDecision = z.infer<
  typeof publishedDelegatedDecisionSchema
>;
type DelegatedArrival = z.infer<typeof arrivalSchema>;
type DelegatedSettlement = z.infer<typeof settlementSchema>;

export type DelegatedAdmission = {
  status: 'settled' | 'held' | 'already-settled';
  reason: string;
  applied: boolean;
  decision: PublishedDelegatedDecision | null;
  settlement: DelegatedSettlement | null;
};

function walk(
  value: unknown,
  visit: (record: Record<string, unknown>) => boolean,
  seen = new Set<object>(),
): boolean {
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value))
    return value.some((item) => walk(item, visit, seen));
  const record = value as Record<string, unknown>;
  if (visit(record)) return true;
  return Object.values(record).some((item) => walk(item, visit, seen));
}

function requestsCombat(value: unknown) {
  return walk(value, (record) => record.kind === 'combat');
}

function requestsModel(value: unknown) {
  return walk(
    value,
    (record) =>
      record.kind === 'model' ||
      record.kind === 'provider-call' ||
      record.providerCall === true,
  );
}

function held(
  decision: PublishedDelegatedDecision | null,
  reason: string,
): DelegatedAdmission {
  return {
    status: 'held',
    reason,
    applied: false,
    decision,
    settlement: null,
  };
}

function choiceById(decision: PublishedDelegatedDecision, choiceId: string) {
  return decision.choices.find((choice) => choice.id === choiceId) ?? null;
}

function settle(
  decision: PublishedDelegatedDecision,
  arrival: DelegatedArrival,
  choiceId: string,
  fictionalSeconds: number,
  source: 'player' | 'preapproved-withdrawal',
): DelegatedAdmission {
  const settlement = settlementSchema.parse({
    operationId: arrival.operationId,
    deliveryId: arrival.deliveryId,
    choiceId,
    source,
    settledAtMs: arrival.atMs,
    fictionalSeconds,
    waitingFictionalSeconds: 0,
    provenance: source === 'preapproved-withdrawal' ? PROVENANCE : null,
  });
  return {
    status: 'settled',
    reason: source,
    applied: true,
    decision: { ...decision, settlement },
    settlement,
  };
}

/**
 * Admit one arrival for one published two-choice invitation.
 * The caller keeps the returned decision and submits the next arrival against it.
 * This does not lock a story row, import the narrative-rehearsal timer, or call a model.
 */
export function admitDelegatedDecision(
  decision: unknown,
  arrival: unknown,
): DelegatedAdmission {
  if (requestsCombat(decision) || requestsCombat(arrival)) {
    return held(null, 'combat-refused');
  }
  if (requestsModel(decision) || requestsModel(arrival)) {
    return held(null, 'model-refused');
  }
  const parsedDecision = publishedDelegatedDecisionSchema.safeParse(decision);
  if (!parsedDecision.success) return held(null, 'not-this-invitation');
  const current = parsedDecision.data;
  const parsedArrival = arrivalSchema.safeParse(arrival);
  if (!parsedArrival.success) return held(current, 'not-this-invitation');
  const next = parsedArrival.data;
  if (current.settlement) {
    return {
      status: 'already-settled',
      reason: 'duplicate-delivery',
      applied: false,
      decision: current,
      settlement: current.settlement,
    };
  }
  if (next.kind === 'player') {
    const selected = choiceById(current, next.choiceId);
    if (!selected) return held(current, 'ineligible-choice');
    return settle(
      current,
      next,
      selected.id,
      selected.fictionalSeconds,
      'player',
    );
  }
  const deadline = current.publishedAtMs + PREAPPROVED_WITHDRAWAL_WINDOW_MS;
  if (!Number.isSafeInteger(deadline))
    return held(current, 'not-this-invitation');
  if (next.atMs < deadline) return held(current, 'window-open');
  const consent = current.consent;
  if (!consent) return held(current, 'consent-absent');
  if (
    current.revokedConsentVersion !== null &&
    current.revokedConsentVersion >= consent.version
  ) {
    return held(current, 'consent-revoked');
  }
  if (consent.grantedAtMs > deadline)
    return held(current, 'consent-after-deadline');
  const fallback = choiceById(current, consent.fallbackChoiceId);
  if (!fallback || fallback.kind !== 'withdrawal') {
    return held(current, 'ineligible-fallback');
  }
  return settle(
    current,
    next,
    fallback.id,
    fallback.fictionalSeconds,
    'preapproved-withdrawal',
  );
}
