import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { logger } from './common/logger.js';

const config = loadConfig();
const app = createApp();

app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, 'Backend listening');
});
