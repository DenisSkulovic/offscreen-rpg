'use client';

import { useId, useState } from 'react';
import type { TerminalPairingConsent } from '@offscreen/identity-interface/terminal-auth';
import { Action } from '@/src/shared/ui/action';

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'approved' }
  | { kind: 'error'; message: string };

export function TerminalConnectForm({
  consent,
}: {
  consent: TerminalPairingConsent;
}) {
  const formId = useId();
  const [userCode, setUserCode] = useState('');
  const [state, setState] = useState<SubmitState>({ kind: 'idle' });

  async function approve(event: React.FormEvent) {
    event.preventDefault();
    if (state.kind === 'submitting' || state.kind === 'approved') {
      return;
    }
    if (userCode.trim().length !== 10) {
      setState({
        kind: 'error',
        message: 'Enter the ten-character code shown in your terminal.',
      });
      return;
    }
    setState({ kind: 'submitting' });
    try {
      const response = await fetch(
        `/api/terminal-auth/pairings/${consent.pairingId}/approve`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ userCode: userCode.trim().toUpperCase() }),
        },
      );
      if (response.status === 204) {
        setState({ kind: 'approved' });
        return;
      }
      if (response.status === 404) {
        setState({
          kind: 'error',
          message: 'That code did not match this pairing request.',
        });
        return;
      }
      setState({
        kind: 'error',
        message: 'Approval could not be completed. Try again shortly.',
      });
    } catch {
      setState({
        kind: 'error',
        message: 'Approval could not reach the server.',
      });
    }
  }

  return (
    <main className="terminal-connect">
      <h1>Approve terminal access</h1>
      <p>
        <strong>{consent.clientLabel}</strong> is asking to connect as a{' '}
        <strong>story-only</strong> player client. Approved access lasts{' '}
        <strong>{consent.accessDurationDays} days</strong>, then must be renewed
        here.
      </p>
      <p>
        This credential can list, play, inspect history, and fork your campaigns
        through the same story APIs as this browser session. It cannot access
        drafts, admin tools, or provider secrets.
      </p>
      <p>
        Pairing request expires at{' '}
        {new Date(consent.pairingExpiresAt).toLocaleString()}.
      </p>
      {state.kind === 'approved' ? (
        <p role="status">
          Approved. Return to your terminal to finish sign-in.
        </p>
      ) : (
        <form onSubmit={approve} aria-labelledby={`${formId}-heading`}>
          <h2 id={`${formId}-heading`} className="terminal-connect__heading">
            Type the code from your terminal
          </h2>
          <label htmlFor={`${formId}-code`}>Pairing code</label>
          <input
            id={`${formId}-code`}
            name="userCode"
            autoComplete="off"
            inputMode="text"
            spellCheck={false}
            maxLength={10}
            value={userCode}
            onChange={(event) =>
              setUserCode(event.target.value.toUpperCase().slice(0, 10))
            }
            disabled={state.kind === 'submitting'}
          />
          {state.kind === 'error' ? <p role="alert">{state.message}</p> : null}
          <Action
            kind="button"
            type="submit"
            disabled={state.kind === 'submitting'}
            aria-busy={state.kind === 'submitting'}
          >
            {state.kind === 'submitting' ? 'Approving…' : 'Approve access'}
          </Action>
        </form>
      )}
    </main>
  );
}
