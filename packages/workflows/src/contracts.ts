export interface OpeningActivities {
  completeScriptedOpening(id: string): Promise<void>;
}
export const openingWorkflowType = 'scriptedOpeningV1';
export const openingWorkflowId = (id: string) => `scripted-opening/${id}`;
export interface IntervalActivities {
  advanceStoryInterval(id: string): Promise<number | null>;
  advanceControlledInterval(id: string): Promise<number | null>;
}
export const intervalWorkflowType = 'storyIntervalV1';
export const intervalWorkflowId = (id: string) => `story-interval/${id}`;
export const controlledIntervalWorkflowType = 'storyIntervalV2';
export const controlledIntervalWorkflowId = (id: string) =>
  `controlled-interval/${id}`;
export const intervalChangedSignal = 'intervalChanged';

export interface DecisionActivities {
  resolveStoryDecision(id: string): Promise<number | null>;
}
export const decisionWorkflowType = 'storyDecisionV1';
export const decisionWorkflowId = (id: string) => `story-decision/${id}`;
