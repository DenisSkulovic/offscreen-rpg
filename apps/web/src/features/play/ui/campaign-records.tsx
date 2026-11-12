import type { CampaignView } from '@offscreen/contracts/campaign';

export function CampaignRecords({ campaign }: { campaign: CampaignView }) {
  return (
    <>
      {campaign.actionReceipts.length ? (
        <details>
          <summary>Committed immediate outcomes</summary>
          {campaign.actionReceipts.map((receipt) => (
            <article key={receipt.id}>
              <p>
                <strong>{receipt.label}</strong> · {receipt.outcome} ·{' '}
                {receipt.state}
              </p>
              <p>{receipt.text}</p>
              {receipt.state === 'pending' ? (
                <p role="status">
                  The outcome is committed. Storyteller preparation has not
                  produced a generation yet, so time remains held and retrying
                  preparation cannot repeat the action, roll, or effects.
                </p>
              ) : null}
              {receipt.declarations.map((declaration) => (
                <p key={declaration.fact.id}>
                  Established {declaration.fact.id}:{' '}
                  {String(declaration.fact.value)}
                </p>
              ))}
              {receipt.roll ? (
                <p>
                  d20: {receipt.roll.dice.join(', ')} → {receipt.roll.chosen} ={' '}
                  {receipt.roll.total}; DC {receipt.roll.dc}:{' '}
                  {receipt.roll.success ? 'success' : 'failure'}.
                </p>
              ) : (
                <p>No roll was required.</p>
              )}
            </article>
          ))}
        </details>
      ) : null}
      <details>
        <summary>Character abilities</summary>
        <dl>
          {Object.entries(campaign.character?.scores ?? {}).map(
            ([ability, score]) => (
              <div key={ability}>
                <dt>{ability}</dt>
                <dd>
                  {score} ({Math.floor((score - 10) / 2) >= 0 ? '+' : ''}
                  {Math.floor((score - 10) / 2)})
                </dd>
              </div>
            ),
          )}
        </dl>
        <p>
          Proficient: {campaign.character?.proficientSkills.join(', ')}.
          Proficiency bonus +{campaign.character?.proficiencyBonus}.
        </p>
      </details>
      <details open={campaign.rolls.length > 0}>
        <summary>Saved dice and outcomes (latest 100)</summary>
        {campaign.rolls.map((entry) => (
          <article key={entry.id}>
            <p>
              <strong>{entry.roll.purpose}</strong> · fictional second{' '}
              {entry.gameSecond} · boundary {entry.segment}
            </p>
            <p>
              d20: {entry.roll.dice.join(', ')} → {entry.roll.chosen}
              {entry.roll.modifiers
                .map(
                  (modifier) =>
                    ` ${modifier.value >= 0 ? '+' : ''}${modifier.value} ${modifier.source}`,
                )
                .join('')}{' '}
              = {entry.roll.total};{' '}
              {entry.roll.kind === 'event'
                ? `event threshold ≤ ${entry.roll.dc}: ${entry.roll.success ? 'occurred' : 'quiet'}`
                : `DC ${entry.roll.dc}: ${entry.roll.success ? 'success' : 'failure'}`}
              .{' '}
              {entry.effects
                .map((effect) =>
                  effect.kind === 'fact.set.v1'
                    ? `${effect.fact.id}: ${effect.fact.value}`
                    : `${campaign.character?.quantities.find((quantity) => quantity.id === effect.quantityId)?.label ?? effect.quantityId}: ${effect.delta >= 0 ? '+' : ''}${effect.delta}`,
                )
                .join(', ')}
            </p>
          </article>
        ))}
      </details>
      <p className="field-help">
        Dice are rolled and saved by the server. Reloading and narration cannot
        reroll them. <a href="/rules">Rules and attribution</a>
      </p>
    </>
  );
}
