import { useRef, useState } from 'react';
import type { Experiment } from '../api/experiments';
import { ExperimentItem } from './ExperimentItem';

export type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; experiments: Experiment[] };

type ExperimentListProps = {
  state: ListState;
  onRetry: () => void;
  onDeleted: (id: string) => void;
};

export function ExperimentList({
  state,
  onRetry,
  onDeleted,
}: ExperimentListProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const handleDeleted = (experiment: Experiment, alreadyGone: boolean) => {
    onDeleted(experiment.id);
    setNotice(
      alreadyGone
        ? `“${experiment.name}” had already been deleted.`
        : `Deleted “${experiment.name}”.`,
    );
    // The focused button disappears with the row; keep focus in the list.
    headingRef.current?.focus();
  };

  return (
    <section className="panel" aria-labelledby="experiments-heading">
      <div className="panel-header">
        <h2 id="experiments-heading" ref={headingRef} tabIndex={-1}>
          Experiments
        </h2>
        {state.status === 'success' && state.experiments.length > 0 && (
          <span className="count">{state.experiments.length}</span>
        )}
      </div>

      {state.status === 'loading' && (
        <p className="muted" role="status">
          Loading experiments…
        </p>
      )}

      {state.status === 'error' && (
        <div className="alert" role="alert">
          <p>
            <strong>Could not load experiments.</strong> {state.message}
          </p>
          <button type="button" className="button secondary" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      {state.status === 'success' && state.experiments.length === 0 && (
        <p className="empty">
          No experiments yet. Create the first one with the form.
        </p>
      )}

      {state.status === 'success' && state.experiments.length > 0 && (
        <ul className="experiment-list">
          {state.experiments.map((experiment) => (
            <ExperimentItem
              key={experiment.id}
              experiment={experiment}
              onDeleted={handleDeleted}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
