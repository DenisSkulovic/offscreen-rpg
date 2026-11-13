'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { queryKeys } from '@/src/shared/api/query-keys';
import {
  openLabRun,
  readLabCommands,
  readLabRun,
  readLabScenarios,
  replayLabRun,
  submitLabCommand,
  type LabScenario,
} from './lab-transport';

function laneAvailability(
  scenario: LabScenario,
  lane: string,
): { state: string; reason?: string } {
  const entry = scenario.availabilityPerLane[lane] as
    | { state: string; reason?: string }
    | undefined;
  return entry ?? { state: 'blocked', reason: 'Lane not listed' };
}

export function useLabWorkbench(viewerId: string) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('activity');
  const [selected, setSelected] = useState<{
    id: string;
    version: number;
  } | null>({ id: 'activity-clock-wait-eighty', version: 1 });
  const [lane, setLane] = useState('bench-policy');
  const [runId, setRunId] = useState<string | null>(null);
  const [consoleLine, setConsoleLine] = useState('load');
  const [status, setStatus] = useState<string | null>(null);
  const [replayCommand, setReplayCommand] = useState<string | null>(null);

  const scenariosQuery = useQuery({
    queryKey: queryKeys.chamber(viewerId, 'lab-scenarios', search),
    queryFn: () => readLabScenarios(search),
  });

  const commandsQuery = useQuery({
    queryKey: queryKeys.chamber(viewerId, 'lab-commands'),
    queryFn: readLabCommands,
  });

  const runQuery = useQuery({
    queryKey: queryKeys.chamber(viewerId, 'lab-run', runId ?? 'none'),
    queryFn: () => readLabRun(runId!),
    enabled: runId !== null,
  });

  const openMutation = useMutation({
    mutationFn: openLabRun,
    retry: false,
    onSuccess: (opened) => {
      setRunId(opened.runId);
      setStatus(`opened ${opened.scenarioId}@${opened.scenarioVersion}`);
      setReplayCommand(null);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chamber(viewerId, 'lab-run'),
      });
    },
    onError: (error: Error) => setStatus(error.message),
  });

  const commandMutation = useMutation({
    mutationFn: (body: unknown) =>
      submitLabCommand(runId!, crypto.randomUUID(), body),
    retry: false,
    onSuccess: (payload) => {
      const record = payload as {
        kind?: string;
        replayCommand?: string;
        result?: { outcome?: string; errorCode?: string; detail?: string };
      };
      if (record.kind === 'finalize' && record.replayCommand) {
        setReplayCommand(record.replayCommand);
        setStatus('evidence finalized');
      } else if (record.result?.outcome === 'blocked') {
        setStatus(
          `${record.result.errorCode ?? 'blocked'}: ${record.result.detail ?? ''}`,
        );
      } else {
        setStatus(record.result?.outcome ?? record.kind ?? 'ok');
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chamber(viewerId, 'lab-run', runId ?? 'none'),
      });
    },
    onError: (error: Error) => setStatus(error.message),
  });

  const replayMutation = useMutation({
    mutationFn: () => replayLabRun(runId!, crypto.randomUUID()),
    retry: false,
    onSuccess: (opened) => {
      setRunId(opened.runId);
      setStatus(`replayed as ${opened.runId}`);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chamber(viewerId, 'lab-run'),
      });
    },
    onError: (error: Error) => setStatus(error.message),
  });

  const selectedScenario =
    scenariosQuery.data?.find(
      (entry) =>
        selected &&
        entry.id === selected.id &&
        entry.version === selected.version,
    ) ?? null;
  const availability = selectedScenario
    ? laneAvailability(selectedScenario, lane)
    : { state: 'blocked', reason: 'Select a scenario' };
  const canOpen = availability.state === 'available' && !openMutation.isPending;

  function parseConsole(line: string): unknown | null {
    const trimmed = line.trim();
    if (!trimmed) return null;
    const [name, ...rest] = trimmed.split(/\s+/);
    switch (name) {
      case 'load':
      case 'pause':
      case 'resume':
      case 'reset':
      case 'export':
      case 'finalize':
        return { kind: name };
      case 'inspect':
        return {
          kind: 'inspect',
          facets: rest.length
            ? rest
            : ['summary', 'clock', 'items'],
        };
      case 'advanceClock': {
        const target = Number(rest[0]);
        if (!Number.isFinite(target)) return null;
        return { kind: 'advanceClock', targetGameSecond: target };
      }
      case 'assert': {
        const invariantId = rest[0];
        if (!invariantId) return null;
        const expectedRaw = rest[1];
        const expected =
          expectedRaw === undefined
            ? undefined
            : Number.isFinite(Number(expectedRaw))
              ? Number(expectedRaw)
              : expectedRaw;
        return {
          kind: 'assert',
          invariantId,
          ...(expected !== undefined ? { expected } : {}),
        };
      }
      default:
        return null;
    }
  }

  return {
    search,
    setSearch,
    scenarios: scenariosQuery.data ?? [],
    scenariosPending: scenariosQuery.isPending,
    scenariosError: scenariosQuery.error
      ? (scenariosQuery.error as Error).message
      : null,
    commands: commandsQuery.data ?? [],
    selected,
    setSelected,
    lane,
    setLane,
    availability,
    canOpen,
    openPending: openMutation.isPending,
    open: () => {
      if (!selected || !canOpen) return;
      openMutation.mutate({
        scenarioId: selected.id,
        scenarioVersion: selected.version,
        lane,
        seed: 141,
      });
    },
    runId,
    run: runQuery.data ?? null,
    runPending: runQuery.isPending && runId !== null,
    consoleLine,
    setConsoleLine,
    submitConsole: () => {
      if (!runId || commandMutation.isPending) return;
      const body = parseConsole(consoleLine);
      if (!body) {
        setStatus('Unknown or invalid console command');
        return;
      }
      commandMutation.mutate(body);
    },
    commandPending: commandMutation.isPending,
    status,
    replayCommand,
    copyReplay: async () => {
      if (!replayCommand) return;
      await navigator.clipboard.writeText(replayCommand);
      setStatus('replay command copied');
    },
    replay: () => {
      if (!runId) return;
      replayMutation.mutate();
    },
    replayPending: replayMutation.isPending,
  };
}

export type LabWorkbenchModel = ReturnType<typeof useLabWorkbench>;
