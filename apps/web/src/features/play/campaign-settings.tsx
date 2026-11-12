'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { StorySnapshot } from '@offscreen/contracts/stories';
import type { CampaignView } from '@offscreen/contracts/campaign';
import { useCampaignCommand } from './use-campaign-command';
import {
  creativeToFormValues,
  formValuesToCreative,
  settingsEditorFormSchema,
  type SettingsEditorFormValues,
} from './settings-form';
import { usePresetSave } from './use-preset-save';
import {
  ownedPresetsQueryOptions,
  presetCatalogueQueryOptions,
  settingsHistoryQueryOptions,
} from '@/src/shared/api/settings-query';

const suggestedTags = [
  {
    id: 'melancholy',
    description:
      'Quiet reflection, small details, bittersweet encounters; do not force tragedy.',
  },
  {
    id: 'absurd-comedy',
    description:
      'Occasional surreal incongruities and deadpan dialogue, while preserving established consequences.',
  },
  {
    id: 'growth',
    description:
      'Make room for ordinary work, study and gradual improvement without forced danger.',
  },
];

export function CampaignSettingsEditor({
  viewerId,
  story,
  campaign,
  onSnapshot,
}: {
  viewerId: string;
  story: StorySnapshot;
  campaign: CampaignView;
  onSnapshot: (story: StorySnapshot) => void;
}) {
  const formId = useId();
  const queryClient = useQueryClient();
  const command = useCampaignCommand(story.id, onSnapshot);
  const presetSave = usePresetSave(viewerId);
  const [presetId, setPresetId] = useState<string | null>(null);
  const [localMessage, setLocalMessage] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const baselineRevision = useRef(campaign.settings.revision);
  const profile = campaign.settings.creative.profile;

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    setFocus,
    watch,
    formState: { isDirty, errors },
  } = useForm<SettingsEditorFormValues>({
    resolver: zodResolver(settingsEditorFormSchema),
    mode: 'onTouched',
    defaultValues: creativeToFormValues(campaign.settings.creative),
  });

  const tagsArray = useFieldArray({ control, name: 'tags' });
  const guidanceValues = watch('guidance');

  const catalogueQuery = useQuery(presetCatalogueQueryOptions(viewerId));
  const ownedQuery = useQuery(ownedPresetsQueryOptions(viewerId));
  const historyQuery = useQuery({
    ...settingsHistoryQueryOptions(viewerId, story.id),
    enabled: historyOpen,
  });

  const catalogue = catalogueQuery.data ?? [];
  const presets = ownedQuery.data ?? [];
  const staleWhileDirty =
    isDirty && campaign.settings.revision !== baselineRevision.current;

  useEffect(() => {
    if (isDirty) {
      return;
    }
    baselineRevision.current = campaign.settings.revision;
    reset(creativeToFormValues(campaign.settings.creative, getValues('presetName')));
  }, [
    campaign.settings.revision,
    campaign.settings.creative,
    isDirty,
    reset,
    getValues,
  ]);

  function adoptServerSettings() {
    baselineRevision.current = campaign.settings.revision;
    reset(creativeToFormValues(campaign.settings.creative, getValues('presetName')));
    setPresetId(null);
    setLocalMessage('Loaded the latest saved settings.');
  }

  function focusFirstError(fieldErrors: typeof errors) {
    if (fieldErrors.tone) {
      setFocus('tone');
      return;
    }
    if (fieldErrors.emphasis) {
      setFocus('emphasis');
      return;
    }
    if (fieldErrors.surprises) {
      setFocus('surprises');
      return;
    }
    if (fieldErrors.tags?.[0]?.id) {
      setFocus('tags.0.id');
      return;
    }
    if (fieldErrors.guidance?.[0]) {
      setFocus('guidance.0');
    }
  }

  const onSaveSettings = handleSubmit(
    (values) => {
      if (staleWhileDirty) {
        setLocalMessage(
          'Saved settings changed while you were editing. Adopt the latest revision before saving, or keep editing and expect a conflict.',
        );
        return;
      }
      try {
        const creative = formValuesToCreative(values, profile);
        void command.send('settings', {
          expectedRevision: baselineRevision.current,
          creative,
          ...(presetId ? { presetId } : {}),
        });
        setLocalMessage('');
      } catch {
        setLocalMessage(
          'Use unique lowercase tag IDs, nonempty descriptions/guidance, and the displayed field limits.',
        );
      }
    },
    (fieldErrors) => {
      focusFirstError(fieldErrors);
      setLocalMessage(
        'Use unique lowercase tag IDs, nonempty descriptions/guidance, and the displayed field limits.',
      );
    },
  );

  function savePresetFromForm() {
    const values = getValues();
    try {
      const creative = formValuesToCreative(values, profile);
      presetSave.save({ name: values.presetName, creative });
      setLocalMessage('');
    } catch {
      setLocalMessage(
        'Use unique lowercase tag IDs, nonempty descriptions/guidance, and the displayed field limits.',
      );
    }
  }

  const statusMessage =
    localMessage ||
    presetSave.message ||
    command.message ||
    (catalogueQuery.isError || ownedQuery.isError
      ? 'Some presets could not be loaded. Current settings are preserved.'
      : '');

  return (
    <details>
      <summary>
        Storyteller settings · revision {campaign.settings.revision}
        {campaign.settings.locked ? ' · locked' : ''}
      </summary>
      <p>
        Change the DM&apos;s creative direction without changing your character
        or past outcomes. An admitted action keeps its original settings; these
        edits apply to the next action.
      </p>
      <p>
        {story.sourceMode === 'provider'
          ? 'Changes apply to the next bounded Storyteller turn; they do not rewrite past scenes or mechanical outcomes.'
          : 'Offline rehearsal uses authored scenes and mechanical summaries. Custom guidance is saved for generated tasks; it does not make the fixture improvise.'}
      </p>
      {staleWhileDirty ? (
        <p role="status">
          A newer revision ({campaign.settings.revision}) arrived while these
          fields were dirty. Your edits are kept until you adopt the saved
          settings or save and accept a possible conflict.
          <button type="button" onClick={adoptServerSettings}>
            Adopt saved settings
          </button>
        </p>
      ) : null}
      <form id={formId} onSubmit={onSaveSettings}>
        <fieldset
          disabled={campaign.settings.locked || command.busy || command.retry}
        >
          <legend>Effective creative settings</legend>
          <label>
            Apply a preset{' '}
            <select
              value=""
              onChange={(event) => {
                const selected = [...catalogue, ...presets].find(
                  (item) => item.id === event.target.value,
                );
                if (!selected) {
                  return;
                }
                reset(
                  creativeToFormValues(
                    selected.creative,
                    getValues('presetName'),
                  ),
                  { keepDefaultValues: true },
                );
                setPresetId(
                  presets.some((item) => item.id === selected.id)
                    ? selected.id
                    : null,
                );
              }}
            >
              <option value="">Choose a preset</option>
              {[...catalogue, ...presets].map((preset) => (
                <option value={preset.id} key={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tone{' '}
            <textarea maxLength={1200} aria-invalid={Boolean(errors.tone)} {...register('tone')} />
          </label>
          <label>
            Emphasis{' '}
            <select {...register('emphasis')}>
              {['balanced', 'economy', 'growth', 'adventure', 'social'].map(
                (value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ),
              )}
            </select>
          </label>
          <label>
            Narrative surprise preference{' '}
            <select {...register('surprises')}>
              {['rare', 'occasional', 'frequent'].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <p>
            This guidance does not change the probability of mechanical events.
          </p>
          <p>
            Suggested narrative tags:{' '}
            {suggestedTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                disabled={tagsArray.fields.length >= 16}
                onClick={() => {
                  const current = getValues('tags') ?? [];
                  if (current.some((entry) => entry.id === tag.id)) {
                    return;
                  }
                  tagsArray.append(tag);
                }}
              >
                {tag.id}
              </button>
            ))}
          </p>
          {tagsArray.fields.map((field, index) => (
            <div key={field.id}>
              <label>
                Tag ID{' '}
                <input
                  maxLength={60}
                  aria-invalid={Boolean(errors.tags?.[index]?.id)}
                  {...register(`tags.${index}.id`)}
                />
              </label>
              <label>
                Description{' '}
                <textarea
                  maxLength={400}
                  aria-invalid={Boolean(errors.tags?.[index]?.description)}
                  {...register(`tags.${index}.description`)}
                />
              </label>
              <button type="button" onClick={() => tagsArray.remove(index)}>
                Remove tag
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={tagsArray.fields.length >= 16}
            onClick={() =>
              tagsArray.append({
                id: `custom-${tagsArray.fields.length + 1}`,
                description: '',
              })
            }
          >
            Add custom narrative tag
          </button>
          <p>
            Tags describe creative intent. They do not grant coins, powers or
            rule changes.
          </p>
          {(guidanceValues ?? []).map((_, index) => (
            <label key={`guidance-${index}`}>
              Guidance {index + 1}
              <textarea
                maxLength={1200}
                aria-invalid={Boolean(errors.guidance?.[index])}
                {...register(`guidance.${index}`)}
              />
              <button
                type="button"
                onClick={() => {
                  const next = [...(getValues('guidance') ?? [])];
                  next.splice(index, 1);
                  setValue('guidance', next, { shouldDirty: true });
                }}
              >
                Remove guidance
              </button>
            </label>
          ))}
          <button
            type="button"
            disabled={(guidanceValues?.length ?? 0) >= 4}
            onClick={() =>
              setValue('guidance', [...(getValues('guidance') ?? []), ''], {
                shouldDirty: true,
              })
            }
          >
            Add guidance
          </button>
          <button type="submit">Save these settings for the next action</button>
          <label>
            Private preset name{' '}
            <input maxLength={100} {...register('presetName')} />
          </label>
          <button
            type="button"
            disabled={presetSave.busy}
            onClick={savePresetFromForm}
          >
            Save as a private preset
          </button>
        </fieldset>
      </form>
      <p>
        Rules: SRD 5.2.1 subset. Risk: nonlethal. Creative presets leave speed
        and these permissions unchanged.
      </p>
      {statusMessage ? <p role="status">{statusMessage}</p> : null}
      {command.retry ? (
        <button
          type="button"
          disabled={command.busy}
          onClick={() => void command.send()}
        >
          Retry settings save
        </button>
      ) : null}
      {presetSave.canRetry ? (
        <button
          type="button"
          disabled={presetSave.busy}
          onClick={() => presetSave.retry()}
        >
          Retry preset save
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => {
          setHistoryOpen(true);
          void queryClient.invalidateQueries({
            queryKey: settingsHistoryQueryOptions(viewerId, story.id).queryKey,
          });
        }}
      >
        Show saved settings history
      </button>
      {historyOpen && historyQuery.isError ? (
        <p role="status">Settings history is unavailable.</p>
      ) : null}
      {historyQuery.data?.map((entry) => (
        <p key={`${story.id}:${entry.settings.revision}:${entry.createdAt}`}>
          Revision {entry.settings.revision} · {entry.createdAt} ·{' '}
          {entry.settings.creative.tone}
        </p>
      ))}
    </details>
  );
}
