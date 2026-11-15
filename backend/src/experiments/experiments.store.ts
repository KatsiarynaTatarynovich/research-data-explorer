import { randomUUID } from 'node:crypto';
import type { CreateExperimentInput, Experiment } from './experiments.types.js';
import { pool } from '../db.js';

export const getExperiments = async (): Promise<Experiment[]> => {
  const { rows } = await pool.query(
    'SELECT id, name, description FROM experiments',
  );

  return rows;
};

export const listExperiments = async (): Promise<Experiment[]> => {
  const { rows } = await pool.query(
    'SELECT id, name, description FROM experiments',
  );
  return rows.map((experiment) => ({ ...experiment }));
};

export const findExperimentById = async (
  id: string,
): Promise<Experiment | undefined> => {
  const { rows } = await pool.query(
    'SELECT id, name, description FROM experiments WHERE id = $1',
    [id],
  );
  const experiment = rows[0];
  return experiment ? { ...experiment } : undefined;
};

export const createExperiment = async ({
  name,
  description,
}: CreateExperimentInput): Promise<Experiment> => {
  const experiment: Experiment = { id: randomUUID(), name, description };
  const { rows } = await pool.query(
    'INSERT INTO experiments (id, name, description) VALUES ($1, $2, $3) RETURNING id, name, description',
    [experiment.id, experiment.name, experiment.description],
  );
  const createdExperiment = rows[0];
  return { ...createdExperiment };
};
