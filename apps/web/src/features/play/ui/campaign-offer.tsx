import type { CampaignView } from '@offscreen/contracts/campaign';
import type { StorySnapshot } from '@offscreen/contracts/stories';
import { formatWorldDuration } from '@offscreen/game/calendar';
import type { CampaignCommandApi } from '../api/campaign-command';
import {
  isPathStaged,
  offerChildren,
  offerNodes,
} from '../model/campaign-projections';
import { useOfferPath } from '../model/use-offer-path';

export function CampaignOfferPanel({
  story,
  campaign,
  command,
}: {
  story: StorySnapshot;
  campaign: CampaignView;
  command: CampaignCommandApi;
}) {
  const nodes = offerNodes(story, campaign);
  const offer = useOfferPath(campaign.offer?.id);
  const children = offerChildren(nodes, offer.path);
  const active = Boolean(
    campaign.activity &&
    ['running', 'paused'].includes(campaign.activity.state),
  );

  return (
    <>
      {nodes.length ? (
        <div
          className="scene-choices campaign-decisions"
          aria-label="Contextual options"
        >
          <h2>What would you like to do?</h2>
          {offer.path.length ? (
            <button
              disabled={command.busy}
              onClick={() => offer.setPath((prior) => prior.slice(0, -1))}
            >
              Back
            </button>
          ) : null}
          {children.map((node) => {
            const nextPath = [...offer.path, node.id];
            const staged = isPathStaged(offer.successorPaths, nextPath);
            return (
              <article className="campaign-option" key={node.id}>
                <button
                  disabled={
                    command.busy ||
                    command.retry ||
                    (Boolean(node.action) && staged)
                  }
                  onClick={() => {
                    if (!node.action) {
                      offer.setPath(nextPath);
                      return;
                    }
                    void command.send('actions', {
                      expectedRevision: story.revision,
                      offerId: campaign.offer?.id,
                      path: nextPath,
                      ...(offer.successorPaths.length
                        ? {
                            successorPaths: offer.successorPaths,
                            horizonGameSeconds: offer.planHorizonGameSeconds,
                          }
                        : {}),
                    });
                    offer.setPath([]);
                    offer.setSuccessorPaths([]);
                  }}
                >
                  {node.label}
                </button>
                <p className="campaign-option-intention">{node.description}</p>
                {node.action ? (
                  <p>
                    Time:{' '}
                    {node.action.timing.kind === 'process'
                      ? 'extended'
                      : formatWorldDuration(
                          campaign.settings.time,
                          node.action.timing.fictionalSeconds,
                        )}
                    .
                  </p>
                ) : null}
                {node.risk ? (
                  <p className="campaign-option-risk">
                    <strong>Apparent risk:</strong> {node.risk}
                  </p>
                ) : null}
                {node.action ? (
                  <button
                    disabled={
                      command.busy || offer.successorPaths.length >= 5 || staged
                    }
                    onClick={() =>
                      offer.setSuccessorPaths((prior) => [...prior, nextPath])
                    }
                  >
                    Add as a later activity
                  </button>
                ) : null}
              </article>
            );
          })}
          {offer.successorPaths.length ? (
            <div>
              <p>
                {offer.successorPaths.length} later{' '}
                {offer.successorPaths.length === 1 ? 'activity' : 'activities'}{' '}
                staged. Choose a different activity to start the plan.
              </p>
              <label>
                Successor horizon in fictional seconds{' '}
                <input
                  type="number"
                  min={1}
                  max={10080}
                  value={offer.planHorizonGameSeconds}
                  onChange={(event) =>
                    offer.setPlanHorizonGameSeconds(Number(event.target.value))
                  }
                />
              </label>{' '}
              <button
                onClick={() =>
                  offer.setSuccessorPaths((prior) => prior.slice(0, -1))
                }
              >
                Remove last
              </button>{' '}
              <button onClick={() => offer.setSuccessorPaths([])}>Clear</button>
            </div>
          ) : null}
        </div>
      ) : null}
      {!story.resolution && !active && !nodes.length ? (
        <p>
          The story is held: the current plan produced no supported action for
          these circumstances. Your character's life has not ended.
        </p>
      ) : null}
    </>
  );
}
