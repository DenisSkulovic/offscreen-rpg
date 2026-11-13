import type { CampaignView } from '@offscreen/contracts/campaign';
import type { StorySnapshot } from '@offscreen/contracts/stories';

export function campaignHoldMessage(
  holds: CampaignView['holds'],
): string | null {
  if (holds.length === 0) {
    return null;
  }
  if (
    holds.some(
      (hold) =>
        hold.kind === 'storyteller-intent' || hold.kind === 'storyteller',
    )
  ) {
    return 'Campaign time is held while the Storyteller prepares a required scene.';
  }
  if (holds.some((hold) => hold.kind === 'world-obligation')) {
    return 'Campaign time is held because a consequential world event requires attention.';
  }
  return 'Campaign time is held while your choice is open.';
}

export function offerNodes(
  story: StorySnapshot,
  campaign: CampaignView,
): NonNullable<CampaignView['offer']>['nodes'] {
  if (story.resolution) {
    return [];
  }
  return campaign.offer?.nodes ?? [];
}

export function offerChildren(
  nodes: NonNullable<CampaignView['offer']>['nodes'],
  path: string[],
) {
  const parent = path.at(-1) ?? null;
  return nodes.filter((node) => node.parent === parent);
}

export function isActivityActive(
  activity: CampaignView['activity'],
): activity is NonNullable<CampaignView['activity']> & {
  state: 'running' | 'paused';
} {
  return Boolean(activity && ['running', 'paused'].includes(activity.state));
}

export function activityConditionLabel(
  activity: NonNullable<CampaignView['activity']>,
): string {
  if (activity.completionPending) {
    return 'Checking the outcome — not finished yet';
  }
  switch (activity.state) {
    case 'running':
      return 'Underway';
    case 'paused':
      return 'Paused — time is not advancing this work';
    case 'encounter':
      return 'Interrupted — the scene needs your attention';
    case 'suspended':
      return 'Suspended — progress is saved';
    case 'blocked':
      return 'Blocked — this work cannot continue yet';
    case 'complete':
      return 'Complete';
    case 'abandoned':
      return 'Abandoned';
    default:
      return activity.state;
  }
}

export function retainedCommitments(campaign: CampaignView) {
  return campaign.commitments.filter(
    (commitment) => commitment.id !== campaign.activity?.id,
  );
}

export function pathKey(path: string[]) {
  return path.join('/');
}

export function isPathStaged(successorPaths: string[][], path: string[]) {
  const key = pathKey(path);
  return successorPaths.some((candidate) => pathKey(candidate) === key);
}
