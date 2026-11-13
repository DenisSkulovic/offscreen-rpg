import type { CampaignView } from '@offscreen/contracts/campaign';
import {
  formatWorldDuration,
  projectWorldTime,
} from '@offscreen/game/calendar';
import { campaignHoldMessage } from '../model/campaign-projections';

export function CampaignStatus({ campaign }: { campaign: CampaignView }) {
  const holdMessage = campaignHoldMessage(campaign.holds);
  const character = campaign.character;
  const hasYou =
    Boolean(character?.name) ||
    Boolean(character?.quantities?.length) ||
    Boolean(character?.facts?.length) ||
    campaign.storyFacts.length > 0;
  const hasWorld =
    Boolean(campaign.location) ||
    campaign.worldConditions.length > 0 ||
    campaign.worldObligations.some((o) => o.state === 'pending') ||
    campaign.worldObligationEvents.length > 0;

  return (
    <div className="story-frame__status-band">
      <div className="campaign-summary">
        {character?.name ? (
          <p>
            {character.name}
            {typeof character.hp === 'number' &&
            typeof character.maxHp === 'number'
              ? ` · HP ${character.hp}/${character.maxHp}`
              : ''}
            {campaign.location ? ` · ${campaign.location}` : ''}
          </p>
        ) : campaign.location ? (
          <p>{campaign.location}</p>
        ) : null}
        <p>World time: {campaign.worldTime.label}</p>
      </div>
      {holdMessage ? (
        <p className="story-frame__stage-status" role="status">
          {holdMessage} Existing activity progress is preserved and held wall
          time will not become catch-up progress.
        </p>
      ) : null}

      {hasYou ? (
        <details className="story-frame__secondary">
          <summary>You</summary>
          <p className="story-frame__intention-support">
            Only facts the public view already carries. Absent body, inventory,
            or scores are omitted — not shown as zero.
          </p>
          {character?.quantities?.map((quantity) => (
            <p key={quantity.id}>
              {quantity.label}: {quantity.value}
            </p>
          ))}
          {character?.facts?.map((fact) => (
            <p key={fact.id}>
              {fact.id}: {String(fact.value)}
            </p>
          ))}
          {campaign.storyFacts.map((fact) => (
            <p key={fact.id}>
              Story fact · {fact.id}: {String(fact.value)}
            </p>
          ))}
          <p>
            Elapsed game time:{' '}
            {formatWorldDuration(campaign.settings.time, campaign.gameSecond)}.
          </p>
        </details>
      ) : null}

      {hasWorld ? (
        <details className="story-frame__secondary">
          <summary>World</summary>
          <p className="story-frame__intention-support">
            Established public conditions and known future events only — not a
            private lore database.
          </p>
          {campaign.location ? <p>Known place: {campaign.location}</p> : null}
          {campaign.worldConditions.map((condition) => (
            <p key={condition.id}>
              <strong>{condition.label}</strong>: {String(condition.value)}
            </p>
          ))}
          {campaign.worldObligations.some(
            (obligation) => obligation.state === 'pending',
          ) ? (
            <>
              <h3 className="story-frame__threshold-heading">
                Known future events
              </h3>
              {campaign.worldObligations
                .filter((obligation) => obligation.state === 'pending')
                .map((obligation) => (
                  <p key={obligation.id}>
                    <strong>{obligation.label}</strong>
                    {obligation.visibility === 'exact'
                      ? ` — ${projectWorldTime(campaign.settings.time, obligation.dueGameSecond).label}`
                      : ` — ${obligation.description}`}
                  </p>
                ))}
            </>
          ) : null}
          {campaign.worldObligationEvents.length ? (
            <details className="story-frame__secondary">
              <summary>World event history</summary>
              {campaign.worldObligationEvents.map((event) => (
                <p key={event.id}>
                  <strong>{event.label}</strong> · {event.kind} ·{' '}
                  {projectWorldTime(
                    campaign.settings.time,
                    event.gameSecond,
                  ).label}
                </p>
              ))}
            </details>
          ) : null}
        </details>
      ) : null}
    </div>
  );
}
