'use client';

import { useId, useState, type FormEvent } from 'react';
import { Action } from '@/src/shared/ui/action';
import { useStoryLaunch } from './use-story-launch';
import { StoryLaunchStatus } from './story-launch-status';
import './story-launch.css';

export type StoryLaunchPreset = {
  presetId: string;
  presetRootHash: string;
  label: string;
};

export function StoryLaunchForm({
  viewerId,
  presets = [],
}: {
  viewerId: string;
  presets?: StoryLaunchPreset[];
}) {
  const { phase, beginLaunch, refreshStatus } = useStoryLaunch(viewerId);
  const formId = useId();
  const [prompt, setPrompt] = useState('');
  const [presetId, setPresetId] = useState('');
  const [world, setWorld] = useState<'original' | 'source-bound' | ''>('');

  const pending = phase.kind === 'submitting' || phase.kind === 'polling';
  // Held, failed, and uncertain stay on the existing operation. A new Launch
  // would mint another PUT; only Check status may ask again, and that is a GET.
  const locked =
    pending || phase.kind === 'attention' || phase.kind === 'ready';

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked) {
      return;
    }
    const selected = presets.find((preset) => preset.presetId === presetId);
    await beginLaunch({
      prompt,
      ...(selected
        ? {
            preset: {
              presetId: selected.presetId,
              presetRootHash: selected.presetRootHash,
            },
          }
        : {}),
      ...(world === '' ? {} : { hints: { worldInvention: world } }),
    });
  }

  return (
    <form
      id={formId}
      className="story-launch__form"
      onSubmit={(e) => void onSubmit(e)}
      noValidate
    >
      {presets.length > 0 ? (
        <div className="story-launch__field">
          <label className="story-launch__label" htmlFor={`${formId}-preset`}>
            Prepared start
          </label>
          <select
            id={`${formId}-preset`}
            className="story-launch__select"
            value={presetId}
            disabled={locked}
            onChange={(e) => setPresetId(e.target.value)}
          >
            <option value="">None</option>
            {presets.map((preset) => (
              <option key={preset.presetId} value={preset.presetId}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="story-launch__field">
        <label className="story-launch__label" htmlFor="story-prompt">
          Story prompt
        </label>
        <textarea
          id="story-prompt"
          name="prompt"
          className="story-launch__prompt"
          maxLength={24000}
          required
          disabled={locked}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>
      <div className="story-launch__field">
        <label className="story-launch__label" htmlFor={`${formId}-world`}>
          World
        </label>
        <select
          id={`${formId}-world`}
          className="story-launch__select"
          value={world}
          disabled={locked}
          onChange={(e) =>
            setWorld(e.target.value as 'original' | 'source-bound' | '')
          }
        >
          <option value="">Leave unset</option>
          <option value="original">original</option>
          <option value="source-bound">source-bound</option>
        </select>
      </div>
      <div className="story-launch__actions">
        <Action
          kind="button"
          type="submit"
          variant="primary"
          pending={pending}
          disabled={locked}
        >
          {pending ? 'Launching…' : 'Launch'}
        </Action>
      </div>
      <StoryLaunchStatus
        phase={phase}
        onCheckStatus={() => void refreshStatus()}
      />
    </form>
  );
}
