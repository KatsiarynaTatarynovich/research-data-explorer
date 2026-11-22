// PostgreSQL error codes we turn into HTTP responses.
// Full list: https://www.postgresql.org/docs/current/errcodes-appendix.html
export const PG_UNIQUE_VIOLATION = '23505';
export const PG_FOREIGN_KEY_VIOLATION = '23503';
export const PG_INVALID_TEXT_REPRESENTATION = '22P02';

/** True if `error` came from PostgreSQL with the given SQLSTATE code. */
export const isPgError = (error: unknown, code: string): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === code;
