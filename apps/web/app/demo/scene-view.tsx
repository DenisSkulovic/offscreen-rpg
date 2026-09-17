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
  return (
    <section className="story-scene" aria-labelledby="scene-title">
      <p className="eyebrow">{scene.place}</p>
      <h1 id="scene-title" tabIndex={-1}>
        {scene.title}
      </h1>
      <div className="scene-prose">
        {scene.paragraphs.map((text) => (
          <p key={text}>{text}</p>
        ))}
      </div>
      <p className="scene-status" role="status">
        {paused ? 'Paused. This moment can wait.' : scene.status}
      </p>
      {scene.phase === 'decision' && (
        <fieldset disabled={paused} className="scene-choices">
          <legend>What do you do?</legend>
          {scene.choices.map((choice) => (
            <button key={choice.id} onClick={() => onChoose(choice.id)}>
              <span>{choice.label}</span>
              <small>{choice.detail}</small>
            </button>
          ))}
        </fieldset>
      )}
    </section>
  );
}
