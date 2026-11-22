// Client for /api/experiments (backend/src/experiments).
import {
  ApiError,
  isRecord,
  postJson,
  request,
  UNEXPECTED_RESPONSE_MESSAGE,
} from './client';

export { ApiError, toUserMessage } from './client';

export type Experiment = {
  id: string;
  name: string;
  description: string;
};

export type CreateExperimentInput = Omit<Experiment, 'id'>;

export const EXPERIMENTS_URL = '/api/experiments';

const isExperiment = (value: unknown): value is Experiment =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  typeof value.description === 'string';

/** Matches the API's limits (backend/src/http/pagination.ts). */
export const PAGE_SIZE = 10;
export const MAX_SEARCH_LENGTH = 100;

export type ExperimentQuery = {
  /** Case-insensitive "name contains"; empty means all. */
  search: string;
  /** 1-based. */
  page: number;
  pageSize: number;
};

export type ExperimentPage = {
  items: Experiment[];
  total: number;
  page: number;
  pageSize: number;
  /** 0 when there are no results. */
  totalPages: number;
};

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

const isExperimentPage = (value: unknown): value is ExperimentPage =>
  isRecord(value) &&
  Array.isArray(value.items) &&
  value.items.every(isExperiment) &&
  isCount(value.total) &&
  isCount(value.page) &&
  isCount(value.pageSize) &&
  isCount(value.totalPages);

/** GET /api/experiments?search=&page=&pageSize= → one page, ordered by name. */
export const fetchExperiments = async (
  { search, page, pageSize }: ExperimentQuery,
  signal?: AbortSignal,
): Promise<ExperimentPage> => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (search !== '') params.set('search', search);

  const body = await request(`${EXPERIMENTS_URL}?${params}`, { signal });
  if (!isExperimentPage(body)) {
    throw new ApiError(UNEXPECTED_RESPONSE_MESSAGE, null);
  }
  return body;
};

export const createExperiment = async (
  input: CreateExperimentInput,
): Promise<Experiment> => {
  const body = await postJson(EXPERIMENTS_URL, input);
  if (!isExperiment(body)) {
    throw new ApiError(UNEXPECTED_RESPONSE_MESSAGE, null);
  }
  return body;
};

/**
 * DELETE /api/experiments/:id → 204 with no body. The server also deletes
 * the experiment's samples (ON DELETE CASCADE).
 * Errors: 400 (malformed id), 404 (no such experiment), 500. A 404 is thrown
 * as an ApiError with status 404 so the caller can treat it as "already gone".
 */
export const deleteExperiment = async (id: string): Promise<void> => {
  await request(`${EXPERIMENTS_URL}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
};
