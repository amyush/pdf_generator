const fs = require('fs');
const path = require('path');
const config = require('../config');

async function ensureStorageDir() {
  await fs.promises.mkdir(config.storage.dir, { recursive: true });
}

function getFilePath(fileId) {
  return path.join(config.storage.dir, `${fileId}.pdf`);
}

async function savePdf(fileId, buffer) {
  const filePath = getFilePath(fileId);
  await fs.promises.writeFile(filePath, buffer);
  return filePath;
}

async function getPdfStream(fileId) {
  const filePath = getFilePath(fileId);
  const stat = await fs.promises.stat(filePath);
  return { filePath, size: stat.size };
}

async function pdfExists(fileId) {
  try {
    await fs.promises.access(getFilePath(fileId));
    return true;
  } catch {
    return false;
  }
}

module.exports = { ensureStorageDir, savePdf, getPdfStream, pdfExists, getFilePath };
