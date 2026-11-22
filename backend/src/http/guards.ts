// Shared checks for nested routes. Each sends the error response itself and
// returns false, so a handler can simply `return` when a check fails.
import type { Response } from 'express';
import { findExperimentById } from '../experiments/experiments.store.js';
import { findSampleInExperiment } from '../samples/samples.store.js';
import { isUuid } from '../utils/is-uuid.js';
import { sendError } from './send-error.js';

/**
 * 400 if the id is malformed, 404 if no such experiment. Lets list routes
 * tell "no such experiment" (404) apart from "exists but empty" (200 []).
 */
export const ensureExperimentExists = async (
  experimentId: string,
  response: Response,
): Promise<boolean> => {
  if (!isUuid(experimentId)) {
    sendError(response, 400, 'Invalid experiment ID');
    return false;
  }
  if (!(await findExperimentById(experimentId))) {
    sendError(response, 404, 'Experiment not found');
    return false;
  }
  return true;
};

/**
 * Checks the experiment first, then that the sample exists **and belongs
 * to that experiment**. A sample from another experiment is a 404.
 */
export const ensureSampleInExperiment = async (
  experimentId: string,
  sampleId: string,
  response: Response,
): Promise<boolean> => {
  if (!(await ensureExperimentExists(experimentId, response))) return false;

  if (!isUuid(sampleId)) {
    sendError(response, 400, 'Invalid sample ID');
    return false;
  }
  if (!(await findSampleInExperiment(experimentId, sampleId))) {
    sendError(response, 404, 'Sample not found');
    return false;
  }
  return true;
};
