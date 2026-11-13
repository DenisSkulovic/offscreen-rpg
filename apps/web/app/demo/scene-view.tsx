import { StoryFrame } from '@/src/features/play/ui/story-frame';
import type { DemoFacts } from './demo-state';
import { returnDigestParagraphs } from './demo-state';
import type { SceneChoice } from './script';

export type ScenePresentation = {
  place: string;
  title: string;
  paragraphs: readonly string[];
  phase: 'decision' | 'waiting' | 'ended';
  status: string;
  choices: readonly SceneChoice[];
};

// Presentation only: scheduling, permissions and outcomes belong to its caller.
export function SceneView({
  scene,
  facts,
  paused,
  choices,
  onChoose,
}: {
  scene: ScenePresentation;
  facts: DemoFacts;
  paused: boolean;
  choices: readonly SceneChoice[];
  onChoose: (id: string) => void;
}) {
  const paragraphs =
    scene.phase === 'ended'
      ? returnDigestParagraphs(facts)
      : scene.paragraphs;

  const intentions =
    scene.phase === 'decision'
      ? choices.map((choice) => ({
          id: choice.id,
          label: choice.label,
          support: choice.detail,
        }))
      : [];

  const memoryParts = [
    'Scripted preview · simulated time · resets when refreshed',
  ];
  if (facts.noticeRead) memoryParts.push('You know what the notice says');
  if (facts.repairEarned === 3) {
    memoryParts.push('Repair held at 3 of 9');
  }

  return (
    <StoryFrame
      storiesHref="/"
      storyLabel="Interactive preview"
      situationLabel={scene.place}
      statusLabel={paused ? 'Paused. This moment can wait.' : scene.status}
      passageTitle={scene.title}
      paragraphs={paragraphs}
      memory={memoryParts.join(' · ')}
      thresholdHeading="What will you do?"
      intentions={intentions}
      intentionsDisabled={paused}
      onIntentionSelect={onChoose}
      details={
        <p>
          This is a finite authored rehearsal. It never calls a model and does
          not save to an account. Create a persistent story when you want a
          durable life under real rules.
        </p>
      }
      stageExtras={
        scene.phase === 'waiting' ? (
          <p className="story-frame__stage-status" role="status">
            Simulated wait — use the control below to jump to the next authored
            moment. This is not server-authorized progress.
          </p>
        ) : scene.phase === 'ended' ? (
          <p className="story-frame__stage-status" role="status">
            End of preview. Scripted choices are not carried into a paid
            campaign — creation starts a new persistent story.
          </p>
        ) : null
      }
    />
  );
}
