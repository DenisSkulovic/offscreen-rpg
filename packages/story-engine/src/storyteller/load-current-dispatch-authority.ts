import { and, eq } from 'drizzle-orm';
import { generation } from '@offscreen/db/generation-schema';
import { storyDraft } from '@offscreen/db/draft-schema';
import { story } from '@offscreen/db/story-schema';
import {
  storytellerCurrentOwnerGrant,
  storytellerCurrentPlatformPolicy,
  storytellerAttempt,
  storytellerOperation,
} from '@offscreen/db/storyteller-schema';
import {
  storytellerDispatchRouteMapSchema,
  type IndependentAuthorityDenialReason,
} from './dispatch-authority-policy';
import {
  effectiveUsagePolicySchema,
  type EffectiveUsagePolicy,
} from '@offscreen/usage-policy/usage-policy';
import {
  executionPolicySchema,
  storytellerTaskSchema,
  type ExecutionPolicy,
  type StorytellerTask,
} from '@offscreen/storyteller/tasks';
import type { Transaction } from '@offscreen/db/outbox';
import { retainsIndependentCurrentAuthority } from './dispatch-authority';
import { resolveIndependentAuthorityFromStore } from './current-authority';

export type CurrentDispatchAuthorityDenialReason =
  | IndependentAuthorityDenialReason
  | 'policy_disabled'
  | 'route_not_allowed'
  | 'funding_mode_not_allowed'
  | 'store_read_failed'
  | 'unreadable_task'
  | 'generation_missing'
  | 'execution_not_provider'
  | 'authority_not_captured'
  | 'generation_owner_mismatch'
  | 'story_owner_mismatch'
  | 'draft_owner_mismatch'
  | 'source_moved'
  | 'attempt_binding_mismatch'
  | 'grant_scope_mismatch'
  | 'route_binding_mismatch'
  | 'captured_policy_mismatch';

export type CurrentDispatchAuthorityResolution =
  | {
      kind: 'allowed';
      capturedPolicy: EffectiveUsagePolicy;
      currentPolicy: EffectiveUsagePolicy;
      grantId: string;
      platformRevision: number;
      grantRevision: number;
    }
  | { kind: 'denied'; reason: CurrentDispatchAuthorityDenialReason };

export type LockedCurrentDispatchAttempt = {
  attempt: typeof storytellerAttempt.$inferSelect;
  operation: typeof storytellerOperation.$inferSelect;
};

function deny(
  reason: CurrentDispatchAuthorityDenialReason,
): CurrentDispatchAuthorityResolution {
  return { kind: 'denied', reason };
}

