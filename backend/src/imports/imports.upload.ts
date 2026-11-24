import type { RequestHandler } from 'express';
import multer from 'multer';
import { sendError } from '../http/send-error.js';

export const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB
export const FILE_FIELD = 'file';

// Memory storage: the file is small and parsed straight away, so there's no
// temp file to clean up. The size limit is what keeps memory use bounded.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
}).single(FILE_FIELD);

/**
 * Reads one uploaded file into `request.file`. Multer's errors have no HTTP
 * `status`, so without this wrapper the app's error handler would turn
 * "file too large" into a 500.
 */
export const receiveCsvFile: RequestHandler = (request, response, next) => {
  if (!request.is('multipart/form-data')) {
    sendError(
      response,
      415,
      `Content-Type must be multipart/form-data with the CSV in a field named "${FILE_FIELD}"`,
    );
    return;
  }

  upload(request, response, (error: unknown) => {
    if (error === undefined) {
      next();
      return;
    }
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        sendError(response, 413, 'The file is larger than 1 MB');
      } else if (error.code === 'LIMIT_FILE_COUNT') {
        sendError(response, 400, 'Upload one file at a time');
      } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        sendError(
          response,
          400,
          `Send the CSV in a field named "${FILE_FIELD}", not "${error.field}"`,
        );
      } else {
        sendError(response, 400, error.message);
      }
      return;
    }
    // Any other error here comes from parsing the multipart body itself
    // (e.g. a missing boundary or a cut-off upload): the client's fault.
    sendError(response, 400, 'Malformed multipart/form-data body');
  });
};
