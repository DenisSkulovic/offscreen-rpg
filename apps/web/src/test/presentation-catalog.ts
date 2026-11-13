import type { TrustedAsset } from '@/src/features/play/presentation/types';

/** Storybook and test catalog only. The generic resolver does not import this. */
export const exampleAssetCatalog: Record<string, TrustedAsset> = {
  'scene.cave-wall': {
    src: '/presentation-fixtures/cave.svg',
    width: 800,
    height: 480,
    description: null,
  },
  'scene.harbor-light': {
    src: '/presentation-fixtures/harbor.svg',
    width: 800,
    height: 480,
    description: 'Pale water and a warm lantern, decorative',
  },
  'scene.abstract-field': {
    src: '/presentation-fixtures/abstract.svg',
    width: 800,
    height: 480,
    description: null,
  },
  'scene.broken': {
    src: '/presentation-fixtures/missing.svg',
    width: 800,
    height: 480,
    description: null,
  },
};
