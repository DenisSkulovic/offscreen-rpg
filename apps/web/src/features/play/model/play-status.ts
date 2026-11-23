import type { StorySnapshot } from '@offscreen/story-interface/stories';

export function resolutionMessage(story: StorySnapshot) {
  if (!story.resolution) {
    return null;
  }
  const pendingAction =
    story.resolution.evidence === 'pending-action' &&
    story.campaign?.actionExecution;
  if (pendingAction) {
    if (story.resolution.state === 'uncertain') {
      return 'Private narration preparation has uncertain provider usage and is stopped. The accepted action is still in progress; its outcome, roll and effects are not current before the target.';
    }
    if (story.resolution.state === 'failed') {
      return 'Private narration preparation failed. The accepted action is still in progress; its outcome, roll and effects are not current before the target. Recovery can reuse the same frozen result after mechanics settle.';
    }
    if (story.resolution.state === 'blocked') {
      return 'Private narration is prepared but cannot publish before the accepted action settles.';
    }
    return 'The storyteller is preparing privately while the accepted action runs. No outcome, roll, effect or next choice is current before the target.';
  }
  const savedOutcome = story.campaign?.character
    ? 'The outcome and dice are saved. '
    : '';
  if (story.resolution.state === 'uncertain') {
    return `${savedOutcome}Provider usage is uncertain. Paid generation is stopped until it is reconciled; refreshing does not send another model request.`;
  }
  if (story.resolution.state === 'failed') {
    if (story.resolution.blocker?.kind === 'funding') {
      return `${savedOutcome}The generation allowance is unavailable. Your scene is unchanged.`;
    }
    if (story.resolution.blocker?.kind === 'usage-window') {
      return `${savedOutcome}This story has reached a renewable generation limit. Your scene is saved; retry after capacity returns.`;
    }
    if (story.resolution.blocker?.kind === 'authority') {
      return `${savedOutcome}Generation authorization changed before dispatch. Nothing was sent and your scene is unchanged.`;
    }
    if (story.resolution.blocker?.kind === 'task-input') {
      return `${savedOutcome}The required story context does not fit this generation policy. Retrying the unchanged request will not help.`;
    }
    if (story.resolution.blocker?.kind === 'provider-disabled') {
      return `${savedOutcome}Live generation is disabled. Your scene is unchanged.`;
    }
    if (story.campaign?.character) {
      return 'The outcome and dice are saved. Narration could not finish, and this spent operation cannot be repeated.';
    }
    return 'Continuation failed. Your intention is saved and the current scene is unchanged.';
  }
  if (story.resolution.state === 'blocked') {
    return `${savedOutcome}The saved continuation could not be published. Your current scene is unchanged.`;
  }
  if (story.campaign?.character) {
    return 'The outcome and dice are saved. The storyteller is preparing the next passage.';
  }
  return 'The storyteller is resolving this intention.';
}

export function stageStatusLabel(story: StorySnapshot, canChoose: boolean) {
  if (story.waiting) {
    return story.waiting.remainingMs === null
      ? 'Journey underway'
      : 'Journey paused';
  }
  if (story.resolution?.state === 'uncertain') {
    return 'Usage uncertain';
  }
  if (story.resolution?.state === 'failed') {
    return 'Continuation failed';
  }
  if (story.resolution?.state === 'blocked') {
    return 'Publication blocked';
  }
  if (story.resolution) {
    return 'Resolving your action';
  }
  if (canChoose) {
    return 'Waiting for your choice';
  }
  return 'Nothing underway';
}
