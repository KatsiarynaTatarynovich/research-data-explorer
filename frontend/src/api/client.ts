// Shared HTTP helpers for the Express API.
// Requests use relative URLs; in development Vite proxies /api to Express.

/** An error whose `message` is safe and useful to show to the user. */
export class ApiError extends Error {
  readonly status: number | null;
  /** `error.details` from the response, if any (e.g. an import's invalid rows). Unchecked. */
  readonly details: unknown;

  constructor(message: string, status: number | null, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const NETWORK_ERROR_MESSAGE =
  'Could not reach the server. Check your connection and that the API is running, then try again.';

export const UNEXPECTED_RESPONSE_MESSAGE =
  'The server returned an unexpected response. Try again, and contact the maintainer if it keeps happening.';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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
    return undefined; // Empty or non-JSON body (e.g. a 204 or a proxy error page).
  }
};

/** Performs a request; resolves with the parsed JSON body (or undefined). */
export const request = async (
  url: string,
  init?: RequestInit,
): Promise<unknown> => {
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
      isRecord(body) && isRecord(body.error) ? body.error.details : undefined,
    );
  }

  return body;
};

/** Sends `data` as a JSON POST body. */
export const postJson = (url: string, data: unknown): Promise<unknown> =>
  request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

/** Turns anything thrown by the API modules into a user-facing message. */
export const toUserMessage = (error: unknown): string =>
  error instanceof ApiError ? error.message : UNEXPECTED_RESPONSE_MESSAGE;
