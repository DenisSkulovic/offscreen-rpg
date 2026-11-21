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

/** Execution-only worker: frozen task claim/save; no publication. */
export interface StorytellerDistributedExecutionActivities {
  executeFrozenStoryteller(generationId: string): Promise<void>;
}

/** Control worker: GA adoption + publication after a saved result exists. */
export interface StorytellerDistributedControlActivities {
  publishSavedStoryteller(generationId: string): Promise<void>;
}

export const storytellerExecuteTaskQueue = 'storyteller-execute-v1' as const;
export const storytellerControlTaskQueue = 'control' as const;
export const storytellerDistributedWorkflowType =
  'storytellerDistributedV1' as const;
export interface CampaignActivities {
  advanceCampaignActivity(id: string): Promise<number | null>;
  advanceCampaignAction(id: string): Promise<number | null>;
  advanceDelegatedWithdrawal(id: string): Promise<number | null>;
  prepareCampaignConsequence(id: string): Promise<void>;
}
export const campaignDelegatedDecisionWorkflowType =
  'campaignDelegatedDecisionV1';
export const campaignDelegatedDecisionWorkflowId = (id: string) =>
  `campaign-delegated-decision/${id}`;
export const campaignActivityWorkflowType = 'campaignActivityV1';
export const campaignActivityWorkflowId = (id: string) =>
  `campaign-activity/${id}`;
export const campaignActionWorkflowType = 'campaignActionV1';
export const campaignActionWorkflowId = (id: string) => `campaign-action/${id}`;
export const campaignConsequenceWorkflowType = 'campaignConsequenceV1';
export const campaignConsequenceWorkflowId = (id: string) =>
  `campaign-consequence/${id}`;
export const storytellerWorkflowType = 'storytellerV1';
export const storytellerWorkflowId = (id: string) => `storyteller/${id}`;

export interface StoryLaunchActivities {
  runScriptedLaunchWriter(
    reservedStoryId: string,
  ): Promise<'composing' | 'failed' | 'uncertain' | 'replayed'>;
}
export const storyLaunchWorkflowType = 'storyLaunchV1';
export const storyLaunchWorkflowId = (id: string) => `story-launch/${id}`;

export interface WriterSceneActivities {
  runScriptedWriterScene(missionId: string): Promise<void>;
}
export const writerSceneWorkflowType = 'writerSceneV1';
export const writerSceneWorkflowId = (id: string) => `writer-scene/${id}`;
