import type { Request } from 'express';

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;
export const MAX_SEARCH_LENGTH = 100;

/** Response shape for any paginated list. */
export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  /** 0 when there are no results at all. */
  totalPages: number;
};

export type ListQuery = { search: string; page: number; pageSize: number };

type ParseResult<T> = { ok: true; value: T } | { ok: false; message: string };

// Digits only: rejects "1.5", "10abc", "-1" and "" that parseInt would bend.
const POSITIVE_INTEGER = /^\d+$/;

/**
 * Reads one query parameter as a single string. Express gives an array for
 * ?x=1&x=2, so a plain `as string` cast would lie about the type.
 */
const readSingle = (
  query: Request['query'],
  name: string,
): ParseResult<string | undefined> => {
  const raw = query[name];
  if (raw === undefined) return { ok: true, value: undefined };
  if (typeof raw !== 'string') {
    return { ok: false, message: `Query parameter ${name} must be given once` };
  }
  return { ok: true, value: raw };
};

const readInt = (
  query: Request['query'],
  name: string,
  { fallback, min, max }: { fallback: number; min: number; max: number },
): ParseResult<number> => {
  const single = readSingle(query, name);
  if (!single.ok) return single;
  if (single.value === undefined) return { ok: true, value: fallback };

  const value = Number(single.value);
  if (
    !POSITIVE_INTEGER.test(single.value) ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  ) {
    const range =
      max === Number.MAX_SAFE_INTEGER
        ? `${min} or more`
        : `from ${min} to ${max}`;
    return {
      ok: false,
      message: `Query parameter ${name} must be a whole number ${range}`,
    };
  }
  return { ok: true, value };
};

/** Validates ?search=&page=&pageSize= for list endpoints. */
export const parseListQuery = (
  query: Request['query'],
): ParseResult<ListQuery> => {
  const search = readSingle(query, 'search');
  if (!search.ok) return search;
  const trimmed = (search.value ?? '').trim();
  if (trimmed.length > MAX_SEARCH_LENGTH) {
    return {
      ok: false,
      message: `Query parameter search must be at most ${MAX_SEARCH_LENGTH} characters`,
    };
  }

  const page = readInt(query, 'page', {
    fallback: 1,
    min: 1,
    max: Number.MAX_SAFE_INTEGER,
  });
  if (!page.ok) return page;

  const pageSize = readInt(query, 'pageSize', {
    fallback: DEFAULT_PAGE_SIZE,
    min: 1,
    max: MAX_PAGE_SIZE,
  });
  if (!pageSize.ok) return pageSize;

  return {
    ok: true,
    value: { search: trimmed, page: page.value, pageSize: pageSize.value },
  };
};

/**
 * Makes user text match literally inside LIKE/ILIKE: without this, "_" and
 * "%" are wildcards, so searching for "_" would match every row.
 * Use with `ESCAPE '\'` in the SQL.
 */
export const escapeLike = (text: string): string =>
  text.replace(/[\\%_]/g, (character) => `\\${character}`);
