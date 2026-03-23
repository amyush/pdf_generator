const Redis = require('ioredis');
const config = require('../config');

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
});

const KEY_PREFIX = 'pdfjob:';
const TTL = 86400; // 24h expiry for job data

function key(id) {
  return `${KEY_PREFIX}${id}`;
}

async function createJob(id, data) {
  const job = {
    id,
    type: data.type,
    status: 'pending',
    documents: data.documents || [],
    progress: { completed: 0, failed: 0, total: data.total || 1 },
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  await redis.set(key(id), JSON.stringify(job), 'EX', TTL);
  return job;
}

async function getJob(id) {
  const raw = await redis.get(key(id));
  return raw ? JSON.parse(raw) : null;
}

async function updateJob(id, updates) {
  const job = await getJob(id);
  if (!job) return null;
  Object.assign(job, updates);
  await redis.set(key(id), JSON.stringify(job), 'EX', TTL);
  return job;
}

async function updateDocument(jobId, docIndex, updates) {
  const job = await getJob(jobId);
  if (!job || !job.documents[docIndex]) return null;
  Object.assign(job.documents[docIndex], updates);
  await redis.set(key(jobId), JSON.stringify(job), 'EX', TTL);
  return job;
}

module.exports = { createJob, getJob, updateJob, updateDocument };
