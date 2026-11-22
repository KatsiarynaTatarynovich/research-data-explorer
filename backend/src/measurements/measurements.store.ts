import { randomUUID } from 'node:crypto';
import { pool } from '../db.js';
import type {
  CreateMeasurementInput,
  Measurement,
} from './measurements.types.js';

const COLUMNS = 'id, sample_id, value, unit, measurement_type, measured_at';

// Oldest first; `id` breaks ties. Served by the (sample_id, measured_at, id) index.
export const getMeasurementsBySampleId = async (
  sampleId: string,
): Promise<Measurement[]> => {
  const { rows } = await pool.query<Measurement>(
    `SELECT ${COLUMNS} FROM measurements WHERE sample_id = $1 ORDER BY measured_at, id`,
    [sampleId],
  );
  return rows;
};

export const createMeasurement = async ({
  sample_id,
  value,
  unit,
  measurement_type,
  measured_at,
}: CreateMeasurementInput): Promise<Measurement> => {
  // COALESCE: use the given time, or the database's now() when it's omitted.
  const { rows } = await pool.query<Measurement>(
    `INSERT INTO measurements (id, sample_id, value, unit, measurement_type, measured_at)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, now()))
     RETURNING ${COLUMNS}`,
    [
      randomUUID(),
      sample_id,
      value,
      unit,
      measurement_type,
      measured_at ?? null,
    ],
  );
  return rows[0];
};
