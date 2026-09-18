'use client';
import { SessionRefresh } from '../stories/session-refresh';
import { ChamberScene, ChamberStart } from './scene';
import { useChamberPlay } from './use-chamber-play';
import type { StorySnapshot } from '@offscreen/contracts/stories';
import { QaWorkspace } from './qa-workspace';

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
      <p className="eyebrow">Chamber laboratory</p>
      <p>
        Local developer scenarios that exercise real persistence and execution.
        No AI calls. The inspector is read-only.
      </p>
      {play.story ? (
        <ChamberScene
          story={play.story}
          pending={play.pending}
          controlPending={play.controlOperation.current !== null}
          responsePending={play.responseOperation.current !== null}
          inspector={play.inspector}
          inspectorError={play.inspectorError}
          inspectorPending={play.inspectorPending}
          onInspect={play.refreshInspector}
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
      <QaWorkspace />
      <p>
        <a href="/stories">Back to stories</a>
      </p>
    </main>
  );
}
