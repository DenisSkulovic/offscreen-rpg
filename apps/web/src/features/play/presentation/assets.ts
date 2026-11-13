/** Trusted local fixture art. Input may name these refs only — never a URL. */

export type FixtureAsset = {
  src: string;
  width: number;
  height: number;
  /** Approved public description. Null means decorative-only. */
  description: string | null;
};

export const FIXTURE_ASSETS: Record<string, FixtureAsset> = {
  'fixture:cave-wall': {
    src: '/presentation-fixtures/cave.svg',
    width: 800,
    height: 480,
    description: null,
  },
  'fixture:harbor-light': {
    src: '/presentation-fixtures/harbor.svg',
    width: 800,
    height: 480,
    description: 'Pale water and a warm lantern, decorative',
  },
  'fixture:abstract-field': {
    src: '/presentation-fixtures/abstract.svg',
    width: 800,
    height: 480,
    description: null,
  },
  'fixture:broken': {
    src: '/presentation-fixtures/missing.svg',
    width: 800,
    height: 480,
    description: null,
  },
};

export function lookupFixtureAsset(assetRef: string) {
  return FIXTURE_ASSETS[assetRef] ?? null;
}
