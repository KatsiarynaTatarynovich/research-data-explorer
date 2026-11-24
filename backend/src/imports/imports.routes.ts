import express, { type RequestHandler } from 'express';
import { isPgError, PG_FOREIGN_KEY_VIOLATION } from '../db-errors.js';
import { ensureExperimentExists } from '../http/guards.js';
import { sendError } from '../http/send-error.js';
import { parseMeasurementsCsv } from './imports.parse.js';
import { importMeasurements } from './imports.store.js';
import { FILE_FIELD, receiveCsvFile } from './imports.upload.js';

// Mounted at /api/experiments/:experimentId/imports (see app.ts).
// mergeParams lets this router read :experimentId from the parent path;
// without it request.params.experimentId is undefined.
const router = express.Router({ mergeParams: true });

type ExperimentParams = { experimentId: string };

// Runs before the upload, so a wrong experiment id is rejected without
// reading a 1 MB file first.
const requireExperiment: RequestHandler<ExperimentParams> = async (
  request,
  response,
  next,
) => {
  try {
    if (await ensureExperimentExists(request.params.experimentId, response)) {
      next();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/experiments/:experimentId/imports
 * multipart/form-data with a CSV in the "file" field:
 *   sample_code,measurement_type,value,unit[,measured_at]
 * 201 → { measurements_imported, samples_created, samples_reused }
 * 400 → { error: { code, message, details?: [{ record, line, message }] } }
 * Any invalid record rejects the whole file; nothing is saved.
 */
router.post<'/', ExperimentParams>(
  '/',
  requireExperiment,
  receiveCsvFile,
  async (request, response, next) => {
    const { file } = request;
    if (!file) {
      sendError(
        response,
        400,
        `No file uploaded: send the CSV in a field named "${FILE_FIELD}"`,
      );
      return;
    }
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      sendError(response, 400, 'Only .csv files can be imported');
      return;
    }

    const parsed = parseMeasurementsCsv(file.buffer);
    if (!parsed.ok) {
      sendError(response, 400, parsed.message, parsed.invalidRecords);
      return;
    }

    try {
      const summary = await importMeasurements(
        request.params.experimentId,
        parsed.rows,
      );
      response.status(201).json(summary);
    } catch (error) {
      if (isPgError(error, PG_FOREIGN_KEY_VIOLATION)) {
        // The experiment was deleted while the file was being imported.
        sendError(response, 404, 'Experiment not found');
        return;
      }
      next(error);
    }
  },
);

export default router;
