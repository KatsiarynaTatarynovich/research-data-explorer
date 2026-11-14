import express from 'express';
import experimentsRouter from './experiments/experiments.routes.js';
import { sendError } from './http/send-error.js';

const app = express();
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use('/api/experiments', experimentsRouter);

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

const getHttpStatus = (error: unknown): number => {
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
  return status === 404 ? 'Not found' : 'Bad request';
};

export default app;
