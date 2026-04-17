import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { validateUpload } from '../validators/uploadValidator.js';
import { storeImage } from '../clients/s3Client.js';
import { runAnalysis } from '../pipeline/analysisPipeline.js';

/**
 * Creates the /api/analyze route handler.
 *
 * @param {{ bedrockClient: object, riskConfig: object, upload: Function }} deps
 * @returns {Router}
 */
export function createAnalyzeRoute({ bedrockClient, riskConfig, upload }) {
  const router = Router();

  router.post('/', upload.single('image'), async (req, res) => {
    try {
      const file = req.file;
      const userId = req.body?.userId;

      if (!file) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'No image file provided.',
        });
      }

      if (!userId) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'userId is required.',
        });
      }

      const validation = validateUpload(file.buffer, file.mimetype, file.size);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: validation.error,
        });
      }

      const scanId = uuidv4();
      const s3Key = await storeImage(file.buffer, userId, scanId, file.mimetype);
      const result = await runAnalysis(file.buffer, s3Key, { bedrockClient, riskConfig });

      if (result.error === 'PIPELINE_ERROR') {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (err) {
      console.error('[AnalyzeRoute] Unexpected error:', err.message);
      return res.status(500).json({
        error: 'PIPELINE_ERROR',
        message: 'An unexpected error occurred during analysis.',
        failedStep: 'unknown',
      });
    }
  });

  return router;
}
