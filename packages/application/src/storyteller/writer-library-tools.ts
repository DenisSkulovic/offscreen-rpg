import type {
  WriterMissionCapture,
  WriterToolName,
} from '@offscreen/storyteller/tasks';
import {
  createPinnedLibraryNavigation,
  LibraryNavigationError,
  type LibraryAccess,
  type LibraryBrowseCursor,
} from './library-navigation';

const READ_ONLY_LIBRARY_TOOLS = [
  'library.browse',
  'library.find',
  'library.read',
  'library.diff',
  'skills.open',
] as const satisfies readonly WriterToolName[];

type ReadOnlyLibraryTool = (typeof READ_ONLY_LIBRARY_TOOLS)[number];

const maxPageEntries = 128;
const maxReadCharacters = 16_384;

const capabilityElevationKeys = new Set([
  'toolsAllowlist',
  'tools',
  'budgets',
  'maxMicrousd',
  'maxModelRounds',
  'maxInputTokens',
  'maxGeneratedTokens',
  'deadlineMs',
  'privateDocuments',
  'grant',
  'skillObjectHashes',
  'profileObjectHash',
  'libraryRootRevision',
  'storyId',
  'ownerId',
]);

export class WriterLibraryToolError extends Error {
  constructor(
    readonly code:
      | 'tool-not-granted'
      | 'tool-not-supported'
      | 'capability-elevation'
      | 'foreign-root'
      | 'skill-not-pinned'
      | 'invalid-args',
  ) {
    super(code);
    this.name = 'WriterLibraryToolError';
  }
}

type LibraryReader = Parameters<typeof createPinnedLibraryNavigation>[0]['reader'];

export type WriterLibraryToolCall = Readonly<{
  id: string;
  name: WriterToolName;
  args: Record<string, unknown>;
}>;

export type WriterLibraryToolSuccess = Readonly<{
  ok: true;
  toolCallId: string;
  name: ReadOnlyLibraryTool;
  result: unknown;
  resultByteLength: number;
}>;

export type WriterLibraryToolFailure = Readonly<{
  ok: false;
  toolCallId: string;
  name: WriterToolName;
  code: string;
  resultByteLength: 0;
}>;

export type WriterLibraryToolOutcome =
  | WriterLibraryToolSuccess
  | WriterLibraryToolFailure;

function resultByteLength(result: unknown): number {
  return Buffer.byteLength(JSON.stringify(result), 'utf8');
}

function assertReadOnlyTool(name: WriterToolName): asserts name is ReadOnlyLibraryTool {
  if (!(READ_ONLY_LIBRARY_TOOLS as readonly string[]).includes(name)) {
    throw new WriterLibraryToolError('tool-not-supported');
  }
}

function assertToolGranted(
  capture: WriterMissionCapture,
  name: WriterToolName,
): void {
  if (!capture.toolsAllowlist.includes(name)) {
    throw new WriterLibraryToolError('tool-not-granted');
  }
}

function assertNoCapabilityElevation(
  args: Record<string, unknown>,
  pinnedRootHash: string,
): void {
  for (const key of Object.keys(args)) {
    if (capabilityElevationKeys.has(key)) {
      throw new WriterLibraryToolError('capability-elevation');
    }
  }
  const rootHash = args.rootHash;
  if (typeof rootHash === 'string' && rootHash !== pinnedRootHash) {
    throw new WriterLibraryToolError('foreign-root');
  }
  const cursor = args.cursor;
  if (cursor !== null && typeof cursor === 'object' && cursor !== undefined) {
    const root = (cursor as LibraryBrowseCursor).rootHash;
    if (typeof root === 'string' && root !== pinnedRootHash) {
      throw new WriterLibraryToolError('foreign-root');
    }
  }
  const characters = args.characters;
  if (
    typeof characters === 'number' &&
    (!Number.isInteger(characters) || characters > maxReadCharacters)
  ) {
    throw new WriterLibraryToolError('capability-elevation');
  }
  const pageSize = args.pageSize;
  if (
    typeof pageSize === 'number' &&
    (!Number.isInteger(pageSize) || pageSize > maxPageEntries)
  ) {
    throw new WriterLibraryToolError('capability-elevation');
  }
}

function navigationErrorCode(error: unknown): string {
  if (error instanceof LibraryNavigationError) return error.code;
  if (error instanceof WriterLibraryToolError) return error.code;
  return 'internal-error';
}

function diffText(left: string, right: string): Readonly<{
  leftObjectHash: string;
  rightObjectHash: string;
  lines: readonly { kind: 'same' | 'left' | 'right'; text: string }[];
}> {
  const leftLines = left.split('\n');
  const rightLines = right.split('\n');
  const lines: { kind: 'same' | 'left' | 'right'; text: string }[] = [];
  const max = Math.max(leftLines.length, rightLines.length);
  for (let index = 0; index < max; index += 1) {
    const l = leftLines[index];
    const r = rightLines[index];
    if (l === r) {
      if (l !== undefined) lines.push({ kind: 'same', text: l });
    } else {
      if (l !== undefined) lines.push({ kind: 'left', text: l });
      if (r !== undefined) lines.push({ kind: 'right', text: r });
    }
    if (lines.length >= 512) break;
  }
  return {
    leftObjectHash: '',
    rightObjectHash: '',
    lines,
  };
}

export type WriterLibraryToolExecutor = Readonly<{
  capture: WriterMissionCapture;
  execute(call: WriterLibraryToolCall): Promise<WriterLibraryToolOutcome>;
}>;

