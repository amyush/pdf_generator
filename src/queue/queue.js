const { Queue, QueueEvents } = require('bullmq');
const config = require('../config');

const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
};

const pdfQueue = new Queue(config.queue.name, { connection });
const queueEvents = new QueueEvents(config.queue.name, { connection });

module.exports = { pdfQueue, queueEvents, connection };
