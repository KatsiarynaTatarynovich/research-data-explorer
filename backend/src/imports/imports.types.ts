/** One valid CSV record: a measurement for a sample identified by its code. */
export type ImportRow = {
  sample_code: string;
  measurement_type: string;
  value: number;
  unit: string;
  /** Omitted → the database's now(), like POST /measurements. */
  measured_at?: Date;
};

/** Why a record was rejected. `record` 1 = first record after the header. */
export type InvalidRecord = {
  record: number;
  /** Line in the file, so the user can find the record in a text editor. */
  line: number;
  message: string;
};

export type ImportSummary = {
  measurements_imported: number;
  samples_created: number;
  samples_reused: number;
};
