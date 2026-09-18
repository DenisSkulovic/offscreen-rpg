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
      <label htmlFor="storyteller">Choose your storyteller</label>
      <select
        id="storyteller"
        value={value ? identity(value) : ''}
        onChange={(event) => {
          const profile = catalogue.find(
            (item) => identity(item) === event.target.value,
          );
          onChange(
            profile ? { id: profile.id, revision: profile.revision } : null,
          );
        }}
      >
        <option value="">Choose a style</option>
        {value && !selected ? (
          <option value={identity(value)}>
            Saved storyteller ({value.id})
          </option>
        ) : null}
        {catalogue.map((profile) => (
          <option key={identity(profile)} value={identity(profile)}>
            {profile.name}
          </option>
        ))}
      </select>
      <p className="field-help">
        {error
          ? 'The catalogue is unavailable. Your saved selection is preserved; reload to try again.'
          : (selected?.description ??
            'You can save an incomplete draft before choosing.')}
      </p>
    </>
  );
}
