import express from 'express';
import {
  isPgError,
  PG_FOREIGN_KEY_VIOLATION,
  PG_INVALID_TEXT_REPRESENTATION,
  PG_UNIQUE_VIOLATION,
} from './db-errors.js';
import experimentsRouter from './experiments/experiments.routes.js';
import { sendError } from './http/send-error.js';
import samplesRouter from './samples/samples.routes.js';

const app = express();
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use('/api/experiments', experimentsRouter);
app.use('/api/experiments/:experimentId/samples', samplesRouter);

// Catch-all: no route above matched.
app.use((_request, response) => {
  sendError(response, 404, 'Not found');
});

// Error handler: Express recognises it by its FOUR parameters.
// Anything can be thrown, so `error` is `unknown`, not `Error`.
// Errors from middleware such as express.json() carry an HTTP `status`
// (e.g. 400 for malformed JSON, 413 for a body that is too large).
app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    const status = getHttpStatus(error);

    if (status >= 500) {
      console.error(error);
      sendError(response, status, 'Internal server error');
      return;
    }

    sendError(response, status, getClientMessage(error, status));
  },
);

// Safety net for database errors a route didn't handle itself: they are
// caused by the request's data, not a server fault, so they aren't 500s.
const getPgStatus = (error: unknown): number | null => {
  if (isPgError(error, PG_INVALID_TEXT_REPRESENTATION)) return 400;
  if (isPgError(error, PG_UNIQUE_VIOLATION)) return 409;
  if (isPgError(error, PG_FOREIGN_KEY_VIOLATION)) return 409;
  return null;
};

const getHttpStatus = (error: unknown): number => {
  const pgStatus = getPgStatus(error);
  if (pgStatus !== null) return pgStatus;

  if (typeof error === 'object' && error !== null && 'status' in error) {
    const { status } = error;
    if (typeof status === 'number' && status >= 400 && status <= 599) {
      return status;
    }
  }
  return 500;
};

const getClientMessage = (error: unknown, status: number): string => {
  if (typeof error === 'object' && error !== null && 'type' in error) {
    if (error.type === 'entity.parse.failed') return 'Malformed JSON body';
    if (error.type === 'entity.too.large') return 'Request body too large';
  }
  if (status === 409) return 'The request conflicts with existing data';
  return status === 404 ? 'Not found' : 'Bad request';
};

export default app;
