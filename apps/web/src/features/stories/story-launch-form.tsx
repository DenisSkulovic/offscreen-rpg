'use client';

import { useId, useState } from 'react';
import { Action } from '@/src/shared/ui/action';
import { useStoryLaunch } from './use-story-launch';
import { StoryLaunchStatus } from './story-launch-status';
import './story-launch.css';

export type StoryLaunchPreset = {
  presetId: string;
  presetRootHash: string;
  label: string;
};

function worldHints(world: 'original' | 'source-bound' | '') {
  return world === '' ? {} : { hints: { worldInvention: world } as const };
}

export function StoryLaunchForm({
  viewerId,
  presets = [],
}: {
  viewerId: string;
  presets?: StoryLaunchPreset[];
}) {
  const { phase, beginLaunch, refreshStatus } = useStoryLaunch(viewerId);
  const baseId = useId();
  const [prompt, setPrompt] = useState('');
  const [world, setWorld] = useState<'original' | 'source-bound' | ''>('');
  const [presetPrompts, setPresetPrompts] = useState<Record<string, string>>(
    {},
  );
  const [customizeWorld, setCustomizeWorld] = useState<
    Record<string, 'original' | 'source-bound' | ''>
  >({});

  const pending = phase.kind === 'submitting' || phase.kind === 'polling';
  const locked =
    pending || phase.kind === 'attention' || phase.kind === 'ready';

  async function launchCustom() {
    if (locked) {
      return;
    }
    await beginLaunch({
      prompt,
      ...worldHints(world),
    });
  }

  async function launchPreset(
    preset: StoryLaunchPreset,
    customPrompt: string,
    presetWorld: 'original' | 'source-bound' | '',
  ) {
    if (locked) {
      return;
    }
    await beginLaunch({
      prompt: customPrompt,
      preset: {
        presetId: preset.presetId,
        presetRootHash: preset.presetRootHash,
      },
      ...worldHints(presetWorld),
    });
  }

  return (
    <div className="story-launch__surface">
      {presets.length > 0 ? (
        <section
          className="story-launch__prepared"
          aria-labelledby={`${baseId}-prepared-heading`}
        >
          <h2
            id={`${baseId}-prepared-heading`}
            className="story-launch__section-title"
          >
            Prepared experiences
          </h2>
          <ul className="story-launch__preset-list">
            {presets.map((preset) => {
              const customizePromptId = `${baseId}-preset-${preset.presetId}-prompt`;
              const customizeWorldId = `${baseId}-preset-${preset.presetId}-world`;
              const presetWorld = customizeWorld[preset.presetId] ?? '';

              return (
                <li key={preset.presetId} className="story-launch__preset-card">
                  <h3 className="story-launch__preset-label">{preset.label}</h3>
                  <div className="story-launch__preset-play">
                    <Action
                      kind="button"
                      variant="primary"
                      pending={pending}
                      disabled={locked}
                      onClick={() => void launchPreset(preset, '', '')}
                    >
                      {pending ? 'Launching…' : 'Play'}
                    </Action>
                  </div>
                  <details className="story-launch__customize">
                    <summary>Customize</summary>
                    <div className="story-launch__customize-body">
                      <div className="story-launch__field">
                        <label
                          className="story-launch__label"
                          htmlFor={customizePromptId}
                        >
                          Story prompt
                        </label>
                        <textarea
                          id={customizePromptId}
                          className="story-launch__prompt"
                          maxLength={24000}
                          disabled={locked}
                          value={presetPrompts[preset.presetId] ?? ''}
                          onChange={(e) =>
                            setPresetPrompts((prev) => ({
                              ...prev,
                              [preset.presetId]: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="story-launch__field">
                        <label
                          className="story-launch__label"
                          htmlFor={customizeWorldId}
                        >
                          World invention
                        </label>
                        <select
                          id={customizeWorldId}
                          className="story-launch__select"
                          value={presetWorld}
                          disabled={locked}
                          onChange={(e) =>
                            setCustomizeWorld((prev) => ({
                              ...prev,
                              [preset.presetId]: e.target.value as
                                'original' | 'source-bound' | '',
                            }))
                          }
                        >
                          <option value="">Leave unset</option>
                          <option value="original">original</option>
                          <option value="source-bound">source-bound</option>
                        </select>
                      </div>
                      <Action
                        kind="button"
                        variant="secondary"
                        pending={pending}
                        disabled={locked}
                        onClick={() =>
                          void launchPreset(
                            preset,
                            presetPrompts[preset.presetId] ?? '',
                            presetWorld,
                          )
                        }
                      >
                        {pending ? 'Launching…' : 'Play with customization'}
                      </Action>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section
        className="story-launch__custom"
        aria-labelledby={`${baseId}-custom-heading`}
      >
        {presets.length > 0 ? (
          <h2
            id={`${baseId}-custom-heading`}
            className="story-launch__section-title"
          >
            Or create your own
          </h2>
        ) : (
          <h2
            id={`${baseId}-custom-heading`}
            className="story-launch__section-title"
          >
            Create a story
          </h2>
        )}
        <p className="story-launch__lede">
          One word, a sentence, or a paragraph — whatever invites the opening.
        </p>
        <div className="story-launch__field">
          <label className="story-launch__label" htmlFor="story-prompt">
            Story prompt
          </label>
          <textarea
            id="story-prompt"
            name="prompt"
            className="story-launch__prompt"
            maxLength={24000}
            disabled={locked}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
        <details className="story-launch__customize">
          <summary>Customize</summary>
          <div className="story-launch__customize-body">
            <div className="story-launch__field">
              <label
                className="story-launch__label"
                htmlFor={`${baseId}-world`}
              >
                World invention
              </label>
              <select
                id={`${baseId}-world`}
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
          </div>
        </details>
        <div className="story-launch__actions">
          <Action
            kind="button"
            variant="primary"
            pending={pending}
            disabled={locked}
            onClick={() => void launchCustom()}
          >
            {pending ? 'Launching…' : 'Create story'}
          </Action>
        </div>
      </section>

      <StoryLaunchStatus
        phase={phase}
        onCheckStatus={() => void refreshStatus()}
      />
    </div>
  );
}
