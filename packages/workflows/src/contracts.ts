export interface OpeningActivities {
  completeScriptedOpening(id: string): Promise<void>;
}
export const openingWorkflowType = 'scriptedOpeningV1';
export const openingWorkflowId = (id: string) => `scripted-opening/${id}`;
export interface IntervalActivities {
  advanceStoryInterval(id: string): Promise<number | null>;
}
export const intervalWorkflowType = 'storyIntervalV1';
export const intervalWorkflowId = (id: string) => `story-interval/${id}`;
