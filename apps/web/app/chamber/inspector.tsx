'use client';

import type { ChamberInspector } from '@offscreen/contracts/chamber';

function Field(args: { label: string; value: string }) {
  return (
    <>
      <dt>{args.label}</dt>
      <dd>{args.value}</dd>
    </>
  );
}

function JsonValue({ value }: { value: unknown }) {
  if (value == null) {
    return <dd>None</dd>;
  }
  return (
    <dd>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </dd>
  );
}

export function ChamberInspectorPanel(args: {
  inspector: ChamberInspector | null;
  error: string;
  pending: boolean;
  onRefresh: () => void;
}) {
  const inspection = args.inspector;
  return (
    <section aria-label="Inspector">
      <details open>
        <summary>Inspector</summary>
        <p>
          Read-only developer view of committed state. It is not the player
          scene.
        </p>
        <button disabled={args.pending} onClick={() => args.onRefresh()}>
          {args.pending ? 'Refreshing inspector…' : 'Refresh inspector'}
        </button>
        <p role="status">{args.error}</p>
        {inspection ? (
          <>
            <h2>Story</h2>
            <dl>
              <Field label="Story ID" value={inspection.story.id} />
              <Field label="Source" value={inspection.story.source} />
              <Field
                label="Revision"
                value={String(inspection.story.revision)}
              />
              <Field
                label="View version"
                value={String(inspection.story.viewVersion)}
              />
              <Field label="Created" value={inspection.story.createdAt} />
            </dl>
            <h2>Current passage</h2>
            <dl>
              <Field label="Passage ID" value={inspection.current.passageId} />
              <Field
                label="Sequence"
                value={String(inspection.current.sequence)}
              />
              <Field
                label="Transition ID"
                value={inspection.current.transitionId ?? 'None'}
              />
              <Field
                label="Response source"
                value={inspection.current.responseSource ?? 'None'}
              />
              <Field
                label="Source generation ID"
                value={inspection.current.sourceGenerationId ?? 'None'}
              />
              <Field
                label="Source generation part"
                value={inspection.current.sourceGenerationPart ?? 'None'}
              />
              <Field label="Title" value={inspection.current.content.title} />
              <Field
                label="Interaction"
                value={
                  inspection.current.interaction
                    ? inspection.current.interaction.specification.prompt
                    : 'None'
                }
              />
            </dl>
            <h2>Timing / decision</h2>
            <dl>
              <Field label="Due at" value={inspection.timing.dueAt ?? 'None'} />
              <Field
                label="Remaining ms"
                value={
                  inspection.timing.remainingMs === null
                    ? 'None'
                    : String(inspection.timing.remainingMs)
                }
              />
              <Field
                label="Control revision"
                value={String(inspection.timing.controlRevision)}
              />
              <Field
                label="Response due at"
                value={inspection.timing.responseDueAt ?? 'None'}
              />
              <dt>Wait plan</dt>
              <JsonValue value={inspection.timing.waitPlan} />
              <dt>Decision plan</dt>
              <JsonValue value={inspection.timing.decisionPlan} />
            </dl>
            <h2>Items</h2>
            {inspection.items.length === 0 ? (
              <p>No items.</p>
            ) : (
              <ul>
                {inspection.items.map((item) => (
                  <li key={item.key}>
                    {item.label} — held by {item.holderKey} ({item.key})
                  </li>
                ))}
              </ul>
            )}
            <h2>Recent history</h2>
            <ol>
              {inspection.recentHistory.map((entry) => (
                <li key={entry.passageId}>
                  {entry.sequence}. {entry.title}
                  {entry.responseSource ? ` [${entry.responseSource}]` : ''}
                  {entry.hasWait ? ' wait' : ''}
                  {entry.hasDecision ? ' decision' : ''}
                  {entry.hasEffect ? ' effect' : ''}
                  {entry.hasInteraction ? ' interaction' : ''}
                </li>
              ))}
            </ol>
            <h2>Generation provenance</h2>
            {inspection.generation ? (
              <dl>
                <Field label="Generation ID" value={inspection.generation.id} />
                <Field label="Kind" value={inspection.generation.kind} />
                <Field label="State" value={inspection.generation.state} />
                <Field
                  label="Failure code"
                  value={inspection.generation.failureCode ?? 'None'}
                />
                <Field
                  label="Source draft ID"
                  value={inspection.generation.sourceDraftId ?? 'None'}
                />
                <Field
                  label="Source draft revision"
                  value={
                    inspection.generation.sourceDraftRevision === null
                      ? 'None'
                      : String(inspection.generation.sourceDraftRevision)
                  }
                />
                <dt>Option intentions</dt>
                <JsonValue value={inspection.generation.optionIntentions} />
                <dt>Proposal</dt>
                <JsonValue value={inspection.generation.proposal} />
              </dl>
            ) : (
              <p>No generation provenance on this passage.</p>
            )}
            {inspection.storyteller ? (
              <>
                <h2>Storyteller context and continuity</h2>
                <dl>
                  <JsonValue value={inspection.storyteller} />
                </dl>
              </>
            ) : null}
            <h2>Active resolution</h2>
            {inspection.resolution ? (
              <dl>
                <Field
                  label="Operation ID"
                  value={inspection.resolution.operationId}
                />
                <Field
                  label="Base passage ID"
                  value={inspection.resolution.basePassageId}
                />
                <Field
                  label="Base revision"
                  value={String(inspection.resolution.baseRevision)}
                />
                <Field
                  label="Generation ID"
                  value={inspection.resolution.generationId}
                />
                <Field label="Kind" value={inspection.resolution.kind} />
                <Field label="State" value={inspection.resolution.state} />
                <Field
                  label="Selected option ID"
                  value={inspection.resolution.selectedOptionId ?? 'None'}
                />
                <dt>Selected intention</dt>
                <JsonValue value={inspection.resolution.selectedIntention} />
                <dt>Proposal</dt>
                <JsonValue value={inspection.resolution.proposal} />
              </dl>
            ) : (
              <p>No active generated resolution on this passage.</p>
            )}
          </>
        ) : null}
      </details>
    </section>
  );
}
