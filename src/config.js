require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  puppeteer: {
    concurrency: parseInt(process.env.PUPPETEER_CONCURRENCY || '4'),
    // Max line items per page chunk before splitting to avoid OOM
    chunkSize: parseInt(process.env.CHUNK_SIZE || '50'),
  },
  storage: {
    dir: process.env.STORAGE_DIR || './storage/pdfs',
  },
  queue: {
    name: 'pdf-generation',
  },
  // Max ms to wait before returning async response for single PDF
  syncTimeout: 5000,
};
