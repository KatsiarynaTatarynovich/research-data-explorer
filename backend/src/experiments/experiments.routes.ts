import express from 'express';
import { sendError } from '../http/send-error.js';
import { isUuid } from '../utils/is-uuid.js';
import {
  createExperiment,
  findExperimentById,
  getExperiments,
  deleteExperimentById,
} from './experiments.store.js';

const router = express.Router();

router.delete('/:id', async (request, response, next) => {
  try {
    const { id } = request.params;

    if (!isUuid(id)) {
      sendError(response, 400, 'Invalid experiment ID');
      return;
    }

    // One query: the DELETE itself tells us whether the row existed.
    if (!(await deleteExperimentById(id))) {
      sendError(response, 404, 'Experiment not found');
      return;
    }

    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/', async (_request, response, next) => {
  try {
    response.json(await getExperiments());
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (request, response, next) => {
  try {
    const { id } = request.params;

    if (!isUuid(id)) {
      sendError(response, 400, 'Invalid experiment ID');
      return;
    }

    const experiment = await findExperimentById(id);
    if (!experiment) {
      sendError(response, 404, 'Experiment not found');
      return;
    }
    response.json(experiment);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (request, response, next) => {
  if (!request.is('application/json')) {
    sendError(response, 415, 'Content-Type must be application/json');
    return;
  }

  // Data from outside the program: `unknown` until proven otherwise.
  const body: unknown = request.body;

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    sendError(response, 400, 'Request body must be a JSON object');
    return;
  }

  if (!('name' in body) || !('description' in body)) {
    sendError(response, 400, 'Missing required fields: name, description');
    return;
  }

  if (typeof body.name !== 'string' || typeof body.description !== 'string') {
    sendError(response, 400, 'Fields name and description must be strings');
    return;
  }

  const name = body.name.trim();
  const description = body.description.trim();

  if (name === '' || description === '') {
    sendError(response, 400, 'Fields name and description cannot be empty');
    return;
  }

  try {
    const experiment = await createExperiment({ name, description });
    response.status(201).json(experiment);
  } catch (error) {
    next(error);
  }
});

export default router;
