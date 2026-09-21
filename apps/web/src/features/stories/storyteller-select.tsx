'use client';
import { useEffect, useState } from 'react';
import {
  storytellerCatalogueSchema,
  type StorytellerReference,
  type StorytellerSummary,
} from '@offscreen/contracts/storytellers';

export function StorytellerSelect({
  value,
  onChange,
}: {
  value: StorytellerReference | null;
  onChange: (reference: StorytellerReference | null) => void;
}) {
  const [catalogue, setCatalogue] = useState<StorytellerSummary[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/storytellers', {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error('Unavailable');
        }
        const result = storytellerCatalogueSchema.parse(await response.json());
        if (!controller.signal.aborted) {
          setCatalogue(result.items);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError(true);
        }
      }
    }
    void load();
    return () => controller.abort();
  }, []);
  const selected = catalogue.find(
    (item) => item.id === value?.id && item.revision === value?.revision,
  );
  const identity = (reference: StorytellerReference) =>
    `${reference.id}/${reference.revision}`;
  return (
    <>
      <fieldset className="storyteller-options">
        <legend>Choose your Storyteller</legend>
        {catalogue.map((profile) => (
          <label key={identity(profile)}>
            <input
              type="radio"
              name="storyteller"
              value={identity(profile)}
              checked={identity(profile) === (value ? identity(value) : '')}
              onChange={() =>
                onChange({ id: profile.id, revision: profile.revision })
              }
            />
            <span>
              <strong>{profile.name}</strong>
              <small>{profile.description}</small>
            </span>
          </label>
        ))}
        {value && !selected ? (
          <label>
            <input type="radio" checked readOnly />
            <span>
              <strong>Saved Storyteller</strong>
              <small>{value.id}</small>
            </span>
          </label>
        ) : null}
      </fieldset>
      {error ? (
        <p className="field-help" role="alert">
          The Storyteller catalogue is unavailable. Your saved selection is
          preserved; reload to try again.
        </p>
      ) : null}
    </>
  );
}
