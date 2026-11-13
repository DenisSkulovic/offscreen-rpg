'use client';

import { useLabWorkbench } from './use-lab-workbench';

export function LabWorkbench({ viewerId }: { viewerId: string }) {
  const lab = useLabWorkbench(viewerId);
  return (
    <section aria-labelledby="lab-workbench-heading" className="stack">
      <h2 id="lab-workbench-heading">Lab workbench</h2>
      <p>
        Searchable offline scenarios, typed LabRun steps, inspector delta and
        copyable replay. Legacy scripted scenes and QA journal remain below.
      </p>

      <label>
        Search scenarios
        <input
          value={lab.search}
          onChange={(event) => lab.setSearch(event.target.value)}
          aria-label="Search lab scenarios"
        />
      </label>

      {lab.scenariosError ? (
        <p role="alert">{lab.scenariosError}</p>
      ) : null}

      <label>
        Scenario
        <select
          value={
            lab.selected
              ? `${lab.selected.id}@${lab.selected.version}`
              : ''
          }
          onChange={(event) => {
            const [id, version] = event.target.value.split('@');
            if (!id || !version) {
              lab.setSelected(null);
              return;
            }
            lab.setSelected({ id, version: Number(version) });
          }}
          disabled={lab.scenariosPending}
        >
          <option value="">Select…</option>
          {lab.scenarios.map((scenario) => (
            <option
              key={`${scenario.id}@${scenario.version}`}
              value={`${scenario.id}@${scenario.version}`}
            >
              {scenario.name} ({scenario.id}@{scenario.version})
            </option>
          ))}
        </select>
      </label>

      <label>
        Lane
        <select
          value={lab.lane}
          onChange={(event) => lab.setLane(event.target.value)}
        >
          <option value="bench-policy">bench-policy</option>
          <option value="sandbox-db">sandbox-db</option>
          <option value="connected">connected</option>
        </select>
      </label>

      {lab.availability.state !== 'available' ? (
        <p role="status">
          Lane unavailable: {lab.availability.reason ?? lab.availability.state}
        </p>
      ) : (
        <p role="status">Lane available for offline LabRun.</p>
      )}

      <button
        type="button"
        onClick={() => lab.open()}
        disabled={!lab.canOpen || lab.openPending}
      >
        {lab.openPending ? 'Opening…' : 'Open LabRun'}
      </button>

      {lab.runId ? (
        <div className="stack">
          <p>
            Run <code>{lab.runId}</code> — lifecycle{' '}
            {lab.run?.snapshot.lifecycle ?? '…'} rev{' '}
            {lab.run?.snapshot.revision ?? '…'}
          </p>

          <label>
            Console command
            <input
              value={lab.consoleLine}
              onChange={(event) => lab.setConsoleLine(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  lab.submitConsole();
                }
              }}
              list="lab-command-suggestions"
              aria-label="Lab console command"
            />
          </label>
          <datalist id="lab-command-suggestions">
            {lab.commands.map((command) => (
              <option key={command.name} value={command.name}>
                {command.description}
              </option>
            ))}
          </datalist>
          <button
            type="button"
            onClick={() => lab.submitConsole()}
            disabled={lab.commandPending}
          >
            {lab.commandPending ? 'Running…' : 'Run command'}
          </button>

          <button type="button" onClick={() => lab.replay()} disabled={lab.replayPending}>
            Replay as new run
          </button>

          {lab.replayCommand ? (
            <p>
              <button type="button" onClick={() => void lab.copyReplay()}>
                Copy replay command
              </button>{' '}
              <code>{lab.replayCommand}</code>
            </p>
          ) : null}

          {lab.run?.lastDelta ? (
            <pre aria-label="Semantic delta">
              {JSON.stringify(lab.run.lastDelta, null, 2)}
            </pre>
          ) : null}

          {lab.run?.lastObservation ? (
            <pre aria-label="Last observation">
              {JSON.stringify(lab.run.lastObservation, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}

      {lab.status ? <p role="status">{lab.status}</p> : null}

      <details>
        <summary>Command palette</summary>
        <ul>
          {lab.commands.map((command) => (
            <li key={command.name}>
              <code>
                {command.name}
                {command.params ? ` ${command.params}` : ''}
              </code>{' '}
              — {command.description}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
