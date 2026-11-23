import { LibraryNavigationError } from './library-navigation.js';

/**
 * Sequential multi-file read over an already pinned library navigation.
 * The helper does not look up hashes, switch roots, or cache authorization.
 * Each path is opened with offset 0 so the navigator repeats its own checks.
 */

export const maxBatchPaths = 8;
export const maxBatchFileCharacters = 4096;
export const maxBatchSerializedBytes = 32_768;

export class LibraryBatchReadError extends Error {
  constructor(readonly code: 'invalid-request' | 'budget-exceeded') {
    super(code);
    this.name = 'LibraryBatchReadError';
  }
}

export type LibraryBatchDocument = Readonly<{
  status: 'read';
  path: string;
  rootHash: string;
  rootRevision: number;
  documentId: string;
  revision: number;
  objectHash: string;
  content: string;
  nextOffset: number | null;
  totalCharacters: number;
}>;

export type LibraryBatchUnavailable = Readonly<{
  status: 'unavailable';
  path: string;
}>;

export type LibraryBatchItem = LibraryBatchDocument | LibraryBatchUnavailable;

type OpenedDocument = Readonly<{
  rootHash: string;
  rootRevision: number;
  path: string;
  documentId: string;
  revision: number;
  objectHash: string;
  content: string;
  nextOffset: number | null;
  totalCharacters: number;
}>;

export type LibraryBatchNavigation = Readonly<{
  open(options: {
    path: string;
    offset?: number;
    characters?: number;
  }): Promise<OpenedDocument>;
}>;

export type LibraryBatchReadInput = Readonly<{
  navigation: LibraryBatchNavigation;
  paths: readonly string[];
  characters?: number;
}>;

function assertRequest(paths: readonly string[], characters: number): void {
  if (
    !Array.isArray(paths) ||
    paths.length < 1 ||
    paths.length > maxBatchPaths
  ) {
    throw new LibraryBatchReadError('invalid-request');
  }
  if (new Set(paths).size !== paths.length) {
    throw new LibraryBatchReadError('invalid-request');
  }
  if (
    !Number.isInteger(characters) ||
    characters < 1 ||
    characters > maxBatchFileCharacters
  ) {
    throw new LibraryBatchReadError('invalid-request');
  }
}

function serializedBytes(items: readonly LibraryBatchItem[]): number {
  return Buffer.byteLength(JSON.stringify(items), 'utf8');
}

function readItem(path: string, opened: OpenedDocument): LibraryBatchDocument {
  return {
    status: 'read',
    path,
    rootHash: opened.rootHash,
    rootRevision: opened.rootRevision,
    documentId: opened.documentId,
    revision: opened.revision,
    objectHash: opened.objectHash,
    content: opened.content,
    nextOffset: opened.nextOffset,
    totalCharacters: opened.totalCharacters,
  };
}

/**
 * Reads up to eight distinct logical paths in order.
 * A missing or non-visible path becomes `{ status: 'unavailable', path }`.
 * Authorization, stale-root, and corrupt-source failures abort the whole call.
 * The serialized JSON array, including metadata, must stay within 32 KiB.
 * A later path is not opened once the next item would pass that cap.
 */
export async function readLibraryDocumentsBatch(
  input: LibraryBatchReadInput,
): Promise<readonly LibraryBatchItem[]> {
  const characters = input.characters ?? maxBatchFileCharacters;
  assertRequest(input.paths, characters);
  const items: LibraryBatchItem[] = [];
  for (const path of input.paths) {
    let item: LibraryBatchItem;
    try {
      const opened = await input.navigation.open({
        path,
        offset: 0,
        characters,
      });
      item = readItem(path, opened);
    } catch (error) {
      if (
        error instanceof LibraryNavigationError &&
        error.code === 'not-found'
      ) {
        item = { status: 'unavailable', path };
      } else {
        throw error;
      }
    }
    const next = [...items, item];
    if (serializedBytes(next) > maxBatchSerializedBytes) {
      throw new LibraryBatchReadError('budget-exceeded');
    }
    items.push(item);
  }
  return items;
}