export function createWriterLibraryToolExecutor(input: {
  capture: WriterMissionCapture;
  reader: LibraryReader;
  authorize: () => Promise<LibraryAccess | null>;
}): WriterLibraryToolExecutor {
  const navigation = createPinnedLibraryNavigation({
    reader: input.reader,
    storyId: input.capture.storyId,
    rootHash: input.capture.libraryRootHash,
    rootRevision: input.capture.libraryRootRevision,
    authorize: input.authorize,
  });

  async function readSkillBody(objectHash: string, offset: number, characters: number) {
    const source = await input.reader.readDocument(objectHash);
    const text = source.body;
    const codepoints = Array.from(text);
    return {
      objectHash,
      content: codepoints.slice(offset, offset + characters).join(''),
      nextOffset:
        offset + characters < codepoints.length ? offset + characters : null,
      totalCharacters: codepoints.length,
    };
  }

  return {
    capture: input.capture,
    async execute(call) {
      const fail = (code: string): WriterLibraryToolFailure => ({
        ok: false,
        toolCallId: call.id,
        name: call.name,
        code,
        resultByteLength: 0,
      });

      try {
        assertToolGranted(input.capture, call.name);
        assertReadOnlyTool(call.name);
        assertNoCapabilityElevation(
          call.args,
          input.capture.libraryRootHash,
        );
      } catch (error) {
        return fail(navigationErrorCode(error));
      }

      try {
        switch (call.name) {
          case 'library.browse': {
            const result = await navigation.browse({
              ...(typeof call.args.prefix === 'string'
                ? { prefix: call.args.prefix }
                : {}),
              ...(typeof call.args.after === 'string'
                ? { after: call.args.after }
                : {}),
              ...(typeof call.args.pageSize === 'number'
                ? { pageSize: call.args.pageSize }
                : {}),
              ...(call.args.cursor !== null && typeof call.args.cursor === 'object'
                ? { cursor: call.args.cursor as LibraryBrowseCursor }
                : {}),
            });
            return {
              ok: true,
              toolCallId: call.id,
              name: call.name,
              result,
              resultByteLength: resultByteLength(result),
            };
          }
          case 'library.find': {
            const query = call.args.query;
            if (typeof query !== 'string') {
              throw new WriterLibraryToolError('invalid-args');
            }
            const result = await navigation.find({
              query,
              ...(typeof call.args.prefix === 'string'
                ? { prefix: call.args.prefix }
                : {}),
              ...(typeof call.args.after === 'string'
                ? { after: call.args.after }
                : {}),
              ...(typeof call.args.pageSize === 'number'
                ? { pageSize: call.args.pageSize }
                : {}),
            });
            return {
              ok: true,
              toolCallId: call.id,
              name: call.name,
              result,
              resultByteLength: resultByteLength(result),
            };
          }
          case 'library.read': {
            const offset =
              typeof call.args.offset === 'number' ? call.args.offset : undefined;
            const characters =
              typeof call.args.characters === 'number'
                ? call.args.characters
                : undefined;
            const objectHash =
              typeof call.args.objectHash === 'string' ? call.args.objectHash : undefined;
            const path =
              typeof call.args.path === 'string'
                ? call.args.path
                : typeof call.args.handle === 'string'
                  ? call.args.handle
                  : undefined;
            if (objectHash !== undefined) {
              const result = await navigation.readByObjectHash({
                objectHash,
                ...(offset !== undefined ? { offset } : {}),
                ...(characters !== undefined ? { characters } : {}),
              });
              return {
                ok: true,
                toolCallId: call.id,
                name: call.name,
                result,
                resultByteLength: resultByteLength(result),
              };
            }
            if (path === undefined) {
              throw new WriterLibraryToolError('invalid-args');
            }
            const result = await navigation.open({
              path,
              ...(offset !== undefined ? { offset } : {}),
              ...(characters !== undefined ? { characters } : {}),
            });
            return {
              ok: true,
              toolCallId: call.id,
              name: call.name,
              result,
              resultByteLength: resultByteLength(result),
            };
          }
          case 'library.diff': {
            const leftObjectHash =
              typeof call.args.leftObjectHash === 'string'
                ? call.args.leftObjectHash
                : undefined;
            const rightObjectHash =
              typeof call.args.rightObjectHash === 'string'
                ? call.args.rightObjectHash
                : undefined;
            if (leftObjectHash === undefined || rightObjectHash === undefined) {
              throw new WriterLibraryToolError('invalid-args');
            }
            const [left, right] = await Promise.all([
              navigation.readByObjectHash({ objectHash: leftObjectHash }),
              navigation.readByObjectHash({ objectHash: rightObjectHash }),
            ]);
            const diff = diffText(left.content, right.content);
            const result = {
              rootHash: input.capture.libraryRootHash,
              rootRevision: input.capture.libraryRootRevision,
              leftObjectHash,
              rightObjectHash,
              lines: diff.lines,
            };
            return {
              ok: true,
              toolCallId: call.id,
              name: call.name,
              result,
              resultByteLength: resultByteLength(result),
            };
          }
          case 'skills.open': {
            const objectHash =
              typeof call.args.objectHash === 'string' ? call.args.objectHash : undefined;
            if (objectHash === undefined) {
              throw new WriterLibraryToolError('invalid-args');
            }
            if (!input.capture.skillObjectHashes.includes(objectHash)) {
              throw new WriterLibraryToolError('skill-not-pinned');
            }
            const offset =
              typeof call.args.offset === 'number' ? call.args.offset : 0;
            const characters =
              typeof call.args.characters === 'number' ? call.args.characters : 4096;
            const result = await readSkillBody(objectHash, offset, characters);
            return {
              ok: true,
              toolCallId: call.id,
              name: call.name,
              result,
              resultByteLength: resultByteLength(result),
            };
          }
          default:
            return fail('tool-not-supported');
        }
      } catch (error) {
        return fail(navigationErrorCode(error));
      }
    },
  };
}