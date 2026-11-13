import type { StorySnapshot } from '@offscreen/contracts/stories';
import { allCampaignOfferPaths, offerNodes } from './campaign-projections';
import { resolvePresentation } from '../presentation/resolve';
import type {
  AssetCatalog,
  PresentationScope,
  ResolvedPresentation,
} from '../presentation/types';

function trustedCatalog(
  assets: NonNullable<StorySnapshot['current']['appearance']>['assets'],
): AssetCatalog {
  if (!assets) return {};
  const catalog: Record<string, AssetCatalog[string]> = {};
  for (const [id, asset] of Object.entries(assets)) {
    catalog[id] = {
      src: asset.src,
      width: asset.width,
      height: asset.height,
      description: asset.description,
    };
  }
  return catalog;
}

/** Derive presentation scope from the validated live snapshot only. */
export function presentationScopeForStory(
  story: StorySnapshot,
): PresentationScope {
  const interactionId = story.current.interaction?.id;
  const campaignOfferId = story.campaign?.offer?.id;
  const nodes = story.campaign
    ? offerNodes(story, story.campaign)
    : [];
  return {
    storyId: story.id,
    passageId: story.current.id,
    paragraphCount: story.current.content.paragraphs.length,
    ...(interactionId ? { interactionId } : {}),
    ...(campaignOfferId ? { campaignOfferId } : {}),
    ...(nodes.length
      ? { validCampaignPaths: allCampaignOfferPaths(nodes) }
      : {}),
    ...(interactionId
      ? {
          validLegacyOptionIds: story.current.interaction!.specification.options.map(
            (option) => option.id,
          ),
        }
      : {}),
  };
}

/**
 * Resolve published appearance for live Play. Missing/stale/corrupt → null.
 * Never invents style from prose.
 */
export function resolveLivePresentation(
  story: StorySnapshot,
): ResolvedPresentation | null {
  const appearance = story.current.appearance;
  if (!appearance) return null;
  if (
    appearance.source.storyId !== story.id ||
    appearance.source.passageId !== story.current.id
  ) {
    return null;
  }
  const resolved = resolvePresentation(
    appearance.directive,
    presentationScopeForStory(story),
    trustedCatalog(appearance.assets),
  );
  return resolved.applied ? resolved : null;
}
