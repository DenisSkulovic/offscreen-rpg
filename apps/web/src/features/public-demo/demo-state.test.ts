import { describe, expect, it } from 'vitest';
import {
  createInitialDemoState,
  replayDemo,
  returnDigestParagraphs,
  setDemoPaused,
  transitionDemo,
  visibleChoices,
} from '../../../app/demo/demo-state';
import { scenes } from '../../../app/demo/script';

describe('Greywake scripted preview state', () => {
  it('opens on a decision without requiring advance first', () => {
    const state = createInitialDemoState();
    expect(state.sceneId).toBe('landing');
    expect(scenes.landing.phase).toBe('decision');
    expect(visibleChoices(state.sceneId, state.facts).map((c) => c.id)).toEqual(
      ['begin_repair', 'read_notice'],
    );
  });

  it('hides show-order until the notice was read', () => {
    let state = createInitialDemoState();
    state = transitionDemo(state, 'begin_repair');
    state = transitionDemo(state, 'advance');
    expect(state.sceneId).toBe('visitor_work');
    expect(state.facts.repairEarned).toBe(3);
    expect(
      visibleChoices(state.sceneId, state.facts).map((c) => c.id),
    ).not.toContain('show_order');

    state = createInitialDemoState();
    state = transitionDemo(state, 'read_notice');
    state = transitionDemo(state, 'begin_repair');
    state = transitionDemo(state, 'advance');
    expect(
      visibleChoices(state.sceneId, state.facts).map((c) => c.id),
    ).toContain('show_order');
  });

  it('does not invent repair progress when work was never started', () => {
    let state = createInitialDemoState();
    state = transitionDemo(state, 'read_notice');
    state = transitionDemo(state, 'leave_untouched');
    expect(state.sceneId).toBe('visitor_idle');
    expect(state.facts.repairStarted).toBe(false);
    expect(state.facts.repairEarned).toBe(0);

    state = transitionDemo(state, 'ask_why');
    state = transitionDemo(state, 'advance');
    const digest = returnDigestParagraphs(state.facts);
    expect(digest.some((line) => line.includes('No repair work'))).toBe(true);
    expect(digest.some((line) => line.includes('3/9'))).toBe(false);
  });

  it('keeps interrupted 3/9 on the work path and mentions notice knowledge when earned', () => {
    let state = createInitialDemoState();
    state = transitionDemo(state, 'read_notice');
    state = transitionDemo(state, 'begin_repair');
    state = transitionDemo(state, 'advance');
    state = transitionDemo(state, 'show_order');
    state = transitionDemo(state, 'advance');
    expect(state.sceneId).toBe('return_digest');
    expect(state.facts.repairEarned).toBe(3);
    const digest = returnDigestParagraphs(state.facts);
    expect(digest.some((line) => line.includes('3/9'))).toBe(true);
    expect(digest.some((line) => line.includes('harbor watch'))).toBe(true);
    expect(digest.some((line) => line.includes('written order'))).toBe(true);
  });

  it('ignores duplicate clicks and paused actions; replay resets', () => {
    let state = createInitialDemoState();
    state = transitionDemo(state, 'begin_repair');
    const afterFirst = state;
    state = transitionDemo(state, 'begin_repair');
    expect(state.history.length).toBe(afterFirst.history.length);

    state = setDemoPaused(state, true);
    state = transitionDemo(state, 'advance');
    expect(state.sceneId).toBe('repair_accepted');

    state = replayDemo();
    expect(state.sceneId).toBe('landing');
    expect(state.facts.noticeRead).toBe(false);
    expect(state.facts.repairEarned).toBe(0);
  });

  it('rejects show_order transition when notice was never read', () => {
    let state = createInitialDemoState();
    state = transitionDemo(state, 'begin_repair');
    state = transitionDemo(state, 'advance');
    const blocked = transitionDemo(state, 'show_order');
    expect(blocked.sceneId).toBe('visitor_work');
    expect(blocked.facts.showedOrder).toBe(false);
  });
});
