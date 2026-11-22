export type Sample = {
  id: string;
  experiment_id: string;
  code: string;
};

export type CreateSampleInput = Omit<Sample, 'id'>;
