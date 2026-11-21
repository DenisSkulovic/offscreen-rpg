import type { QaJourneyCase } from '@offscreen/contracts/qa';
import { activityLifecycleCases } from './qa-catalog/activity-lifecycle';
import { calendarAndLiveEvaluationCases } from './qa-catalog/calendar-and-live-evaluation';
import { playerEntryCases } from './qa-catalog/player-entry';
import { storytellerOperationCases } from './qa-catalog/storyteller-operations';
import { startPackageCases } from './qa-catalog/start-packages';

export const qaJourneyCatalog: readonly QaJourneyCase[] = [
  ...playerEntryCases,
  ...activityLifecycleCases,
  ...storytellerOperationCases,
  ...startPackageCases,
  ...calendarAndLiveEvaluationCases,
];

if (
  new Set(qaJourneyCatalog.map((entry) => entry.id)).size !==
  qaJourneyCatalog.length
) {
  throw new Error('Duplicate QA journey identity');
}

export function listQaJourneyCases(): readonly QaJourneyCase[] {
  return qaJourneyCatalog;
}

export function findQaJourneyCase(
  id: string,
  version: number,
): QaJourneyCase | undefined {
  return qaJourneyCatalog.find(
    (entry) => entry.id === id && entry.version === version,
  );
}
