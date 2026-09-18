export interface OpeningActivities {
  completeScriptedOpening(id: string): Promise<void>;
}
export const openingWorkflowType = 'scriptedOpeningV1';
export const openingWorkflowId = (id: string) => `scripted-opening/${id}`;
export interface ContinuationActivities {
  completeScriptedContinuation(id: string): Promise<void>;
}
export const continuationWorkflowType = 'scriptedContinuationV1';
export const continuationWorkflowId = (id: string) =>
  `scripted-continuation/${id}`;
export interface IntervalActivities {
  advanceControlledInterval(id: string): Promise<number | null>;
}
export const controlledIntervalWorkflowType = 'storyIntervalV1';
export const controlledIntervalWorkflowId = (id: string) =>
  `controlled-interval/${id}`;
export const intervalChangedSignal = 'intervalChanged';

export interface DecisionActivities {
  resolveStoryDecision(id: string): Promise<number | null>;
}
export const decisionWorkflowType = 'storyDecisionV1';
export const decisionWorkflowId = (id: string) => `story-decision/${id}`;

export interface StorytellerActivities {
  completeStoryteller(id: string): Promise<void>;
}
export interface CampaignActivities {
  advanceCampaignActivity(id: string): Promise<number | null>;
  prepareCampaignConsequence(id: string): Promise<void>;
}
export const campaignActivityWorkflowType = 'campaignActivityV1';
export const campaignActivityWorkflowId = (id: string) =>
  `campaign-activity/${id}`;
export const campaignConsequenceWorkflowType = 'campaignConsequenceV1';
export const campaignConsequenceWorkflowId = (id: string) =>
  `campaign-consequence/${id}`;
export const storytellerWorkflowType = 'storytellerV1';
export const storytellerWorkflowId = (id: string) => `storyteller/${id}`;
