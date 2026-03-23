const { Worker } = require('bullmq');
const config = require('../config');
const { connection } = require('./queue');
const { generatePdf } = require('../services/pdf-generator');
const { getJob, updateJob, updateDocument } = require('../store/job-store');
const { EventEmitter } = require('events');

// SSE progress updates are pushed via this emitter
const progressEmitter = new EventEmitter();
progressEmitter.setMaxListeners(1000);

function initWorker() {
  const worker = new Worker(
    config.queue.name,
    async (job) => {
      const { fileId, type, data, jobId, docIndex } = job.data;

      try {
        const result = await generatePdf({ type, data, fileId });

        const parentJob = await getJob(jobId);
        if (parentJob) {
          await updateDocument(jobId, docIndex, {
            status: 'completed',
            fileId: result.fileId,
            hash: result.hash,
            size: result.size,
          });
          parentJob.progress.completed++;
          await updateJob(jobId, { progress: parentJob.progress });

          const { completed, failed, total } = parentJob.progress;
          progressEmitter.emit(`progress:${jobId}`, {
            completed, failed, total,
            latestFileId: result.fileId,
          });

          if (completed + failed >= total) {
            await updateJob(jobId, {
              status: failed > 0 ? 'completed_with_errors' : 'completed',
              completedAt: new Date().toISOString(),
            });
            progressEmitter.emit(`done:${jobId}`);
          }
        }

        return result;
      } catch (err) {
        const parentJob = await getJob(jobId);
        if (parentJob) {
          await updateDocument(jobId, docIndex, { status: 'failed', error: err.message });
          parentJob.progress.failed++;
          await updateJob(jobId, { progress: parentJob.progress });

          const { completed, failed, total } = parentJob.progress;
          progressEmitter.emit(`progress:${jobId}`, {
            completed, failed, total, error: err.message,
          });

          if (completed + failed >= total) {
            await updateJob(jobId, {
              status: 'completed_with_errors',
              completedAt: new Date().toISOString(),
            });
            progressEmitter.emit(`done:${jobId}`);
          }
        }
        throw err;
      }
    },
    {
      connection,
      concurrency: config.puppeteer.concurrency,
      // Stalled jobs (crash mid-render) get retried after 30s
      stalledInterval: 30000,
      // Retry failed jobs up to 3 times with exponential backoff
      settings: { backoffStrategy: (attemptsMade) => Math.min(attemptsMade * 2000, 10000) },
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
  });

  worker.on('stalled', (jobId) => {
    console.warn(`Job ${jobId} stalled - will be retried`);
  });

  console.log(`Worker started (concurrency: ${config.puppeteer.concurrency})`);
  return worker;
}

module.exports = { initWorker, progressEmitter };
