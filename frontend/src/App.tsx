import { useCallback, useEffect, useState } from 'react';
import {
  fetchExperiments,
  toUserMessage,
  type Experiment,
} from './api/experiments';
import { ExperimentList, type ListState } from './components/ExperimentList';
import { NewExperimentForm } from './components/NewExperimentForm';
import './App.css';

function App() {
  const [listState, setListState] = useState<ListState>({ status: 'loading' });
  // Bumping this key re-runs the load effect (used by Retry).
  const [loadKey, setLoadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetchExperiments(controller.signal)
      .then((experiments) => setListState({ status: 'success', experiments }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setListState({ status: 'error', message: toUserMessage(error) });
      });

    return () => controller.abort();
  }, [loadKey]);

  const reload = useCallback(() => {
    setListState({ status: 'loading' });
    setLoadKey((key) => key + 1);
  }, []);

  const listLoaded = listState.status === 'success';

  const handleCreated = useCallback(
    (experiment: Experiment) => {
      if (!listLoaded) {
        // The list isn't loaded (still loading or failed): fetch it so the
        // new experiment shows up together with the existing ones.
        reload();
        return;
      }
      setListState((previous) =>
        previous.status === 'success'
          ? { ...previous, experiments: [...previous.experiments, experiment] }
          : previous,
      );
    },
    [listLoaded, reload],
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1>Research Data Explorer</h1>
        <p className="muted">Store and review experiment results.</p>
      </header>

      <main className="layout">
        <ExperimentList state={listState} onRetry={reload} />
        <NewExperimentForm onCreated={handleCreated} />
      </main>
    </div>
  );
}

export default App;
