import { randomUUID } from 'node:crypto';
import { pool } from '../db.js';
import type { CreateSampleInput, Sample } from './samples.types.js';

// ORDER BY code uses the (experiment_id, code) UNIQUE index, so it's cheap.
export const getSamplesByExperimentId = async (
  experimentId: string,
): Promise<Sample[]> => {
  const { rows } = await pool.query<Sample>(
    'SELECT id, experiment_id, code FROM samples WHERE experiment_id = $1 ORDER BY code',
    [experimentId],
  );
  return rows;
};

export const createSample = async ({
  experiment_id,
  code,
}: CreateSampleInput): Promise<Sample> => {
  const { rows } = await pool.query<Sample>(
    'INSERT INTO samples (id, experiment_id, code) VALUES ($1, $2, $3) RETURNING id, experiment_id, code',
    [randomUUID(), experiment_id, code],
  );
  return rows[0];
};
