export type Experiment = {
  id: string;
  name: string;
  description: string;
  created_at: Date;
};

export type CreateExperimentInput = Omit<Experiment, 'id' | 'created_at'>;
