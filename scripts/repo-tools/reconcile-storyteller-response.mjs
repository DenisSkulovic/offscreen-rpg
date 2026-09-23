import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  createDatabase,
  readDatabaseConfig,
} from '../../packages/db/dist/src/index.js';
import { createStorytellerBudget } from '../../packages/application/dist/storyteller/index.js';
import {
  diagnoseStorytellerResult,
  storytellerTaskSchema,
} from '../../packages/storyteller/dist/src/tasks/index.js';
import {
  normalizeOpenAiStrictOutput,
  usdToMicrousd,
} from '../../packages/storyteller/dist/src/providers/openrouter.js';
import { fail, root } from './process.mjs';

const generationId = process.argv[2];
const attemptId = process.argv[3];
const evidenceArgument = process.argv[4];

if (!generationId || !attemptId || !evidenceArgument) {
  fail(
    'Usage: node scripts/repo-tools/reconcile-storyteller-response.mjs <generation-id> <attempt-id> <saved-response.json>',
  );
} else {
  const evidenceRoot = path.resolve(root, 'data', 'story-local-evidence');
  const evidencePath = path.resolve(root, evidenceArgument);
  const relativeEvidence = path.relative(evidenceRoot, evidencePath);
  if (
    relativeEvidence.startsWith('..') ||
    path.isAbsolute(relativeEvidence) ||
    path.extname(evidencePath) !== '.json'
  ) {
    fail('Evidence must be a JSON file under data/story-local-evidence.');
  } else {
    const database = createDatabase(
      readDatabaseConfig({
        DATABASE_URL:
          'postgresql://offscreen:local-development-only@127.0.0.1:5432/offscreen_story_local',
      }),
      () => {},
    );
    try {
      const stored = await database.db.$client.query(
        `SELECT g.input, g.state AS generation_state, g.attempt_id,
                a.state AS attempt_state
         FROM generation g
         LEFT JOIN storyteller_attempt a ON a.id = g.attempt_id
         WHERE g.id = $1`,
        [generationId],
      );
      const row = stored.rows[0];
      if (
        !row ||
        row.generation_state !== 'uncertain' ||
        row.attempt_id !== attemptId ||
        row.attempt_state !== 'uncertain'
      ) {
        throw new Error('The named generation/attempt is not uncertain.');
      }

      const task = storytellerTaskSchema.parse(row.input);
      if (task.resources.recipe.version !== 'repairable-turn.v1') {
        throw new Error('The uncertain task did not capture repair capacity.');
      }
      const evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
      const envelope = JSON.parse(evidence.raw);
      const choice = envelope.choices?.[0];
      const usage = envelope.usage;
      if (
        evidence.httpStatus !== 200 ||
        !envelope.id ||
        !envelope.model ||
        !choice?.message?.content ||
        !usage
      ) {
        throw new Error('Saved evidence is not a complete provider response.');
      }
      if (
        task.execution.mode !== 'provider' ||
        envelope.model !== task.execution.policy.model ||
        envelope.provider !== task.execution.policy.provider
      ) {
        throw new Error('Saved evidence does not match the captured route.');
      }
      const integerUsage = [
        usage.prompt_tokens,
        usage.completion_tokens,
        usage.total_tokens,
      ];
      if (
        integerUsage.some(
          (value) => !Number.isSafeInteger(value) || value < 0,
        ) ||
        usage.total_tokens !== usage.prompt_tokens + usage.completion_tokens
      ) {
        throw new Error('Saved evidence has invalid token accounting.');
      }

      const candidate = normalizeOpenAiStrictOutput(
        JSON.parse(choice.message.content),
        task.request.outputSchema,
      );
      const diagnostic = diagnoseStorytellerResult(task, candidate);
      if (diagnostic === null) {
        throw new Error(
          'Saved response is valid; invalid-output repair does not apply.',
        );
      }
      const reportedCostMicrousd = usdToMicrousd(usage.cost);
      await createStorytellerBudget(database).settle({
        id: attemptId,
        execution: task.execution,
        usage: {
          reportedCostMicrousd,
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          reasoningTokens:
            usage.completion_tokens_details?.reasoning_tokens ?? null,
          cachedTokens: usage.prompt_tokens_details?.cached_tokens ?? null,
          cacheWriteTokens:
            usage.prompt_tokens_details?.cache_write_tokens ?? null,
        },
        telemetry: {
          durationMs: null,
          httpStatus: evidence.httpStatus,
          providerId: envelope.id,
          reportedModel: envelope.model,
          finishReason: choice.finish_reason ?? null,
        },
        generationOutcome: {
          state: 'failed',
          output: null,
          failureCode: 'invalid_output',
          repairCandidate: candidate,
          repairDiagnostic: diagnostic,
        },
        operationOutcome: 'continue',
      });
      console.log(
        JSON.stringify({
          generationId,
          attemptId,
          reportedCostMicrousd: reportedCostMicrousd.toString(),
          diagnostic,
        }),
      );
    } catch (error) {
      fail(error);
    } finally {
      await database.close();
    }
  }
}
