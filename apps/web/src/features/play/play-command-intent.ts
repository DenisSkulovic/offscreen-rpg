import type { FrozenResolutionEnvelope } from '@/src/shared/api/resolution-intent-store';

export type PlayResolutionIntent =
  | { status: 'idle' }
  | { status: 'submitting'; envelope: FrozenResolutionEnvelope }
  | { status: 'admitted'; envelope: FrozenResolutionEnvelope }
  | {
      status: 'awaiting_ack';
      envelope: FrozenResolutionEnvelope;
      message: string;
    }
  | {
      status: 'conflict';
      envelope: FrozenResolutionEnvelope;
      message: string;
    }
  | {
      status: 'blocked';
      envelope: FrozenResolutionEnvelope;
      message: string;
    }
  | {
      status: 'failed';
      envelope: FrozenResolutionEnvelope;
      message: string;
    };

export type PlayResolutionIntentAction =
  | { type: 'reset' }
  | { type: 'begin'; envelope: FrozenResolutionEnvelope }
  | { type: 'admitted'; envelope: FrozenResolutionEnvelope }
  | {
      type: 'awaiting_ack';
      envelope: FrozenResolutionEnvelope;
      message: string;
    }
  | { type: 'conflict'; envelope: FrozenResolutionEnvelope; message: string }
  | { type: 'blocked'; envelope: FrozenResolutionEnvelope; message: string }
  | { type: 'failed'; envelope: FrozenResolutionEnvelope; message: string }
  | { type: 'restore'; intent: PlayResolutionIntent };

export function playResolutionIntentReducer(
  state: PlayResolutionIntent,
  action: PlayResolutionIntentAction,
): PlayResolutionIntent {
  switch (action.type) {
    case 'reset':
      return { status: 'idle' };
    case 'begin':
      return { status: 'submitting', envelope: action.envelope };
    case 'admitted':
      return { status: 'admitted', envelope: action.envelope };
    case 'awaiting_ack':
      return {
        status: 'awaiting_ack',
        envelope: action.envelope,
        message: action.message,
      };
    case 'conflict':
      return {
        status: 'conflict',
        envelope: action.envelope,
        message: action.message,
      };
    case 'blocked':
      return {
        status: 'blocked',
        envelope: action.envelope,
        message: action.message,
      };
    case 'failed':
      return {
        status: 'failed',
        envelope: action.envelope,
        message: action.message,
      };
    case 'restore':
      return action.intent;
    default:
      return state;
  }
}

export function intentEnvelope(
  intent: PlayResolutionIntent,
): FrozenResolutionEnvelope | null {
  return intent.status === 'idle' ? null : intent.envelope;
}
