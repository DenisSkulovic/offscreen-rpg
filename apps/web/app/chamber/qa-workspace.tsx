'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  QaDisposition,
  QaJourneyCase,
  QaRun,
  QaRunSummary,
} from '@offscreen/contracts/qa';
import {
  qaQualityRubric,
  type QaRubricDimensionId,
} from '@offscreen/contracts/qa';
import {
  finalizeQaRun,
  openQaRun,
  readQaCases,
  readQaEvidence,
  readQaRun,
  readQaRuns,
  recordQaStage,
} from './transport';

const savedRunKey = 'offscreen.qa-run-id';

export function QaWorkspace() {
  const [cases, setCases] = useState<QaJourneyCase[]>([]);
  const [caseId, setCaseId] = useState('');
  const [variantId, setVariantId] = useState<string | null>(null);
  const [run, setRun] = useState<QaRun | null>(null);
  const [recentRuns, setRecentRuns] = useState<QaRunSummary[]>([]);
  const [status, setStatus] = useState('Loading QA catalogue…');
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState('passed');
  const [observation, setObservation] = useState('');
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const [ratings, setRatings] = useState<
    Partial<Record<QaRubricDimensionId, { score: string; evidence: string }>>
  >({});
  const [disposition, setDisposition] =
    useState<QaDisposition>('useful-evidence');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [catalogue, recent] = await Promise.all([
          readQaCases(),
          readQaRuns(),
        ]);
        if (!active) return;
        setCases(catalogue);
        setRecentRuns(recent);
        const first = catalogue.find(
          (candidate) => candidate.availability.state === 'available',
        );
        setCaseId(first?.id ?? catalogue[0]?.id ?? '');
        setVariantId(first?.variants[0]?.id ?? null);
        const savedRun = window.localStorage.getItem(savedRunKey);
        if (savedRun) {
          try {
            setRun(await readQaRun(savedRun));
            setStatus('Resumed the last open or finalized QA run.');
            return;
          } catch {
            window.localStorage.removeItem(savedRunKey);
          }
        }
        setStatus('Choose an available offline journey to begin.');
      } catch {
        if (active) {
          setStatus(
            'QA tools are unavailable. Launch this page through the local Chamber.',
          );
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const selected = cases.find((candidate) => candidate.id === caseId) ?? null;
  const selectedVariant = selected?.variants.find(
    (variant) => variant.id === variantId,
  );
  const currentStage = useMemo(() => {
    if (!run) return null;
    const result = run.stages.find(
      (candidate) => candidate.status === 'not-run',
    );
    return result
      ? (run.case.stages.find((candidate) => candidate.id === result.stageId) ??
          null)
      : null;
  }, [run]);

  function selectCase(nextId: string) {
    const next = cases.find((candidate) => candidate.id === nextId);
    setCaseId(nextId);
    setVariantId(next?.variants[0]?.id ?? null);
  }

  async function start() {
    if (!selected || selected.availability.state !== 'available') return;
    setPending(true);
    setStatus('Opening QA run…');
    try {
      const id = crypto.randomUUID();
      window.localStorage.setItem(savedRunKey, id);
      const opened = await openQaRun(id, {
        caseId: selected.id,
        caseVersion: selected.version,
        variantId,
        driver: 'manual-chamber',
        setup: { scenario: selected.initialScenario },
      });
      setRun(opened);
      setRecentRuns((current) => [
        {
          id: opened.id,
          caseId: opened.case.id,
          caseVersion: opened.case.version,
          caseName: opened.case.name,
          variantId: opened.variantId,
          state: opened.state,
          disposition: opened.disposition,
          startedAt: opened.startedAt,
          updatedAt: opened.updatedAt,
        },
        ...current.filter((candidate) => candidate.id !== opened.id),
      ]);
      setStatus(
        'Run opened. Follow the current stage and record what happened.',
      );
    } catch (error) {
      setStatus(`Could not open the run: ${message(error)}`);
    } finally {
      setPending(false);
    }
  }

  async function record() {
    if (!run || !currentStage) return;
    setPending(true);
    setStatus('Recording stage evidence…');
    try {
      const references = currentStage.evidence
        .map((requirement) => ({
          kind: requirement.kind,
          reference: evidence[requirement.kind]?.trim() ?? '',
        }))
        .filter((reference) => reference.reference.length > 0);
      const next = await recordQaStage(run.id, currentStage.id, {
        expectedRevision: run.revision,
        status: outcome as 'passed' | 'failed' | 'blocked' | 'skipped',
        observation,
        evidence: references,
        ratings: currentStage.rubricDimensions
          .map((dimension) => ({
            dimension,
            score: Number(ratings[dimension]?.score ?? '-1'),
            evidence: ratings[dimension]?.evidence.trim() ?? '',
          }))
          .filter((rating) => rating.score >= 0 && rating.evidence.length > 0),
      });
      setRun(next);
      setObservation('');
      setEvidence({});
      setRatings({});
      setStatus('Stage recorded. Captured results cannot be overwritten.');
    } catch (error) {
      setStatus(`Could not record the stage: ${message(error)}`);
    } finally {
      setPending(false);
    }
  }

  async function finish() {
    if (!run) return;
    setPending(true);
    setStatus('Finalizing evidence…');
    try {
      const finalized = await finalizeQaRun(run.id, {
        expectedRevision: run.revision,
        disposition,
        operatorNotes: notes,
      });
      setRun(finalized);
      setRecentRuns((current) =>
        current.map((candidate) =>
          candidate.id === finalized.id
            ? {
                ...candidate,
                state: finalized.state,
                disposition: finalized.disposition,
                updatedAt: finalized.updatedAt,
              }
            : candidate,
        ),
      );
      setStatus('Run finalized. Its captured facts are now immutable.');
    } catch (error) {
      setStatus(`Could not finalize the run: ${message(error)}`);
    } finally {
      setPending(false);
    }
  }

  async function downloadEvidence() {
    if (!run) return;
    setPending(true);
    try {
      const bundle = await readQaEvidence(run.id);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(bundle, null, 2)], {
          type: 'application/json',
        }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `offscreen-qa-${run.id}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus('Sanitized evidence bundle exported.');
    } catch (error) {
      setStatus(`Could not export evidence: ${message(error)}`);
    } finally {
      setPending(false);
    }
  }

  function newRun() {
    window.localStorage.removeItem(savedRunKey);
    setRun(null);
    setNotes('');
    setStatus(
      'Previous evidence remains saved. Choose a journey for a new run.',
    );
  }

  async function resume(runId: string) {
    setPending(true);
    setStatus('Loading saved QA run…');
    try {
      const saved = await readQaRun(runId);
      window.localStorage.setItem(savedRunKey, runId);
      setRun(saved);
      setStatus('Saved QA run loaded.');
    } catch (error) {
      setStatus(`Could not load the run: ${message(error)}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="qa-workspace" aria-labelledby="qa-heading">
      <p className="eyebrow">QA journeys</p>
      <h2 id="qa-heading">Evidence workspace</h2>
      {!run ? (
        <>
          <label htmlFor="qa-case">Journey</label>
          <select
            id="qa-case"
            value={caseId}
            onChange={(event) => selectCase(event.target.value)}
          >
            {cases.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name} · {candidate.costClass}
              </option>
            ))}
          </select>
          {selected ? (
            <div className="qa-case-summary">
              <p>{selected.purpose}</p>
              <p>
                <strong>Risk:</strong> {selected.risk}
              </p>
              {selected.availability.state === 'planned' ? (
                <p role="note">
                  <strong>Planned:</strong> {selected.availability.reason}
                </p>
              ) : null}
              {selected.variants.length > 0 ? (
                <>
                  <label htmlFor="qa-variant">Variant</label>
                  <select
                    id="qa-variant"
                    value={variantId ?? ''}
                    onChange={(event) => setVariantId(event.target.value)}
                  >
                    {selected.variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.name}
                      </option>
                    ))}
                  </select>
                  {selectedVariant?.availability.state === 'planned' ? (
                    <p role="note">
                      <strong>Variant planned:</strong>{' '}
                      {selectedVariant.availability.reason}
                    </p>
                  ) : null}
                </>
              ) : null}
              <details>
                <summary>Prerequisites and limits</summary>
                <ul>
                  {selected.prerequisites.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                  {selectedVariant?.prerequisites.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {selected.nonAssertions.map((item) => (
                  <p key={item} className="field-help">
                    Does not assert: {item}
                  </p>
                ))}
              </details>
              <button
                type="button"
                disabled={
                  pending ||
                  selected.availability.state !== 'available' ||
                  selectedVariant?.availability.state === 'planned'
                }
                onClick={() => void start()}
              >
                Open offline QA run
              </button>
            </div>
          ) : null}
          {recentRuns.length > 0 ? (
            <div className="qa-recent">
              <h3>Recent runs</h3>
              <ul>
                {recentRuns.map((recent) => (
                  <li key={recent.id}>
                    <span>
                      {recent.caseName} · {recent.state}
                      {recent.disposition ? ` · ${recent.disposition}` : ''}
                    </span>
                    <button
                      type="button"
                      className="quiet-button"
                      disabled={pending}
                      onClick={() => void resume(recent.id)}
                    >
                      Open
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p>
            <strong>{run.case.name}</strong> · revision {run.revision} ·{' '}
            {run.state}
          </p>
          <p className="field-help">
            {run.git.commit.slice(0, 12)} {run.git.dirty ? '(dirty tree)' : ''}{' '}
            · {run.environment.identity} · provider calls{' '}
            {run.accounting.providerCallCount}
          </p>
          <ol className="qa-stage-list">
            {run.case.stages.map((definition) => {
              const result = run.stages.find(
                (candidate) => candidate.stageId === definition.id,
              );
              return (
                <li key={definition.id}>
                  {definition.name} <span>{result?.status ?? 'not-run'}</span>
                </li>
              );
            })}
          </ol>
          {run.state === 'open' && currentStage ? (
            <fieldset disabled={pending}>
              <legend>Current stage: {currentStage.name}</legend>
              <p>
                <strong>Action:</strong> {currentStage.action}
              </p>
              <p>
                <strong>Observe:</strong> {currentStage.observableExpectation}
              </p>
              <p>
                <strong>Authoritative expectation:</strong>{' '}
                {currentStage.authoritativeExpectation}
              </p>
              <label htmlFor="qa-outcome">Outcome</label>
              <select
                id="qa-outcome"
                value={outcome}
                onChange={(event) => setOutcome(event.target.value)}
              >
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="blocked">Blocked</option>
                <option value="skipped">Skipped</option>
              </select>
              <label htmlFor="qa-observation">Observation</label>
              <textarea
                id="qa-observation"
                rows={4}
                value={observation}
                onChange={(event) => setObservation(event.target.value)}
                placeholder="What actually happened? Name the missing prerequisite when blocked."
              />
              {currentStage.evidence.map((requirement) => (
                <div key={requirement.kind}>
                  <label htmlFor={`qa-evidence-${requirement.kind}`}>
                    Evidence: {requirement.kind}
                  </label>
                  <input
                    id={`qa-evidence-${requirement.kind}`}
                    value={evidence[requirement.kind] ?? ''}
                    onChange={(event) =>
                      setEvidence((current) => ({
                        ...current,
                        [requirement.kind]: event.target.value,
                      }))
                    }
                    placeholder={requirement.description}
                  />
                </div>
              ))}
              {currentStage.rubricDimensions.map((dimensionId) => {
                const dimension = qaQualityRubric.find(
                  (candidate) => candidate.id === dimensionId,
                );
                if (!dimension) return null;
                return (
                  <div key={dimension.id} className="qa-rating">
                    <label htmlFor={`qa-rating-${dimension.id}`}>
                      {dimension.name}
                    </label>
                    <select
                      id={`qa-rating-${dimension.id}`}
                      value={ratings[dimension.id]?.score ?? ''}
                      onChange={(event) =>
                        setRatings((current) => ({
                          ...current,
                          [dimension.id]: {
                            score: event.target.value,
                            evidence: current[dimension.id]?.evidence ?? '',
                          },
                        }))
                      }
                    >
                      <option value="">Choose an anchored score</option>
                      {dimension.anchors.map((anchor, score) => (
                        <option key={anchor} value={score}>
                          {score} — {anchor}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label={`${dimension.name} evidence`}
                      value={ratings[dimension.id]?.evidence ?? ''}
                      onChange={(event) =>
                        setRatings((current) => ({
                          ...current,
                          [dimension.id]: {
                            score: current[dimension.id]?.score ?? '',
                            evidence: event.target.value,
                          },
                        }))
                      }
                      placeholder="Specific passage or behavior supporting this score"
                    />
                  </div>
                );
              })}
              <button
                type="button"
                disabled={pending || observation.trim().length === 0}
                onClick={() => void record()}
              >
                Record stage
              </button>
            </fieldset>
          ) : null}
          {run.state === 'open' ? (
            <fieldset disabled={pending} className="qa-finalize">
              <legend>Finalize this run</legend>
              <label htmlFor="qa-disposition">Disposition</label>
              <select
                id="qa-disposition"
                value={disposition}
                onChange={(event) =>
                  setDisposition(event.target.value as QaDisposition)
                }
              >
                <option value="useful-evidence">Useful evidence</option>
                <option value="inconclusive">Inconclusive</option>
                <option value="product-defect">Product defect</option>
                <option value="infrastructure-defect">
                  Infrastructure defect
                </option>
                <option value="design-question">Design question</option>
              </select>
              <label htmlFor="qa-notes">Operator notes</label>
              <textarea
                id="qa-notes"
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
              <button
                type="button"
                disabled={pending || notes.trim().length === 0}
                onClick={() => void finish()}
              >
                Finalize immutable run
              </button>
            </fieldset>
          ) : (
            <div className="qa-actions">
              <button
                type="button"
                disabled={pending}
                onClick={() => void downloadEvidence()}
              >
                Export evidence JSON
              </button>
              <button type="button" disabled={pending} onClick={newRun}>
                Start a new run
              </button>
            </div>
          )}
        </>
      )}
      <p role="status" className="status">
        {status}
      </p>
    </section>
  );
}

function message(error: unknown) {
  return error instanceof Error ? error.message : 'qa_unavailable';
}
