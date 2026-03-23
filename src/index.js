const express = require('express');
const config = require('./config');
const generateRoutes = require('./routes/generate');
const bulkRoutes = require('./routes/bulk');
const statusRoutes = require('./routes/status');
const downloadRoutes = require('./routes/download');
const { initBrowserPool, closeBrowserPool } = require('./services/browser-pool');
const { initWorker } = require('./queue/worker');
const { ensureStorageDir } = require('./services/storage');

const app = express();
app.use(express.json({ limit: '50mb' }));

app.use('/api', generateRoutes);
app.use('/api', bulkRoutes);
app.use('/api', statusRoutes);
app.use('/api', downloadRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

async function start() {
  await ensureStorageDir();
  await initBrowserPool();
  initWorker();

  app.listen(config.port, () => {
    console.log(`PDF service running on port ${config.port}`);
  });
}

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await closeBrowserPool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await closeBrowserPool();
  process.exit(0);
});

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
