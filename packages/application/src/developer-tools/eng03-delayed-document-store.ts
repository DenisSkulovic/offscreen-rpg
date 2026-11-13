/**
 * Test-only DocumentStore wrapper that delays immutable reads.
 * Used by ENG03-M lock measurement; never wire into production adapters.
 */
import type { DocumentStore } from '@offscreen/documents';

export type Eng03DocumentReadSpan = {
  method: string;
  delayMs: number;
  startedAt: number;
  endedAt: number;
};

export type Eng03DelayedDocumentStoreOptions = {
  delayMs: number;
  onBeforeRead?: (method: string) => void | Promise<void>;
  onRead?: (span: Eng03DocumentReadSpan) => void;
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function createEng03DelayedDocumentStore(
  inner: DocumentStore,
  options: Eng03DelayedDocumentStoreOptions,
): DocumentStore {
  const delayMs = Math.max(0, options.delayMs);
  async function delayRead<T>(
    method: string,
    run: () => Promise<T>,
  ): Promise<T> {
    await options.onBeforeRead?.(method);
    const startedAt = performance.now();
    if (delayMs > 0) await sleep(delayMs);
    try {
      return await run();
    } finally {
      const endedAt = performance.now();
      options.onRead?.({ method, delayMs, startedAt, endedAt });
    }
  }

  return {
    putDocument: (document) => inner.putDocument(document),
    putSourcePassage: (passage) => inner.putSourcePassage(passage),
    putStructuredDocument: (document) => inner.putStructuredDocument(document),
    putManifest: (manifest) => inner.putManifest(manifest),
    putWorldPackageManifest: (manifest) =>
      inner.putWorldPackageManifest(manifest),
    putRulePackageManifest: (manifest) =>
      inner.putRulePackageManifest(manifest),
    putStartPackageManifest: (manifest) =>
      inner.putStartPackageManifest(manifest),
    readDocument: (hash) =>
      delayRead('readDocument', () => inner.readDocument(hash)),
    readSourcePassage: (hash) =>
      delayRead('readSourcePassage', () => inner.readSourcePassage(hash)),
    readStructuredDocument: (hash) =>
      delayRead('readStructuredDocument', () =>
        inner.readStructuredDocument(hash),
      ),
    readManifest: (hash) =>
      delayRead('readManifest', () => inner.readManifest(hash)),
    readWorldPackageManifest: (hash) =>
      delayRead('readWorldPackageManifest', () =>
        inner.readWorldPackageManifest(hash),
      ),
    readRulePackageManifest: (hash) =>
      delayRead('readRulePackageManifest', () =>
        inner.readRulePackageManifest(hash),
      ),
    readStartPackageManifest: (hash) =>
      delayRead('readStartPackageManifest', () =>
        inner.readStartPackageManifest(hash),
      ),
  };
}
