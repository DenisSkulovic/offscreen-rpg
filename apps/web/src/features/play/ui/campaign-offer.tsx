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

function supportLine(parts: Array<string | null | undefined>) {
  const text = parts.filter(Boolean).join(' · ');
  return text || undefined;
}

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
        <section
          className="story-frame__threshold campaign-decisions"
          aria-label="Contextual options"
        >
          <h2 className="story-frame__threshold-heading">What will you do?</h2>
          {offer.path.length ? (
            <button
              type="button"
              className="story-frame__intention story-frame__intention--explore"
              disabled={command.busy}
              onClick={() => offer.setPath((prior) => prior.slice(0, -1))}
            >
              Back
              <span className="story-frame__intention-support">
                Return to the previous options · no time spent
              </span>
            </button>
          ) : null}
          <ul className="story-frame__intentions">
            {children.map((node) => {
              const nextPath = [...offer.path, node.id];
              const staged = isPathStaged(offer.successorPaths, nextPath);
              const isCommit = Boolean(node.action);
              const timing =
                node.action == null
                  ? null
                  : node.action.timing.kind === 'process'
                    ? 'Begins ongoing work'
                    : formatWorldDuration(
                        campaign.settings.time,
                        node.action.timing.fictionalSeconds,
                      );
              return (
                <li key={node.id}>
                  <button
                    type="button"
                    className={
                      isCommit
                        ? 'story-frame__intention story-frame__intention--commit'
                        : 'story-frame__intention story-frame__intention--explore'
                    }
                    disabled={
                      command.busy ||
                      command.retry ||
                      (isCommit && staged)
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
                    <span className="story-frame__intention-support">
                      {supportLine([
                        isCommit ? null : 'Browse options · no time spent',
                        node.description,
                        timing,
                        node.risk ? `Apparent risk: ${node.risk}` : null,
                        staged ? 'Already staged for later' : null,
                      ])}
                    </span>
                  </button>
                  {isCommit ? (
                    <button
                      type="button"
                      className="story-frame__intention story-frame__intention--explore"
                      disabled={
                        command.busy ||
                        offer.successorPaths.length >= 5 ||
                        staged
                      }
                      onClick={() =>
                        offer.setSuccessorPaths((prior) => [
                          ...prior,
                          nextPath,
                        ])
                      }
                    >
                      Stage for later
                      <span className="story-frame__intention-support">
                        Does not start the action · planning only
                      </span>
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {offer.successorPaths.length ? (
            <details className="story-frame__secondary">
              <summary>
                {offer.successorPaths.length} later{' '}
                {offer.successorPaths.length === 1
                  ? 'activity'
                  : 'activities'}{' '}
                staged
              </summary>
              <p className="story-frame__intention-support">
                Choose a different activity to start the plan. Horizon editing
                stays here until the dedicated planner slice.
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
              </label>
              <button
                type="button"
                className="story-frame__intention story-frame__intention--explore"
                onClick={() =>
                  offer.setSuccessorPaths((prior) => prior.slice(0, -1))
                }
              >
                Remove last
              </button>
              <button
                type="button"
                className="story-frame__intention story-frame__intention--explore"
                onClick={() => offer.setSuccessorPaths([])}
              >
                Clear staged plan
              </button>
            </details>
          ) : null}
        </section>
      ) : null}
      {!story.resolution && !active && !nodes.length ? (
        <p className="story-frame__stage-status" role="status">
          The story is held: the current plan produced no supported action for
          these circumstances. Your character&apos;s life has not ended.
        </p>
      ) : null}
    </>
  );
}
