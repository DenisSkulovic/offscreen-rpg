import { test } from 'node:test';
import {
  waitForProfiledOutboxQuiet,
  withProfiledStoryteller,
} from './storyteller-suite.js';
import { checkImportedStart } from './storyteller-imported-start.integration.js';
import { checkJourneySchedule } from './storyteller-journey-schedule.integration.js';
import { checkPreparationHold } from './storyteller-preparation-hold.integration.js';
import { checkActivityAdmission } from './storyteller-activity-admission.integration.js';
import { checkAcceptedPlan } from './storyteller-accepted-plan.integration.js';
import { checkActivitySettlement } from './storyteller-activity-settlement.integration.js';
import { checkPublicationContext } from './storyteller-publication-context.integration.js';
import { checkProviderBudget } from './storyteller-provider-budget.integration.js';
import { checkMemoryExploration } from './storyteller-memory-exploration.integration.js';
import { checkProviderRecovery } from './storyteller-provider-recovery.integration.js';
import { checkWorkerReplay } from './storyteller-worker-replay.integration.js';
import { checkBrowserCreation } from './storyteller-browser-creation.integration.js';

// All sources and provider responses in this suite are local. No credentials are read.
// One session and the original case order. The shared opening, allocation rows,
// uncertain-attempt cleanup, and worker stop or restart stay in this sequence.
test(
  'profiled storyteller: durable choices, context, accounting and browser creation',
  { timeout: 240000 },
  async (t) => {
    await withProfiledStoryteller(async (suite) => {
      await checkImportedStart(t, suite);
      await checkJourneySchedule(t, suite);
      await waitForProfiledOutboxQuiet(suite.database, {
        restartWorker: suite.restartWorker,
      });
      await checkPreparationHold(t, suite);
      await checkActivityAdmission(t, suite);
      await checkAcceptedPlan(t, suite);
      await checkActivitySettlement(t, suite);
      await checkPublicationContext(t, suite);
      await checkProviderBudget(t, suite);
      await checkMemoryExploration(t, suite);
      await checkProviderRecovery(t, suite);
      await waitForProfiledOutboxQuiet(suite.database, {
        restartWorker: suite.restartWorker,
      });
      await checkWorkerReplay(t, suite);
      await checkBrowserCreation(t, suite);
    });
  },
);
