'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import {
  QueryErrorResetBoundary,
  useQueryErrorResetBoundary,
} from '@tanstack/react-query';
import { classifyReadRecovery } from '@/src/features/recovery/read-error';
import { RouteRecoveryPanel } from '@/src/features/recovery/route-recovery';

type BoundaryProps = {
  onReset: () => void;
  children: ReactNode;
};

type BoundaryState = {
  error: unknown;
};

class PlayReactErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { error };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Play query boundary', error, info.componentStack);
    }
  }

  reset = () => {
    this.props.onReset();
    this.setState({ error: null });
  };

  override render() {
    if (this.state.error) {
      return (
        <PlayQueryErrorFallback
          error={this.state.error}
          resetErrorBoundary={this.reset}
        />
      );
    }
    return this.props.children;
  }
}

function PlayQueryErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: unknown;
  resetErrorBoundary: () => void;
}) {
  const { reset } = useQueryErrorResetBoundary();
  const { kind } = classifyReadRecovery(error);
  return (
    <RouteRecoveryPanel
      kind={kind}
      resource="story"
      onRetry={() => {
        reset();
        resetErrorBoundary();
      }}
    />
  );
}

/**
 * Query + React error boundary for Play. Thrown query failures get typed
 * recovery; does not auto-dispatch mutations.
 */
export function PlayQueryBoundary({ children }: { children: ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <PlayReactErrorBoundary onReset={reset}>
          {children}
        </PlayReactErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
