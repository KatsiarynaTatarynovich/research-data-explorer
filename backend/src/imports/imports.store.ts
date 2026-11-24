import { randomUUID } from 'node:crypto';
import { pool } from '../db.js';
import type { ImportRow, ImportSummary } from './imports.types.js';

/**
 * Saves all rows in ONE transaction: either every measurement is stored or,
 * if anything fails, none are (no half-imported files).
 *
 * Samples are matched by code within the experiment; codes that don't exist
 * yet are created. Each step is a single query however many rows there are:
 * the rows are sent as arrays and turned back into rows with unnest().
 */
export const importMeasurements = async (
  experimentId: string,
  rows: ImportRow[],
): Promise<ImportSummary> => {
  const codes = [...new Set(rows.map((row) => row.sample_code))];

  // A transaction needs one connection for all its queries; pool.query()
  // could run each query on a different connection.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ON CONFLICT DO NOTHING: an existing code is reused, not an error.
    const created = await client.query(
      `INSERT INTO samples (id, experiment_id, code)
       SELECT id, $1, code FROM unnest($2::uuid[], $3::text[]) AS t(id, code)
       ON CONFLICT (experiment_id, code) DO NOTHING`,
      [experimentId, codes.map(() => randomUUID()), codes],
    );

    const { rows: samples } = await client.query<{ id: string; code: string }>(
      'SELECT id, code FROM samples WHERE experiment_id = $1 AND code = ANY($2::text[])',
      [experimentId, codes],
    );
    const sampleIdByCode = new Map(samples.map((s) => [s.code, s.id]));

    await client.query(
      `INSERT INTO measurements (id, sample_id, value, unit, measurement_type, measured_at)
       SELECT id, sample_id, value, unit, measurement_type, COALESCE(measured_at, now())
       FROM unnest($1::uuid[], $2::uuid[], $3::float8[], $4::text[], $5::text[], $6::timestamptz[])
         AS t(id, sample_id, value, unit, measurement_type, measured_at)`,
      [
        rows.map(() => randomUUID()),
        rows.map((row) => sampleIdByCode.get(row.sample_code)),
        rows.map((row) => row.value),
        rows.map((row) => row.unit),
        rows.map((row) => row.measurement_type),
        rows.map((row) => row.measured_at ?? null),
      ],
    );

    await client.query('COMMIT');

    const samplesCreated = created.rowCount ?? 0;
    return {
      measurements_imported: rows.length,
      samples_created: samplesCreated,
      samples_reused: codes.length - samplesCreated,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
