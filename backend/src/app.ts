import express from 'express';
import experimentsRouter from './experiments/experiments.routes.js';

const app = express();
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use('/api/experiments', experimentsRouter);

app.use((_request, response) => {
  response.status(404).send({ error: { code: 404, message: 'Not found' } });
});

app.use((_request, response, _next) => {
  response.status(400).send({ error: { code: 400, message: 'Bad request' } });
});

app.use(
  (
    error: Error,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(error);
    response
      .status(500)
      .send({ error: { code: 500, message: 'Internal server error' } });
  },
);

export default app;
