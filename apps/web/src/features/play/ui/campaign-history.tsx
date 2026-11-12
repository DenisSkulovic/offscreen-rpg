import type { CampaignView } from '@offscreen/contracts/campaign';

export function CampaignHistory({ campaign }: { campaign: CampaignView }) {
  return (
    <>
      {campaign.activityEvents.length ? (
        <details>
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
        <details>
          <summary>Timed action history (latest 100)</summary>
          {campaign.actionExecutionEvents.map((event) => (
            <p key={event.id}>
              <strong>{event.label}</strong> · {event.kind} · fictional second{' '}
              {event.gameSecond}
            </p>
          ))}
        </details>
      ) : null}
      {campaign.activityReports.length ? (
        <details open>
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
        <details open>
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
    </>
  );
}
