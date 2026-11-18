import type { ReactNode } from 'react';
import './controls.css';

export type NoticeTone = 'neutral' | 'attention' | 'error' | 'success';

function liveRole(tone: NoticeTone): 'status' | 'alert' | undefined {
  if (tone === 'error') return 'alert';
  if (tone === 'attention' || tone === 'success') return 'status';
  return undefined;
}

/** Textual system status. Neutral notices are not live regions. */
export function SystemNotice({
  tone,
  label,
  children,
  action,
}: {
  tone: NoticeTone;
  label?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const role = liveRole(tone);
  return (
    <section className="system-notice" data-tone={tone} aria-label={label}>
      <div {...(role ? { role } : {})}>{children}</div>
      {action ? <div className="system-notice__action">{action}</div> : null}
    </section>
  );
}
