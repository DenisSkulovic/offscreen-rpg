import type { StorytellerTask } from '../tasks';
import {
  compareOpenRouterRequests,
  inspectOpenRouterRequest,
} from './openrouter';

export type StorytellerRequestAuditCase = Readonly<{
  id: string;
  task: StorytellerTask;
  evidenceExpectations?: Readonly<{
    requiredHandles: readonly string[];
    forbiddenHandles: readonly string[];
  }>;
  sequence?: Readonly<{ id: string; position: number }>;
}>;

function sourceRevision(task: StorytellerTask) {
  return task.task === 'opening'
    ? { kind: 'draft' as const, revision: task.source.draftRevision }
    : { kind: 'story' as const, revision: task.source.narrativeRevision };
}

/**
 * Composes reproducible structural evidence from already-captured tasks. It
 * never reads credentials, estimates tokens or performs provider transport.
 */
export function createStorytellerRequestAudit(
  cases: readonly StorytellerRequestAuditCase[],
) {
  if (!cases.length) {
    throw new Error('At least one Storyteller request audit case is required');
  }
  const ids = cases.map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error('Storyteller request audit case IDs must be unique');
  }
  const inspected = cases.map(({ id, task, evidenceExpectations, sequence }) => {
    const inspection = inspectOpenRouterRequest(task);
    const loadedHandles = task.context.evidence.map(
      (passage) => `p${passage.sequence}`,
    );
    const requiredHandles = evidenceExpectations?.requiredHandles ?? [];
    const forbiddenHandles = evidenceExpectations?.forbiddenHandles ?? [];
    return {
      id,
      sequence: sequence ?? null,
      source: sourceRevision(task),
      profile: { id: task.profile.id, revision: task.profile.revision },
      purpose: inspection.purpose,
      taskInputVersion: task.inputVersion,
      promptVersion: inspection.promptVersion,
      contextPolicyVersion: inspection.contextPolicyVersion,
      packet: {
        sha256: inspection.sha256,
        serializedBytes: inspection.serializedBytes,
        capturedRequestBytes: inspection.capturedRequestBytes,
        outputSchemaBytes: inspection.outputSchemaBytes,
        outputSchemaSha256: inspection.outputSchemaSha256,
        messages: inspection.messages,
        userSections: inspection.userSections,
      },
      evidence: {
        loadedHandles,
        omittedSequences: task.contextManifest.omittedSequences,
        omissionReason:
          task.contextManifest.omittedSequences.length > 0
            ? 'outside-bounded-selection'
            : null,
        expectations: {
          requiredHandles,
          forbiddenHandles,
          missingRequiredHandles: requiredHandles.filter(
            (handle) => !loadedHandles.includes(handle),
          ),
          loadedForbiddenHandles: forbiddenHandles.filter((handle) =>
            loadedHandles.includes(handle),
          ),
        },
      },
      estimatedInputTokens: inspection.estimatedInputTokens,
      observedProviderCacheHitTokens: null,
      inspection,
    };
  });
  const comparisons = inspected.slice(1).map((right, index) => ({
    leftCaseId: inspected[index]!.id,
    rightCaseId: right.id,
    ...compareOpenRouterRequests(inspected[index]!.inspection, right.inspection),
  }));
  const sequenceIds = [
    ...new Set(
      inspected.flatMap((entry) => (entry.sequence ? [entry.sequence.id] : [])),
    ),
  ];
  return {
    version: 'storyteller-request-audit.v2' as const,
    transportPerformed: false as const,
    providerChargeMicrousd: '0' as const,
    cases: inspected.map(({ inspection: _inspection, ...entry }) => entry),
    comparisons,
    sequences: sequenceIds.map((sequenceId) => {
      const entries = inspected
        .filter((entry) => entry.sequence?.id === sequenceId)
        .sort(
          (left, right) =>
            left.sequence!.position - right.sequence!.position,
        );
      const transitions = entries.slice(1).map((right, index) => {
        const left = entries[index]!;
        const comparison = compareOpenRouterRequests(
          left.inspection,
          right.inspection,
        );
        return {
          leftCaseId: left.id,
          rightCaseId: right.id,
          potentialReusableMessageContentBytes:
            comparison.potentialReusableMessageContentBytes,
          estimatedSharedInputTokens: null,
          observedProviderCacheHitTokens: null,
        };
      });
      return {
        id: sequenceId,
        caseIds: entries.map((entry) => entry.id),
        coldSerializedRequestBytes: entries.reduce(
          (total, entry) => total + entry.inspection.serializedBytes,
          0,
        ),
        transitions,
        estimatedColdInputTokens: null,
        observedProviderCacheHitTokens: null,
      };
    }),
  };
}

export type StorytellerRequestAudit = ReturnType<
  typeof createStorytellerRequestAudit
>;

/** Human summary derived from the manifest; the JSON remains authoritative. */
export function formatStorytellerRequestAudit(audit: StorytellerRequestAudit) {
  const lines = [
    `Storyteller request audit ${audit.version}`,
    `Provider transport: ${audit.transportPerformed ? 'performed' : 'not performed'}; charge: ${audit.providerChargeMicrousd} microusd`,
    '',
  ];
  for (const entry of audit.cases) {
    lines.push(
      `${entry.id}: ${entry.purpose.id}`,
      `  contract: ${entry.purpose.inputContract} -> ${entry.purpose.outputContract}`,
      `  versions: task ${entry.taskInputVersion}, prompt ${entry.promptVersion}, context ${entry.contextPolicyVersion}`,
      `  bytes: packet ${entry.packet.serializedBytes}, request ${entry.packet.capturedRequestBytes}, schema ${entry.packet.outputSchemaBytes}`,
      `  evidence: ${entry.evidence.loadedHandles.join(', ') || 'none'}; omitted: ${entry.evidence.omittedSequences.join(', ') || 'none'}`,
      `  coverage: missing required ${entry.evidence.expectations.missingRequiredHandles.join(', ') || 'none'}; loaded forbidden ${entry.evidence.expectations.loadedForbiddenHandles.join(', ') || 'none'}`,
      `  tokens/cache: unknown / unknown`,
    );
  }
  if (audit.comparisons.length) {
    lines.push('', 'Adjacent comparisons:');
    for (const comparison of audit.comparisons) {
      lines.push(
        `  ${comparison.leftCaseId} -> ${comparison.rightCaseId}: delta ${comparison.serializedBytesDelta} bytes; message prefixes ${comparison.messages.map((message) => message.commonPrefixBytes).join('/')}`,
      );
    }
  }
  if (audit.sequences.length) {
    lines.push('', 'Cache-aware sequences (structural potential only):');
    for (const sequence of audit.sequences) {
      lines.push(
        `  ${sequence.id}: cold ${sequence.coldSerializedRequestBytes} bytes across ${sequence.caseIds.length} requests; tokens/cache/savings unknown`,
      );
      for (const transition of sequence.transitions) {
        lines.push(
          `    ${transition.leftCaseId} -> ${transition.rightCaseId}: potential reusable message content ${transition.potentialReusableMessageContentBytes} bytes`,
        );
      }
    }
  }
  return `${lines.join('\n')}\n`;
}
