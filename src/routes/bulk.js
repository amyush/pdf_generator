const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { pdfQueue } = require('../queue/queue');
const { createJob, updateJob } = require('../store/job-store');

const router = Router();

// Bulk endpoint: Django sends ALL document data upfront (snapshot approach)
// to avoid stale data issues during long-running bulk generations
router.post('/bulk', async (req, res) => {
  try {
    const { documents } = req.body;

    if (!Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ error: 'documents array is required' });
    }
    if (documents.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 documents per bulk request' });
    }

    const jobId = uuidv4();
    const docs = documents.map(() => ({
      fileId: uuidv4(),
      status: 'pending',
    }));

    await createJob(jobId, { type: 'bulk', total: documents.length, documents: docs });
    await updateJob(jobId, { status: 'processing' });

    // Queue all documents with retry config
    const queuePromises = documents.map((doc, i) =>
      pdfQueue.add('generate-pdf', {
        type: doc.type,
        data: doc.data,
        fileId: docs[i].fileId,
        jobId,
        docIndex: i,
      }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } })
    );
    await Promise.all(queuePromises);

    res.status(202).json({
      jobId,
      total: documents.length,
      statusUrl: `/api/jobs/${jobId}/status`,
      downloadUrl: `/api/download/bulk/${jobId}`,
    });
  } catch (err) {
    console.error('Bulk error:', err);
    res.status(500).json({ error: 'Failed to queue bulk generation' });
  }
});

module.exports = router;
