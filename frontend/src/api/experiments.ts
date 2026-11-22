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

export const fetchExperiments = async (
  signal?: AbortSignal,
): Promise<Experiment[]> => {
  const body = await request(EXPERIMENTS_URL, { signal });
  if (!Array.isArray(body) || !body.every(isExperiment)) {
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
