// Turns an uploaded CSV file into validated rows. No database access here,
// so every rule can be checked (and tested) without Postgres.
import { CsvError, parse } from 'csv-parse/sync';
import { parseIsoDateTime } from '../utils/parse-iso-datetime.js';
import type { ImportRow, InvalidRecord } from './imports.types.js';

const REQUIRED_COLUMNS = ['sample_code', 'measurement_type', 'value', 'unit'];
const OPTIONAL_COLUMNS = ['measured_at'];
const KNOWN_COLUMNS = new Set([...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]);

export const MAX_RECORDS = 10_000;
// Enough to fix a file; a file with 5,000 bad rows needs one message, not 5,000.
const MAX_REPORTED_ERRORS = 100;

// A plain decimal number such as 2.4, -0.5 or 1e-3. Number() alone would
// also accept "" (→ 0), "0x1A", "Infinity" and " 7 ".
const DECIMAL_NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

export type ParseOutcome =
  | { ok: true; rows: ImportRow[] }
  | { ok: false; message: string; invalidRecords: InvalidRecord[] };

const fail = (
  message: string,
  invalidRecords: InvalidRecord[] = [],
): ParseOutcome => ({ ok: false, message, invalidRecords });

/** Shows a user's value inside a message, shortened if it's very long. */
const quote = (value: string): string =>
  JSON.stringify(value.length > 40 ? `${value.slice(0, 40)}…` : value);

export const parseMeasurementsCsv = (file: Buffer): ParseOutcome => {
  // fatal: invalid UTF-8 (e.g. an Excel file renamed to .csv) is an error
  // instead of silently becoming "�". TextDecoder also drops a leading BOM,
  // which Excel adds and which would otherwise end up in the first header.
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(file);
  } catch {
    return fail('The file must be UTF-8 encoded text');
  }

  // relax_column_count: a row with too few/many fields is reported below as
  // one invalid record, instead of csv-parse aborting the whole file.
  // info: each record comes with the line it ended on.
  let records: { record: string[]; info: { lines: number } }[];
  try {
    records = parse(text, {
      trim: true,
      skip_empty_lines: true,
      relax_column_count: true,
      info: true,
    }) as unknown as typeof records; // the typings ignore `info: true`
  } catch (error) {
    if (error instanceof CsvError) {
      return fail(`The file is not valid CSV: ${error.message}`);
    }
    throw error;
  }

  const [header, ...dataRecords] = records;
  if (header === undefined) return fail('The file is empty');

  // ---- Header ----
  const columns = header.record.map((name) => name.toLowerCase());
  const duplicate = columns.find((name, i) => columns.indexOf(name) !== i);
  if (duplicate !== undefined) {
    return fail(`Column "${duplicate}" appears more than once in the header`);
  }
  const unknown = columns.filter((name) => !KNOWN_COLUMNS.has(name));
  if (unknown.length > 0) {
    return fail(
      `Unknown column(s): ${unknown.map(quote).join(', ')}. Allowed: ${[...KNOWN_COLUMNS].join(', ')}`,
    );
  }
  const missing = REQUIRED_COLUMNS.filter((name) => !columns.includes(name));
  if (missing.length > 0) {
    return fail(`Missing required column(s): ${missing.join(', ')}`);
  }

  if (dataRecords.length === 0) {
    return fail('The file has a header but no records');
  }
  if (dataRecords.length > MAX_RECORDS) {
    return fail(
      `The file has ${dataRecords.length} records; the limit is ${MAX_RECORDS}`,
    );
  }

  // ---- Records ----
  const rows: ImportRow[] = [];
  const invalidRecords: InvalidRecord[] = [];
  let invalidCount = 0;

  dataRecords.forEach(({ record: cells, info }, index) => {
    const problems: string[] = [];
    const cell = (name: string): string => {
      const i = columns.indexOf(name);
      return i === -1 ? '' : (cells[i] ?? '');
    };

    if (cells.length !== columns.length) {
      problems.push(`expected ${columns.length} fields, found ${cells.length}`);
    } else {
      for (const name of REQUIRED_COLUMNS) {
        if (cell(name) === '') problems.push(`${name} is empty`);
      }

      const rawValue = cell('value');
      const value = Number(rawValue);
      if (
        rawValue !== '' &&
        (!DECIMAL_NUMBER.test(rawValue) || !Number.isFinite(value))
      ) {
        problems.push(
          `value ${quote(rawValue)} is not a number (use a dot for decimals, e.g. 2.4)`,
        );
      }

      const rawMeasuredAt = cell('measured_at');
      const measuredAt =
        rawMeasuredAt === '' ? undefined : parseIsoDateTime(rawMeasuredAt);
      if (measuredAt === null) {
        problems.push(
          `measured_at ${quote(rawMeasuredAt)} must be an ISO 8601 date-time with a time zone, e.g. 2026-11-22T14:30:00Z`,
        );
      }

      if (problems.length === 0) {
        rows.push({
          sample_code: cell('sample_code'),
          measurement_type: cell('measurement_type'),
          value,
          unit: cell('unit'),
          measured_at: measuredAt ?? undefined,
        });
      }
    }

    if (problems.length > 0) {
      invalidCount += 1;
      if (invalidRecords.length < MAX_REPORTED_ERRORS) {
        invalidRecords.push({
          record: index + 1,
          line: info.lines,
          message: problems.join('; '),
        });
      }
    }
  });

  if (invalidCount > 0) {
    const shown =
      invalidCount > invalidRecords.length
        ? ` (showing the first ${invalidRecords.length})`
        : '';
    return fail(
      `${invalidCount} of ${dataRecords.length} records are invalid${shown}. Nothing was imported.`,
      invalidRecords,
    );
  }
  return { ok: true, rows };
};
