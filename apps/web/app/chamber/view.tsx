'use client';
import { SessionRefresh } from '../stories/session-refresh';
import { ChamberScene, ChamberStart } from './scene';
import { useChamberPlay } from './use-chamber-play';
import type { StorySnapshot } from '@offscreen/contracts/stories';

export function Chamber({
  initial,
  initialId,
}: {
  initial: StorySnapshot | null;
  initialId: string | null;
}) {
  const play = useChamberPlay({ initial, initialId });
  return (
    <main className="editor">
      <SessionRefresh />
      <p className="eyebrow">Scripted testing chamber</p>
      <p>
        A short branching story with saved choices and consequences. No AI
        calls. A timed visit can be paused and resumed; pace controls and
        possessions are not connected yet.
      </p>
      {play.story ? (
        <ChamberScene
          story={play.story}
          pending={play.pending}
          controlPending={play.controlOperation.current !== null}
          responsePending={play.responseOperation.current !== null}
          onControl={(action) => void play.control(action)}
          onRespond={(optionId) => void play.respond(optionId)}
        />
      ) : (
        <ChamberStart
          pending={play.pending}
          scenario={play.scenario}
          startLocked={play.startOperationId.current !== null}
          onScenario={play.setScenario}
          onStart={() => void play.start()}
        />
      )}
      <p role="status">{play.error}</p>
      <p>
        <a href="/stories">Back to stories</a>
      </p>
    </main>
  );
}