function parseCommittedTask(input: unknown): StorytellerTask | null {
  const parsed = storytellerTaskSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

function providerExecution(
  execution: ExecutionPolicy,
): execution is Extract<ExecutionPolicy, { mode: 'provider' }> {
  return executionPolicySchema.parse(execution).mode === 'provider';
}

function routeEntryMatchesExecution(
  entry: {
    provider: string;
    model: string;
    priceVersion: string;
    route: string;
  },
  execution: Extract<ExecutionPolicy, { mode: 'provider' }>,
) {
  const policy = execution.policy;
  return (
    entry.route === policy.route &&
    entry.provider === policy.provider &&
    entry.model === policy.model &&
    entry.priceVersion === policy.priceVersion
  );
}

/**
 * Reads persisted platform policy, owner grant, generation source ownership,
 * and route bindings inside an existing dispatch transaction.
 * Caller-supplied identity fields are never trusted as authority.
 */
export async function loadCurrentDispatchAuthority(
  tx: Transaction,
  locked: LockedCurrentDispatchAttempt,
  now: Date = new Date(),
): Promise<CurrentDispatchAuthorityResolution> {
  const { attempt, operation } = locked;
  let generationRow: typeof generation.$inferSelect | undefined;
  let platformRow:
    | typeof storytellerCurrentPlatformPolicy.$inferSelect
    | undefined;
  let grantRow:
    | typeof storytellerCurrentOwnerGrant.$inferSelect
    | undefined;

  try {
    [generationRow] = await tx
      .select()
      .from(generation)
      .where(eq(generation.id, attempt.generationId));
    [platformRow] = await tx
      .select()
      .from(storytellerCurrentPlatformPolicy)
      .where(eq(storytellerCurrentPlatformPolicy.enabled, true))
      .for('share')
      .limit(1);
    [grantRow] = await tx
      .select()
      .from(storytellerCurrentOwnerGrant)
      .where(
        and(
          eq(storytellerCurrentOwnerGrant.accountId, operation.accountId),
          eq(storytellerCurrentOwnerGrant.runId, operation.runId),
          eq(storytellerCurrentOwnerGrant.userId, operation.ownerId),
        ),
      )
      .for('share')
      .limit(1);
  } catch {
    return deny('store_read_failed');
  }

  if (!generationRow) return deny('generation_missing');
  const task = parseCommittedTask(generationRow.input);
  if (!task) return deny('unreadable_task');
  if (!providerExecution(task.execution)) return deny('execution_not_provider');
  if (task.resources.authority.kind !== 'effective-usage-policy') {
    return deny('authority_not_captured');
  }

  let capturedPolicy: EffectiveUsagePolicy;
  try {
    capturedPolicy = effectiveUsagePolicySchema.parse(
      task.resources.authority.policy,
    );
  } catch {
    return deny('unreadable_task');
  }

  if (
    generationRow.ownerId !== operation.ownerId ||
    generationRow.ownerId !== attempt.ownerId
  ) {
    return deny('generation_owner_mismatch');
  }
  if (
    task.execution.accountId !== attempt.accountId ||
    task.execution.accountId !== operation.accountId ||
    task.execution.runId !== attempt.runId ||
    task.execution.runId !== operation.runId
  ) {
    return deny('attempt_binding_mismatch');
  }

  const sourceStoryId =
    'storyId' in task.source ? task.source.storyId : null;
  const sourceDraftId =
    'draftId' in task.source ? task.source.draftId : null;
  if (attempt.storyId !== sourceStoryId || attempt.draftId !== sourceDraftId) {
    return deny('source_moved');
  }

  const executionPolicy = task.execution.policy;
  if (
    attempt.requestedProvider !== executionPolicy.provider ||
    attempt.requestedModel !== executionPolicy.model ||
    attempt.priceVersion !== executionPolicy.priceVersion
  ) {
    return deny('attempt_binding_mismatch');
  }

  try {
    if (sourceDraftId) {
      const [draft] = await tx
        .select({ ownerId: storyDraft.ownerId })
        .from(storyDraft)
        .where(eq(storyDraft.id, sourceDraftId));
      if (!draft || draft.ownerId !== generationRow.ownerId) {
        return deny('draft_owner_mismatch');
      }
    } else if (sourceStoryId) {
      const [storyRow] = await tx
        .select({ ownerId: story.ownerId })
        .from(story)
        .where(eq(story.id, sourceStoryId));
      if (!storyRow || storyRow.ownerId !== generationRow.ownerId) {
        return deny('story_owner_mismatch');
      }
    }
  } catch {
    return deny('store_read_failed');
  }

  const storeResolution = resolveIndependentAuthorityFromStore({
    platform: platformRow
      ? {
          revision: platformRow.revision,
          profile: platformRow.profile,
          routeMap: platformRow.routeMap,
          enabled: platformRow.enabled,
        }
      : null,
    grant: grantRow
      ? {
          id: grantRow.id,
          revision: grantRow.revision,
          userId: grantRow.userId,
          accountId: grantRow.accountId,
          runId: grantRow.runId,
          entitlementProfile: grantRow.entitlementProfile,
          restrictions: grantRow.restrictions,
          enabled: grantRow.enabled,
          revokedAt: grantRow.revokedAt?.toISOString() ?? null,
          noExpiry: grantRow.noExpiry,
          expiresAt: grantRow.expiresAt?.toISOString() ?? null,
          requestedRoute: grantRow.requestedRoute,
          requestedFundingMode: grantRow.requestedFundingMode,
          operatorId: grantRow.operatorId,
          approvalIdentity: grantRow.approvalIdentity,
        }
      : null,
    now,
  });
  if (storeResolution.kind === 'denied') {
    return deny(storeResolution.reason);
  }

  if (!grantRow || !platformRow) {
    return deny('grant_missing');
  }
  if (
    grantRow.userId !== generationRow.ownerId ||
    grantRow.accountId !== operation.accountId ||
    grantRow.runId !== operation.runId ||
    grantRow.requestedRoute !== capturedPolicy.route ||
    grantRow.requestedFundingMode !== capturedPolicy.fundingMode
  ) {
    return deny('grant_scope_mismatch');
  }

  let routeMap;
  try {
    routeMap = storytellerDispatchRouteMapSchema.parse(platformRow.routeMap);
  } catch {
    return deny('invalid_store');
  }
  const routeEntry = routeMap.routes.find(
    (entry) => entry.route === capturedPolicy.route,
  );
  if (!routeEntry || !routeEntryMatchesExecution(routeEntry, task.execution)) {
    return deny('route_binding_mismatch');
  }

  if (
    !retainsIndependentCurrentAuthority(capturedPolicy, storeResolution)
  ) {
    return deny('captured_policy_mismatch');
  }

  if (storeResolution.kind !== 'allowed') {
    return deny('captured_policy_mismatch');
  }

  return {
    kind: 'allowed',
    capturedPolicy,
    currentPolicy: storeResolution.policy,
    grantId: grantRow.id,
    platformRevision: platformRow.revision,
    grantRevision: grantRow.revision,
  };
}