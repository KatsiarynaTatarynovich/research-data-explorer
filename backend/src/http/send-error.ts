import type { Response } from 'express';

export type ErrorBody = {
  error: { code: number; message: string };
};

/** Sends a JSON error response; the status code is written in exactly one place. */
export const sendError = (
  response: Response,
  status: number,
  message: string,
): void => {
  const body: ErrorBody = { error: { code: status, message } };
  response.status(status).json(body);
};
