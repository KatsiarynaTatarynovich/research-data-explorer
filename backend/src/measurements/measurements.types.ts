export type Measurement = {
  id: string;
  sample_id: string;
  value: number;
  unit: string;
  measurement_type: string;
};

export type CreateMeasurementInput = Omit<Measurement, 'id'>;
