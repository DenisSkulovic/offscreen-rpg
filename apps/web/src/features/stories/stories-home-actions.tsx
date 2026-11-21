import { Action } from '@/src/shared/ui/action';

export function StoriesHomeActions({
  launchEnabled,
}: {
  launchEnabled: boolean;
}) {
  return (
    <div className="stories-library__actions">
      <Action kind="link" variant="primary" href="/stories/new">
        Create a story
      </Action>
      {launchEnabled ? (
        <Action kind="link" variant="quiet" href="/stories/launch">
          Play from a prompt
        </Action>
      ) : null}
      <Action kind="link" variant="quiet" href="/demo">
        Try the public preview
      </Action>
    </div>
  );
}
