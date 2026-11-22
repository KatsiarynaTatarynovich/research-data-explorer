import { useCallback, useEffect, useState } from 'react';
import {
  fetchExperiments,
  MAX_SEARCH_LENGTH,
  PAGE_SIZE,
  toUserMessage,
  type ExperimentQuery,
} from './api/experiments';
import { ExperimentList, type ListResult } from './components/ExperimentList';
import { NewExperimentForm } from './components/NewExperimentForm';
import './App.css';

const SEARCH_DEBOUNCE_MS = 300;

/** Reads ?search=&page= so a reload or a shared link keeps the same view. */
const readQueryFromUrl = (): ExperimentQuery => {
  const params = new URLSearchParams(window.location.search);
  const search = (params.get('search') ?? '')
    .trim()
    .slice(0, MAX_SEARCH_LENGTH);
  const rawPage = params.get('page') ?? '';
  const page =
    /^\d+$/.test(rawPage) && Number(rawPage) >= 1 ? Number(rawPage) : 1;
  return { search, page, pageSize: PAGE_SIZE };
};

const writeQueryToUrl = ({ search, page }: ExperimentQuery) => {
  const params = new URLSearchParams();
  if (search !== '') params.set('search', search);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
  if (url !== `${window.location.pathname}${window.location.search}`) {
    window.history.replaceState(null, '', url);
  }
};

function App() {
  const [query, setQuery] = useState<ExperimentQuery>(readQueryFromUrl);
  // What's in the search box; copied into `query` after a short pause.
  const [searchInput, setSearchInput] = useState(query.search);
  // Bumping this re-fetches the current page (Retry, after create/delete).
  const [loadKey, setLoadKey] = useState(0);
  const [result, setResult] = useState<ListResult | null>(null);

  // The request that should be showing. If `result` is for a different key,
  // a newer request is in flight, so we're loading (and keep the old rows on
  // screen meanwhile instead of flashing an empty list).
  const requestKey = `${query.search}\n${query.page}\n${query.pageSize}\n${loadKey}`;
  const isLoading = result?.key !== requestKey;

  useEffect(() => {
    const controller = new AbortController();

    fetchExperiments(query, controller.signal)
      .then((data) => {
        // Past the last page (e.g. the last item on it was deleted, or an
        // old link): jump to the last page that exists.
        const lastPage = Math.max(data.totalPages, 1);
        if (data.page > lastPage) {
          setQuery((current) => ({ ...current, page: lastPage }));
          return;
        }
        setResult({ key: requestKey, ok: true, data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key: requestKey,
          ok: false,
          message: toUserMessage(error),
        });
      });

    // A newer query (e.g. the user typed again) cancels this request, so an
    // old, slow response can never overwrite a newer one.
    return () => controller.abort();
  }, [query, requestKey]);

  useEffect(() => writeQueryToUrl(query), [query]);

  // Debounce: search once typing pauses, starting again from page 1.
  useEffect(() => {
    const search = searchInput.trim();
    if (search === query.search) return;
    const timer = window.setTimeout(() => {
      setQuery((current) => ({ ...current, search, page: 1 }));
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput, query.search]);

  const reload = useCallback(() => setLoadKey((key) => key + 1), []);

  const goToPage = useCallback((page: number) => {
    setQuery((current) => ({ ...current, page }));
  }, []);

  const clearSearch = useCallback(() => {
    setSearchInput('');
    setQuery((current) => ({ ...current, search: '', page: 1 }));
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Research Data Explorer</h1>
        <p className="muted">Store and review experiment results.</p>
      </header>

      <main className="layout">
        <ExperimentList
          result={result}
          isLoading={isLoading}
          activeSearch={query.search}
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          onClearSearch={clearSearch}
          onPageChange={goToPage}
          onRetry={reload}
          onDeleted={reload}
        />
        {/* The new experiment's place depends on its name, the search and
            the page, so re-fetch the current page instead of guessing. */}
        <NewExperimentForm onCreated={reload} />
      </main>
    </div>
  );
}

export default App;
