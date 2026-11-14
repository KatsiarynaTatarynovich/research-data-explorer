import express from 'express';
import {
  listExperiments,
  createExperiment,
  findExperimentById,
} from './experiments.store.js';
const router = express.Router();

router.get('/', (_request, response) => {
  response.send(listExperiments());
});

router.get('/:id', (request, response) => {
  const experiment = findExperimentById(request.params.id);
  if (!experiment) {
    response
      .status(404)
      .send({ error: { code: 404, message: 'Experiment not found' } });
    return;
  }
  response.send(experiment);
});

router.post('/', (request, response) => {
  if (!request.is('application/json')) {
    response
      .status(400)
      .send({ error: { code: 400, message: 'Invalid content type' } });
    return;
  }
  const body: unknown = request.body;

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    response
      .status(400)
      .send({ error: { code: 400, message: 'Invalid request body' } });
    return;
  }

  if (!('name' in body) || !('description' in body)) {
    response
      .status(400)
      .send({ error: { code: 400, message: 'Missing required fields' } });
    return;
  }

  if (
    !(typeof body.name === 'string') ||
    !(typeof body.description === 'string')
  ) {
    response
      .status(400)
      .send({ error: { code: 400, message: 'Invalid field types' } });
    return;
  }

  if (body.name.trim() === '' || body.description.trim() === '') {
    response
      .status(400)
      .send({ error: { code: 400, message: 'Fields cannot be empty' } });
    return;
  }

  response.status(201).send(
    createExperiment({
      name: body.name,
      description: body.description,
    }),
  );
});

export default router;
