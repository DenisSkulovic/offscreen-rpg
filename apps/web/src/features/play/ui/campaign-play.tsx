'use client';
/**
 * Campaign surface composer: Query snapshot projections + command callbacks.
 * Transport ownership stays in api/use-campaign-command; offer path is local.
 */
import type { StorySnapshot } from '@offscreen/contracts/stories';
import type { CampaignView } from '@offscreen/contracts/campaign';
import { useCampaignCommand } from '../api/use-campaign-command';
import { CampaignActivityPanel } from './campaign-activity';
import { CampaignHistory } from './campaign-history';
import { CampaignOfferPanel } from './campaign-offer';
import { CampaignRecords } from './campaign-records';
import { CampaignStatus } from './campaign-status';

export function CampaignPlay({
  story,
  campaign,
  onSnapshot,
}: {
  story: StorySnapshot;
  campaign: CampaignView;
  onSnapshot: (story: StorySnapshot) => void;
}) {
  const command = useCampaignCommand(story.id, onSnapshot);
  return (
    <section className="campaign-play" aria-label="Character and activities">
      <CampaignStatus campaign={campaign} />
      <CampaignActivityPanel campaign={campaign} command={command} />
      <CampaignHistory campaign={campaign} />
      <CampaignOfferPanel story={story} campaign={campaign} command={command} />
      {command.message ? <p role="status">{command.message}</p> : null}
      {command.retry ? (
        <button disabled={command.busy} onClick={() => void command.send()}>
          Retry the same request
        </button>
      ) : null}
      <CampaignRecords campaign={campaign} />
    </section>
  );
}
