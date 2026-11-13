import { scenes, type SceneChoice, type SceneId } from './script';

export type DemoFacts = {
  noticeRead: boolean;
  repairStarted: boolean;
  /** Scripted fixture only: 3/9 after the first preview jump on the work path. */
  repairEarned: 0 | 3;
  visitorSpoke: boolean;
  showedOrder: boolean;
};

export type DemoVisit = {
  sceneId: SceneId;
  intention: string | null;
};

export type DemoState = {
  sceneId: SceneId;
  facts: DemoFacts;
  history: DemoVisit[];
  paused: boolean;
};

const initialFacts: DemoFacts = {
  noticeRead: false,
  repairStarted: false,
  repairEarned: 0,
  visitorSpoke: false,
  showedOrder: false,
};

export function createInitialDemoState(): DemoState {
  return {
    sceneId: 'landing',
    facts: { ...initialFacts },
    history: [{ sceneId: 'landing', intention: null }],
    paused: false,
  };
}

export function visibleChoices(
  sceneId: SceneId,
  facts: DemoFacts,
): SceneChoice[] {
  const scene = scenes[sceneId];
  return scene.choices.filter(
    (choice) => !choice.requiresNoticeRead || facts.noticeRead,
  );
}

function applyFactSideEffects(
  facts: DemoFacts,
  fromScene: SceneId,
  choiceId: string,
  toScene: SceneId,
): DemoFacts {
  const next = { ...facts };
  if (choiceId === 'read_notice') next.noticeRead = true;
  if (choiceId === 'begin_repair') next.repairStarted = true;
  if (fromScene === 'repair_accepted' && choiceId === 'advance') {
    next.repairEarned = 3;
  }
  if (
    (fromScene === 'visitor_work' || fromScene === 'visitor_idle') &&
    (choiceId === 'ask_why' ||
      choiceId === 'inspect_mark' ||
      choiceId === 'send_back' ||
      choiceId === 'show_order')
  ) {
    next.visitorSpoke = true;
  }
  if (choiceId === 'show_order') next.showedOrder = true;
  if (toScene === 'visitor_work' && next.repairStarted && next.repairEarned === 0) {
    next.repairEarned = 3;
  }
  return next;
}

/** Advance a waiting scene, or choose a decision. Duplicate clicks on the same moment are ignored. */
export function transitionDemo(
  state: DemoState,
  choiceId: string,
): DemoState {
  if (state.paused) return state;
  const scene = scenes[state.sceneId];
  if (scene.phase === 'ended') return state;

  if (scene.phase === 'decision') {
    const allowed = visibleChoices(state.sceneId, state.facts);
    if (!allowed.some((choice) => choice.id === choiceId)) return state;
  } else if (scene.phase === 'waiting') {
    if (choiceId !== 'advance') return state;
  } else {
    return state;
  }

  const target = scene.next[choiceId];
  if (!target) return state;
  if (state.history[state.history.length - 1]?.sceneId !== state.sceneId) {
    return state;
  }

  const intention =
    scene.phase === 'decision'
      ? (scene.choices.find((choice) => choice.id === choiceId)?.label ?? null)
      : choiceId === 'advance'
        ? 'Preview next moment'
        : null;

  const facts = applyFactSideEffects(
    state.facts,
    state.sceneId,
    choiceId,
    target,
  );

  return {
    ...state,
    sceneId: target,
    facts,
    history: [...state.history, { sceneId: target, intention }],
  };
}

export function setDemoPaused(state: DemoState, paused: boolean): DemoState {
  return { ...state, paused };
}

export function replayDemo(): DemoState {
  return createInitialDemoState();
}

/** Truthful branch digest for the ended return scene. */
export function returnDigestParagraphs(facts: DemoFacts): string[] {
  const lines: string[] = [
    'In a real story, a permitted activity can continue while the browser is closed. This preview jumped to the next meaningful saved moment.',
  ];

  if (facts.repairStarted && facts.repairEarned === 3) {
    lines.push(
      'Repair reached 3/9, then stopped when someone came upstairs. Your earlier work is preserved. The stranger\'s question still needs an answer.',
    );
  } else {
    lines.push(
      'No repair work was completed. The lantern remains dark.',
    );
  }

  if (facts.noticeRead) {
    lines.push(
      'You learned that the harbor watch ordered the lamp dark. That knowledge changed what you could ask.',
    );
  }

  if (facts.showedOrder) {
    lines.push(
      'Showing the written order moved the visitor aside from the workbench. The broader mystery is not solved.',
    );
  } else if (facts.visitorSpoke) {
    lines.push(
      'You spoke with the visitor. Their claim stays ambiguous in this preview.',
    );
  }

  lines.push(
    'In a persistent story, this is where your saved life would continue.',
  );
  return lines;
}

export function waitingAdvanceLabel(sceneId: SceneId): string {
  if (
    sceneId === 'ask_response' ||
    sceneId === 'inspect_response' ||
    sceneId === 'send_response' ||
    sceneId === 'show_response'
  ) {
    return 'Preview returning later';
  }
  return 'Jump to next moment in this preview';
}
