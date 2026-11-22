import { randomUUID } from 'node:crypto';
import type { CreateExperimentInput, Experiment } from './experiments.types.js';
import { pool } from '../db.js';

// `id` breaks ties: rows inserted in one transaction share the same now().
export const getExperiments = async (): Promise<Experiment[]> => {
  const { rows } = await pool.query<Experiment>(
    'SELECT id, name, description, created_at FROM experiments ORDER BY created_at ASC, id ASC',
  );
  return rows;
};

export const findExperimentById = async (
  id: string,
): Promise<Experiment | undefined> => {
  const { rows } = await pool.query<Experiment>(
    'SELECT id, name, description, created_at FROM experiments WHERE id = $1',
    [id],
  );
  return rows[0];
};

export const createExperiment = async ({
  name,
  description,
}: CreateExperimentInput): Promise<Experiment> => {
  const { rows } = await pool.query<Experiment>(
    'INSERT INTO experiments (id, name, description) VALUES ($1, $2, $3) RETURNING id, name, description, created_at',
    [randomUUID(), name, description],
  );
  return rows[0];
};

/**
 * Deletes the experiment; its samples go too (ON DELETE CASCADE, see
 * migrations/003). Returns false if no experiment had that id.
 */
export const deleteExperimentById = async (id: string): Promise<boolean> => {
  const { rowCount } = await pool.query(
    'DELETE FROM experiments WHERE id = $1',
    [id],
  );
  return (rowCount ?? 0) > 0;
};
