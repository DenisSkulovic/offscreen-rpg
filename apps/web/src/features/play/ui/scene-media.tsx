'use client';

import { useEffect, useState } from 'react';
import type { ResolvedMedia } from '../presentation/types';

export function SceneMedia({
  media,
  identity,
  className,
}: {
  media: ResolvedMedia;
  /** storyId:passageId. A late load from another identity does not paint. */
  identity: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  useEffect(() => {
    setFailed(false);
    setLoadedFor(null);
  }, [identity, media.src]);
  if (failed || (loadedFor !== null && loadedFor !== identity)) return null;
  const decorative = media.role !== 'supplemental';
  return (
    <figure
      className={className}
      data-slot={media.slot.kind}
      style={{ aspectRatio: `${media.width} / ${media.height}` }}
      aria-hidden={decorative ? true : undefined}
    >
      <img
        src={media.src}
        alt={decorative ? '' : (media.description ?? '')}
        width={media.width}
        height={media.height}
        style={{ objectPosition: `${media.focalPoint.x}% ${media.focalPoint.y}%` }}
        data-crop={media.crop}
        onLoad={() => setLoadedFor(identity)}
        onError={() => setFailed(true)}
      />
    </figure>
  );
}
