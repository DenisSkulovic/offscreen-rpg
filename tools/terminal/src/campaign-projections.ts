import type { CampaignView } from '@offscreen/contracts/campaign';
import type { StorySnapshot } from '@offscreen/contracts/stories';

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

export function pathKey(path: string[]) {
  return path.join('/');
}

export function isPathStaged(successorPaths: string[][], path: string[]) {
  const key = pathKey(path);
  return successorPaths.some((candidate) => pathKey(candidate) === key);
}
