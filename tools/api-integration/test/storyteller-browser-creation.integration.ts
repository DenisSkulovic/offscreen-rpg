import assert from 'node:assert/strict';
import { createCustomDraftSetup } from './helpers/draft-wizard.js';
import { withBrowserSession } from './helpers/browser-session.js';
import type { TestContext } from 'node:test';
import {
  Client,
  Connection,
  WorkflowNotFoundError,
} from '@temporalio/client';
import { type ProfiledStoryteller } from './storyteller-suite.js';
import { registerProfiledStoryteller } from './storyteller-suite.js';

async function describeTemporalStorytellerWorkflows(
  workflowIds: readonly string[],
): Promise<Array<{ workflowId: string; status: string }>> {
  const address = process.env['TEMPORAL_ADDRESS'] ?? '127.0.0.1:7233';
  const namespace = process.env['TEMPORAL_NAMESPACE'] ?? 'default';
  const connection = await Connection.connect({ address });
  const results: Array<{ workflowId: string; status: string }> = [];
  try {
    const client = new Client({ connection, namespace });
    for (const workflowId of workflowIds) {
      try {
        const handle = client.workflow.getHandle(workflowId);
        const description = await handle.describe();
        results.push({
          workflowId,
          status: description.status.name,
        });
      } catch (error) {
        if (error instanceof WorkflowNotFoundError) {
          results.push({ workflowId, status: 'not found' });
          continue;
        }
        const code = (error as { code?: string }).code;
        if (code === 'NOT_FOUND' || code === 'WORKFLOW_NOT_FOUND') {
          results.push({ workflowId, status: 'not found' });
          continue;
        }
        throw error;
      }
    }
  } finally {
    await connection.close().catch(() => undefined);
  }
  return results;
}

