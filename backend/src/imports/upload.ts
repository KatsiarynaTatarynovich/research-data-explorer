import multer from 'multer';
import { FILE_SIZE_LIMIT_CSV, MAX_FILES_CSV } from './imports.constants.js';

export const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FILE_SIZE_LIMIT_CSV,
    files: MAX_FILES_CSV,
  },
});
