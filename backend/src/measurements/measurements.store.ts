import { randomUUID } from 'node:crypto';
import { pool } from '../db.js';
import type {
  CreateMeasurementInput,
  Measurement,
} from './measurements.types.js';

// ORDER BY code uses the (experiment_id, code) UNIQUE index, so it's cheap.
export const getMeasurementsBySampleId = async (
  sampleId: string,
): Promise<Measurement[]> => {
  const { rows } = await pool.query<Measurement>(
    'SELECT id, sample_id, value, unit, measurement_type FROM measurements WHERE sample_id = $1 ORDER BY measurement_type',
    [sampleId],
  );
  return rows;
};

export const createMeasurement = async ({
  sample_id,
  value,
  unit,
  measurement_type,
}: CreateMeasurementInput): Promise<Measurement> => {
  const { rows } = await pool.query<Measurement>(
    'INSERT INTO measurements (id, sample_id, value, unit, measurement_type) VALUES ($1, $2, $3, $4, $5) RETURNING id, sample_id, value, unit, measurement_type',
    [randomUUID(), sample_id, value, unit, measurement_type],
  );
  return rows[0];
};
