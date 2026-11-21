'use client';

import type { StoryLaunchStatus as StoryLaunchStatusBody } from '@offscreen/contracts/story-launch';
import { Action } from '@/src/shared/ui/action';
import { SystemNotice } from '@/src/shared/ui/system-notice';
import type { StoryLaunchPhase } from './use-story-launch';

function heldMessage(reason: 'policy' | 'authorization' | 'capacity'): string {
  switch (reason) {
    case 'policy':
      return 'This launch is held for policy review. It will not be retried automatically.';
    case 'authorization':
      return 'This launch needs authorization before it can continue.';
    case 'capacity':
      return 'The service is at capacity. Try again later; this launch will not be resent.';
  }
}

function failedMessage(
  reason: 'rejected' | 'not-admitted' | 'unavailable',
): string {
  switch (reason) {
    case 'rejected':
      return 'The launch was rejected and will not be retried.';
    case 'not-admitted':
      return 'The launch was not admitted.';
    case 'unavailable':
      return 'The launch service is unavailable.';
  }
}

function pollingMessage(state: StoryLaunchStatusBody['state']): string {
  switch (state) {
    case 'pending':
      return 'Waiting for the story.';
    case 'preparing':
      return 'Preparing the opening.';
    case 'composing':
      return 'Composing the first scene.';
    default:
      return 'Waiting for the story.';
  }
}

function AttentionNotice({
  status,
  onCheckStatus,
}: {
  status: StoryLaunchStatusBody;
  onCheckStatus: () => void;
}) {
  if (status.state === 'held') {
    return (
      <SystemNotice tone="attention" label="Launch held">
        {heldMessage(status.reason)}
      </SystemNotice>
    );
  }
  if (status.state === 'failed') {
    return (
      <SystemNotice tone="attention" label="Launch failed">
        {failedMessage(status.reason)}
      </SystemNotice>
    );
  }
  if (status.state === 'uncertain') {
    return (
      <SystemNotice
        tone="attention"
        label="Launch uncertain"
        action={
          <Action kind="button" variant="secondary" onClick={onCheckStatus}>
            Check status
          </Action>
        }
      >
        {status.explanation} The launch was not confirmed and will not be sent
        again automatically.
      </SystemNotice>
    );
  }
  return null;
}

export function StoryLaunchStatus({
  phase,
  onCheckStatus,
}: {
  phase: StoryLaunchPhase;
  onCheckStatus: () => void;
}) {
  switch (phase.kind) {
    case 'idle':
      return (
        <div className="story-launch__status">
          <SystemNotice tone="neutral" label="Launch hint">
            One prompt starts the story. A title and character are not required.
          </SystemNotice>
        </div>
      );
    case 'submitting':
      return (
        <div className="story-launch__status">
          <SystemNotice tone="neutral" label="Launch submitting">
            Sending the launch request…
          </SystemNotice>
        </div>
      );
    case 'polling':
      return (
        <div className="story-launch__status" aria-live="polite">
          <SystemNotice tone="neutral" label="Launch in progress">
            {pollingMessage(phase.status.state)}
          </SystemNotice>
        </div>
      );
    case 'attention':
      return (
        <div className="story-launch__status">
          <AttentionNotice
            status={phase.status}
            onCheckStatus={onCheckStatus}
          />
        </div>
      );
    case 'ready':
      return (
        <div className="story-launch__status">
          <SystemNotice
            tone="success"
            label="Story ready"
            action={
              <Action kind="link" variant="primary" href={phase.href}>
                Open the story
              </Action>
            }
          >
            Your story is ready to play.
          </SystemNotice>
        </div>
      );
    case 'needs-input':
      return (
        <div className="story-launch__status">
          <SystemNotice tone="attention" label="Launch needs input">
            {phase.message}
          </SystemNotice>
        </div>
      );
    case 'rejected':
      return (
        <div className="story-launch__status">
          <SystemNotice tone="error" label="Launch rejected">
            {phase.message}
          </SystemNotice>
        </div>
      );
    default:
      return null;
  }
}
