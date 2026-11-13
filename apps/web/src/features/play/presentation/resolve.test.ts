import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast';
import {
  cavePresentation,
  caveScope,
  harborPresentation,
  harborScope,
  malformedPresentation,
  sterilePresentation,
  unknownVersionPresentation,
} from './fixtures';
import { resolvePresentation, matchCampaignChoice } from './resolve';

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
    const harbor = resolvePresentation(harborPresentation, harborScope);
    const cave = resolvePresentation(cavePresentation, caveScope);
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
    expect(cave.media.every((item) => item.src.startsWith('/presentation-fixtures/'))).toBe(true);
  });

  it('drops a bad gradient and raw css without hiding the rest', () => {
    const resolved = resolvePresentation(malformedPresentation, harborScope);
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
    const resolved = resolvePresentation(unknownVersionPresentation, scope);
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
              assetRef: 'fixture:cave-wall',
              slot: { kind: 'after-paragraph', index: 9 },
            },
          ],
        },
      },
      caveScope,
    );
    expect(matchCampaignChoice(resolved, caveScope.campaignOfferId!, ['look', 'wait'])?.surface).toBe('luminous');
    expect(matchCampaignChoice(resolved, 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', ['look', 'wait'])).toBeUndefined();
    expect(resolved.media).toEqual([]);
  });

  it('keeps light sterile text readable', () => {
    const resolved = resolvePresentation(sterilePresentation, scope);
    expect(contrastRatio(resolved.ink, resolved.surface)).toBeGreaterThanOrEqual(4.5);
    expect(resolved.ink).not.toBe('#e7ece8');
  });
});
