import { Pool } from 'pg';

export const pool = new Pool({
  connectionTimeoutMillis: 3000,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL connection error', error);
});
