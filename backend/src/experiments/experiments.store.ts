import { randomUUID } from 'node:crypto';
import type { CreateExperimentInput, Experiment } from './experiments.types.js';
import { pool } from '../db.js';

// `id` breaks ties: rows inserted in one transaction share the same now().
export const getExperiments = async (
  search: string,
  page: number,
  pageSize: number,
): Promise<{
  items: Experiment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> => {
  const offset = (page - 1) * pageSize;
  const pattern = `%${search}%`;

  const result = await pool.query<Experiment>(
    'SELECT id, name, description, created_at FROM experiments WHERE name ILIKE $1 ORDER BY name ASC, id ASC LIMIT $2 OFFSET $3',
    [pattern, pageSize, offset],
  );

  const countResult = await pool.query<{ total: number }>(
    'SELECT COUNT(*) AS total FROM experiments WHERE name ILIKE $1',
    [pattern],
  );
  const total = Number(countResult.rows[0].total);

  return {
    items: result.rows,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
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
