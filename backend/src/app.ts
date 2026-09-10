import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { loadConfig } from './config/env.js';
import { errorHandler, notFound, requestId, requestLogger } from './common/middleware.js';
import { healthRouter } from './modules/health/routes.js';

export function createApp(): express.Express {
  const config = loadConfig();
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: ['http://localhost:5173'], credentials: false }));
  app.use(express.json({ limit: '1mb' }));
  app.use(requestId);
  app.use(requestLogger);
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    }),
  );

  app.use('/api/v1', healthRouter());
  void config;

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
