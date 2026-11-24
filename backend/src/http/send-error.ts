import type { Response } from 'express';

export type ErrorBody = {
  /** `details`: optional per-item problems, e.g. the invalid rows of an import. */
  error: { code: number; message: string; details?: unknown[] };
};

/** Sends a JSON error response; the status code is written in exactly one place. */
export const sendError = (
  response: Response,
  status: number,
  message: string,
  details?: unknown[],
): void => {
  const body: ErrorBody = {
    error: details?.length
      ? { code: status, message, details }
      : { code: status, message },
  };
  response.status(status).json(body);
};
