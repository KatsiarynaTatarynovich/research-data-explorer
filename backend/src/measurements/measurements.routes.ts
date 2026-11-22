import express from 'express';
import { isPgError, PG_FOREIGN_KEY_VIOLATION } from '../db-errors.js';
import { ensureSampleInExperiment } from '../http/guards.js';
import { sendError } from '../http/send-error.js';
import { parseIsoDateTime } from '../utils/parse-iso-datetime.js';
import {
  createMeasurement,
  getMeasurementsBySampleId,
} from './measurements.store.js';

// Mounted at /api/experiments/:experimentId/samples/:sampleId/measurements
// (see app.ts). mergeParams lets this router read both parent params.
const router = express.Router({ mergeParams: true });

type SampleParams = { experimentId: string; sampleId: string };

router.get<'/', SampleParams>('/', async (request, response, next) => {
  try {
    const { experimentId, sampleId } = request.params;
    if (!(await ensureSampleInExperiment(experimentId, sampleId, response))) {
      return;
    }

    response.json(await getMeasurementsBySampleId(sampleId));
  } catch (error) {
    next(error);
  }
});

router.post<'/', SampleParams>('/', async (request, response, next) => {
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

  // JSON can't encode NaN/Infinity, but check anyway: double precision would
  // accept them and they'd break any later calculation.
  if (typeof body.value !== 'number' || !Number.isFinite(body.value)) {
    sendError(response, 400, 'Field value must be a finite number');
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

  // Optional: when the measurement was taken. Omitted → the database's now().
  let measured_at: Date | undefined;
  if ('measured_at' in body && body.measured_at !== undefined) {
    const parsed =
      typeof body.measured_at === 'string'
        ? parseIsoDateTime(body.measured_at)
        : null;
    if (!parsed) {
      sendError(
        response,
        400,
        'Field measured_at must be an ISO 8601 date-time with a time zone, e.g. 2026-11-22T14:30:00Z',
      );
      return;
    }
    measured_at = parsed;
  }

  const { experimentId, sampleId } = request.params;

  try {
    if (!(await ensureSampleInExperiment(experimentId, sampleId, response))) {
      return;
    }

    const measurement = await createMeasurement({
      sample_id: sampleId,
      value: body.value,
      unit,
      measurement_type,
      measured_at,
    });
    response.status(201).json(measurement);
  } catch (error) {
    if (isPgError(error, PG_FOREIGN_KEY_VIOLATION)) {
      // The sample was deleted between our check and the INSERT.
      sendError(response, 404, 'Sample not found');
      return;
    }
    next(error);
  }
});

export default router;
