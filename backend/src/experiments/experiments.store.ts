import { randomUUID } from 'node:crypto';
import type { CreateExperimentInput, Experiment } from './experiments.types.js';
import { pool } from '../db.js';
import {
  escapeLike,
  type ListQuery,
  type Paginated,
} from '../http/pagination.js';

/**
 * One page of experiments whose name contains `search` (case-insensitive),
 * ordered by name. `id` breaks ties so equal names keep a stable order across
 * pages — without it, a row could appear on two pages or on none.
 */
export const getExperiments = async ({
  search,
  page,
  pageSize,
}: ListQuery): Promise<Paginated<Experiment>> => {
  const offset = (page - 1) * pageSize;
  // Escape % and _ so the user's text matches literally.
  const pattern = `%${escapeLike(search)}%`;

  // Independent queries, so run them at the same time.
  const [itemsResult, countResult] = await Promise.all([
    pool.query<Experiment>(
      `SELECT id, name, description, created_at FROM experiments
       WHERE name ILIKE $1 ESCAPE '\\'
       ORDER BY name ASC, id ASC
       LIMIT $2 OFFSET $3`,
      [pattern, pageSize, offset],
    ),
    // COUNT(*) is a bigint, which `pg` returns as a string.
    pool.query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM experiments WHERE name ILIKE $1 ESCAPE '\\'`,
      [pattern],
    ),
  ]);

  const total = Number(countResult.rows[0].total);

  return {
    items: itemsResult.rows,
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
