import type { ReactNode } from 'react';

/** One flowing book leaf. It does not query, post, or choose. */
export function BookSurface({
  labelId,
  children,
}: {
  labelId: string;
  children: ReactNode;
}) {
  return (
    <article className="story-frame__book" aria-labelledby={labelId}>
      {children}
    </article>
  );
}
