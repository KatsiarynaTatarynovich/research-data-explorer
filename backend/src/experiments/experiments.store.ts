import { randomUUID } from 'node:crypto';
import type { CreateExperimentInput, Experiment } from './experiments.types.js';

// In-memory only: emptied whenever the server restarts (including tsx watch reloads).
const experiments: Experiment[] = [];

// Return copies so callers can never mutate the stored data.
export const listExperiments = (): Experiment[] =>
  experiments.map((experiment) => ({ ...experiment }));

export const findExperimentById = (id: string): Experiment | undefined => {
  const experiment = experiments.find((exp) => exp.id === id);
  return experiment ? { ...experiment } : undefined;
};

export const createExperiment = ({
  name,
  description,
}: CreateExperimentInput): Experiment => {
  const experiment: Experiment = { id: randomUUID(), name, description };
  experiments.push(experiment);
  return { ...experiment };
};
