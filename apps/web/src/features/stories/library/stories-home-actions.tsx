import { Action } from '@/src/shared/ui/action';

export function StoriesHomeActions() {
  return (
    <div className="stories-library__actions">
      <Action kind="link" variant="primary" href="/stories/new">
        Create a story
      </Action>
      <Action kind="link" variant="quiet" href="/demo">
        Try the public preview
      </Action>
    </div>
  );
}
