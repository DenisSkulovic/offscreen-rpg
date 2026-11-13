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
import { matchCampaignChoice } from '../presentation/resolve';
import type { ResolvedPresentation } from '../presentation/types';
import { IntentionChoice } from './intention-choice';

function supportLine(parts: Array<string | null | undefined>) {
  const text = parts.filter(Boolean).join(' · ');
  return text || undefined;
}

export function CampaignOfferPanel({
  story,
  campaign,
  command,
  presentation = null,
}: {
  story: StorySnapshot;
  campaign: CampaignView;
  command: CampaignCommandApi;
  /** Fixture-resolved treatments. Live Play leaves this unset. */
  presentation?: ResolvedPresentation | null;
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
            <IntentionChoice
              label="Back"
              support="Return to the previous options · no time spent"
              behavior="explore"
              disabled={command.busy}
              onClick={() => offer.setPath((prior) => prior.slice(0, -1))}
            />
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
                  <IntentionChoice
                    label={node.label}
                    support={supportLine([
                      isCommit ? null : 'Browse options · no time spent',
                      node.description,
                      timing,
                      node.risk ? `Apparent risk: ${node.risk}` : null,
                      staged ? 'Already staged for later' : null,
                    ])}
                    behavior={isCommit ? 'commit' : 'explore'}
                    disabled={
                      command.busy || command.retry || (isCommit && staged)
                    }
                    treatment={
                      presentation && campaign.offer
                        ? matchCampaignChoice(
                            presentation,
                            campaign.offer.id,
                            nextPath,
                          )
                        : undefined
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
                  />
                  {isCommit ? (
                    <IntentionChoice
                      label="Add to plan ahead"
                      support="Does not start the action · conditional later attempt"
                      behavior="explore"
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
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
          {offer.successorPaths.length ? (
            <details className="story-frame__secondary" open>
              <summary>
                Plan a little ahead · {offer.successorPaths.length} later{' '}
                {offer.successorPaths.length === 1
                  ? 'activity'
                  : 'activities'}{' '}
                staged
              </summary>
              <p className="story-frame__intention-support">
                Successors are conditional later attempts, not guaranteed
                completions. Choose a different activity as the first step to
                accept this plan in one frozen command.
              </p>
              <fieldset>
                <legend>Stop planning after about</legend>
                {(
                  [
                    { label: '1 in-world hour', seconds: 3600 },
                    { label: '4 in-world hours', seconds: 14400 },
                    { label: '1 in-world day', seconds: 86400 },
                  ] as const
                ).map((option) => (
                  <label key={option.seconds}>
                    <input
                      type="radio"
                      name="plan-horizon"
                      checked={
                        offer.planHorizonGameSeconds === option.seconds
                      }
                      onChange={() =>
                        offer.setPlanHorizonGameSeconds(option.seconds)
                      }
                    />{' '}
                    {option.label}
                  </label>
                ))}
              </fieldset>
              <p className="story-frame__intention-support">
                Horizon:{' '}
                {formatWorldDuration(
                  campaign.settings.time,
                  offer.planHorizonGameSeconds,
                )}{' '}
                of fictional time (exact admitted seconds:{' '}
                {offer.planHorizonGameSeconds}).
              </p>
              <IntentionChoice
                label="Remove last step"
                behavior="explore"
                onClick={() =>
                  offer.setSuccessorPaths((prior) => prior.slice(0, -1))
                }
              />
              <IntentionChoice
                label="Clear plan"
                behavior="explore"
                onClick={() => offer.setSuccessorPaths([])}
              />
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
