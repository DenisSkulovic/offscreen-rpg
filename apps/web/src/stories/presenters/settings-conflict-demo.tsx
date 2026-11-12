'use client';

import { useState } from 'react';
import type { CampaignView } from '@offscreen/contracts/campaign';
import { makeCampaign } from '@/src/test/campaign-fixtures';
import { makeStorySnapshot } from '@/src/test/story-fixtures';
import { CampaignSettingsEditor } from '@/src/features/play/campaign-settings';

const viewerId = 'storybook-viewer';

/**
 * Interactive settings conflict: dirty RHF fields survive a later server revision.
 * Preset GETs must be MSW-mocked by the story; no Nest call.
 */
export function SettingsConflictDemo({
  initial = makeCampaign(),
}: {
  initial?: CampaignView;
}) {
  const [campaign, setCampaign] = useState(initial);
  const story = makeStorySnapshot({ title: 'Settings workbench' });

  return (
    <main className="editor">
      <p className="eyebrow">Storybook · Settings revision conflict</p>
      <p>
        Edit tone, then simulate a newer saved revision. Dirty fields must stay
        until Adopt saved settings.
      </p>
      <p>
        <button
          type="button"
          onClick={() => {
            setCampaign((current) => ({
              ...current,
              settings: {
                ...current.settings,
                revision: current.settings.revision + 1,
                creative: {
                  ...current.settings.creative,
                  tone: 'Server won the race.',
                },
              },
            }));
          }}
        >
          Simulate newer saved revision
        </button>
      </p>
      <CampaignSettingsEditor
        key={story.id}
        viewerId={viewerId}
        story={{ ...story, campaign }}
        campaign={campaign}
        onSnapshot={() => {
          /* Storybook: no snapshot write */
        }}
      />
    </main>
  );
}
