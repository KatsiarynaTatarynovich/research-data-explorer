// Client for /api/experiments/:experimentId/samples (backend/src/samples).
import {
  ApiError,
  isRecord,
  postJson,
  request,
  UNEXPECTED_RESPONSE_MESSAGE,
} from './client';
import { EXPERIMENTS_URL } from './experiments';

export type Sample = {
  id: string;
  experiment_id: string;
  code: string;
};

const samplesUrl = (experimentId: string) =>
  `${EXPERIMENTS_URL}/${encodeURIComponent(experimentId)}/samples`;

const isSample = (value: unknown): value is Sample =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.experiment_id === 'string' &&
  typeof value.code === 'string';

/** GET → 200 Sample[] ordered by code; 400 malformed id; 404 no experiment. */
export const fetchSamples = async (
  experimentId: string,
  signal?: AbortSignal,
): Promise<Sample[]> => {
  const body = await request(samplesUrl(experimentId), { signal });
  if (!Array.isArray(body) || !body.every(isSample)) {
    throw new ApiError(UNEXPECTED_RESPONSE_MESSAGE, null);
  }
  return body;
};

/** POST { code } → 201 Sample; 400 invalid code; 404 no experiment; 409 duplicate code. */
export const createSample = async (
  experimentId: string,
  code: string,
): Promise<Sample> => {
  const body = await postJson(samplesUrl(experimentId), { code });
  if (!isSample(body)) {
    throw new ApiError(UNEXPECTED_RESPONSE_MESSAGE, null);
  }
  return body;
};

/** Same order as the API's ORDER BY code, so a new sample lands where a reload would put it. */
export const sortByCode = (samples: Sample[]): Sample[] =>
  [...samples].sort((a, b) => a.code.localeCompare(b.code));
