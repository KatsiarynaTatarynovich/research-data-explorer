import { useEffect, useRef, useState, type FormEvent } from 'react';
import { toUserMessage } from '../api/client';
import {
  createSample,
  fetchSamples,
  sortByCode,
  type Sample,
} from '../api/samples';
import { ImportCsvForm } from './ImportCsvForm';
import { SampleItem } from './SampleItem';

type SamplesState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; samples: Sample[] };

type SamplesPanelProps = {
  id: string;
  experimentId: string;
  experimentName: string;
};

export function SamplesPanel({
  id,
  experimentId,
  experimentName,
}: SamplesPanelProps) {
  const [state, setState] = useState<SamplesState>({ status: 'loading' });
  // Bumping this key re-runs the load effect (used by Retry).
  const [loadKey, setLoadKey] = useState(0);

  const [code, setCode] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchSamples(experimentId, controller.signal)
      .then((samples) => setState({ status: 'success', samples }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', message: toUserMessage(error) });
      });

    return () => controller.abort();
  }, [experimentId, loadKey]);

  const reload = () => {
    setState({ status: 'loading' });
    setLoadKey((key) => key + 1);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;

    setNotice(null);
    setSubmitError(null);

    // Mirrors the API: code is required and must not be blank after trimming.
    const trimmed = code.trim();
    if (trimmed === '') {
      setFieldError('Enter a sample code.');
      codeRef.current?.focus();
      return;
    }
    setFieldError(null);

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const sample = await createSample(experimentId, trimmed);
      if (state.status === 'success') {
        setState((previous) =>
          previous.status === 'success'
            ? {
                ...previous,
                samples: sortByCode([...previous.samples, sample]),
              }
            : previous,
        );
      } else {
        reload();
      }
      setCode('');
      setNotice(`Added sample ${sample.code}.`);
      codeRef.current?.focus();
    } catch (error) {
      // Keep the input so the user can fix it (e.g. a duplicate code).
      setSubmitError(toUserMessage(error));
      codeRef.current?.focus();
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const inputId = `${id}-code`;
  const errorId = `${id}-code-error`;
  const submitErrorId = `${id}-submit-error`;
  const describedBy =
    [fieldError && errorId, submitError && submitErrorId]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <section
      id={id}
      className="samples"
      aria-label={`Samples for ${experimentName}`}
    >
      {state.status === 'loading' && (
        <p className="muted small-text" role="status">
          Loading samples…
        </p>
      )}

      {state.status === 'error' && (
        <div className="alert compact" role="alert">
          <p>
            <strong>Could not load samples.</strong> {state.message}
          </p>
          <button
            type="button"
            className="button secondary small"
            onClick={reload}
          >
            Retry
          </button>
        </div>
      )}

      {state.status === 'success' && state.samples.length === 0 && (
        <p className="muted small-text">No samples yet.</p>
      )}

      {state.status === 'success' && state.samples.length > 0 && (
        <ul className="sample-list">
          {state.samples.map((sample) => (
            <SampleItem
              key={sample.id}
              experimentId={experimentId}
              sample={sample}
            />
          ))}
        </ul>
      )}

      <form className="sample-form" onSubmit={handleSubmit} noValidate>
        <div className="sample-form-row">
          <div className="field">
            <label htmlFor={inputId}>Sample code</label>
            <input
              ref={codeRef}
              id={inputId}
              type="text"
              autoComplete="off"
              required
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                if (fieldError) setFieldError(null);
                if (submitError) setSubmitError(null);
              }}
              aria-invalid={fieldError || submitError ? true : undefined}
              aria-describedby={describedBy}
            />
          </div>
          <button
            type="submit"
            className="button small"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adding…' : 'Add sample'}
          </button>
        </div>

        {fieldError && (
          <p id={errorId} className="field-error">
            {fieldError}
          </p>
        )}
        {submitError && (
          <p id={submitErrorId} className="field-error" role="alert">
            <strong>Could not add the sample.</strong> {submitError}
          </p>
        )}
        <p className="success small-text" role="status">
          {notice}
        </p>
      </form>

      {/* An import can add samples and measurements, so reload the list.
          This also closes open measurement tables, so none shows stale rows. */}
      <ImportCsvForm
        id={`${id}-import`}
        experimentId={experimentId}
        experimentName={experimentName}
        onImported={reload}
      />
    </section>
  );
}
