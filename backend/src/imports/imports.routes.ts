import express from 'express';
import { uploadCsv } from './upload.js';
import { ensureExperimentExists } from '../http/guards.js';
import { sendError } from '../http/send-error.js';

const router = express.Router();

type ExperimentParams = { experimentId: string };

router.post<'/', ExperimentParams>(
  '/',
  uploadCsv.single('file'),
  async (request, response, next) => {
    try {
      const { experimentId } = request.params;

      if (!(await ensureExperimentExists(experimentId, response))) return;

      if (!request.file) {
        sendError(response, 400, 'No file uploaded');
        return;
      }

      const content = request.file.buffer.toString('utf-8');
      console.log('File content:', content);

      response.status(200).json({
        status: 'received',
        filename: request.file.originalname,
        size: request.file.size,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
