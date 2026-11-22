export type Measurement = {
  id: string;
  sample_id: string;
  value: number;
  unit: string;
  measurement_type: string;
  measured_at: Date;
};

/** `measured_at` is optional: the database defaults it to now(). */
export type CreateMeasurementInput = Omit<Measurement, 'id' | 'measured_at'> & {
  measured_at?: Date;
};
