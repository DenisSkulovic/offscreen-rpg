#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import {
  assertAllowedApiOrigin,
  defaultAuthFilePath,
  normalizeApiOrigin,
  resolveApiOriginFromEnv,
  TerminalConfigError,
} from './config.js';
import { createTerminalHttpClient, TerminalHttpError } from './http.js';
import { formatLoginSuccess, runLogin } from './login.js';
import {
  forkStoryAtSequence,
  interactivePlay,
  launchStatusCommand,
  launchStoryFromPrompt,
  listStoriesCommand,
  logout,
  readStoryHistory,
  refreshStory,
  resumeWaitingStory,
  submitStoryChoice,
  TerminalPlayerError,
  whoami,
} from './player.js';
import { AuthStoreError } from './auth-store.js';

function usage(): string {
  return [
    'Usage: offscreen [--api ORIGIN] [--json] <command> [args]',
    '',
    'Commands:',
    '  login [--label NAME]       Pair this terminal with your browser account',
    '  logout                     Revoke the terminal token and clear local credentials',
    '  whoami                     Show signed-in identity',
    '  stories                    List visible stories',
    '  launch [--prompt-file PATH] Read prompt from stdin or file',
    '  launch-status [OPERATION_ID]',
    '  play STORY_ID              Interactive play loop',
    '  refresh STORY_ID           Fetch current scene',
    '  choose STORY_ID OPTION_ID  Submit a legacy choice',
    '  history STORY_ID           List recent passages',
    '  fork STORY_ID SEQUENCE     Fork from a historical sequence',
    '  resume STORY_ID            Resume a pausable wait interval',
  ].join('\n');
}

function resolveApiOrigin(argvApi?: string): string {
  const raw = argvApi ?? resolveApiOriginFromEnv();
  if (!raw) {
    throw new TerminalConfigError(
      'Set OFFSCREEN_API_ORIGIN or pass --api <origin>.',
    );
  }
  assertAllowedApiOrigin(raw);
  return normalizeApiOrigin(raw);
}

function printError(message: string): void {
  console.error(message);
}

function parseArgv(argv: string[]): {
  api: string | undefined;
  label: string | undefined;
  json: boolean;
  promptFile: string | undefined;
  positionals: string[];
} {
  let api: string | undefined;
  let label: string | undefined;
  let json = false;
  let promptFile: string | undefined;
  const positionals: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) {
      continue;
    }
    if (arg === '--api') {
      api = argv[++i];
      continue;
    }
    if (arg.startsWith('--api=')) {
      api = arg.slice('--api='.length);
      continue;
    }
    if (arg === '--label') {
      label = argv[++i];
      continue;
    }
    if (arg === '--json') {
      json = true;
      continue;
    }
    if (arg === '--prompt-file') {
      promptFile = argv[++i];
      continue;
    }
    if (arg.startsWith('--prompt-file=')) {
      promptFile = arg.slice('--prompt-file='.length);
      continue;
    }
    if (arg.startsWith('-')) {
      continue;
    }
    positionals.push(arg);
  }
  return { api, label, json, promptFile, positionals };
}

async function readPromptFromStdin(): Promise<string> {
  const chunks: string[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === 'string' ? chunk : chunk.toString('utf8'));
  }
  return chunks.join('');
}

