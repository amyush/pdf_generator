const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { pdfQueue, queueEvents } = require('../queue/queue');
const { createJob } = require('../store/job-store');
const config = require('../config');

const router = Router();

router.post('/generate', async (req, res) => {
  try {
    const { type, data } = req.body;

    if (!type || !data) {
      return res.status(400).json({ error: 'Missing type or data' });
    }
    if (!['purchase-order', 'invoice'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be purchase-order or invoice' });
    }

    const jobId = uuidv4();
    const fileId = uuidv4();

    await createJob(jobId, {
      type: 'single',
      total: 1,
      documents: [{ type, fileId, status: 'pending' }],
    });

    const queueJob = await pdfQueue.add('generate-pdf',
      { type, data, fileId, jobId, docIndex: 0 },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
    );

    // Try to return synchronously within the timeout window
    try {
      const result = await queueJob.waitUntilFinished(queueEvents, config.syncTimeout);
      return res.json({
        status: 'completed',
        fileId: result.fileId,
        hash: result.hash,
        size: result.size,
        downloadUrl: `/api/download/${result.fileId}`,
      });
    } catch {
      // Timed out waiting, return async handle instead
      return res.status(202).json({
        status: 'processing',
        jobId,
        statusUrl: `/api/jobs/${jobId}/status`,
      });
    }
  } catch (err) {
    console.error('Generate error:', err);
    res.status(500).json({ error: 'Failed to queue PDF generation' });
  }
});

module.exports = router;
