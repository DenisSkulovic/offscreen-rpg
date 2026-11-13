import type { CampaignView } from '@offscreen/contracts/campaign';

export function CampaignHistory({ campaign }: { campaign: CampaignView }) {
  const hasRecent =
    campaign.activityReports.length > 0 ||
    campaign.worldObligationReports.length > 0 ||
    campaign.activityEvents.length > 0 ||
    campaign.actionExecutionEvents.length > 0;

  if (!hasRecent) {
    return null;
  }

  return (
    <section
      className="story-frame__journal"
      aria-label="Committed developments"
    >
      <h2 className="story-frame__threshold-heading">
        Recent committed developments
      </h2>
      <p className="story-frame__intention-support">
        Verified campaign records only — not a “since you left” digest. No
        unseen-cursor projection is claimed here.
      </p>
      {campaign.activityReports.length ? (
        <details className="story-frame__secondary" open>
          <summary>Reports from earlier activity</summary>
          {campaign.activityReports.map((entry) => (
            <article key={entry.id}>
              <p>
                <strong>{entry.report?.title ?? entry.label}</strong> ·
                fictional second {entry.sourceGameSecond} · {entry.state}
              </p>
              {(entry.report?.paragraphs ?? [entry.factualSummary]).map(
                (paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ),
              )}
            </article>
          ))}
        </details>
      ) : null}
      {campaign.worldObligationReports.length ? (
        <details className="story-frame__secondary" open>
          <summary>Reports from world events</summary>
          {campaign.worldObligationReports.map((entry) => (
            <article key={entry.id}>
              <p>
                <strong>{entry.report?.title ?? entry.label}</strong> ·
                fictional second {entry.sourceGameSecond} · {entry.state}
              </p>
              {(entry.report?.paragraphs ?? [entry.factualSummary]).map(
                (paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ),
              )}
            </article>
          ))}
        </details>
      ) : null}
      {campaign.activityEvents.length ? (
        <details className="story-frame__secondary">
          <summary>Activity history (latest 100)</summary>
          {campaign.activityEvents.map((event) => (
            <article key={event.id}>
              <p>
                <strong>{event.label}</strong> · {event.kind} · fictional second{' '}
                {event.gameSecond}
              </p>
              <p>{event.summary}</p>
            </article>
          ))}
        </details>
      ) : null}
      {campaign.actionExecutionEvents.length ? (
        <details className="story-frame__secondary">
          <summary>Timed action history (latest 100)</summary>
          {campaign.actionExecutionEvents.map((event) => (
            <p key={event.id}>
              <strong>{event.label}</strong> · {event.kind} · fictional second{' '}
              {event.gameSecond}
            </p>
          ))}
        </details>
      ) : null}
    </section>
  );
}
