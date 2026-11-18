import type { ResolvedChoice } from '../presentation/types';
import { IntentionChoice } from './intention-choice';

export type DecisionOption = {
  id: string;
  label: string;
  support?: string | undefined;
};

/** Current options only. A historical passage does not mount this group. */
export function DecisionGroup({
  heading,
  intentions,
  disabled = false,
  treatmentFor,
  onSelect,
}: {
  heading: string;
  intentions: readonly DecisionOption[];
  disabled?: boolean | undefined;
  treatmentFor?: ((id: string) => ResolvedChoice | undefined) | undefined;
  onSelect: (id: string) => void;
}) {
  if (intentions.length === 0) return null;
  return (
    <section
      className="story-frame__threshold"
      aria-labelledby="story-frame-threshold-heading"
    >
      <h2
        id="story-frame-threshold-heading"
        className="story-frame__threshold-heading"
      >
        {heading}
      </h2>
      <ul className="story-frame__intentions">
        {intentions.map((intention) => (
          <li key={intention.id} data-intention-id={intention.id}>
            <IntentionChoice
              label={intention.label}
              support={intention.support}
              behavior="commit"
              disabled={disabled}
              treatment={treatmentFor?.(intention.id)}
              onClick={() => onSelect(intention.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
