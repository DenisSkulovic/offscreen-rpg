import type { StorytellerTask } from '@offscreen/storyteller/tasks';

type ControlState =
  'idle' | 'armed-hold' | 'armed-failure' | 'held' | 'released' | 'failed';

type ControlRecord = {
  revision: number;
  state: ControlState;
  generationId: string | null;
};

const idle = (): ControlRecord => ({
  revision: 0,
  state: 'idle',
  generationId: null,
});

/**
 * Process-local Chamber policy. Generation state and release wakes remain
 * durable; this object only selects the next scripted pending consequence.
 * Reusing it across worker restarts keeps an armed/held control deterministic.
 */
export function createChamberStorytellerControl() {
  const records = new Map<string, ControlRecord>();

  function read(storyId: string) {
    return { storyId, ...(records.get(storyId) ?? idle()) };
  }

  function replace(
    storyId: string,
    expectedRevision: number,
    state: ControlState,
    generationId: string | null,
  ) {
    const current = records.get(storyId) ?? idle();
    if (current.revision !== expectedRevision) {
      throw new Error('storyteller_control_conflict');
    }
    const next = {
      revision: current.revision + 1,
      state,
      generationId,
    } satisfies ControlRecord;
    records.set(storyId, next);
    return { storyId, ...next };
  }

  return {
    read,
    arm(storyId: string, expectedRevision: number, mode: 'hold' | 'fail') {
      return replace(
        storyId,
        expectedRevision,
        mode === 'hold' ? 'armed-hold' : 'armed-failure',
        null,
      );
    },
    clear(storyId: string, expectedRevision: number) {
      return replace(storyId, expectedRevision, 'idle', null);
    },
    release(storyId: string, expectedRevision: number, generationId: string) {
      const current = records.get(storyId) ?? idle();
      if (current.state !== 'held' || current.generationId !== generationId) {
        throw new Error('storyteller_control_conflict');
      }
      return replace(storyId, expectedRevision, 'released', generationId);
    },
    evaluate(input: { generationId: string; task: StorytellerTask }) {
      if (input.task.task !== 'pending-consequence') {
        return 'proceed' as const;
      }
      const storyId = input.task.source.storyId;
      const current = records.get(storyId);
      if (!current) return 'proceed' as const;
      if (
        current.generationId !== null &&
        current.generationId !== input.generationId
      ) {
        return 'proceed' as const;
      }
      if (current.state === 'armed-hold') {
        records.set(storyId, {
          revision: current.revision + 1,
          state: 'held',
          generationId: input.generationId,
        });
        return 'hold' as const;
      }
      if (current.state === 'armed-failure') {
        records.set(storyId, {
          revision: current.revision + 1,
          state: 'failed',
          generationId: input.generationId,
        });
        return 'fail' as const;
      }
      if (current.state === 'held') return 'hold' as const;
      return 'proceed' as const;
    },
  };
}

export type ChamberStorytellerControl = ReturnType<
  typeof createChamberStorytellerControl
>;
