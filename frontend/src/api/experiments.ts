// Client for the Express experiments API (backend/src/experiments).
// Requests use relative URLs; in development Vite proxies /api to Express.

export type Experiment = {
  id: string;
  name: string;
  description: string;
};

export type CreateExperimentInput = Omit<Experiment, 'id'>;

/** An error whose `message` is safe and useful to show to the user. */
export class ApiError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const EXPERIMENTS_URL = '/api/experiments';

const NETWORK_ERROR_MESSAGE =
  'Could not reach the server. Check your connection and that the API is running, then try again.';

const UNEXPECTED_RESPONSE_MESSAGE =
  'The server returned an unexpected response. Try again, and contact the maintainer if it keeps happening.';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isExperiment = (value: unknown): value is Experiment =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  typeof value.description === 'string';

/** Reads `{ error: { message } }`, the API's error format, if present. */
const getApiErrorMessage = (body: unknown): string | null => {
  if (isRecord(body) && isRecord(body.error)) {
    const { message } = body.error;
    if (typeof message === 'string' && message.trim() !== '') return message;
  }
  return null;
};

const fallbackMessageForStatus = (status: number): string => {
  if (status >= 500) {
    return `The server could not complete the request (HTTP ${status}). Make sure the API is running, then try again.`;
  }
  return `The request was rejected (HTTP ${status}). Check your input and try again.`;
};

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return undefined; // Empty or non-JSON body (e.g. a proxy error page).
  }
};

const request = async (url: string, init?: RequestInit): Promise<unknown> => {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { Accept: 'application/json', ...init?.headers },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError(NETWORK_ERROR_MESSAGE, null);
  }

  const body = await readJson(response);

  if (!response.ok) {
    throw new ApiError(
      getApiErrorMessage(body) ?? fallbackMessageForStatus(response.status),
      response.status,
    );
  }

  return body;
};

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
  const body = await request(EXPERIMENTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!isExperiment(body)) {
    throw new ApiError(UNEXPECTED_RESPONSE_MESSAGE, null);
  }
  return body;
};

/** Turns anything thrown by this module into a user-facing message. */
export const toUserMessage = (error: unknown): string =>
  error instanceof ApiError ? error.message : UNEXPECTED_RESPONSE_MESSAGE;
