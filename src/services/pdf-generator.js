const { PDFDocument } = require('pdf-lib');
const { acquirePage, releasePage } = require('./browser-pool');
const { renderTemplate } = require('./template-engine');
const { computeHash } = require('./hasher');
const { savePdf } = require('./storage');
const config = require('../config');

const PDF_OPTIONS = {
  format: 'A4',
  printBackground: true,
  margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' },
};

async function generatePdf(documentData) {
  const { type, data, fileId } = documentData;
  const items = data.items || [];

  if (items.length > config.puppeteer.chunkSize) {
    return generateChunkedPdf(documentData);
  }

  // Non-chunked: show everything on one render
  const html = renderTemplate(type, { ...data, showHeader: true, showSummary: true });
  const page = await acquirePage();

  try {
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    const pdfBuffer = await page.pdf(PDF_OPTIONS);
    const hash = computeHash(pdfBuffer);
    await savePdf(fileId, pdfBuffer);
    return { fileId, hash, size: pdfBuffer.length };
  } finally {
    await releasePage(page);
  }
}

// Split large docs into chunks, render each separately, merge with pdf-lib.
// Prevents Puppeteer OOM on 500+ line item documents.
async function generateChunkedPdf(documentData) {
  const { type, data, fileId } = documentData;
  const items = data.items || [];
  const chunkSize = config.puppeteer.chunkSize;
  const chunks = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }

  const mergedPdf = await PDFDocument.create();

  for (let i = 0; i < chunks.length; i++) {
    const chunkData = {
      ...data,
      items: chunks[i],
      pageInfo: { current: i + 1, total: chunks.length },
      showHeader: i === 0,
      showSummary: i === chunks.length - 1,
    };

    const html = renderTemplate(type, chunkData);
    const page = await acquirePage();

    try {
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
      const chunkPdfBytes = await page.pdf(PDF_OPTIONS);
      const chunkPdf = await PDFDocument.load(chunkPdfBytes);
      const pages = await mergedPdf.copyPages(chunkPdf, chunkPdf.getPageIndices());
      pages.forEach((p) => mergedPdf.addPage(p));
    } finally {
      await releasePage(page);
    }
  }

  const mergedBytes = await mergedPdf.save();
  const pdfBuffer = Buffer.from(mergedBytes);
  const hash = computeHash(pdfBuffer);
  await savePdf(fileId, pdfBuffer);
  return { fileId, hash, size: pdfBuffer.length };
}

module.exports = { generatePdf };
