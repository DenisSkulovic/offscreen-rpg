import { StoryFrame } from '@/src/features/play/ui/story-frame';

export type ScenePresentation = {
  place: string;
  title: string;
  paragraphs: readonly string[];
  phase: 'decision' | 'waiting' | 'ended';
  status: string;
  choices: readonly { id: string; label: string; detail: string }[];
};

// Presentation only: scheduling, permissions and outcomes belong to its caller.
export function SceneView({
  scene,
  paused,
  onChoose,
}: {
  scene: ScenePresentation;
  paused: boolean;
  onChoose: (id: string) => void;
}) {
  const intentions =
    scene.phase === 'decision'
      ? scene.choices.map((choice) => ({
          id: choice.id,
          label: choice.label,
          support: choice.detail,
        }))
      : [];

  return (
    <StoryFrame
      storiesHref="/"
      storyLabel="Interactive preview"
      situationLabel={scene.place}
      statusLabel={paused ? 'Paused. This moment can wait.' : scene.status}
      passageTitle={scene.title}
      paragraphs={scene.paragraphs}
      memory="Interactive preview · time is simulated here and this sample resets when refreshed. No account or AI call."
      thresholdHeading="What will you do?"
      intentions={intentions}
      intentionsDisabled={paused}
      onIntentionSelect={onChoose}
      stageExtras={
        scene.phase === 'waiting' ? (
          <p className="story-frame__stage-status" role="status">
            Simulated wait — use the control below to advance demo time. This is
            not server-authorized progress.
          </p>
        ) : scene.phase === 'ended' ? (
          <p className="story-frame__stage-status" role="status">
            End of preview. Create a real story to keep a durable life.
          </p>
        ) : null
      }
    />
  );
}
