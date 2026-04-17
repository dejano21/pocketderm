import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createBedrockClient } from './clients/bedrockClient.js';
import { loadRiskConfig } from './config/riskConfigLoader.js';
import { createAnalyzeRoute } from './routes/analyzeRoute.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Initialise shared dependencies once at startup
const bedrockClient = createBedrockClient();
const riskConfig = loadRiskConfig(join(__dirname, 'config', 'risk-config.json'));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// Register the analyze route
app.use('/api/analyze', createAnalyzeRoute({ bedrockClient, riskConfig, upload }));

// Multer error handling middleware
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'File exceeds maximum size of 10 MB.',
      });
    }
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: err.message,
    });
  }

  console.error('[App] Unhandled error:', err.message);
  return res.status(500).json({
    error: 'PIPELINE_ERROR',
    message: 'An unexpected server error occurred.',
    failedStep: 'unknown',
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
