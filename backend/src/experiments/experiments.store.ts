import { randomUUID } from 'node:crypto';
import type { CreateExperimentInput, Experiment } from './experiments.types.js';
import { pool } from '../db.js';

export const getExperiments = async (): Promise<Experiment[]> => {
  const { rows } = await pool.query(
    'SELECT id, name, description, created_at FROM experiments ORDER BY created_at ASC',
  );

  return rows;
};

export const findExperimentById = async (
  id: string,
): Promise<Experiment | undefined> => {
  const { rows } = await pool.query(
    'SELECT id, name, description, created_at FROM experiments WHERE id = $1',
    [id],
  );
  const experiment = rows[0];
  return experiment;
};

export const createExperiment = async ({
  name,
  description,
}: CreateExperimentInput): Promise<Experiment> => {
  const { rows } = await pool.query(
    'INSERT INTO experiments (id, name, description) VALUES ($1, $2, $3) RETURNING id, name, description, created_at',
    [randomUUID(), name, description],
  );
  const createdExperiment = rows[0];
  return createdExperiment;
};

export const deleteExperimentById = async (id: string): Promise<void> => {
  await pool.query('DELETE FROM experiments WHERE id = $1', [id]);
};
