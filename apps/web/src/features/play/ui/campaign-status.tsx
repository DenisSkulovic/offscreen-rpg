import type { CampaignView } from '@offscreen/contracts/campaign';
import {
  formatWorldDuration,
  projectWorldTime,
} from '@offscreen/game/calendar';
import { campaignHoldMessage } from '../model/campaign-projections';

export function CampaignStatus({ campaign }: { campaign: CampaignView }) {
  const holdMessage = campaignHoldMessage(campaign.holds);
  return (
    <div className="story-frame__status-band">
      <div className="campaign-summary">
        <p>
          {campaign.character?.name
            ? `${campaign.character.name} · HP ${campaign.character.hp}/${campaign.character.maxHp}`
            : 'Character state arrives with the scene'}
          {campaign.location ? ` · ${campaign.location}` : ''}
        </p>
        <p>World time: {campaign.worldTime.label}</p>
      </div>
      {holdMessage ? (
        <p className="story-frame__stage-status" role="status">
          {holdMessage} Existing activity progress is preserved and held wall
          time will not become catch-up progress.
        </p>
      ) : null}
      {campaign.worldConditions.length ? (
        <section aria-label="Current world conditions">
          <h2 className="story-frame__threshold-heading">
            Current world conditions
          </h2>
          {campaign.worldConditions.map((condition) => (
            <p key={condition.id}>
              <strong>{condition.label}</strong>: {String(condition.value)}
            </p>
          ))}
        </section>
      ) : null}
      {campaign.worldObligations.some(
        (obligation) => obligation.state === 'pending',
      ) ? (
        <details className="story-frame__secondary" open>
          <summary>Known future events</summary>
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
        </details>
      ) : null}
      {campaign.worldObligationEvents.length ? (
        <details className="story-frame__secondary">
          <summary>World event history</summary>
          {campaign.worldObligationEvents.map((event) => (
            <p key={event.id}>
              <strong>{event.label}</strong> · {event.kind} ·{' '}
              {projectWorldTime(campaign.settings.time, event.gameSecond).label}
            </p>
          ))}
        </details>
      ) : null}
      <details className="story-frame__secondary">
        <summary>Character state and rules</summary>
        {campaign.character?.quantities.map((quantity) => (
          <p key={quantity.id}>
            {quantity.label}: {quantity.value}
          </p>
        ))}
        {campaign.character?.facts.map((fact) => (
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
          SRD 5.2.1 ability-check subset; server-resolved nonlethal actions.
        </p>
      </details>
    </div>
  );
}
