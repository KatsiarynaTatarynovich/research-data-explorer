import { useEffect, useRef, useState } from 'react';
import {
  ApiError,
  deleteExperiment,
  toUserMessage,
  type Experiment,
} from '../api/experiments';

type Mode = 'idle' | 'confirming' | 'deleting';

type ExperimentItemProps = {
  experiment: Experiment;
  /** Called once the experiment no longer exists on the server. */
  onDeleted: (experiment: Experiment, alreadyGone: boolean) => void;
};

export function ExperimentItem({ experiment, onDeleted }: ExperimentItemProps) {
  const [mode, setMode] = useState<Mode>('idle');
  const [error, setError] = useState<string | null>(null);

  // Blocks a second DELETE if the confirm button is clicked twice quickly.
  const deletingRef = useRef(false);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previousMode = useRef<Mode>(mode);

  // Keep keyboard focus in a sensible place when the buttons swap.
  useEffect(() => {
    if (mode === 'confirming' && previousMode.current === 'idle') {
      cancelButtonRef.current?.focus();
    }
    if (mode === 'idle' && previousMode.current !== 'idle') {
      deleteButtonRef.current?.focus();
    }
    previousMode.current = mode;
  }, [mode]);

  const confirmDelete = async () => {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setMode('deleting');
    setError(null);

    try {
      await deleteExperiment(experiment.id);
      onDeleted(experiment, false);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) {
        // Someone else deleted it first; the outcome the user wanted.
        onDeleted(experiment, true);
        return;
      }
      setError(toUserMessage(caught));
      setMode('idle');
    } finally {
      deletingRef.current = false;
    }
  };

  const confirmTextId = `delete-confirm-${experiment.id}`;

  return (
    <li className="experiment" aria-busy={mode === 'deleting'}>
      <div className="experiment-row">
        <div className="experiment-body">
          <h3>{experiment.name}</h3>
          {experiment.description.trim() !== '' && (
            <p>{experiment.description}</p>
          )}
        </div>

        {mode === 'idle' && (
          <div className="experiment-actions">
            <button
              ref={deleteButtonRef}
              type="button"
              className="button secondary small"
              aria-label={`Delete ${experiment.name}`}
              onClick={() => {
                setError(null);
                setMode('confirming');
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {mode !== 'idle' && (
        <div
          className="confirm"
          role="group"
          aria-labelledby={confirmTextId}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && mode === 'confirming') {
              setMode('idle');
            }
          }}
        >
          <p id={confirmTextId}>
            Delete “{experiment.name}”? This can’t be undone.
          </p>
          <div className="confirm-actions">
            <button
              type="button"
              className="button danger small"
              disabled={mode === 'deleting'}
              onClick={confirmDelete}
            >
              {mode === 'deleting' ? 'Deleting…' : 'Delete'}
            </button>
            <button
              ref={cancelButtonRef}
              type="button"
              className="button secondary small"
              disabled={mode === 'deleting'}
              onClick={() => setMode('idle')}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="item-error" role="alert">
          <strong>Could not delete “{experiment.name}”.</strong> {error}
        </p>
      )}
    </li>
  );
}
