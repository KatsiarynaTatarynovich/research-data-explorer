import { useRef, useState } from 'react';
import {
  MAX_SEARCH_LENGTH,
  type Experiment,
  type ExperimentPage,
} from '../api/experiments';
import { ExperimentItem } from './ExperimentItem';

/** The latest finished request; `key` identifies which query it answered. */
export type ListResult =
  | { key: string; ok: true; data: ExperimentPage }
  | { key: string; ok: false; message: string };

type ExperimentListProps = {
  result: ListResult | null;
  /** A newer request is in flight (result may be from the previous one). */
  isLoading: boolean;
  /** The search the API is (or will be) filtering by. */
  activeSearch: string;
  /** What's typed in the box right now (applied after a short pause). */
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onClearSearch: () => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onDeleted: () => void;
};

const summary = (data: ExperimentPage, search: string): string => {
  if (data.total === 0) return '';
  const first = (data.page - 1) * data.pageSize + 1;
  const last = first + data.items.length - 1;
  const noun = data.total === 1 ? 'experiment' : 'experiments';
  const range = data.totalPages > 1 ? `${first}–${last} of ` : '';
  const matching = search !== '' ? ` matching “${search}”` : '';
  return `Showing ${range}${data.total} ${noun}${matching}`;
};

export function ExperimentList({
  result,
  isLoading,
  activeSearch,
  searchInput,
  onSearchInputChange,
  onClearSearch,
  onPageChange,
  onRetry,
  onDeleted,
}: ExperimentListProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const data = result?.ok ? result.data : null;

  const handleDeleted = (experiment: Experiment, alreadyGone: boolean) => {
    onDeleted();
    setNotice(
      alreadyGone
        ? `“${experiment.name}” had already been deleted.`
        : `Deleted “${experiment.name}”.`,
    );
    // The focused button disappears with the row; keep focus in the list.
    headingRef.current?.focus();
  };

  const changePage = (page: number) => {
    setNotice(null);
    onPageChange(page);
    // Bring the top of the list into view for the new page.
    headingRef.current?.scrollIntoView({ block: 'nearest' });
  };

  const canGoBack = data !== null && data.page > 1;
  const canGoForward = data !== null && data.page < data.totalPages;

  return (
    <section className="panel" aria-labelledby="experiments-heading">
      <div className="panel-header">
        <h2 id="experiments-heading" ref={headingRef} tabIndex={-1}>
          Experiments
        </h2>
        {data && data.total > 0 && <span className="count">{data.total}</span>}
      </div>

      <div className="field search-field" role="search">
        <label htmlFor="experiment-search">Search by name</label>
        <input
          id="experiment-search"
          type="search"
          autoComplete="off"
          maxLength={MAX_SEARCH_LENGTH}
          placeholder="e.g. soil"
          value={searchInput}
          onChange={(event) => onSearchInputChange(event.target.value)}
          aria-describedby="experiment-search-status"
        />
      </div>

      {/* One polite live region for result counts and progress, so screen
          readers hear "Showing 1–10 of 21 experiments" after each change. */}
      <p
        id="experiment-search-status"
        className="muted small-text"
        role="status"
      >
        {isLoading
          ? data
            ? 'Updating…'
            : 'Loading experiments…'
          : data
            ? summary(data, activeSearch)
            : ''}
      </p>

      <p className="notice" role="status">
        {notice}
      </p>

      {result && !result.ok && !isLoading && (
        <div className="alert" role="alert">
          <p>
            <strong>Could not load experiments.</strong> {result.message}
          </p>
          <button type="button" className="button secondary" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}

      {data && data.total === 0 && !isLoading && activeSearch === '' && (
        <p className="empty">
          No experiments yet. Create the first one with the form.
        </p>
      )}

      {data && data.total === 0 && !isLoading && activeSearch !== '' && (
        <div className="empty">
          <p>No experiments match “{activeSearch}”.</p>
          <button
            type="button"
            className="button secondary small"
            onClick={onClearSearch}
          >
            Clear search
          </button>
        </div>
      )}

      {data && data.items.length > 0 && (
        <ul
          className={`experiment-list${isLoading ? ' is-updating' : ''}`}
          aria-busy={isLoading}
        >
          {data.items.map((experiment) => (
            <ExperimentItem
              key={experiment.id}
              experiment={experiment}
              onDeleted={handleDeleted}
            />
          ))}
        </ul>
      )}

      {data && data.totalPages > 1 && (
        <nav className="pagination" aria-label="Experiment pages">
          {/* aria-disabled instead of disabled: the button keeps focus at
              the first/last page instead of dropping it to the page body. */}
          <button
            type="button"
            className="button secondary small"
            aria-disabled={!canGoBack}
            onClick={() => canGoBack && changePage(data.page - 1)}
          >
            Previous
          </button>
          <span className="small-text">
            Page {data.page} of {data.totalPages}
          </span>
          <button
            type="button"
            className="button secondary small"
            aria-disabled={!canGoForward}
            onClick={() => canGoForward && changePage(data.page + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}
