const crypto = require('crypto');

// SHA-256 hash for tamper evidence. Store this hash in DB at generation time.
// To verify: re-hash the PDF and compare. If different, file was tampered.
function computeHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

module.exports = { computeHash };
