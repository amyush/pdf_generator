const { Router } = require('express');
const { getJob } = require('../store/job-store');
const { progressEmitter } = require('../queue/worker');

const router = Router();

// SSE or JSON status endpoint
router.get('/jobs/:jobId/status', async (req, res) => {
  const { jobId } = req.params;
  const job = await getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // SSE mode: client sets Accept: text/event-stream
  if (req.headers.accept === 'text/event-stream') {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send current state immediately
    res.write(`data: ${JSON.stringify({ type: 'status', ...job.progress, status: job.status })}\n\n`);

    // Already finished? Close stream.
    if (job.status === 'completed' || job.status === 'completed_with_errors') {
      res.write(`data: ${JSON.stringify({ type: 'done', status: job.status })}\n\n`);
      return res.end();
    }

    const onProgress = (data) => {
      res.write(`data: ${JSON.stringify({ type: 'progress', ...data })}\n\n`);
    };

    const onDone = async () => {
      const finalJob = await getJob(jobId);
      res.write(`data: ${JSON.stringify({ type: 'done', status: finalJob.status })}\n\n`);
      cleanup();
      res.end();
    };

    progressEmitter.on(`progress:${jobId}`, onProgress);
    progressEmitter.on(`done:${jobId}`, onDone);

    const cleanup = () => {
      progressEmitter.off(`progress:${jobId}`, onProgress);
      progressEmitter.off(`done:${jobId}`, onDone);
    };
    req.on('close', cleanup);
    return;
  }

  // JSON polling mode
  res.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    documents: job.documents.map((d) => ({
      fileId: d.fileId,
      status: d.status,
      hash: d.hash,
      downloadUrl: d.status === 'completed' ? `/api/download/${d.fileId}` : null,
    })),
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  });
});

module.exports = router;
