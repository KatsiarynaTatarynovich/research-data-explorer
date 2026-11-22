import express from 'express';
import {
  isPgError,
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
} from '../db-errors.js';
import { findExperimentById } from '../experiments/experiments.store.js';
import { sendError } from '../http/send-error.js';
import { isUuid } from '../utils/is-uuid.js';
import {
  createMeasurement,
  getMeasurementsBySampleId,
} from './measurements.store.js';
import { getSampleById } from '../samples/samples.store.js';

// Mounted at /api/experiments/:experimentId/samples/:sampleId/measurements (see app.ts).
// mergeParams lets this router read :experimentId from the parent path.
const router = express.Router({ mergeParams: true });

type ExperimentParams = { experimentId: string; sampleId: string };

/**
 * Sends 400/404 and returns false if the experiment id is malformed or
 * doesn't exist. Distinguishes "no such experiment" (404) from
 * "experiment exists but has no samples" (200 []).
 */
const ensureExperimentExists = async (
  experimentId: string,
  response: express.Response,
): Promise<boolean> => {
  if (!isUuid(experimentId)) {
    sendError(response, 400, 'Invalid experiment ID');
    return false;
  }
  if (!(await findExperimentById(experimentId))) {
    sendError(response, 404, 'Experiment not found');
    return false;
  }
  return true;
};

const ensureSampleExists = async (
  sampleId: string,
  response: express.Response,
): Promise<boolean> => {
  if (!isUuid(sampleId)) {
    sendError(response, 400, 'Invalid sample ID');
    return false;
  }
  if (!(await getSampleById(sampleId))) {
    sendError(response, 404, 'Sample not found');
    return false;
  }
  return true;
};

router.get<'/', ExperimentParams>('/', async (request, response, next) => {
  try {
    const { experimentId, sampleId } = request.params;
    if (!(await ensureExperimentExists(experimentId, response))) return;
    if (!(await ensureSampleExists(sampleId, response))) return;

    response.json(await getMeasurementsBySampleId(sampleId));
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

  if (!('value' in body)) {
    sendError(response, 400, 'Missing required field: value');
    return;
  }
  if (!('unit' in body)) {
    sendError(response, 400, 'Missing required field: unit');
    return;
  }
  if (!('measurement_type' in body)) {
    sendError(response, 400, 'Missing required field: measurement_type');
    return;
  }

  if (typeof body.value !== 'number') {
    sendError(response, 400, 'Field value must be a number');
    return;
  }

  if (typeof body.unit !== 'string') {
    sendError(response, 400, 'Field unit must be a string');
    return;
  }

  const unit = body.unit.trim();

  if (unit === '') {
    sendError(response, 400, 'Field unit cannot be empty');
    return;
  }

  if (typeof body.measurement_type !== 'string') {
    sendError(response, 400, 'Field measurement_type must be a string');
    return;
  }

  const measurement_type = body.measurement_type.trim();

  if (measurement_type === '') {
    sendError(response, 400, 'Field measurement_type cannot be empty');
    return;
  }

  const { experimentId, sampleId } = request.params;

  try {
    if (!(await ensureExperimentExists(experimentId, response))) return;
    if (!(await ensureSampleExists(sampleId, response))) return;

    const measurement = await createMeasurement({
      sample_id: sampleId,
      value: body.value,
      unit: unit,
      measurement_type: measurement_type,
    });
    response.status(201).json(measurement);
  } catch (error) {
    if (isPgError(error, PG_UNIQUE_VIOLATION)) {
      sendError(
        response,
        409,
        `Measurement for sample "${sampleId}" already exists`,
      );
      return;
    }
    if (isPgError(error, PG_FOREIGN_KEY_VIOLATION)) {
      // The sample was deleted between our check and the INSERT.
      sendError(response, 404, 'Sample not found');
      return;
    }
    next(error);
  }
});

export default router;
