// Client for POST /api/experiments/:experimentId/imports (backend/src/imports).
import {
  ApiError,
  isRecord,
  request,
  UNEXPECTED_RESPONSE_MESSAGE,
} from './client';
import { EXPERIMENTS_URL } from './experiments';

/** Matches the API's limit (backend/src/imports/imports.upload.ts). */
export const MAX_IMPORT_FILE_BYTES = 1024 * 1024;

export type ImportSummary = {
  measurements_imported: number;
  samples_created: number;
  samples_reused: number;
};

/** One rejected CSV record. `record` 1 = the first row after the header. */
export type InvalidRecord = {
  record: number;
  line: number;
  message: string;
};

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

const isImportSummary = (value: unknown): value is ImportSummary =>
  isRecord(value) &&
  isCount(value.measurements_imported) &&
  isCount(value.samples_created) &&
  isCount(value.samples_reused);

const isInvalidRecord = (value: unknown): value is InvalidRecord =>
  isRecord(value) &&
  isCount(value.record) &&
  isCount(value.line) &&
  typeof value.message === 'string';

/** The per-record problems from a rejected import, or [] for any other error. */
export const getInvalidRecords = (error: unknown): InvalidRecord[] =>
  error instanceof ApiError && Array.isArray(error.details)
    ? error.details.filter(isInvalidRecord)
    : [];

/**
 * Uploads a CSV as multipart/form-data in the "file" field.
 * 201 → summary. 400 → invalid file or records (see getInvalidRecords);
 * 404 no experiment; 413 file over 1 MB. Nothing is saved on any error.
 */
export const importMeasurementsCsv = async (
  experimentId: string,
  file: File,
): Promise<ImportSummary> => {
  const form = new FormData();
  form.append('file', file);

  // No Content-Type header: the browser sets multipart/form-data together
  // with the boundary string that separates the parts.
  const body = await request(
    `${EXPERIMENTS_URL}/${encodeURIComponent(experimentId)}/imports`,
    { method: 'POST', body: form },
  );
  if (!isImportSummary(body)) {
    throw new ApiError(UNEXPECTED_RESPONSE_MESSAGE, null);
  }
  return body;
};
