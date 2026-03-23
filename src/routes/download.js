const { Router } = require('express');
const fs = require('fs');
const archiver = require('archiver');
const { getJob } = require('../store/job-store');
const { getPdfStream, pdfExists, getFilePath } = require('../services/storage');

const router = Router();

// Bulk ZIP download - must be registered BEFORE /:fileId to avoid route conflict
router.get('/download/bulk/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const job = getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const completedDocs = job.documents.filter((d) => d.status === 'completed');
  if (completedDocs.length === 0) {
    return res.status(404).json({ error: 'No completed documents to download' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="bulk-${jobId.slice(0, 8)}.zip"`);

  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.pipe(res);

  completedDocs.forEach((doc, i) => {
    const filePath = getFilePath(doc.fileId);
    archive.file(filePath, { name: `document-${i + 1}-${doc.fileId.slice(0, 8)}.pdf` });
  });

  await archive.finalize();
});

// Single PDF download with Range header support (resumable downloads for unreliable connections)
router.get('/download/:fileId', async (req, res) => {
  const { fileId } = req.params;

  if (!await pdfExists(fileId)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const { filePath, size } = await getPdfStream(fileId);
  const range = req.headers.range;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileId}.pdf"`);
  res.setHeader('Accept-Ranges', 'bytes');

  if (range) {
    // Resumable download: client sends Range header after a failed partial download
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : size - 1;

    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
    res.setHeader('Content-Length', end - start + 1);
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.setHeader('Content-Length', size);
    fs.createReadStream(filePath).pipe(res);
  }
});

module.exports = router;