async function main(): Promise<void> {
  const { api, label, json, promptFile, positionals } = parseArgv(
    process.argv.slice(2),
  );
  const command = positionals[0];
  if (!command || command === '--help' || command === '-h') {
    console.log(usage());
    return;
  }

  let apiOrigin: string | undefined;
  try {
    apiOrigin = resolveApiOrigin(api);
  } catch (error) {
    if (error instanceof TerminalConfigError) {
      printError(error.message);
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  const client = createTerminalHttpClient(apiOrigin);
  const authFilePath = defaultAuthFilePath(apiOrigin);

  try {
    if (command === 'login') {
      const clientLabel =
        label && label.length > 0 ? label : 'Offscreen terminal';
      const result = await runLogin({
        client,
        label: clientLabel,
        authFilePath,
        openVerificationUri: async () => {},
        onAwaitingApproval: (pairing) => {
          console.log(
            formatLoginSuccess({
              pairing,
              displayCode: pairing.code,
            }),
          );
        },
      });
      console.log(`Credentials stored at ${result.authFilePath}`);
      return;
    }

    if (command === 'logout') {
      const outcome = await logout(client, authFilePath);
      if (outcome === 'offline_cleared') {
        console.log(
          'Local credentials removed. Server revoke could not be confirmed; the token may remain valid until it expires.',
        );
        return;
      }
      console.log('Signed out.');
      return;
    }

    if (command === 'whoami') {
      const result = await whoami(client, authFilePath);
      const count = result.stories.items.length;
      if (json) {
        console.log(
          JSON.stringify(
            {
              profile: result.profile,
              storyCount: count,
            },
            null,
            2,
          ),
        );
        return;
      }
      console.log(
        [
          `Signed in as ${result.profile.displayName} (${result.profile.scope})`,
          `Story library: ${count} stor${count === 1 ? 'y' : 'ies'} visible via bearer`,
        ].join('\n'),
      );
      return;
    }

    if (command === 'stories') {
      console.log(await listStoriesCommand(client, authFilePath, json));
      return;
    }

    if (command === 'launch') {
      const prompt =
        promptFile !== undefined
          ? await readFile(promptFile, 'utf8')
          : await readPromptFromStdin();
      const result = await launchStoryFromPrompt({
        client,
        authFilePath,
        apiOrigin,
        prompt,
        json,
      });
      console.log(result.text.trimEnd());
      return;
    }

    if (command === 'launch-status') {
      console.log(
        (
          await launchStatusCommand({
            client,
            authFilePath,
            apiOrigin,
            ...(positionals[1] ? { operationId: positionals[1] } : {}),
            json,
          })
        ).trimEnd(),
      );
      return;
    }

    const storyId = positionals[1];

    if (command === 'play') {
      if (!storyId) {
        printError('play requires STORY_ID');
        process.exitCode = 1;
        return;
      }
      await interactivePlay({
        client,
        authFilePath,
        apiOrigin,
        storyId,
      });
      return;
    }

    if (command === 'refresh') {
      if (!storyId) {
        printError('refresh requires STORY_ID');
        process.exitCode = 1;
        return;
      }
      const result = await refreshStory(client, authFilePath, storyId, json);
      console.log(result.text.trimEnd());
      return;
    }

    if (command === 'choose') {
      const optionId = positionals[2];
      if (!storyId || !optionId) {
        printError('choose requires STORY_ID OPTION_ID');
        process.exitCode = 1;
        return;
      }
      const result = await submitStoryChoice({
        client,
        authFilePath,
        apiOrigin,
        storyId,
        optionId,
        json,
      });
      console.log(result.text.trimEnd());
      return;
    }

    if (command === 'history') {
      if (!storyId) {
        printError('history requires STORY_ID');
        process.exitCode = 1;
        return;
      }
      console.log(
        (await readStoryHistory(client, authFilePath, storyId, json)).trimEnd(),
      );
      return;
    }

    if (command === 'fork') {
      const sequence = Number(positionals[2]);
      if (!storyId || !Number.isInteger(sequence) || sequence < 1) {
        printError('fork requires STORY_ID SEQUENCE');
        process.exitCode = 1;
        return;
      }
      const result = await forkStoryAtSequence({
        client,
        authFilePath,
        sourceStoryId: storyId,
        sequence,
        json,
      });
      console.log(result.text.trimEnd());
      return;
    }

    if (command === 'resume') {
      if (!storyId) {
        printError('resume requires STORY_ID');
        process.exitCode = 1;
        return;
      }
      const result = await resumeWaitingStory({
        client,
        authFilePath,
        storyId,
        json,
      });
      console.log(result.text.trimEnd());
      return;
    }

    printError(`Unknown command: ${command}`);
    console.log(usage());
    process.exitCode = 1;
  } catch (error) {
    if (error instanceof TerminalConfigError) {
      printError(error.message);
      process.exitCode = 1;
      return;
    }
    if (error instanceof AuthStoreError) {
      printError(error.message);
      process.exitCode = 1;
      return;
    }
    if (error instanceof TerminalPlayerError) {
      printError(error.message);
      process.exitCode = 1;
      return;
    }
    if (error instanceof TerminalHttpError) {
      printError(error.message);
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}

await main();
