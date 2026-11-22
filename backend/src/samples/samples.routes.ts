import express from 'express';
import {
  isPgError,
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
} from '../db-errors.js';
import { ensureExperimentExists } from '../http/guards.js';
import { sendError } from '../http/send-error.js';
import { createSample, getSamplesByExperimentId } from './samples.store.js';

// Mounted at /api/experiments/:experimentId/samples (see app.ts).
// mergeParams lets this router read :experimentId from the parent path.
const router = express.Router({ mergeParams: true });

type ExperimentParams = { experimentId: string };

router.get<'/', ExperimentParams>('/', async (request, response, next) => {
  try {
    const { experimentId } = request.params;
    if (!(await ensureExperimentExists(experimentId, response))) return;

    response.json(await getSamplesByExperimentId(experimentId));
  } catch (error) {
    next(error);
  }
});

router.post<'/', ExperimentParams>('/', async (request, response, next) => {
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

  if (!('code' in body)) {
    sendError(response, 400, 'Missing required field: code');
    return;
  }

  if (typeof body.code !== 'string') {
    sendError(response, 400, 'Field code must be a string');
    return;
  }

  const code = body.code.trim();

  if (code === '') {
    sendError(response, 400, 'Field code cannot be empty');
    return;
  }

  const { experimentId } = request.params;

  try {
    if (!(await ensureExperimentExists(experimentId, response))) return;

    const sample = await createSample({ experiment_id: experimentId, code });
    response.status(201).json(sample);
  } catch (error) {
    if (isPgError(error, PG_UNIQUE_VIOLATION)) {
      sendError(
        response,
        409,
        `Sample code "${code}" already exists in this experiment`,
      );
      return;
    }
    if (isPgError(error, PG_FOREIGN_KEY_VIOLATION)) {
      // The experiment was deleted between our check and the INSERT.
      sendError(response, 404, 'Experiment not found');
      return;
    }
    next(error);
  }
});

export default router;
