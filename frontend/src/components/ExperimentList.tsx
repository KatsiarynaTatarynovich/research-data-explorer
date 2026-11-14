import type { Experiment } from '../api/experiments';

export type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; experiments: Experiment[] };

type ExperimentListProps = {
  state: ListState;
  onRetry: () => void;
};

export function ExperimentList({ state, onRetry }: ExperimentListProps) {
  return (
    <section className="panel" aria-labelledby="experiments-heading">
      <div className="panel-header">
        <h2 id="experiments-heading">Experiments</h2>
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

      {state.status === 'success' && state.experiments.length === 0 && (
        <p className="empty">
          No experiments yet. Create the first one with the form.
        </p>
      )}

      {state.status === 'success' && state.experiments.length > 0 && (
        <ul className="experiment-list">
          {state.experiments.map((experiment) => (
            <li key={experiment.id} className="experiment">
              <h3>{experiment.name}</h3>
              {experiment.description.trim() !== '' && (
                <p>{experiment.description}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