// Moved unchanged from the profiled Storyteller suite.
export async function checkBrowserCreation(
  t: TestContext,
  {
    database,
    origin,
    cookie,
    restartWorker,
  }: ProfiledStoryteller,
): Promise<void> {
  await t.test(
    'browser selects a profile, starts, chooses, reloads and finds live story',
    async () => {
      await restartWorker();
      await withBrowserSession(origin, cookie, async ({ context }) => {
        const page = await context.newPage();
        await page.goto(`${origin}/stories/new`);
        // W08 multi-step setup: scratch -> role -> Storyteller -> review -> save.
        await createCustomDraftSetup(page, {
          title: 'Pineapple browser story',
          premise: 'I am SpongeBob in the pineapple with Gary.',
          storytellerName: 'Quiet Eerie Mystery',
        });
        await page
          .getByRole('link', { name: 'Create the opening' })
          .click();
        await page
          .getByRole('button', {
            name: 'Create opening',
            exact: true,
          })
          .click();
        await page
          .getByRole('button', { name: 'Start story', exact: true })
          .click({ timeout: 30000 });
        await page.waitForURL('**/play/**');
        await page
          .getByRole('heading', {
            name: 'Morning in the pineapple',
            exact: true,
          })
          .waitFor({ timeout: 30000 });
        const askGary = page.getByRole('button', {
          name: 'Ask Gary about the delivery',
          exact: true,
        });
        await askGary.waitFor({ timeout: 30000 });
        const resolutionPutPath =
          /^\/api\/stories\/([^/]+)\/resolutions\/([^/]+)$/;
        let putStatus: number | 'timeout' = 'timeout';
        let putBody: unknown = null;
        let storyId = '';
        let operationId = '';
        const putResponsePromise = page.waitForResponse(
          (response) => {
            if (response.request().method() !== 'PUT') {
              return false;
            }
            return resolutionPutPath.test(
              new URL(response.url()).pathname,
            );
          },
          { timeout: 60000 },
        );
        await askGary.click();
        try {
          const putResponse = await putResponsePromise;
          putStatus = putResponse.status();
          try {
            putBody = await putResponse.json();
          } catch {
            putBody = await putResponse.text();
          }
          const match = new URL(putResponse.url()).pathname.match(
            resolutionPutPath,
          );
          if (match) {
            storyId = match[1] ?? '';
            operationId = match[2] ?? '';
          }
        } catch {
          // leave putStatus as 'timeout' for Gary timeout diagnostics
        }
        await page
          .getByText('The storyteller is resolving this intention.')
          .waitFor({ timeout: 30000 });
        await page.reload();
        await page
          .getByText('The storyteller is resolving this intention.')
          .waitFor({ timeout: 30000 });
        let receiptStatus: number | 'not fetched' = 'not fetched';
        let receiptBody: unknown = null;
        if (storyId && operationId) {
          const receiptResponse = await fetch(
            `${origin}/api/stories/${storyId}/resolutions/${operationId}/receipt`,
            { headers: { cookie } },
          );
          receiptStatus = receiptResponse.status;
          try {
            receiptBody = await receiptResponse.json();
          } catch {
            receiptBody = await receiptResponse.text();
          }
        }
        const garysPromise = page.getByRole('heading', {
          name: 'Gary’s promise',
          exact: true,
        });
        try {
          await garysPromise.waitFor({ timeout: 30000 });
        } catch (error) {
          const h1Texts = await page.locator('h1').allInnerTexts();
          let generationDiagnostic: unknown = null;
          let outboxDiagnostic: unknown = null;
          let temporalDiagnostic: unknown = null;
          if (storyId && operationId) {
            const generationResult = await database.db.$client.query<{
              generation_id: string;
              state: string;
              kind: string;
            }>(
              `SELECT g.id AS generation_id, g.state, g.kind
               FROM story_resolution sr
               INNER JOIN generation g ON g.id = sr.generation_id
               WHERE sr.story_id = $1::uuid AND sr.operation_id = $2::uuid`,
              [storyId, operationId],
            );
            generationDiagnostic = generationResult.rows;
            const generationId = generationResult.rows[0]?.generation_id;
            const outboxOperationIds = generationId
              ? [operationId, generationId]
              : [operationId];
            const outboxResult = await database.db.$client.query<{
              id: string;
              topic: string;
              delivered_at: Date | null;
              created_at: Date;
            }>(
              `SELECT id, topic, delivered_at, available_at AS created_at
               FROM outbox
               WHERE operation_id = ANY($1::uuid[])`,
              [outboxOperationIds],
            );
            outboxDiagnostic = outboxResult.rows;
            const temporalWorkflowIds = [`storyteller/${operationId}`];
            if (generationId && generationId !== operationId) {
              temporalWorkflowIds.push(`storyteller/${generationId}`);
            }
            temporalDiagnostic =
              await describeTemporalStorytellerWorkflows(temporalWorkflowIds);
          }
          throw new Error(
            `Expected heading Gary’s promise; PUT status=${JSON.stringify(putStatus)} PUT body=${JSON.stringify(putBody)}; receipt status=${JSON.stringify(receiptStatus)} receipt body=${JSON.stringify(receiptBody)}; h1 texts: ${JSON.stringify(h1Texts)}; generation=${JSON.stringify(generationDiagnostic)}; outbox=${JSON.stringify(outboxDiagnostic)}; temporal=${JSON.stringify(temporalDiagnostic)}`,
            { cause: error },
          );
        }
        await page
          .getByRole('button', {
            name: 'Walk to work and leave this for later',
            exact: true,
          })
          .click();
        await page
          .getByRole('heading', {
            name: 'On the way to work',
            exact: true,
          })
          .waitFor({ timeout: 30000 });
        await page
          .getByRole('button', { name: 'Pause', exact: true })
          .click();
        await page.getByText('Journey paused', { exact: true }).waitFor();
        await restartWorker();
        const url = page.url();
        await page.reload();
        await page.getByText('Journey paused', { exact: true }).waitFor();
        await page
          .getByRole('button', { name: 'Resume', exact: true })
          .click();
        await page
          .getByRole('heading', { name: 'Outside work', exact: true })
          .waitFor({ timeout: 35000 });
        await page.reload();
        await page.getByRole('button', { name: 'Contents', exact: true }).click();
        await page.getByRole('link', { name: 'Journal', exact: true }).click();
        await page
          .getByRole('button', {
            name: 'Read saved passages',
            exact: true,
          })
          .click();
        await page
          .getByRole('button', {
            name: /1\. Morning in the pineapple/,
          })
          .waitFor();
        await page.goto(`${origin}/stories`);
        assert.ok(
          await page
            .locator(`a[href="${new URL(url).pathname}"]`)
            .count(),
        );
      });
    },
  );
}

registerProfiledStoryteller(
  import.meta.url,
  'browser story creation',
  checkBrowserCreation,
  { skipFixtureCandidate: true },
);
