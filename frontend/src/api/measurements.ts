// Client for /api/experiments/:experimentId/samples/:sampleId/measurements
// (backend/src/measurements).
import {
  ApiError,
  isRecord,
  postJson,
  request,
  UNEXPECTED_RESPONSE_MESSAGE,
} from './client';
import { EXPERIMENTS_URL } from './experiments';

export type Measurement = {
  id: string;
  sample_id: string;
  value: number;
  unit: string;
  measurement_type: string;
  /** ISO 8601 in UTC, e.g. "2026-11-22T08:00:00.000Z". */
  measured_at: string;
};

export type CreateMeasurementInput = {
  value: number;
  unit: string;
  measurement_type: string;
  /** ISO 8601 with a time zone. Omit to let the server use "now". */
  measured_at?: string;
};

const measurementsUrl = (experimentId: string, sampleId: string) =>
  `${EXPERIMENTS_URL}/${encodeURIComponent(experimentId)}/samples/${encodeURIComponent(sampleId)}/measurements`;

const isMeasurement = (value: unknown): value is Measurement =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.sample_id === 'string' &&
  typeof value.value === 'number' &&
  typeof value.unit === 'string' &&
  typeof value.measurement_type === 'string' &&
  typeof value.measured_at === 'string' &&
  !Number.isNaN(Date.parse(value.measured_at));

/** GET → 200 Measurement[] oldest first; 400 malformed id; 404 no experiment/sample. */
export const fetchMeasurements = async (
  experimentId: string,
  sampleId: string,
  signal?: AbortSignal,
): Promise<Measurement[]> => {
  const body = await request(measurementsUrl(experimentId, sampleId), {
    signal,
  });
  if (!Array.isArray(body) || !body.every(isMeasurement)) {
    throw new ApiError(UNEXPECTED_RESPONSE_MESSAGE, null);
  }
  return body;
};

/** POST → 201 Measurement; 400 invalid field; 404 no experiment/sample. */
export const createMeasurement = async (
  experimentId: string,
  sampleId: string,
  input: CreateMeasurementInput,
): Promise<Measurement> => {
  const body = await postJson(measurementsUrl(experimentId, sampleId), input);
  if (!isMeasurement(body)) {
    throw new ApiError(UNEXPECTED_RESPONSE_MESSAGE, null);
  }
  return body;
};

/**
 * Same order as the API (ORDER BY measured_at, id), so a new measurement
 * lands where a reload would put it. Lowercase UUID strings compare the same
 * way Postgres compares uuid values.
 */
export const sortMeasurements = (measurements: Measurement[]): Measurement[] =>
  [...measurements].sort(
    (a, b) =>
      Date.parse(a.measured_at) - Date.parse(b.measured_at) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
