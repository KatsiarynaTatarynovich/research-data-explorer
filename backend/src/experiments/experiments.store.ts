import crypto from 'crypto';
import { CreateExperimentInput, Experiment } from './experiments.types.js';

const experiments: Array<Experiment> = [];

export const listExperiments = (): Array<Experiment> =>
  experiments ? experiments : [];

export const findExperimentById = (id: string): Experiment | undefined =>
  experiments.find((exp) => exp.id === id);

export const createExperiment = ({
  name,
  description,
}: CreateExperimentInput): Experiment => {
  const experiment = { id: crypto.randomUUID(), name, description };
  experiments.push({ ...experiment });
  return experiment;
};
