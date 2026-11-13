import { resolvePresentation } from './resolve';
import type { AssetCatalog, PresentationScope } from './types';
import { exampleAssetCatalog } from '@/src/test/presentation-catalog';

export const harborScope: PresentationScope = {
  storyId: 'story-harbor',
  passageId: 'passage-harbor',
  paragraphCount: 2,
  interactionId: 'interaction-harbor',
  validLegacyOptionIds: ['ask', 'withdraw'],
};

export const caveScope: PresentationScope = {
  storyId: 'story-cave',
  passageId: 'passage-cave',
  paragraphCount: 2,
  campaignOfferId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  validCampaignPaths: [['look'], ['look', 'approach'], ['look', 'wait']],
};

export const harborPresentation = {
  schemaVersion: 1,
  storyStyle: {
    palette: {
      accent: '#d7a15a',
      surfaceTint: '#1c2830',
    },
    typography: 'restrained',
    texture: 'grain-soft',
  },
  scene: {
    palette: {
      backdrop: {
        kind: 'linear',
        angleDegrees: 180,
        stops: [
          { position: 0, color: '#d5e4ea' },
          { position: 55, color: '#8eacb8' },
          { position: 100, color: '#24343c' },
        ],
      },
    },
    atmosphere: { lighting: 'diffuse', vignette: 0.15 },
    stage: 'quiet-surface',
    motion: { ambient: 'still', passageArrival: 'fade' },
  },
  choices: [
    {
      target: { kind: 'legacy', interactionId: 'interaction-harbor', optionId: 'ask' },
      surface: 'outline',
      accent: '#d7a15a',
    },
    {
      target: { kind: 'legacy', interactionId: 'interaction-harbor', optionId: 'withdraw' },
      surface: 'quiet',
      accent: '#8eacb8',
    },
  ],
};

export const cavePresentation = {
  schemaVersion: 1,
  storyStyle: { typography: 'editorial', texture: 'organic-soft' },
  scene: {
    palette: {
      backdrop: {
        kind: 'linear',
        angleDegrees: 160,
        stops: [
          { position: 0, color: '#1a1030' },
          { position: 45, color: '#120818' },
          { position: 100, color: '#07060a' },
        ],
      },
      accent: '#c46bff',
      surfaceTint: '#140e18',
    },
    atmosphere: { lighting: 'dim', vignette: 0.55 },
    stage: 'translucent-surface',
    media: [
      {
        id: 'cave-backdrop',
        assetRef: 'scene.cave-wall',
        slot: { kind: 'backdrop' },
        role: 'decorative',
      },
      {
        id: 'cave-figure',
        assetRef: 'scene.cave-wall',
        slot: { kind: 'after-paragraph', index: 0 },
        scale: 'inset',
        role: 'decorative',
      },
    ],
    motion: { ambient: 'drift-soft', passageArrival: 'rise-subtle' },
  },
  choices: [
    {
      target: {
        kind: 'campaign',
        offerId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        path: ['look', 'wait'],
      },
      surface: 'luminous',
      accent: '#9b6dff',
      effect: 'glow-soft',
    },
    {
      target: {
        kind: 'campaign',
        offerId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        path: ['look', 'approach'],
      },
      surface: 'filled',
      accent: '#b64040',
      emphasis: 0.8,
      effect: 'pulse-soft',
    },
  ],
};

export const sterilePresentation = {
  schemaVersion: 1,
  scene: {
    palette: {
      backdrop: '#f7f4ee',
      accent: '#2f6f62',
      surfaceTint: '#fbfaf7',
    },
    atmosphere: { lighting: 'radiant', vignette: 0 },
    stage: 'open',
  },
};

export const abstractPresentation = {
  schemaVersion: 1,
  storyStyle: { typography: 'technical', texture: 'geometric-soft' },
  scene: {
    palette: {
      backdrop: {
        kind: 'radial',
        center: { x: 50, y: 40 },
        stops: [
          { position: 0, color: '#245c86' },
          { position: 100, color: '#071018' },
        ],
      },
      accent: '#7fd0c0',
      surfaceTint: '#10202b',
    },
    media: [
      {
        id: 'field',
        assetRef: 'scene.abstract-field',
        slot: { kind: 'before-passage' },
        role: 'decorative',
      },
    ],
    motion: { ambient: 'shimmer-soft', passageArrival: 'none' },
  },
};

export const malformedPresentation = {
  schemaVersion: 1,
  scene: {
    palette: {
      backdrop: 'linear-gradient(red, blue)',
      accent: '#d7a15a',
      surfaceTint: '#1c2830',
    },
    atmosphere: { vignette: 'heavy', lighting: 'dim' },
  },
  choices: [
    {
      target: { kind: 'legacy', interactionId: 'interaction-harbor', optionId: 'ask' },
      css: 'background:url(https://evil.example)',
      emphasis: 2,
    },
  ],
};

export const unknownVersionPresentation = {
  schemaVersion: 99,
  scene: { palette: { backdrop: '#000000', surfaceTint: '#000000' } },
};

export const quietRoomPresentation = {
  schemaVersion: 1,
  storyStyle: { typography: 'restrained', texture: 'none' },
  scene: {
    palette: {
      backdrop: '#2a2622',
      accent: '#c4a574',
      surfaceTint: '#241f1b',
    },
    atmosphere: { lighting: 'dim', vignette: 0.25 },
    stage: 'quiet-surface',
    motion: { ambient: 'still', passageArrival: 'none' },
  },
};

export function resolveFixture(
  input: unknown,
  scope: PresentationScope,
  catalog: AssetCatalog = exampleAssetCatalog,
) {
  return resolvePresentation(input, scope, catalog);
}
