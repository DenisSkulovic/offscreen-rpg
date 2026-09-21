import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { canonicalJson } from '@offscreen/documents';
import {
  restoreLexicalStoryIndex,
  type LexicalStoryIndex,
} from './lexical-story-index';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Disposable local persistence for rebuildable indexes; never story authority. */
export class LocalLexicalStoryIndexStore {
  readonly root: string;

  constructor(root: string) {
    if (!root.trim()) throw new Error('Lexical index storage root is required');
    this.root = resolve(root);
  }

  private path(storyId: string) {
    if (!uuidPattern.test(storyId)) {
      throw new Error('Invalid lexical index story identity');
    }
    return join(this.root, `${storyId}.json`);
  }

  async replace(index: LexicalStoryIndex) {
    await mkdir(this.root, { recursive: true });
    const destination = this.path(index.storyId);
    const staged = `${destination}.${randomUUID()}.staged`;
    try {
      await writeFile(staged, canonicalJson(index.snapshot()), {
        encoding: 'utf8',
        flag: 'wx',
      });
      await rename(staged, destination);
    } finally {
      await rm(staged, { force: true }).catch(() => undefined);
    }
  }

  async load(storyId: string) {
    try {
      return restoreLexicalStoryIndex(
        JSON.parse(await readFile(this.path(storyId), 'utf8')),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  delete(storyId: string) {
    return rm(this.path(storyId), { force: true });
  }
}
