import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast';
import {
  cavePresentation,
  caveScope,
  harborPresentation,
  harborScope,
  malformedPresentation,
  resolveFixture,
  sterilePresentation,
  unknownVersionPresentation,
} from './fixtures';
import { matchCampaignChoice, resolvePresentation } from './resolve';

const scope = harborScope;

describe('presentation resolver', () => {
  it('keeps the field-journal baseline when nothing is supplied', () => {
    const resolved = resolvePresentation(undefined, scope);
    expect(resolved.applied).toBe(false);
    expect(resolved.backdrop).toEqual({ kind: 'solid', color: '#12181f' });
    expect(resolved.surface).toBe('#1a222c');
    expect(resolved.ink).toBe('#e7ece8');
    expect(resolved.choices).toEqual([]);
    expect(resolved.media).toEqual([]);
    expect(contrastRatio(resolved.ink, resolved.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('changes harbor and cave atmospheres without accepting raw css', () => {
    const harbor = resolveFixture(harborPresentation, harborScope);
    const cave = resolveFixture(cavePresentation, caveScope);
    expect(harbor.backdrop.kind).toBe('linear');
    expect(cave.backdrop.kind).toBe('linear');
    if (harbor.backdrop.kind !== 'solid' && cave.backdrop.kind !== 'solid') {
      expect(harbor.backdrop.css).not.toBe(cave.backdrop.css);
      expect(harbor.backdrop.css).toContain('#d5e4ea');
      expect(cave.backdrop.css).toContain('#1a1030');
    }
    expect(cave.lighting).toBe('dim');
    expect(cave.media.map((item) => item.slot.kind)).toEqual([
      'backdrop',
      'after-paragraph',
    ]);
    expect(cave.media.find((item) => item.slot.kind === 'after-paragraph')?.scale).toBe('inset');
  });

  it('drops a bad gradient and raw css without hiding the rest', () => {
    const resolved = resolveFixture(malformedPresentation, harborScope);
    expect(resolved.applied).toBe(true);
    expect(resolved.fallback).toBe('partial');
    expect(resolved.backdrop).toEqual({ kind: 'solid', color: '#12181f' });
    expect(resolved.accent).toBe('#d7a15a');
    expect(resolved.lighting).toBe('dim');
    expect(resolved.choices).toHaveLength(1);
    expect(resolved.choices[0]?.emphasis).toBe(0.5);
    expect(JSON.stringify(resolved)).not.toContain('evil.example');
    expect(JSON.stringify(resolved)).not.toContain('linear-gradient');
  });

  it('rejects an unknown version as a whole', () => {
    const resolved = resolveFixture(unknownVersionPresentation, scope);
    expect(resolved.applied).toBe(false);
    expect(resolved.fallback).toBe('full');
    expect(resolved.surface).toBe('#1a222c');
    expect(resolved.ink).toBe('#e7ece8');
  });

  it('ignores stale offer paths and unapproved urls', () => {
    const resolved = resolvePresentation(
      {
        schemaVersion: 1,
        choices: [
          {
            target: {
              kind: 'campaign',
              offerId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
              path: ['look', 'wait'],
            },
            surface: 'filled',
            accent: '#ff0000',
          },
          {
            target: {
              kind: 'campaign',
              offerId: caveScope.campaignOfferId,
              path: ['look', 'wait'],
            },
            surface: 'luminous',
            accent: '#9b6dff',
          },
        ],
        scene: {
          media: [
            {
              id: 'remote',
              assetRef: 'https://evil.example/a.png',
              slot: { kind: 'backdrop' },
            },
            {
              id: 'late',
              assetRef: 'scene.cave-wall',
              slot: { kind: 'after-paragraph', index: 9 },
            },
          ],
        },
      },
      caveScope,
      {
        'scene.cave-wall': {
          src: '/presentation-fixtures/cave.svg',
          width: 80,
          height: 48,
          description: null,
        },
      },
    );
    expect(matchCampaignChoice(resolved, caveScope.campaignOfferId!, ['look', 'wait'])?.surface).toBe('luminous');
    expect(matchCampaignChoice(resolved, 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', ['look', 'wait'])).toBeUndefined();
    expect(resolved.media).toEqual([]);
  });

  it('keeps light sterile text and default controls readable on their own surfaces', () => {
    const resolved = resolveFixture(sterilePresentation, scope);
    expect(contrastRatio(resolved.narrative.ink, resolved.narrative.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(resolved.options.ink, resolved.options.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(resolved.options.muted, resolved.options.surface)).toBeGreaterThanOrEqual(4.5);
    expect(resolved.options.surface).not.toBe('#1f2936');
  });

  it('keeps harbor chrome readable against the pale backdrop, not the dark plate', () => {
    const resolved = resolveFixture(harborPresentation, harborScope);
    expect(contrastRatio(resolved.chrome.ink, resolved.chrome.surface)).toBeGreaterThanOrEqual(4.5);
    expect(resolved.chrome.surface).not.toBe(resolved.narrative.surface);
  });

  it('resolves an unrelated catalog id without knowing scenario names', () => {
    const resolved = resolvePresentation(
      {
        schemaVersion: 1,
        scene: {
          media: [
            {
              id: 'motif',
              assetRef: 'lab.motif',
              slot: { kind: 'before-passage' },
              scale: 'inset',
            },
          ],
        },
      },
      { ...scope, paragraphCount: 1 },
      {
        'lab.motif': {
          src: '/lab/motif.svg',
          width: 64,
          height: 64,
          description: null,
        },
      },
    );
    expect(resolved.media[0]?.src).toBe('/lab/motif.svg');
    expect(resolved.media[0]?.scale).toBe('inset');
  });
});
