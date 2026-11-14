export type Experiment = {
  id: string;
  name: string;
  description: string;
};

export type CreateExperimentInput = Omit<Experiment, 'id'>;
